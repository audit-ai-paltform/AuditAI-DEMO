import { Job, Worker } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';
import { supabaseAdminClient } from '../core/config/supabase.admin.js';
import { supabaseStorageProvider } from '../providers/storage/supabase-storage.provider.js';
import { logger } from '../core/config/logger.config.js';

const activeStatuses = new Set(['RECEIVED', 'QUEUED', 'DOWNLOADING', 'UPLOADING', 'TRANSCRIBING', 'TRANSCRIBED', 'AI_SCORING', 'RETRYING']);

/** Hourly, retry-safe cleanup. It only erases temporary call material, never billing/audit/account records. */
export const retentionWorker = new Worker(
  'retention-cleanup',
  async (_job: Job) => {
    const now = new Date().toISOString();
    const { data: reports } = await supabaseAdminClient.from('daily_reports').select('id,tenant_id,storage_key').lte('report_delete_at', now).eq('status', 'READY').limit(100);
    for (const report of reports ?? []) {
      try {
        if (report.storage_key?.startsWith(`${report.tenant_id}/`)) await supabaseAdminClient.storage.from('reports').remove([report.storage_key]);
        await supabaseAdminClient.from('daily_reports').update({ status: 'EXPIRED', storage_key: null }).eq('id', report.id).eq('tenant_id', report.tenant_id);
      } catch (error) {
        logger.warn({ reportId: report.id, tenantId: report.tenant_id }, 'Report retention cleanup failed; it will retry');
        throw error;
      }
    }
    const { data: calls, error } = await supabaseAdminClient
      .from('calls')
      .select('id,client_id,status,recording_path,created_at')
      .lte('temporary_data_delete_at', now)
      .is('deleted_at', null)
      .limit(100);
    if (error) throw new Error('Unable to load retention candidates');
    const tenantIds = [...new Set((calls ?? []).map((call) => call.client_id))];
    const [{ data: policies }, { data: readyReports }] = await Promise.all([
      supabaseAdminClient.from('tenant_retention_policies').select('tenant_id,business_timezone').in('tenant_id', tenantIds),
      supabaseAdminClient.from('daily_reports').select('tenant_id,business_date,status').in('tenant_id', tenantIds).eq('status', 'READY'),
    ]);
    const timezoneByTenant = new Map((policies ?? []).map((policy) => [policy.tenant_id, policy.business_timezone || 'UTC']));
    const reportKeys = new Set((readyReports ?? []).map((report) => `${report.tenant_id}:${report.business_date}`));
    for (const call of calls ?? []) {
      const base = { tenant_id: call.client_id, call_id: call.id, category: 'TEMPORARY_CALL_DATA' };
      if (activeStatuses.has(call.status)) {
        await supabaseAdminClient.from('retention_deletion_events').insert({ ...base, status: 'SKIPPED', reason: 'processing_incomplete' });
        continue;
      }
      const timezone = timezoneByTenant.get(call.client_id) || 'UTC';
      const businessDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date((call as { created_at?: string }).created_at || now)).reduce((date, part) => part.type === 'year' ? { ...date, year: part.value } : part.type === 'month' ? { ...date, month: part.value } : part.type === 'day' ? { ...date, day: part.value } : date, { year: '', month: '', day: '' });
      if (!reportKeys.has(`${call.client_id}:${businessDate.year}-${businessDate.month}-${businessDate.day}`)) {
        await supabaseAdminClient.from('retention_deletion_events').insert({ ...base, status: 'SKIPPED', reason: 'daily_report_not_ready' });
        continue;
      }
      try {
        // Only delete paths owned by this tenant. Provider URLs and signed URLs are never sent to storage.remove.
        if (typeof call.recording_path === 'string' && call.recording_path.startsWith(`${call.client_id}/`)) {
          await supabaseStorageProvider.delete(call.recording_path);
        }
        const { error: updateError } = await supabaseAdminClient.from('calls').update({
          transcript: [], flags: {}, parameter_scores: [], recording_path: null,
          deleted_at: now, retention_state: 'DELETED',
        }).eq('id', call.id).eq('client_id', call.client_id).is('deleted_at', null);
        if (updateError) throw updateError;
        await supabaseAdminClient.from('retention_deletion_events').insert({ ...base, status: 'COMPLETED' });
      } catch (error) {
        await supabaseAdminClient.from('retention_deletion_events').insert({ ...base, status: 'FAILED', reason: error instanceof Error ? error.message.slice(0, 240) : 'unknown failure' });
        logger.warn({ callId: call.id, tenantId: call.client_id }, 'Retention cleanup failed; job will retry safely');
        throw error;
      }
    }
  },
  { connection: redisConnectionOptions, concurrency: 1 },
);
