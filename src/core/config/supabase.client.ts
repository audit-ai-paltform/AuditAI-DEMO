import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.config.js';
import { logger } from './logger.config.js';

class SupabaseClientSingleton {
  private static instance: SupabaseClient | null = null;

  public static getInstance(): SupabaseClient {
    if (!this.instance) {
      logger.info('Initializing Supabase Publishable Client Singleton...');
      this.instance = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      logger.info('Supabase Publishable Client connection established');
    }
    return this.instance;
  }
}

export const supabaseClient = SupabaseClientSingleton.getInstance();
