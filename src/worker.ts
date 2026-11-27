import { logger } from './core/config/logger.config.js';
import { audioProcessingWorker } from './workers/audio-processing.worker.js';
import { aiEvaluationWorker } from './workers/ai-evaluation.worker.js';
import { flagAnalysisWorker } from './workers/flag-analysis.worker.js';
import { retentionWorker } from './workers/retention.worker.js';
import { reportWorker } from './workers/report.worker.js';
import {
  audioProcessingQueue,
  aiEvaluationQueue,
  flagAnalysisQueue,
  retentionQueue,
  reportQueue,
} from './queues/call-pipeline.queue.js';

logger.info('🚀 Starting AuditAI Dedicated Background Worker Process...');

// Upsert repeatable cron schedulers
retentionQueue
  .upsertJobScheduler('hourly-retention-cleanup', { pattern: '0 * * * *' }, { name: 'retention-cleanup' })
  .catch((err: Error) => {
    logger.error({ err: err.message }, 'Unable to schedule retention cleanup');
  });

reportQueue
  .upsertJobScheduler('daily-report-sweep', { pattern: '15 * * * *' }, { name: 'daily-report-sweep', data: {} })
  .catch(() => {});

logger.info('✅ All BullMQ workers and schedulers are active and waiting for jobs.');

const shutdown = async (signal: string): Promise<void> => {
  logger.warn(`Received ${signal}. Draining and closing BullMQ workers...`);

  try {
    await Promise.allSettled([
      audioProcessingWorker.close(),
      aiEvaluationWorker.close(),
      flagAnalysisWorker.close(),
      retentionWorker.close(),
      reportWorker.close(),
    ]);

    await Promise.allSettled([
      audioProcessingQueue.close(),
      aiEvaluationQueue.close(),
      flagAnalysisQueue.close(),
      retentionQueue.close(),
      reportQueue.close(),
    ]);

    logger.info('BullMQ workers gracefully shut down. Exiting process.');
    process.exit(0);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error closing BullMQ workers');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'Uncaught Exception in worker process!');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled Promise Rejection in worker process!');
  process.exit(1);
});
