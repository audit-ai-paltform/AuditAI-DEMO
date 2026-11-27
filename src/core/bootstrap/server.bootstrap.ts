import { Server } from 'node:http';
import { Express } from 'express';
import { logger } from '../config/logger.config.js';
import { env } from '../config/env.config.js';
import { audioProcessingWorker } from '../../workers/audio-processing.worker.js';
import { aiEvaluationWorker } from '../../workers/ai-evaluation.worker.js';
import { flagAnalysisWorker } from '../../workers/flag-analysis.worker.js';
import { retentionWorker } from '../../workers/retention.worker.js';
import { reportWorker } from '../../workers/report.worker.js';
import {
  audioProcessingQueue,
  aiEvaluationQueue,
  flagAnalysisQueue,
  retentionQueue,
  reportQueue,
} from '../../queues/call-pipeline.queue.js';

export function startServer(app: Express): Server {
  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 AuditAI Backend Server running on port ${env.PORT} [${env.NODE_ENV}] (API Prefix: ${env.API_PREFIX})`,
    );
  });
  // Repeatable job survives browser sessions and is idempotent by design.
  if (process.env.RUN_INLINE_WORKERS !== 'false') {
    retentionQueue.upsertJobScheduler('hourly-retention-cleanup', { pattern: '0 * * * *' }, { name: 'retention-cleanup' }).catch((err: Error) => {
      logger.error({ err: err.message }, 'Unable to schedule retention cleanup');
    });
    reportQueue.upsertJobScheduler('daily-report-sweep', { pattern: '15 * * * *' }, { name: 'daily-report-sweep', data: {} }).catch(() => {});
  }

  /**
   * Close the BullMQ workers before the process exits so an in-flight
   * transcription/scoring job finishes instead of being orphaned mid-write
   * (which would leave the call stuck in TRANSCRIBING / AI_SCORING).
   */
  const closeWorkersAndQueues = async (): Promise<void> => {
    if (process.env.RUN_INLINE_WORKERS !== 'false') {
      await Promise.allSettled([
        audioProcessingWorker.close(),
        aiEvaluationWorker.close(),
        flagAnalysisWorker.close(),
        retentionWorker.close(),
        reportWorker.close(),
      ]);
    }
    await Promise.allSettled([
      audioProcessingQueue.close(),
      aiEvaluationQueue.close(),
      flagAnalysisQueue.close(),
      retentionQueue.close(),
      reportQueue.close(),
    ]);
  };

  const shutdown = (signal: string): void => {
    logger.warn(`Received ${signal}. Initiating graceful shutdown...`);

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error during HTTP server close');
      } else {
        logger.info('HTTP server closed — no new requests accepted.');
      }

      try {
        await closeWorkersAndQueues();
        logger.info('BullMQ workers and queues closed. Process exiting.');
      } catch (closeErr: any) {
        logger.error({ err: closeErr?.message }, 'Error while closing workers/queues');
      }
      process.exit(err ? 1 : 0);
    });

    // Force exit if graceful shutdown takes too long. In-flight AI jobs can
    // legitimately run for tens of seconds, so allow a real drain window.
    setTimeout(() => {
      logger.error('Forceful shutdown triggered after 30s timeout.');
      process.exit(1);
    }, 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught Exception detected! Initiating emergency shutdown.');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled Promise Rejection detected! Initiating emergency shutdown.');
    process.exit(1);
  });

  return server;
}
