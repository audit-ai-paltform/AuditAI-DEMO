import { supabaseAdminClient as db } from '../src/core/config/supabase.admin.js';
const T = '00000000-0000-0000-0000-000000000001';
function line(t: string, op: string, err: any) { console.log(`${t.padEnd(24)} ${op.padEnd(7)} ${err ? 'FAIL: ' + (err.message||err).slice(0,70) : 'PASS'}`); }
async function main() {
  const seven = ['tenant_config','sop_versions','webhook_events','call_processing_events','call_flags','flag_events','notifications'];
  // SELECT on all seven
  for (const t of seven) { const { error } = await db.from(t).select('*', { head: true, count: 'exact' }); line(t,'SELECT',error); }
  console.log('---');
  // webhook_events full CRUD (no FKs, safe)
  const ek = `probe-${Date.now()}`;
  let r = await db.from('webhook_events').insert({ provider:'probe', event_key:ek, client_id:T, payload:{probe:true} }).select('id').single();
  line('webhook_events','INSERT', r.error);
  const id = r.data?.id;
  if (id) {
    r = await db.from('webhook_events').update({ payload:{probe:'updated'} }).eq('id', id).select('id').single() as any; line('webhook_events','UPDATE', r.error);
    const d = await db.from('webhook_events').delete().eq('id', id); line('webhook_events','DELETE', d.error);
  }
  console.log('---');
  // tenant_config UPDATE round-trip (toggle a boolean back to itself)
  const cfg = await db.from('tenant_config').select('client_id, medium_notify').eq('client_id', T).maybeSingle();
  if (cfg.data) {
    const cur = (cfg.data as any).medium_notify;
    const u = await db.from('tenant_config').update({ medium_notify: cur }).eq('client_id', T).select('client_id').single() as any;
    line('tenant_config','UPDATE', u.error);
  } else line('tenant_config','UPDATE','(no config row to update)');
}
main().then(()=>process.exit(0));
