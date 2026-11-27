import { supabaseAdminClient } from '../core/config/supabase.admin.js';
import { logger } from '../core/config/logger.config.js';

export interface ComponentHealthStatus {
  connected: boolean;
  latencyMs: number;
  message: string;
}

export interface InfrastructureHealthResult {
  healthy: boolean;
  database: ComponentHealthStatus;
  storage: ComponentHealthStatus;
  realtime: ComponentHealthStatus;
}

export class DatabaseHealthChecker {
  /**
   * Verifies Database probe connection.
   */
  public static async checkDatabase(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    try {
      const { error } = await supabaseAdminClient.from('clients').select('id').limit(1);
      const latencyMs = Date.now() - startTime;

      if (error) {
        logger.error({ error, latencyMs }, 'Database health check probe failed');
        return {
          connected: false,
          latencyMs,
          message: `Database query error: ${error.message}`,
        };
      }

      logger.debug({ latencyMs }, 'Database health check probe succeeded');
      return {
        connected: true,
        latencyMs,
        message: 'Database connection healthy',
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown database error';
      logger.error({ err, latencyMs }, 'Database probe exception');
      return {
        connected: false,
        latencyMs,
        message: `Database exception: ${message}`,
      };
    }
  }

  /**
   * Verifies Storage subsystem probe connection (checks 'recordings' bucket).
   */
  public static async checkStorage(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    try {
      const { data, error } = await supabaseAdminClient.storage.getBucket('recordings');
      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        logger.error({ error, latencyMs }, 'Storage health check probe failed');
        return {
          connected: false,
          latencyMs,
          message: `Storage bucket error: ${error?.message || 'Bucket recordings not found'}`,
        };
      }

      logger.debug({ latencyMs, bucket: data.name }, 'Storage health check probe succeeded');
      return {
        connected: true,
        latencyMs,
        message: `Storage bucket '${data.name}' available`,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown storage error';
      logger.error({ err, latencyMs }, 'Storage probe exception');
      return {
        connected: false,
        latencyMs,
        message: `Storage exception: ${message}`,
      };
    }
  }

  /**
   * Verifies Realtime engine subsystem probe.
   */
  public static async checkRealtime(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    try {
      const channel = supabaseAdminClient.channel('health_check_probe');
      const latencyMs = Date.now() - startTime;

      if (!channel) {
        logger.error({ latencyMs }, 'Realtime channel creation probe failed');
        return {
          connected: false,
          latencyMs,
          message: 'Realtime channel initialization failed',
        };
      }

      // Cleanup probe channel
      await supabaseAdminClient.removeChannel(channel);

      logger.debug({ latencyMs }, 'Realtime engine probe succeeded');
      return {
        connected: true,
        latencyMs,
        message: 'Realtime engine status healthy',
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown realtime error';
      logger.error({ err, latencyMs }, 'Realtime probe exception');
      return {
        connected: false,
        latencyMs,
        message: `Realtime exception: ${message}`,
      };
    }
  }

  /**
   * Complete Infrastructure Health Audit (Database, Storage, Realtime).
   */
  public static async checkFullInfrastructure(): Promise<InfrastructureHealthResult> {
    const [database, storage, realtime] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkRealtime(),
    ]);

    const healthy = database.connected && storage.connected && realtime.connected;

    if (healthy) {
      logger.info('Infrastructure health check audit passed [DB: OK, Storage: OK, Realtime: OK]');
    } else {
      logger.warn({ database, storage, realtime }, 'Infrastructure health check audit failed');
    }

    return {
      healthy,
      database,
      storage,
      realtime,
    };
  }
}
