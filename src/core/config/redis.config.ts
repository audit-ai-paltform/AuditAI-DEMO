import { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface RedisConfigInput {
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  NODE_ENV?: string;
}

/**
 * Builds validated Redis connection options for BullMQ queues and workers.
 *
 * Rules:
 * 1. Prefer REDIS_URL when configured (used by Render, Upstash, cloud Redis).
 * 2. Fall back to REDIS_HOST / REDIS_PORT / REDIS_PASSWORD for local development.
 * 3. Supports TLS when protocol is rediss://.
 * 4. Never exposes or logs raw passwords or credentials.
 * 5. maxRetriesPerRequest is set to null as required by BullMQ.
 */
export function buildRedisOptions(envOverride?: RedisConfigInput): RedisOptions {
  const envSource = envOverride || process.env;
  const rawUrl = envSource.REDIS_URL?.trim();

  if (rawUrl) {
    if (!rawUrl.startsWith('redis://') && !rawUrl.startsWith('rediss://')) {
      throw new Error('Invalid REDIS_URL protocol: must start with redis:// or rediss://');
    }

    try {
      const parsed = new URL(rawUrl);
      const isTls = parsed.protocol === 'rediss:';

      const port = parsed.port ? parseInt(parsed.port, 10) : (isTls ? 6380 : 6379);
      if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid port in REDIS_URL: must be between 1 and 65535');
      }

      return {
        host: parsed.hostname,
        port,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    } catch (err: any) {
      if (err.message?.includes('Invalid REDIS_URL') || err.message?.includes('Invalid port')) {
        throw err;
      }
      throw new Error(`Failed to parse REDIS_URL: ${err.message || 'Malformed URL format'}`);
    }
  }

  // Host / Port fallback for local development
  const host = envSource.REDIS_HOST?.trim() || '127.0.0.1';
  const rawPort = envSource.REDIS_PORT?.trim() || '6379';
  const port = parseInt(rawPort, 10);

  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid REDIS_PORT configuration: "${rawPort}" must be a number between 1 and 65535`);
  }

  const password = envSource.REDIS_PASSWORD?.trim() || undefined;

  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const redisConnectionOptions: ConnectionOptions = buildRedisOptions();
