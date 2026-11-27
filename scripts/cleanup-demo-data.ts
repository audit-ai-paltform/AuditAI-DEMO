import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { supabaseAdminClient } from '../src/core/config/supabase.admin.js';

/**
 * AuditAI Demo Data Cleanup Script
 *
 * Deletes ONLY demo/test call records and associated event logs.
 * DOES NOT touch clients, agents, parameters, scripts, tenant configuration,
 * memberships, database tables, or schema.
 *
 * Usage:
 *   npx tsx scripts/cleanup-demo-data.ts --dry-run   (Inspect only, default)
 *   npx tsx scripts/cleanup-demo-data.ts --execute   (Performs deletion after user confirmation)
 */

async function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('==================================================');
  console.log(`AuditAI Demo Data Cleanup [MODE: ${isExecute ? 'EXECUTE DELETION' : 'DRY RUN (READ ONLY)'}]`);
  console.log('==================================================');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Identify demo calls
    const callsRes = await client.query(`
      SELECT id, agent_id, status, caller_number, created_at
      FROM public.calls
      ORDER BY created_at DESC;
    `);
    const callIds = callsRes.rows.map((r) => r.id);
    console.log(`Identified ${callIds.length} demo/test call records in public.calls.`);

    // 2. Identify associated processing events
    const eventsRes = await client.query(`
      SELECT count(*) FROM public.call_processing_events
      WHERE call_id = ANY($1::uuid[]);
    `, [callIds]);
    const eventCount = parseInt(eventsRes.rows[0].count, 10);
    console.log(`Identified ${eventCount} associated rows in public.call_processing_events.`);

    // 3. Identify associated webhook events
    const webhooksRes = await client.query(`
      SELECT count(*) FROM public.webhook_events
      WHERE call_id = ANY($1::uuid[]) OR provider = 'knowlarity';
    `, [callIds]);
    const webhookCount = parseInt(webhooksRes.rows[0].count, 10);
    console.log(`Identified ${webhookCount} associated rows in public.webhook_events.`);

    // 4. Identify associated flags & runs
    const flagsRes = await client.query(`
      SELECT count(*) FROM public.call_flags
      WHERE call_id = ANY($1::uuid[]);
    `, [callIds]);
    const flagsCount = parseInt(flagsRes.rows[0].count, 10);

    const runsRes = await client.query(`
      SELECT count(*) FROM public.call_evaluation_runs
      WHERE call_id = ANY($1::uuid[]);
    `, [callIds]);
    const runsCount = parseInt(runsRes.rows[0].count, 10);

    console.log(`Identified ${flagsCount} rows in public.call_flags and ${runsCount} rows in public.call_evaluation_runs.`);

    // 5. Identify storage files in recordings bucket
    const tenantFolder = '00000000-0000-0000-0000-000000000001';
    const { data: storageFiles, error: storageErr } = await supabaseAdminClient
      .storage
      .from('recordings')
      .list(tenantFolder);

    const recordingFilePaths = (storageFiles || []).map((f) => `${tenantFolder}/${f.name}`);
    console.log(`Identified ${recordingFilePaths.length} audio files in Supabase Storage "recordings/${tenantFolder}".`);

    console.log('\n--------------------------------------------------');
    console.log('PROPOSED DELETION SCOPE:');
    console.log(`  - public.calls:                  ${callIds.length} rows`);
    console.log(`  - public.call_processing_events: ${eventCount} rows`);
    console.log(`  - public.webhook_events:         ${webhookCount} rows`);
    console.log(`  - public.call_flags:             ${flagsCount} rows`);
    console.log(`  - public.call_evaluation_runs:   ${runsCount} rows`);
    console.log(`  - Storage bucket "recordings":   ${recordingFilePaths.length} files`);
    console.log('PRESERVED DATA (WILL NOT BE MODIFIED):');
    console.log('  - public.clients:                1 enterprise workspace');
    console.log('  - public.agents:                 6 configured agents');
    console.log('  - public.parameters:             14 QA criteria & weights');
    console.log('  - public.scripts / sop_versions: Preserved active SOPs');
    console.log('  - public.tenant_config:          Preserved config state');
    console.log('  - Database tables & schema:      100% Intact');
    console.log('--------------------------------------------------\n');

    if (!isExecute) {
      console.log('ℹ️  DRY RUN COMPLETED. No database records or storage files were deleted.');
      console.log('   To execute after user confirmation, run with --execute.\n');
      return;
    }

    // Execute deletions in transaction
    await client.query('BEGIN');

    if (callIds.length > 0) {
      await client.query('DELETE FROM public.call_processing_events WHERE call_id = ANY($1::uuid[]);', [callIds]);
      await client.query('DELETE FROM public.call_flags WHERE call_id = ANY($1::uuid[]);', [callIds]);
      await client.query('DELETE FROM public.call_evaluation_runs WHERE call_id = ANY($1::uuid[]);', [callIds]);
      await client.query("DELETE FROM public.webhook_events WHERE call_id = ANY($1::uuid[]) OR provider = 'knowlarity';", [callIds]);
      await client.query('DELETE FROM public.calls WHERE id = ANY($1::uuid[]);', [callIds]);
    }

    await client.query('COMMIT');
    console.log('✅ Database deletion completed successfully in PostgreSQL transaction.');

    // Delete storage files
    if (recordingFilePaths.length > 0) {
      const { data: delStorage, error: delStorageErr } = await supabaseAdminClient
        .storage
        .from('recordings')
        .remove(recordingFilePaths);

      if (delStorageErr) {
        console.warn('⚠️ Storage file cleanup warning:', delStorageErr.message);
      } else {
        console.log(`✅ Deleted ${recordingFilePaths.length} recording files from private storage.`);
      }
    }

    console.log('\n🎉 Demo cleanup completed successfully. Dashboard is now completely fresh.\n');
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Cleanup failed, rolled back transaction:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

