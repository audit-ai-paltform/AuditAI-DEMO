import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';
import { AudioProcessingJobData, aiEvaluationQueue } from '../queues/call-pipeline.queue.js';
import { supabaseStorageProvider } from '../providers/storage/supabase-storage.provider.js';
import { assemblyAIProvider } from '../providers/assemblyai.provider.js';
import { transcriptNormalizerProvider } from '../providers/transcript-normalizer.provider.js';
import { callRepository } from '../modules/calls/calls.repository.js';
import { recordProcessingEvent } from '../modules/calls/processing-events.js';
import { logger } from '../core/config/logger.config.js';
import { assertSafeRecordingUrl } from '../common/security/recording-url.js';
import { integrationsService } from '../modules/integrations/integrations.service.js';

export const audioProcessingWorker = new Worker<AudioProcessingJobData>(
  'audio-processing',
  async (job: Job<AudioProcessingJobData>) => {
    const { call_id, client_id, recording_url, correlation_id } = job.data;
    const log = logger.child({ call_id, client_id, jobId: job.id, correlation_id, component: 'AudioProcessingWorker' });
    log.info('Starting audio pipeline job');

    try {
      const approvedHosts = (process.env.KNOWLARITY_RECORDING_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
      await assertSafeRecordingUrl(recording_url, approvedHosts);
      // 1. Status: DOWNLOADING
      await callRepository.update(call_id, { status: 'DOWNLOADING' }).catch((err: Error) => {
        log.warn({ err: err.message }, 'Status DOWNLOADING notice');
      });
      await recordProcessingEvent({ tenant_id: client_id, call_id, event_type: 'RECORDING_DOWNLOAD_STARTED', status: 'STARTED', correlation_id });

      // 2. Download audio recording file
      let fileBuffer: Buffer | null = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        const fetchResp = await fetch(recording_url, { redirect: 'error', signal: controller.signal });
        clearTimeout(timeout);
        if (fetchResp.ok) {
          const contentLength = Number(fetchResp.headers.get('content-length') || '0');
          if (contentLength > 50 * 1024 * 1024) throw new Error('Recording exceeds 50 MB limit');
          const arrayBuf = await fetchResp.arrayBuffer();
          if (arrayBuf.byteLength > 50 * 1024 * 1024) throw new Error('Recording exceeds 50 MB limit');
          fileBuffer = Buffer.from(arrayBuf);
        } else {
          log.warn({ status: fetchResp.status }, 'Recording download returned non-OK status — will rely on provider URL fetch');
        }
      } catch (err: any) {
        log.warn({ err: err.message }, 'Audio download notice');
      }

      // 3. Status: UPLOADING & store in Supabase Storage
      let recording_path = recording_url;
      await callRepository.update(call_id, { status: 'UPLOADING' })
        .catch((e: any) => log.error({ err: e.message }, 'Could not persist UPLOADING status'));

      if (fileBuffer) {
        try {
          const storagePath = await supabaseStorageProvider.upload(`${client_id}/${call_id}.mp3`, fileBuffer, 'audio/mpeg');
          await recordProcessingEvent({ tenant_id: client_id, call_id, event_type: 'RECORDING_STORED', detail: { storagePath }, correlation_id });
          try {
            const signedUrl = await supabaseStorageProvider.generateSignedUrl(storagePath, 604800);
            recording_path = signedUrl;
          } catch {
            recording_path = recording_url;
          }
        } catch (storageErr: any) {
          log.warn({ storageErr: storageErr.message }, 'Storage upload notice - preserving original recording_url');
          recording_path = recording_url;
        }
      }

      // 4. Status: TRANSCRIBING & AssemblyAI SDK
      await callRepository.update(call_id, { status: 'TRANSCRIBING', recording_path })
        .catch((e: any) => log.error({ err: e.message }, 'Could not persist TRANSCRIBING status'));
      await recordProcessingEvent({ tenant_id: client_id, call_id, event_type: 'TRANSCRIPTION_STARTED', status: 'STARTED', correlation_id });
      const transcriptionStartedAt = Date.now();

      log.info('Submitting public recording URL to AssemblyAI SDK...');
      const assemblyAiKey = await integrationsService.credentialFor(client_id, 'assemblyai');
      const transcriptionResult = await assemblyAIProvider.transcribeAudio(recording_url, assemblyAiKey || undefined);

      // Raw AssemblyAI speaker turns
      const rawTurns = transcriptionResult.utterances.map((u) => ({
        speaker: u.speaker === 'A' ? 'Agent' : 'Customer',
        text: u.text,
        timestamp: `${u.start || 0}-${u.end || 0}`,
      }));

      // Roman Hindi / Hinglish Transcript Normalization Step
      log.info('Normalizing transcript to Roman Hindi / Hinglish...');
      const normalizedUtterances = await transcriptNormalizerProvider.normalizeUtterances(transcriptionResult.utterances);

      // Keep precise start/end ms on the stored transcript so flag
      // evidence can point at exact timestamps.
      const normalizedTurns = normalizedUtterances.map((u) => ({
        speaker: u.speaker === 'A' ? 'Agent' : 'Customer',
        text: u.text,
        start: u.start ?? null,
        end: u.end ?? null,
        timestamp: `${u.start || 0}-${u.end || 0}`,
      }));

      const formattedDuration = transcriptionResult.duration
        ? `${Math.floor(transcriptionResult.duration / 60)}:${String(Math.floor(transcriptionResult.duration % 60)).padStart(2, '0')}`
        : job.data.duration || null;

      // 5. Status: TRANSCRIBED (normalized transcript + raw + metadata)
      await callRepository.update(call_id, {
        status: 'TRANSCRIBED',
        transcript: normalizedTurns,
        duration: formattedDuration,
        recording_path,
        processing_metadata: {
          transcription_provider: 'assemblyai',
          transcription_model: 'universal',
          transcription_duration_ms: Date.now() - transcriptionStartedAt,
          transcription_confidence: transcriptionResult.confidence,
          transcript_language: transcriptionResult.language,
        },
        flags: {
          confidence: transcriptionResult.confidence,
          language: transcriptionResult.language,
          transcript_id: transcriptionResult.transcript_id,
          utterances: transcriptionResult.utterances,
          raw_transcript: rawTurns,
          recording_url: recording_url,
        },
      });

      await recordProcessingEvent({
        tenant_id: client_id, call_id, event_type: 'TRANSCRIPTION_COMPLETED',
        detail: { transcript_id: transcriptionResult.transcript_id, confidence: transcriptionResult.confidence },
        correlation_id,
      });

      log.info({ transcript_id: transcriptionResult.transcript_id }, 'AssemblyAI Transcription finished. Enqueuing AI Evaluation Job...');

      // 6. Enqueue AI Evaluation Job (stable job id for idempotency)
      const aiJobId = job.data.evaluation_run_id
        ? `ai-eval-${call_id}-${job.data.evaluation_run_id}`
        : `ai-eval-${call_id}`;

      await aiEvaluationQueue.add(
        `ai-evaluation-job:${call_id}`,
        {
          call_id,
          client_id,
          agent_id: job.data.agent_id,
          transcript_id: transcriptionResult.transcript_id,
          correlation_id,
          evaluation_run_id: job.data.evaluation_run_id,
          is_reevaluation: job.data.is_reevaluation,
        },
        { jobId: aiJobId },
      );

      return { status: 'TRANSCRIBED', call_id, transcript_id: transcriptionResult.transcript_id };
    } catch (error: any) {
      log.error({ err: error.message }, 'Job error');

      // BullMQ will retry this job if attempts remain — reflect that in the
      // call status so the UI shows RETRYING rather than a terminal FAILED.
      const attemptsMade = job.attemptsMade + 1;
      const willRetry = attemptsMade < (job.opts?.attempts ?? 1);

      await callRepository.update(call_id, {
        status: willRetry ? 'RETRYING' : 'FAILED',
        failure_reason: error.message || 'Audio processing failure',
      }).catch((e: any) => log.error({ err: e.message }, 'Could not persist failure status on the call record'));

      await recordProcessingEvent({
        tenant_id: client_id, call_id, event_type: 'RECORDING_OR_TRANSCRIPTION_FAILED',
        status: 'FAILED', detail: { error: error.message, attempts: attemptsMade, will_retry: willRetry },
        correlation_id,
      }).catch(() => {});

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

audioProcessingWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[AudioProcessingWorker] Job completed successfully');
});

audioProcessingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[AudioProcessingWorker] Job failed');
});
