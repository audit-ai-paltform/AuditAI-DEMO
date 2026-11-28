import { Server } from 'node:http';
import { createExpressApp } from '../http/express.app.js';
import { startServer } from './server.bootstrap.js';
import { logger } from '../config/logger.config.js';
import { seedDatabase } from '../../database/seed.js';
import { EmailService } from '../../modules/email/email.service.js';
import { agentService } from '../../modules/agents/agents.service.js';
import '../../workers/index.js';

export function bootstrapApp(): Server {
  const inlineWorkers = process.env.RUN_INLINE_WORKERS !== 'false';
  logger.info(`Initializing AuditAI Backend Core Infrastructure (Inline workers: ${inlineWorkers})...`);
  seedDatabase().catch((err) => {
    logger.warn({ err: err.message }, '[Bootstrap] Seeding error notice');
  });
  EmailService.startDailyReportScheduler();
  // Periodic 24-48h agent inactivity auto-disable sweep (every 60 mins)
  setInterval(() => {
    if (agentService.getInactivityConfig().enabled) {
      agentService.runInactivitySweep().catch(() => {});
    }
  }, 60 * 60 * 1000);
  const app = createExpressApp();
  return startServer(app);
}
