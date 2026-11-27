import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number between 1 and 65535',
    })
    .default('3000'),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z.string().default('*'),
  TRUST_PROXY: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  BODY_SIZE_LIMIT: z.string().default('10mb'),
  REQUIRE_TENANT_AUTH: z.string().transform((val) => val === 'true' || val === '1').default(process.env.NODE_ENV === 'production' ? 'true' : 'false'),

  // Supabase Platform Infrastructure
  SUPABASE_URL: z.string().url().default('https://xyz.supabase.co'),
  SUPABASE_PUBLISHABLE_KEY: z.string().default(process.env.SUPABASE_ANON_KEY || 'sample_publishable_key'),
  SUPABASE_SECRET_KEY: z.string().default(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'sample_secret_key'),
  DATABASE_URL: z.string().optional(),

  // Integration Services Configuration
  ASSEMBLYAI_API_KEY: z.string().default('sample_assemblyai_key'),
  ASSEMBLYAI_FALLBACK_API_KEYS: z.string().optional(),
  GEMINI_API_KEY: z.string().default(process.env.GOOGLE_API_KEY || 'sample_gemini_key'),
  GEMINI_FALLBACK_API_KEYS: z.string().optional(),
  KNOWLARITY_WEBHOOK_SECRET: z.string().default('sample_knowlarity_secret'),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  RUN_INLINE_WORKERS: z.string().transform((val) => val !== 'false').default('true'),
  RAZORPAY_KEY_ID: z.string().default('sample_razorpay_key_id'),
  RAZORPAY_KEY_SECRET: z.string().default('sample_razorpay_key_secret'),

  // PayU Payment Gateway Configuration
  PAYU_MERCHANT_KEY: z.string().default(process.env.PAYU_MERCHANT_KEY || '4oEfiS'),
  PAYU_SALT: z.string().default(process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || 'OquTGAxW4hVnBxTb8lBVjMQeHU37qMcc'),
  PAYU_MODE: z.enum(['test', 'production']).default('production'),
  PAYU_SUCCESS_URL: z.string().optional(),
  PAYU_FAILURE_URL: z.string().optional(),

  // Dual AI / LLM Providers (Primary Gemini, Secondary Fallback OpenRouter)
  OPENROUTER_API_KEY: z.string().default(process.env.OPENROUTER_API_KEY || ''),
  OPENROUTER_MODEL: z.string().default(process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'),

  // Cloudflare D1 and R2 Edge Infrastructure
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_D1_DATABASE_ID: z.string().optional(),
  CLOUDFLARE_D1_WORKER_URL: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().default('auditai-recordings-storage'),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),
  JWT_SECRET: z.string().default('auditai_enterprise_jwt_super_secret_key_2026'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid Environment Variables Configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
