import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { flagRepository } from '../flags/flags.repository.js';

export interface DashboardKpis {
  calls_audited: number;
  average_score: number;
  pending_review: number;
  failed_audits: number;
  critical_flags: number;
  high_flags: number;
  open_flags: number;
  confirmed_flags: number;
  dismissed_flags: number;
  misinformation_rate: number;
  customer_misunderstanding_rate: number;
  compliance_violation_rate: number;
  total_calls: number;
}

const MISINFORMATION_TYPES = [
  'AGENT_MISINFORMATION',
  'MEDICAL_INFORMATION_RISK',
  'WRONG_MEDICATION_INFORMATION',
  'WRONG_DOSAGE_INFORMATION',
  'INFORMATION_MISMATCH',
  'PRODUCT_INFORMATION_ERROR',
  'PRICING_ERROR',
];

const MISUNDERSTANDING_TYPES = [
  'CUSTOMER_INTENT_MISUNDERSTANDING',
  'CUSTOMER_FACT_MISUNDERSTOOD',
];

const PENDING_STATUSES = ['RECEIVED', 'QUEUED', 'DOWNLOADING', 'UPLOADING', 'TRANSCRIBING', 'TRANSCRIBED', 'AI_SCORING'];

/** Dashboard filter selections — applied server-side, not in the browser. */
export interface DashboardKpiFilters {
  agent_id?: string;
  process?: string;
}

/**
 * Dashboard KPI service — all metrics computed server-side with
 * aggregate queries. The frontend never derives KPIs from raw call
 * lists or mock data.
 */
export class DashboardService {
  public async getKpis(tenantId: string, days = 30, filters: DashboardKpiFilters = {}): Promise<DashboardKpis> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    // Process filter: a call belongs to a process through the SOP version
    // it was audited under. No SOP version for that process means the
    // filter legitimately matches nothing — never fall back to "all".
    let allowedSopVersionIds: string[] | null = null;
    if (filters.process) {
      const { data: versions, error: versionErr } = await supabaseAdminClient
        .from('sop_versions')
        .select('id')
        .eq('client_id', tenantId)
        .eq('process', filters.process);

      if (versionErr) throw new Error(`Dashboard process filter failed: ${versionErr.message}`);
      allowedSopVersionIds = (versions || []).map((v) => (v as { id: string }).id);
      if (allowedSopVersionIds.length === 0) {
        return {
          calls_audited: 0,
          average_score: 0,
          pending_review: 0,
          failed_audits: 0,
          critical_flags: 0,
          high_flags: 0,
          open_flags: 0,
          confirmed_flags: 0,
          dismissed_flags: 0,
          misinformation_rate: 0,
          customer_misunderstanding_rate: 0,
          compliance_violation_rate: 0,
          total_calls: 0,
        };
      }
    }

    // Call aggregates (single query)
    let callQuery = supabaseAdminClient
      .from('calls')
      .select('id, status, score')
      .eq('client_id', tenantId)
      .gte('created_at', cutoffIso);

    if (filters.agent_id) callQuery = callQuery.eq('agent_id', filters.agent_id);
    if (allowedSopVersionIds) callQuery = callQuery.in('sop_version_id', allowedSopVersionIds);

    const { data: callAgg, error: callErr } = await callQuery;

    if (callErr) throw new Error(`Dashboard call metrics failed: ${callErr.message}`);

    const calls = (callAgg || []) as Array<{ id: string; status: string; score: number | null }>;
    const totalCalls = calls.length;
    const audited = calls.filter((c) => c.status === 'COMPLETED');
    const avgScore = audited.length
      ? Math.round(audited.reduce((a, c) => a + (c.score || 0), 0) / audited.length)
      : 0;
    const pending = calls.filter((c) => PENDING_STATUSES.includes(c.status)).length;
    const failed = calls.filter((c) => c.status === 'FAILED' || (typeof c.score === 'number' && c.score < 60)).length;

    // Flag aggregates — scoped to the same filtered call set when a filter
    // is active so the numbers on screen always describe one population.
    const filterActive = Boolean(filters.agent_id || filters.process);
    const scopedCallIds = filterActive ? calls.map((c) => c.id) : undefined;
    const flagCounts = await flagRepository.getCounts(tenantId, scopedCallIds);
    const typeRates = await flagRepository.getTypeRates(tenantId, scopedCallIds);

    const misinformationCount = MISINFORMATION_TYPES.reduce((a, t) => a + (typeRates[t] || 0), 0);
    const misunderstandingCount = MISUNDERSTANDING_TYPES.reduce((a, t) => a + (typeRates[t] || 0), 0);
    const complianceCount = typeRates['COMPLIANCE_VIOLATION'] || 0;

    return {
      calls_audited: audited.length,
      average_score: avgScore,
      pending_review: pending,
      failed_audits: failed,
      critical_flags: flagCounts.critical,
      high_flags: flagCounts.high,
      open_flags: flagCounts.open,
      confirmed_flags: flagCounts.confirmed,
      dismissed_flags: flagCounts.dismissed,
      misinformation_rate: totalCalls ? Math.round((misinformationCount / totalCalls) * 1000) / 10 : 0,
      customer_misunderstanding_rate: totalCalls ? Math.round((misunderstandingCount / totalCalls) * 1000) / 10 : 0,
      compliance_violation_rate: totalCalls ? Math.round((complianceCount / totalCalls) * 1000) / 10 : 0,
      total_calls: totalCalls,
    };
  }

  /** Recent priority alerts for the dashboard Priority Alerts panel. */
  public async getRecentPriorityFlags(tenantId: string, limit = 10) {
    const { flagRepository } = await import('../flags/flags.repository.js');
    const result = await flagRepository.findAll({
      tenant_id: tenantId,
      limit,
      page: 1,
    });
    return result.flags;
  }
}

export const dashboardService = new DashboardService();
