import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdminClient } from '../src/core/config/supabase.admin.js';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Inspecting exact tables and details...');
  const tables = [
    'calls',
    'call_processing_events',
    'call_flags',
    'flag_events',
    'notifications',
    'webhook_events',
    'call_evaluation_runs',
    'daily_reports',
    'tenant_memberships',
    'tenant_integrations',
    'tenant_retention_policies',
  ];

  for (const t of tables) {
    const { data, count, error } = await supabaseAdminClient
      .from(t)
      .select('*', { count: 'exact' });
    if (error) {
      console.log(`Table "${t}": Error (${error.code || ''}): ${error.message}`);
    } else {
      console.log(`Table "${t}": ${count} rows`);
    }
  }

  // Check recordings bucket
  const { data: recList, error: recErr } = await supabaseAdminClient.storage.from('recordings').list();
  console.log('\nRecordings bucket files:', recErr ? recErr.message : JSON.stringify(recList, null, 2));

  // If there are folders like tenant id:
  if (recList && recList.length > 0) {
    for (const item of recList) {
      if (!item.id) {
        // It's a folder/prefix
        const { data: subList } = await supabaseAdminClient.storage.from('recordings').list(item.name);
        console.log(`Subfolder "${item.name}":`, subList?.length, 'files');
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
