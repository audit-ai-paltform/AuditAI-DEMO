import { supabaseAdminClient } from '../core/config/supabase.admin.js';
import { logger } from '../core/config/logger.config.js';
import { syncAllAgentsTenure } from '../modules/calls/calls.repository.js';

export const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Default QA parameters.
 *
 * Retained deliberately: these are tenant *configuration* (editable in the
 * Audit Parameters screen), not audit records, and the scoring worker refuses
 * to run when a tenant has no enabled parameters. They are only inserted when
 * the tenant has none — never overwritten, never merged into existing config.
 *
 * Agents are NOT seeded. Agent records are business data owned by the tenant
 * and must be created through Agent Mapping; the platform never invents them.
 */
export const DEFAULT_PARAMETERS = [
  { name: 'Greeting', weight: 10, enabled: true, ai_suggested: false },
  { name: 'Verification', weight: 15, enabled: true, ai_suggested: false },
  { name: 'Need Analysis', weight: 15, enabled: true, ai_suggested: false },
  { name: 'Communication', weight: 20, enabled: true, ai_suggested: false },
  { name: 'Product Knowledge', weight: 15, enabled: true, ai_suggested: false },
  { name: 'Compliance', weight: 15, enabled: true, ai_suggested: false },
  { name: 'Closing', weight: 10, enabled: true, ai_suggested: false },
];

export async function seedDatabase(): Promise<void> {
  try {
    logger.info('[Seeder] Initializing database seed for AuditAI platform...');

    // 1. Ensure Default Client
    const { data: existingClient } = await supabaseAdminClient
      .from('clients')
      .select('id')
      .eq('id', DEFAULT_CLIENT_ID)
      .maybeSingle();

    if (!existingClient) {
      await supabaseAdminClient.from('clients').insert({
        id: DEFAULT_CLIENT_ID,
        name: 'Health Insurance Enterprise Client',
        email: 'insurance-admin@auditai.io',
        plan: 'enterprise',
        call_limit: 50000,
      });
      logger.info(`[Seeder] Seeded default client (${DEFAULT_CLIENT_ID})`);
    }

    // 2. Ensure Parameters (7 default parameters summing to 100%) — only for a
    //    tenant that has none. Real audit data (agents, calls, scores, flags,
    //    transcripts) is never seeded.
    const { data: existingParams } = await supabaseAdminClient
      .from('parameters')
      .select('id')
      .eq('client_id', DEFAULT_CLIENT_ID);

    if (!existingParams || existingParams.length === 0) {
      for (const p of DEFAULT_PARAMETERS) {
        await supabaseAdminClient.from('parameters').insert({
          client_id: DEFAULT_CLIENT_ID,
          name: p.name,
          weight: p.weight,
          enabled: p.enabled,
          ai_suggested: p.ai_suggested,
        });
      }
      logger.info('[Seeder] Seeded 7 default QA evaluation parameters.');
    }

    // 3. Sync total call duration minutes for all agents
    try {
      await syncAllAgentsTenure();
      logger.info('[Seeder] Synced agent total call minutes into agents database table.');
    } catch (e: any) {
      logger.warn({ err: e?.message }, '[Seeder] Agent tenure sync notice');
    }

    logger.info('[Seeder] Database seeding completed successfully.');
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Seeder] Seeding notice');
  }
}
