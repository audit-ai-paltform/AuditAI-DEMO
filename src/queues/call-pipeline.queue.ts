import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';

export interface AudioProcessingJobData {
  call_id: string;
  client_id: string;
  agent_id?: string;
  recording_url: string;
  caller_number?: string;
  duration?: string;
  timestamp?: string;
  correlation_id?: string;
  evaluation_run_id?: string;
  is_reevaluation?: boolean;
}

export interface AIEvaluationJobData {
  call_id: string;
  client_id: string;
  agent_id?: string;
  transcript_id?: string;
  correlation_id?: string;
  evaluation_run_id?: string;
  is_reevaluation?: boolean;
  trigger_reason?: string;
  triggered_by?: string;
}

export interface FlagAnalysisJobData {
  call_id: string;
  client_id: string;
  agent_id?: string;
  sop_version_id?: string | null;
  correlation_id?: string;
}

/**
 * Queue defaults: bounded retries with exponential backoff. Jobs that
 * exhaust attempts land in the failed set (DLQ) with removeOnFail kept
 * high enough for administrator inspection.
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const audioProcessingQueue = new Queue<AudioProcessingJobData>('audio-processing', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

export const aiEvaluationQueue = new Queue<AIEvaluationJobData>('ai-evaluation', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

export const flagAnalysisQueue = new Queue<FlagAnalysisJobData>('flag-analysis', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

export const retentionQueue = new Queue('retention-cleanup', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});

export const reportQueue = new Queue<{ report_id?: string }>('daily-reports', {
  connection: redisConnectionOptions,
  defaultJobOptions,
});
