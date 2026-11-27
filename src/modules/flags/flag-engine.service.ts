import { flagRepository } from './flags.repository.js';
import { dualAIProvider } from '../../providers/dual-ai.provider.js';
import { supabaseRealtimeProvider } from '../../providers/realtime/supabase-realtime.provider.js';
import { logger } from '../../core/config/logger.config.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import {
  FlagCandidate,
  FlagEntity,
  applyConfidenceGuard,
  classifyConfidence,
  requiresManagerAttention,
} from './flags.types.js';
import { runStageOneDetection, TranscriptSegment, SopKnowledge } from './stage-one.detectors.js';
import { notificationService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';

export const FLAG_ENGINE_VERSION = '1.0.0';

export interface FlagAnalysisInput {
  call_id: string;
  tenant_id: string;
  agent_id?: string | null;
  transcript: Array<{ speaker: string; text: string; start?: number; end?: number; confidence?: number }>;
  sopVersionId?: string | null;
  correlationId?: string;
}

/**
 * Extract key facts from an SOP's sections for Stage-1 fact conflict
 * detection. Sections may carry structured facts; otherwise the plain
 * section text is included as knowledge context for Stage 2.
 */
function buildSopKnowledge(sections: Array<Record<string, unknown>> | null | undefined): SopKnowledge {
  const keyFacts: Array<{ subject: string; value: string }> = [];
  const textParts: string[] = [];

  for (const section of sections || []) {
    const title = String(section.title || section.name || 'Section');
    const body = String(section.text || section.content || '');
    textParts.push(`${title}: ${body}`);

    // Structured facts: { title: 'Fact: premium', text: '₹2,000' } or
    // { title: 'Required phrase', text: 'This call is recorded...' }
    if (/^fact\s*:/i.test(title)) {
      keyFacts.push({ subject: title.replace(/^fact\s*:/i, '').trim().toLowerCase(), value: body });
    } else if (/^required phrase\s*:/i.test(title)) {
      keyFacts.push({ subject: `required-phrase:${title.replace(/^required phrase\s*:/i, '').trim()}`, value: body });
    }
  }

  return { sopVersionId: null, sopText: textParts.join('\n'), keyFacts };
}

/**
 * The Audit Intelligence / Flag Engine.
 *
 * Stage 1: fast deterministic detectors (entity/numeric extraction,
 * contradiction patterns, mandatory disclosures, SOP fact conflicts).
 * Stage 2: AI semantic verification of candidates via the IAIProvider
 * interface (Gemini today) with strict Zod-validated JSON output.
 *
 * Scoring and flagging are independent: this engine never touches
 * call.score or parameter_scores.
 */
export class FlagEngineService {
  /**
   * Run the full two-stage analysis for a call and persist verified flags.
   * Realtime + notifications fire only after successful persistence.
   */
  public async analyzeCall(input: FlagAnalysisInput): Promise<{ created: FlagEntity[]; candidates: number }> {
    const { call_id, tenant_id } = input;
    const log = logger.child({ call_id, tenant_id, component: 'FlagEngine' });

    if (!input.transcript || input.transcript.length === 0) {
      log.info('No transcript — skipping flag analysis');
      return { created: [], candidates: 0 };
    }

    // 1. Resolve the SOP version this call was audited under
    const sop = await this.resolveSop(tenant_id, input.sopVersionId);

    // 2. Stage 1 — deterministic detection
    const segments: TranscriptSegment[] = input.transcript.map((t, i) => ({
      index: i,
      speaker: t.speaker,
      text: t.text,
      start: t.start,
      end: t.end,
      confidence: t.confidence,
    }));
    const candidates = runStageOneDetection(segments, sop);
    log.info({ candidates: candidates.length }, 'Stage 1 detection complete');

    if (candidates.length === 0) {
      return { created: [], candidates: 0 };
    }

    // 3. Stage 2 — AI semantic verification
    let verified: FlagEntity[] = [];
    try {
      const result = await dualAIProvider.verifyFlags({
        transcript: segments.map((s) => ({ speaker: s.speaker, text: s.text, start: s.start, end: s.end })),
        candidates: candidates.map((c) => ({
          detector: c.detector,
          type: c.flag_type,
          severity: c.severity,
          title: c.title,
          description: c.description,
          customerStatement: c.customer_statement ?? null,
          agentStatement: c.agent_statement ?? null,
          expectedInformation: c.expected_information ?? null,
          actualInformation: c.actual_information ?? null,
          evidence: c.evidence ?? null,
          startTime: c.evidence_start_time ?? null,
          endTime: c.evidence_end_time ?? null,
          transcriptSegmentId: c.transcript_segment_id ?? null,
          initialConfidence: c.initial_confidence,
        })),
        sopContent: sop.sopText,
        keyFacts: sop.keyFacts,
      });

      verified = await this.persistVerifiedFlags(input, candidates, result.flags, sop.sopVersionId);
    } catch (err: any) {
      // Flag engine failure must never corrupt the call record — record and rethrow
      // so the queue can retry with backoff.
      log.error({ err: err.message }, 'Stage 2 verification failed');
      throw err;
    }

    return { created: verified, candidates: candidates.length };
  }

  /** Resolve the active SOP version for a tenant (or the call's pinned version). */
  private async resolveSop(tenantId: string, sopVersionId?: string | null): Promise<SopKnowledge & { sopVersionId: string | null }> {
    try {
      let query = supabaseAdminClient
        .from('sop_versions')
        .select('id, process, language, sections, status')
        .eq('client_id', tenantId);

      if (sopVersionId) {
        query = query.eq('id', sopVersionId);
      } else {
        query = query.eq('status', 'ACTIVE').order('version_number', { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        logger.warn({ tenantId, err: error?.message }, '[FlagEngine] No SOP version found — using empty knowledge');
        return { sopVersionId: null, sopText: '', keyFacts: [] };
      }

      const knowledge = buildSopKnowledge(data.sections as Array<Record<string, unknown>>);
      return { ...knowledge, sopVersionId: data.id as string };
    } catch (err: any) {
      logger.warn({ err: err.message }, '[FlagEngine] SOP resolution notice');
      return { sopVersionId: null, sopText: '', keyFacts: [] };
    }
  }

  /**
   * Persist AI-verified flags with deduplication, confidence guards and
   * severity classification. Fires realtime events and notifications
   * only for manager-worthy flags, after persistence.
   */
  private async persistVerifiedFlags(
    input: FlagAnalysisInput,
    candidates: FlagCandidate[],
    aiFlags: Array<Record<string, unknown>>,
    sopVersionId: string | null,
  ): Promise<FlagEntity[]> {
    const created: FlagEntity[] = [];

    for (const raw of aiFlags) {
      // Re-map candidate dedup keys by matching segment ids so re-runs stay idempotent
      const segId = raw.transcriptSegmentId != null ? String(raw.transcriptSegmentId) : null;
      const matchedCandidate = candidates.find(
        (c) => (c.transcript_segment_id != null && String(c.transcript_segment_id) === segId) ||
               (c.title || '').toLowerCase() === String(raw.title || '').toLowerCase(),
      );

      const confidence = Math.min(1, Math.max(0, Number(raw.confidence) || 0));
      const confidenceLevel = classifyConfidence(confidence);
      const severity = applyConfidenceGuard(raw.severity as never, confidenceLevel);
      const isTranscriptionAmbiguity = Boolean(raw.isTranscriptionAmbiguity);
      const finalType = isTranscriptionAmbiguity ? 'TRANSCRIPTION_AMBIGUITY' : raw.type;

      const flag = await flagRepository.create({
        tenant_id: input.tenant_id,
        call_id: input.call_id,
        agent_id: input.agent_id ?? null,
        flag_type: finalType as string,
        category: matchedCandidate?.category || 'OTHER',
        severity,
        confidence,
        confidence_level: confidenceLevel,
        title: String(raw.title || 'Potential issue detected'),
        description: String(raw.description || ''),
        customer_statement: (raw.customerStatement as string) ?? null,
        agent_statement: (raw.agentStatement as string) ?? null,
        expected_information: (raw.expectedInformation as string) ?? null,
        actual_information: (raw.actualInformation as string) ?? null,
        evidence: (raw.evidence as string) ?? null,
        evidence_start_time: raw.startTime != null ? Number(raw.startTime) : null,
        evidence_end_time: raw.endTime != null ? Number(raw.endTime) : null,
        transcript_segment_id: segId,
        sop_version_id: sopVersionId,
        source: 'AI_VERIFIED',
        ai_reasoning: (raw.aiReasoning as string) ?? null,
        recommended_action: (raw.recommendedAction as string) ?? null,
        requires_manager_attention: requiresManagerAttention(severity, confidenceLevel),
        dedup_key: matchedCandidate?.dedup_key ?? `ai:${finalType}:${segId ?? raw.title}`,
      });

      if (flag) {
        created.push(flag);
        await flagRepository.recordEvent({
          flag_id: flag.id,
          tenant_id: input.tenant_id,
          event_type: 'CREATED',
          to_status: flag.status,
          note: `Detected by flag engine v${FLAG_ENGINE_VERSION} (confidence ${confidence})`,
        });

        // Realtime event — tenant-scoped alerts channel
        try {
          await supabaseRealtimeProvider.broadcastEvent(
            `tenant:${input.tenant_id}:alerts`,
            'CALL_FLAG_CREATED',
            {
              callId: flag.call_id,
              flagId: flag.id,
              agentId: flag.agent_id,
              severity: flag.severity,
              flagType: flag.flag_type,
              title: flag.title,
              confidence: flag.confidence,
              requiresManagerAttention: flag.requires_manager_attention,
            },
          );
        } catch (err: any) {
          logger.warn({ err: err.message }, '[FlagEngine] Realtime broadcast notice');
        }

        // Notification — only for flags meeting tenant notification rules
        if (flag.requires_manager_attention) {
          try {
            await notificationService.notifyFlagCreated(flag);
            await EmailService.sendCriticalAlertEmail({
              callId: flag.call_id,
              agentId: flag.agent_id,
              severity: flag.severity,
              flagType: flag.flag_type,
              title: flag.title,
              description: flag.description,
              evidence: flag.evidence,
              recommendedAction: flag.recommended_action,
              confidence: flag.confidence,
            });
          } catch (err: any) {
            logger.warn({ err: err.message }, '[FlagEngine] Notification dispatch notice');
          }
        }
      }
    }

    return created;
  }
}

export const flagEngineService = new FlagEngineService();
