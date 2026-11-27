import { Server } from 'node:http';
import { createExpressApp } from '../http/express.app.js';
import { startServer } from './server.bootstrap.js';
import { logger } from '../config/logger.config.js';
import { seedDatabase } from '../../database/seed.js';
import '../../workers/index.js';

export function bootstrapApp(): Server {
  const inlineWorkers = process.env.RUN_INLINE_WORKERS !== 'false';
  logger.info(`Initializing AuditAI Backend Core Infrastructure (Inline workers: ${inlineWorkers})...`);
  seedDatabase().catch((err) => {
    logger.warn({ err: err.message }, '[Bootstrap] Seeding error notice');
  });
  const app = createExpressApp();
  return startServer(app);
}
