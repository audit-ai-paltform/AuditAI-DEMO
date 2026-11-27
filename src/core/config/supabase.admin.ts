import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.config.js';
import { logger } from './logger.config.js';

class SupabaseAdminSingleton {
  private static instance: SupabaseClient | null = null;

  public static getInstance(): SupabaseClient {
    if (!this.instance) {
      logger.info('Initializing Supabase Admin Client Singleton (Secret Key)...');
      this.instance = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      logger.info('Supabase Admin Client connection established');
    }
    return this.instance;
  }
}

export const supabaseAdminClient = SupabaseAdminSingleton.getInstance();
