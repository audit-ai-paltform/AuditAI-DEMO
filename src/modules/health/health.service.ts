import { env } from '../../core/config/env.config.js';
import { HealthStatus, ReadinessStatus } from '../../common/types/index.js';
import { DatabaseHealthChecker } from '../../database/health.js';

export class HealthService {
  public getLiveStatus(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    };
  }

  public async getReadyStatus(): Promise<ReadinessStatus> {
    const infraHealth = await DatabaseHealthChecker.checkFullInfrastructure();

    return {
      status: infraHealth.healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      services: {
        system: infraHealth.healthy ? 'up' : 'down',
        database: infraHealth.database.connected ? 'up' : 'down',
        databaseLatencyMs: infraHealth.database.latencyMs,
        storage: infraHealth.storage.connected ? 'up' : 'down',
        realtime: infraHealth.realtime.connected ? 'up' : 'down',
      },
    };
  }
}

export const healthService = new HealthService();
