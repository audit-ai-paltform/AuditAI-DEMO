import crypto from 'node:crypto';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { createReportPdf } from './pdf.js';

const pending = new Set(['RECEIVED', 'QUEUED', 'DOWNLOADING', 'UPLOADING', 'TRANSCRIBING', 'TRANSCRIBED', 'AI_SCORING', 'RETRYING']);

function parts(date: Date, timezone: string): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}
/** Converts an IANA-local midnight to a UTC instant, including DST offset changes. */
export function businessDayBounds(date: string, timezone: string): { start: string; end: string } {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) throw new Error('Business date must be YYYY-MM-DD');
  const midnight = (d: number) => {
    let guess = Date.UTC(year, month - 1, d);
    for (let i = 0; i < 3; i++) {
      const local = parts(new Date(guess), timezone);
      const actual = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second));
      guess += Date.UTC(year, month - 1, d) - actual;
    }
    return new Date(guess).toISOString();
  };
  const next = new Date(Date.UTC(year, month - 1, day) + 86_400_000); const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  const [ny, nm, nd] = nextDate.split('-').map(Number);
  const original = [year, month, day];
  // keep function calculation single-source; temporary rebind avoiding locale parsing ambiguity.
  const endGuess = Date.UTC(ny!, nm! - 1, nd!); let adjusted = endGuess;
  for (let i = 0; i < 3; i++) { const local = parts(new Date(adjusted), timezone); const actual = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second)); adjusted += endGuess - actual; }
  void original;
  return { start: midnight(day), end: new Date(adjusted).toISOString() };
}

function durationSeconds(value: string | null): number | null {
  if (!value) return null; const values = value.split(':').map(Number);
  if (values.some(Number.isNaN)) return null;
  if (values.length === 2) return values[0]! * 60 + values[1]!;
  if (values.length === 3) return values[0]! * 3600 + values[1]! * 60 + values[2]!;
  return Number(value) || null;
}

export class ReportsService {
  /** Queues each tenant's preceding completed business day. Safe to run hourly; unique tenant/date records deduplicate it. */
  public async queueCompletedBusinessDays(): Promise<string[]> {
    const { data: policies, error } = await supabaseAdminClient.from('tenant_retention_policies').select('tenant_id,business_timezone');
    if (error) throw new Error('Unable to load report schedules');
    const reportIds: string[] = [];
    for (const policy of policies ?? []) {
      const local = parts(new Date(Date.now() - 86_400_000), policy.business_timezone || 'UTC');
      const date = `${local.year}-${local.month}-${local.day}`;
      const report = await this.createOrGet(policy.tenant_id, date, policy.business_timezone || 'UTC');
      if (report.status !== 'READY') reportIds.push(report.id as string);
    }
    return reportIds;
  }
  public async createOrGet(tenantId: string, businessDate: string, timezone: string): Promise<Record<string, unknown>> {
    businessDayBounds(businessDate, timezone);
    const { data, error } = await supabaseAdminClient.from('daily_reports').upsert({ tenant_id: tenantId, business_date: businessDate, timezone, status: 'QUEUED' }, { onConflict: 'tenant_id,business_date', ignoreDuplicates: true }).select('*').single();
    if (data) return data;
    const existing = await supabaseAdminClient.from('daily_reports').select('*').eq('tenant_id', tenantId).eq('business_date', businessDate).single();
    if (existing.error || !existing.data) throw new Error(error?.message || 'Unable to create report');
    return existing.data;
  }

  public async list(tenantId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabaseAdminClient.from('daily_reports').select('id,business_date,timezone,status,generated_at,report_delete_at,failure_reason').eq('tenant_id', tenantId).order('business_date', { ascending: false });
    if (error) throw new Error('Unable to list reports'); return data ?? [];
  }

  public async generate(reportId: string): Promise<void> {
    const { data: report, error } = await supabaseAdminClient.from('daily_reports').select('*').eq('id', reportId).single();
    if (error || !report) throw new Error('Report not found');
    await supabaseAdminClient.from('daily_reports').update({ status: 'GENERATING', generation_attempts: (report.generation_attempts ?? 0) + 1 }).eq('id', reportId);
    try {
      const bounds = businessDayBounds(report.business_date, report.timezone);
      const { data: calls, error: callsError } = await supabaseAdminClient.from('calls').select('id,agent_id,status,score,duration,parameter_scores,sop_version_id').eq('client_id', report.tenant_id).gte('created_at', bounds.start).lt('created_at', bounds.end);
      if (callsError) throw callsError;
      const rows = calls ?? []; const ids = rows.map((row) => row.id);
      const { data: flags, error: flagsError } = ids.length ? await supabaseAdminClient.from('call_flags').select('call_id,severity,status,title,category,evidence,evidence_start_time,resolution_note,resolved_by').eq('tenant_id', report.tenant_id).in('call_id', ids) : { data: [], error: null };
      if (flagsError) throw flagsError;
      const completed = rows.filter((call) => call.status === 'COMPLETED'); const failed = rows.filter((call) => call.status === 'FAILED'); const incomplete = rows.filter((call) => pending.has(call.status));
      const durations = completed.map((call) => durationSeconds(call.duration)).filter((value): value is number => value !== null);
      const agent = new Map<string, { calls: number; scored: number[]; duration: number; critical: number }>();
      rows.forEach((call) => { const key = call.agent_id || 'Unassigned'; const aggregate = agent.get(key) ?? { calls: 0, scored: [], duration: 0, critical: 0 }; aggregate.calls++; if (call.status === 'COMPLETED' && typeof call.score === 'number') aggregate.scored.push(call.score); const seconds = durationSeconds(call.duration); if (seconds !== null) aggregate.duration += seconds; agent.set(key, aggregate); });
      (flags ?? []).forEach((flag) => { if (flag.severity === 'CRITICAL') { const call = rows.find((item) => item.id === flag.call_id); const key = call?.agent_id || 'Unassigned'; const aggregate = agent.get(key); if (aggregate) aggregate.critical++; } });
      const snapshot = { bounds, total_calls: rows.length, completed: completed.length, failed: failed.length, incomplete: incomplete.length, average_score: completed.filter((c) => typeof c.score === 'number').length ? completed.reduce((sum, c) => sum + (c.score ?? 0), 0) / completed.filter((c) => typeof c.score === 'number').length : null, total_duration_seconds: durations.reduce((sum, value) => sum + value, 0), duration_coverage_calls: durations.length, agents: [...agent.entries()].map(([id, value]) => ({ agent_id: id, calls: value.calls, average_score: value.scored.length ? value.scored.reduce((sum, score) => sum + score, 0) / value.scored.length : null, duration_seconds: value.duration, critical_issues: value.critical })), critical_flags: (flags ?? []).filter((flag) => flag.severity === 'CRITICAL' || flag.severity === 'HIGH').map((flag) => ({ severity: flag.severity, status: flag.status, title: flag.title, category: flag.category, evidence: flag.evidence, evidence_start_time: flag.evidence_start_time, resolution_note: flag.resolution_note, resolved_by: flag.resolved_by })), generated_at: new Date().toISOString() };
      const pdf = createReportPdf(`AuditAI Daily Call Audit Report — ${report.business_date}`, [
        { heading: 'Executive summary', lines: [`Timezone: ${report.timezone}`, `Total calls: ${snapshot.total_calls}; completed: ${snapshot.completed}; failed: ${snapshot.failed}; incomplete/pending: ${snapshot.incomplete}`, `Average audit score (completed scored calls only): ${snapshot.average_score === null ? 'not available' : `${snapshot.average_score.toFixed(1)} / 100`}`, `Conversation duration: ${snapshot.total_duration_seconds}s across ${snapshot.duration_coverage_calls} completed calls with durations.`] },
        { heading: 'Agent performance', lines: snapshot.agents.map((item) => `${item.agent_id}: ${item.calls} calls; score ${item.average_score === null ? 'n/a' : item.average_score.toFixed(1)}; duration ${item.duration_seconds}s; critical/high issues ${item.critical_issues}`) },
        { heading: 'Critical and high-risk evidence', lines: snapshot.critical_flags.length ? snapshot.critical_flags.map((item) => `${item.severity} ${item.category}: ${item.title}; status ${item.status}; evidence ${item.evidence || 'not captured'}; reviewer ${item.resolved_by || 'not assigned'}`) : ['No critical or high-risk flags persisted for this date.'] },
        { heading: 'Coverage and interpretation', lines: ['Scores are AI audit scores, not factual correctness or AI confidence.', 'Unanswered, unassigned, missing-duration and incomplete calls are shown separately and excluded from score/duration denominators.', 'A flag is only shown resolved when its persisted status and reviewer record say so.'] },
      ]);
      if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Generated report failed PDF validation');
      const storageKey = `${report.tenant_id}/${report.id}.pdf`; const upload = await supabaseAdminClient.storage.from('reports').upload(storageKey, pdf, { contentType: 'application/pdf', upsert: true });
      if (upload.error) throw upload.error;
      const policy = await supabaseAdminClient.from('tenant_retention_policies').select('reports_days').eq('tenant_id', report.tenant_id).maybeSingle();
      const deletion = new Date(Date.now() + (policy.data?.reports_days ?? 365) * 86_400_000).toISOString();
      await supabaseAdminClient.from('daily_reports').update({ status: 'READY', snapshot, storage_key: storageKey, checksum: crypto.createHash('sha256').update(pdf).digest('hex'), generated_at: new Date().toISOString(), report_delete_at: deletion, failure_reason: null }).eq('id', reportId).eq('tenant_id', report.tenant_id);
    } catch (failure) { await supabaseAdminClient.from('daily_reports').update({ status: 'FAILED', failure_reason: failure instanceof Error ? failure.message.slice(0, 240) : 'generation failed' }).eq('id', reportId); throw failure; }
  }

  public async download(tenantId: string, reportId: string): Promise<string> {
    const { data, error } = await supabaseAdminClient.from('daily_reports').select('storage_key,status').eq('id', reportId).eq('tenant_id', tenantId).eq('status', 'READY').single();
    if (error || !data?.storage_key) throw new Error('Report not found');
    const signed = await supabaseAdminClient.storage.from('reports').createSignedUrl(data.storage_key, 300);
    if (signed.error || !signed.data.signedUrl) throw new Error('Unable to create download link'); return signed.data.signedUrl;
  }
}
export const reportsService = new ReportsService();
