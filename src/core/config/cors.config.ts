import { CorsOptions } from 'cors';
import { env } from './env.config.js';

function resolveOrigin(): boolean | string | RegExp | (string | RegExp)[] {
  if (env.CORS_ORIGIN === '*') return '*';
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  return origins;
}

export const corsOptions: CorsOptions = {
  origin: resolveOrigin(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-request-id',
    'x-tenant-id',
    'x-knowlarity-secret',
    'x-auditai-test-secret',
  ],
  exposedHeaders: ['x-request-id'],
  credentials: true,
  maxAge: 86400,
};
