import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const users = [
      { id: 'fe73847d-989a-47cc-8563-fdc2dc6ff314', role: 'OWNER' },
      { id: 'e0ec7d65-ca93-4a83-a8ef-78e9c0301e97', role: 'ADMIN' },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE';`,
        [tenantId, u.id, u.role]
      );
    }

    // Also grant service_role and authenticated permissions on tenant_memberships and call_evaluation_runs
    await client.query(`
      GRANT ALL ON public.tenant_memberships TO authenticated;
      GRANT ALL ON public.tenant_memberships TO service_role;
      GRANT ALL ON public.call_evaluation_runs TO authenticated;
      GRANT ALL ON public.call_evaluation_runs TO service_role;
      GRANT ALL ON public.daily_reports TO authenticated;
      GRANT ALL ON public.daily_reports TO service_role;
      GRANT ALL ON public.tenant_integrations TO authenticated;
      GRANT ALL ON public.tenant_integrations TO service_role;
      GRANT ALL ON public.tenant_retention_policies TO authenticated;
      GRANT ALL ON public.tenant_retention_policies TO service_role;
    `);

    const res = await client.query('SELECT * FROM public.tenant_memberships');
    console.log('✅ Active Memberships:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

