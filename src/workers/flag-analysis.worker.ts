import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';
import { FlagAnalysisJobData } from '../queues/call-pipeline.queue.js';
import { callRepository } from '../modules/calls/calls.repository.js';
import { flagEngineService, FLAG_ENGINE_VERSION } from '../modules/flags/flag-engine.service.js';
import { recordProcessingEvent } from '../modules/calls/processing-events.js';
import { logger } from '../core/config/logger.config.js';

/**
 * Flag Analysis Worker — runs AFTER scoring completes.
 *
 * Transcript → Flag Intelligence Engine (Stage 1 rules + Stage 2 AI)
 * → Flags persisted → Realtime event → Manager notification.
 *
 * Scoring and flagging are separate: a scoring failure never blocks
 * flag analysis and vice versa.
 */
export const flagAnalysisWorker = new Worker<FlagAnalysisJobData>(
  'flag-analysis',
  async (job: Job<FlagAnalysisJobData>) => {
    const { call_id, client_id, agent_id, sop_version_id, correlation_id } = job.data;
    const log = logger.child({ call_id, client_id, jobId: job.id, component: 'FlagAnalysisWorker' });

    log.info('Starting flag analysis job');

    await recordProcessingEvent({
      tenant_id: client_id,
      call_id,
      event_type: 'FLAG_ANALYSIS_STARTED',
      status: 'STARTED',
      correlation_id,
    });

    try {
      // 1. Fetch the call with its transcript
      const call = await callRepository.findById(call_id);
      if (!call) {
        throw new Error(`Call ${call_id} not found`);
      }

      if (!Array.isArray(call.transcript) || call.transcript.length === 0) {
        log.info('No transcript on call — skipping flag analysis');
        await recordProcessingEvent({
          tenant_id: client_id, call_id, event_type: 'FLAG_ANALYSIS_SKIPPED',
          status: 'SKIPPED', detail: { reason: 'no_transcript' }, correlation_id,
        });
        return { status: 'SKIPPED', call_id, reason: 'no_transcript' };
      }

      // 2. Run the two-stage engine
      const startedAt = Date.now();
      const result = await flagEngineService.analyzeCall({
        call_id,
        tenant_id: client_id,
        agent_id: agent_id || call.agent_id,
        transcript: call.transcript as Array<{ speaker: string; text: string; start?: number; end?: number }>,
        sopVersionId: sop_version_id || (call as { sop_version_id?: string }).sop_version_id || null,
        correlationId: correlation_id,
      });
      const durationMs = Date.now() - startedAt;

      // 3. Record processing metadata (flag engine version, duration, counts)
      const existingMeta = ((call as { processing_metadata?: Record<string, unknown> }).processing_metadata) || {};
      await callRepository.update(call_id, {
        processing_metadata: {
          ...existingMeta,
          flag_engine_version: FLAG_ENGINE_VERSION,
          flag_analysis_duration_ms: durationMs,
          flag_candidates: result.candidates,
          flags_created: result.created.length,
        },
      });

      await recordProcessingEvent({
        tenant_id: client_id, call_id, event_type: 'FLAG_ANALYSIS_COMPLETED',
        detail: { candidates: result.candidates, flags: result.created.length, durationMs },
        correlation_id,
      });

      log.info({ flags: result.created.length, candidates: result.candidates, durationMs }, 'Flag analysis complete');
      return { status: 'COMPLETED', call_id, flags: result.created.length };
    } catch (error: any) {
      log.error({ err: error.message }, 'Flag analysis job error');

      await recordProcessingEvent({
        tenant_id: client_id, call_id, event_type: 'FLAG_ANALYSIS_FAILED',
        status: 'FAILED', detail: { error: error.message, attempts: job.attemptsMade + 1 },
        correlation_id,
      });

      // Do not mark the call FAILED — scoring already succeeded; the call
      // record stays intact. BullMQ retries; after max attempts the job
      // lands in the failed set (DLQ) for administrator review.
      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  },
);

flagAnalysisWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[FlagAnalysisWorker] Job completed successfully');
});

flagAnalysisWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message, attempts: job?.attemptsMade }, '[FlagAnalysisWorker] Job failed');
});
