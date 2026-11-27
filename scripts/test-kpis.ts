import dotenv from 'dotenv';
dotenv.config();
import { dashboardService } from '../src/modules/dashboard/dashboard.service.js';
import { supabaseAdminClient } from '../src/core/config/supabase.admin.js';

async function main() {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  console.log('Testing dashboardService.getKpis for tenant:', tenantId);
  
  const { data: calls } = await supabaseAdminClient
    .from('calls')
    .select('id, client_id, score, status, created_at, sop_version_id, agent_id');
  console.log('All calls in DB:', JSON.stringify(calls, null, 2));

  const kpis7 = await dashboardService.getKpis(tenantId, 7);
  console.log('7 days KPIs:', kpis7);

  const kpis14 = await dashboardService.getKpis(tenantId, 14);
  console.log('14 days KPIs:', kpis14);

  const kpis30 = await dashboardService.getKpis(tenantId, 30);
  console.log('30 days KPIs:', kpis30);
}

main().catch(console.error);

