import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const tables = [
      'clients', 'agents', 'parameters', 'scripts', 'sop_versions', 'tenant_config',
      'tenant_memberships', 'tenant_integrations', 'tenant_retention_policies',
      'calls', 'call_evaluation_runs', 'call_processing_events', 'call_flags',
      'flag_events', 'notifications', 'webhook_events', 'daily_reports',
      'retention_deletion_events'
    ];
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT count(*) FROM public."${t}";`);
        console.log(`public.${t}: ${res.rows[0].count} rows`);
      } catch (e: any) {
        console.log(`public.${t}: table error (${e.message})`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

