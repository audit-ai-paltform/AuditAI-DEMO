import crypto from 'crypto';
import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';
import { AIEvaluationJobData, flagAnalysisQueue } from '../queues/call-pipeline.queue.js';
import { dualAIProvider } from '../providers/dual-ai.provider.js';
import { callRepository } from '../modules/calls/calls.repository.js';
import { recordProcessingEvent } from '../modules/calls/processing-events.js';
import { supabaseAdminClient } from '../core/config/supabase.admin.js';
import { logger } from '../core/config/logger.config.js';
import { integrationsService } from '../modules/integrations/integrations.service.js';
import { CloudflareD1Service } from '../database/cloudflare-d1.service.js';

export const aiEvaluationWorker = new Worker<AIEvaluationJobData>(
  'ai-evaluation',
  async (job: Job<AIEvaluationJobData>) => {
    const { call_id, client_id, correlation_id } = job.data;
    const log = logger.child({ call_id, client_id, jobId: job.id, component: 'AIEvaluationWorker' });

    log.info('Starting AI Evaluation job');

    try {
      // 1. Status: AI_SCORING
      await callRepository.update(call_id, { status: 'AI_SCORING' });
      await recordProcessingEvent({ tenant_id: client_id, call_id, event_type: 'SCORING_STARTED', status: 'STARTED', correlation_id });

      // 2. Fetch call record — no mock fallbacks: if the transcript is
      //    missing the job fails loudly so the queue can retry / DLQ it.
      const call = await callRepository.findById(call_id);
      if (!call) {
        throw new Error(`Call ${call_id} not found`);
      }
      const turns = call.transcript as Array<{ speaker: string; text: string }>;
      if (!Array.isArray(turns) || turns.length === 0) {
        throw new Error(`Call ${call_id} has no transcript — cannot evaluate`);
      }

      const transcriptText = turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
      const existingFlags = (call.flags as Record<string, unknown>) || {};
      const utterances = (existingFlags.utterances as Array<{ speaker: string; text: string }>) || [];

      // 3. Qalyzer v2.0 Versioned Rule Engine:
      //    Resolve the exact SOP / Knowledge Hub version active on the date the interaction occurred.
      const callCreatedAt = (call as any).created_at || new Date().toISOString();
      let sopContent = '';
      let resolvedSopVersionId: string | null = null;

      try {
        const d1Knowledge = await CloudflareD1Service.query(
          `SELECT id, content, version, effective_from, effective_to 
           FROM knowledge_products_processes 
           WHERE tenant_id = ? AND status = 'ACTIVE' 
             AND effective_from <= ? 
             AND (effective_to IS NULL OR effective_to >= ?)
           ORDER BY effective_from DESC LIMIT 1`,
          [client_id, callCreatedAt, callCreatedAt]
        );
        if (d1Knowledge.success && d1Knowledge.results.length > 0) {
          const doc = d1Knowledge.results[0];
          sopContent = doc.content;
          resolvedSopVersionId = doc.id;
        }
      } catch (err) {
        log.warn({ err }, 'Could not query knowledge_products_processes, using fallback');
      }

      if (!sopContent) {
        const { data: sopVersion } = await supabaseAdminClient
          .from('sop_versions')
          .select('id, sections, version_number')
          .eq('client_id', client_id)
          .eq('status', 'ACTIVE')
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sopVersion && Array.isArray(sopVersion.sections)) {
          sopContent = (sopVersion.sections as Array<Record<string, unknown>>)
            .map((s) => `${s.title || s.name || 'Section'}: ${s.text || s.content || ''}`)
            .join('\n');
          resolvedSopVersionId = sopVersion.id;
        } else {
          sopContent = 'Standard Operating Procedure: Greet customer, verify identity, understand needs, explain policy, maintain compliance, handle objections, close call.';
        }
      }

      // 4. Resolve tenant config version + active parameters
      const { data: configRow } = await supabaseAdminClient
        .from('tenant_config')
        .select('config_version')
        .eq('client_id', client_id)
        .maybeSingle();

      let parameters: Array<{ name: string; weight: number }> = [];
      const { data: paramData } = await supabaseAdminClient
        .from('parameters')
        .select('name, weight')
        .eq('client_id', client_id)
        .eq('enabled', true);
      if (paramData && paramData.length > 0) {
        parameters = paramData as Array<{ name: string; weight: number }>;
      }
      if (parameters.length === 0) {
        throw new Error(`No enabled audit parameters configured for client ${client_id}`);
      }

      // 5. Call Gemini AI Provider for structured evaluation
      const scoringStartedAt = Date.now();
      log.info({ parametersCount: parameters.length, sopVersionId: resolvedSopVersionId ?? null }, 'Sending transcript + active SOP + parameters to Gemini AI Provider...');
      const geminiKey = await integrationsService.credentialFor(client_id, 'gemini');
      const evalResult = await dualAIProvider.evaluateCall(transcriptText, utterances, sopContent, parameters, geminiKey || undefined);
      const scoringDurationMs = Date.now() - scoringStartedAt;

      // 6. Calculate accurate weighted percentage score excluding NOT_APPLICABLE criteria
      let totalWeightedScore = 0;
      let totalWeight = 0;

      const parameterScores = Object.entries(evalResult.evaluation).map(([key, value]) => {
        const matchedParam = parameters.find((p) => p.name.toLowerCase() === key.toLowerCase());
        const isNotApplicable = (value as { status?: string }).status === 'NOT_APPLICABLE' || value.remarks?.toLowerCase().includes('not applicable');

        // A criterion the model did not return a numeric score for is left
        // unscored — it is excluded from the weighted total instead of being
        // credited with an invented pass mark.
        const hasRawScore = typeof value.score === 'number' && Number.isFinite(value.score);
        let scorePct = hasRawScore ? (value.score as number) : null;

        if (scorePct !== null && matchedParam && scorePct <= matchedParam.weight && matchedParam.weight > 0 && !isNotApplicable) {
          scorePct = Math.round((scorePct / matchedParam.weight) * 100);
        }
        if (scorePct !== null) {
          scorePct = Math.min(100, Math.max(0, scorePct));
        }

        // Weight comes only from the tenant's configured parameter — an
        // unrecognised criterion contributes no weight and never inflates the score.
        if (!isNotApplicable && matchedParam && scorePct !== null) {
          totalWeightedScore += (scorePct * matchedParam.weight) / 100;
          totalWeight += matchedParam.weight;
        }

        const remarkText = value.remarks || (isNotApplicable ? 'Not applicable to this call type' : '');
        return {
          parameter_id: key,
          name: key,
          score: isNotApplicable ? ('N/A' as const) : (scorePct ?? ('N/A' as const)),
          status: isNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE',
          justification: remarkText,
          remarks: remarkText,
        };
      });

      let finalOverallScore = evalResult.overall_score;
      if (totalWeight > 0) {
        const calculatedWeighted = Math.round((totalWeightedScore / totalWeight) * 100);
        finalOverallScore = calculatedWeighted;
      }
      finalOverallScore = Math.min(100, Math.max(0, finalOverallScore));

      // 7. Status: COMPLETED — pin SOP version, config version and
      //    processing metadata on the call for enterprise traceability.
      const existingMeta = ((call as { processing_metadata?: Record<string, unknown> }).processing_metadata) || {};
      const evalRunId = job.data.evaluation_run_id;

      if (evalRunId) {
        // Persist the specific evaluation run record
        await supabaseAdminClient
          .from('call_evaluation_runs')
          .update({
            score: finalOverallScore,
            parameter_scores: parameterScores,
            flags_snapshot: {
              violations: evalResult.violations,
              strengths: evalResult.strengths,
              suggestions: evalResult.suggestions,
              summary: evalResult.summary,
              evaluation: evalResult.evaluation,
            },
            sop_version_id: resolvedSopVersionId ?? null,
            config_version: configRow?.config_version ?? null,
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
          })
          .eq('id', evalRunId);
      }

      await callRepository.update(call_id, {
        score: finalOverallScore,
        status: 'COMPLETED',
        // Clear any failure_reason left by a prior retryable attempt (e.g. a
        // Gemini 429/503) so a COMPLETED call never carries a stale error.
        failure_reason: null,
        parameter_scores: parameterScores,
        sop_version_id: resolvedSopVersionId ?? null,
        config_version: configRow?.config_version ?? null,
        latest_evaluation_run_id: evalRunId ?? null,
        processing_metadata: {
          ...existingMeta,
          ai_provider: 'gemini',
          ai_model: 'gemini-3.6-flash',
          scoring_duration_ms: scoringDurationMs,
          latest_evaluation_run_id: evalRunId ?? null,
        },
        flags: {
          ...existingFlags,
          violations: evalResult.violations,
          strengths: evalResult.strengths,
          suggestions: evalResult.suggestions,
          summary: evalResult.summary,
          evaluation: evalResult.evaluation,
          sales_forecasting: evalResult.sales_forecasting,
          coaching: evalResult.coaching,
          predictive_csat: evalResult.predictive_csat,
        },
      });

      // Persist Qalyzer v2.0 AI Sales Forecasting to Cloudflare D1
      if (evalResult.sales_forecasting) {
        const sf = evalResult.sales_forecasting;
        try {
          await CloudflareD1Service.query(
            `INSERT OR REPLACE INTO call_sales_forecasts 
             (id, call_id, tenant_id, lead_identifier, purchase_intent, budget_confirmed, competitor_mentions, pricing_objections, win_probability, forecast_category, projected_revenue, deal_stage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID(),
              call_id,
              client_id,
              call.caller_number || `Lead-${call_id.slice(0, 8)}`,
              sf.buying_signals?.purchase_intent || 'NONE',
              sf.buying_signals?.budget_confirmed ? 1 : 0,
              JSON.stringify(sf.buying_signals?.competitor_mentions || []),
              JSON.stringify(sf.buying_signals?.pricing_objections || []),
              sf.win_probability || 50,
              sf.forecast_category || 'at_risk',
              sf.projected_revenue || 0,
              sf.deal_stage || 'Discovery',
            ]
          );
        } catch (d1Err) {
          log.warn({ d1Err }, 'Failed to persist sales forecast to D1');
        }
      }

      // Persist Qalyzer v2.0 Coaching Insights to Cloudflare D1
      if (evalResult.coaching?.moments?.length) {
        for (const m of evalResult.coaching.moments) {
          try {
            await CloudflareD1Service.query(
              `INSERT OR REPLACE INTO agent_coaching_insights 
               (id, call_id, tenant_id, agent_id, agent_name, turn_index, timestamp, category, missed_opportunity, agent_statement, ideal_rewrite, coaching_rationale)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                crypto.randomUUID(),
                call_id,
                client_id,
                call.agent_id || null,
                (call as any).agent_name || 'Agent',
                m.turn_index || 0,
                m.timestamp || '00:00',
                m.category || 'objection_mishandle',
                m.missed_opportunity || '',
                m.what_agent_said || '',
                m.ideal_rewrite || '',
                m.coaching_rationale || '',
              ]
            );
          } catch (d1Err) {
            log.warn({ d1Err }, 'Failed to persist coaching insight to D1');
          }
        }
      }

      // Persist Qalyzer v2.0 Predictive CSAT & Sentiment Progression to Cloudflare D1
      if (evalResult.predictive_csat) {
        const csat = evalResult.predictive_csat;
        try {
          await CloudflareD1Service.query(
            `INSERT OR REPLACE INTO predictive_csat_metrics
             (id, call_id, tenant_id, predicted_csat_score, predicted_csat_percentage, sentiment_opening, sentiment_middle, sentiment_closing, silence_duration_seconds, silence_percentage, dead_air_occurrences, longest_silence_seconds, escalation_risk_level, escalation_triggers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID(),
              call_id,
              client_id,
              csat.predicted_csat_score || 4.0,
              csat.predicted_csat_percentage || finalOverallScore,
              csat.sentiment_progression?.opening || 'neutral',
              csat.sentiment_progression?.middle || 'neutral',
              csat.sentiment_progression?.closing || 'neutral',
              csat.silence_analysis?.silence_duration_seconds || 0,
              csat.silence_analysis?.silence_percentage || 0,
              csat.silence_analysis?.dead_air_occurrences || 0,
              csat.silence_analysis?.longest_silence_seconds || 0,
              csat.escalation_risk?.risk_level || 'LOW',
              JSON.stringify(csat.escalation_risk?.early_warning_triggers || []),
            ]
          );
        } catch (d1Err) {
          log.warn({ d1Err }, 'Failed to persist CSAT metrics to D1');
        }
      }

      await recordProcessingEvent({
        tenant_id: client_id,
        call_id,
        event_type: evalRunId ? 'REEVALUATION_COMPLETED' : 'SCORING_COMPLETED',
        detail: {
          score: finalOverallScore,
          sop_version_id: resolvedSopVersionId ?? null,
          duration_ms: scoringDurationMs,
          evaluation_run_id: evalRunId ?? null,
        },
        correlation_id,
      });

      log.info({ score: finalOverallScore, evalRunId }, 'AI Evaluation finished. Enqueuing flag analysis...');

      // 8. Enqueue flag analysis (separate concern from scoring).
      //    Stable jobId keeps this idempotent across scoring retries.
      const flagJobId = evalRunId ? `flag-analysis-${call_id}-${evalRunId}` : `flag-analysis-${call_id}`;
      await flagAnalysisQueue.add(
        'flag-analysis-job',
        {
          call_id,
          client_id,
          agent_id: job.data.agent_id || call.agent_id || undefined,
          sop_version_id: resolvedSopVersionId ?? null,
          correlation_id,
        },
        { jobId: flagJobId },
      );

      return { status: 'COMPLETED', call_id, score: finalOverallScore, evaluation_run_id: evalRunId };
    } catch (error: any) {
      log.error({ err: error.message }, 'Evaluation error');

      const attemptsMade = job.attemptsMade + 1;
      const willRetry = attemptsMade < (job.opts?.attempts ?? 1);
      const evalRunId = job.data.evaluation_run_id;

      if (evalRunId) {
        // Record failure on the specific evaluation run
        try {
          await supabaseAdminClient
            .from('call_evaluation_runs')
            .update({
              status: willRetry ? 'IN_PROGRESS' : 'FAILED',
              failure_reason: error.message || 'AI Evaluation failure',
            })
            .eq('id', evalRunId);
        } catch (e: any) {
          log.warn({ err: e.message }, 'Failed to record failure status on call_evaluation_runs');
        }
      }

      // If this was a re-evaluation of a call that had already completed previously,
      // preserve the existing call status and score so previous completed audit is NOT corrupted!
      const isReEval = Boolean(evalRunId || job.data.is_reevaluation);
      if (!isReEval) {
        await callRepository.update(call_id, {
          status: willRetry ? 'RETRYING' : 'FAILED',
          failure_reason: error.message || 'AI Evaluation failure',
        }).catch((e: any) => log.error({ err: e.message }, 'Could not persist failure status on the call record'));
      }

      await recordProcessingEvent({
        tenant_id: client_id,
        call_id,
        event_type: evalRunId ? 'REEVALUATION_FAILED' : 'SCORING_FAILED',
        status: 'FAILED',
        detail: {
          error: error.message,
          attempts: attemptsMade,
          will_retry: willRetry,
          evaluation_run_id: evalRunId ?? null,
        },
        correlation_id,
      }).catch(() => {});

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  },
);

aiEvaluationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[AIEvaluationWorker] Job completed successfully');
});

aiEvaluationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message, attempts: job?.attemptsMade }, '[AIEvaluationWorker] Job failed');
});
