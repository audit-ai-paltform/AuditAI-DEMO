import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';
import {
  FlagEntity,
  FlagListResult,
  FlagCounts,
  FlagSeverity,
  FlagStatus,
  ResolutionType,
} from './flags.types.js';

export interface QueryFlagsDto {
  page?: number;
  limit?: number;
  tenant_id?: string;
  call_id?: string;
  agent_id?: string;
  severity?: FlagSeverity;
  status?: FlagStatus;
  flag_type?: string;
  min_confidence?: number;
  requires_manager_attention?: boolean;
}

export interface CreateFlagDto {
  tenant_id: string;
  call_id: string;
  agent_id?: string | null;
  flag_type: string;
  category: string;
  severity: FlagSeverity;
  status?: FlagStatus;
  confidence: number;
  confidence_level: string;
  title: string;
  description?: string;
  customer_statement?: string | null;
  agent_statement?: string | null;
  expected_information?: string | null;
  actual_information?: string | null;
  evidence?: string | null;
  evidence_start_time?: number | null;
  evidence_end_time?: number | null;
  transcript_segment_id?: string | null;
  parameter_id?: string | null;
  sop_version_id?: string | null;
  source?: string;
  ai_reasoning?: string | null;
  recommended_action?: string | null;
  requires_manager_attention?: boolean;
  dedup_key?: string | null;
}

export interface ResolveFlagDto {
  status: FlagStatus;
  resolution_type?: ResolutionType;
  resolution_note?: string;
  resolved_by?: string;
}

export class FlagRepository {
  private readonly tableName = 'call_flags';

  /**
   * Insert a flag. Tenant scope is always applied. When a dedup_key is
   * present the unique index (call_id, dedup_key) makes re-processing a
   * call idempotent — the insert resolves to null instead of duplicating.
   */
  public async create(dto: CreateFlagDto): Promise<FlagEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert({
        tenant_id: dto.tenant_id,
        call_id: dto.call_id,
        agent_id: dto.agent_id ?? null,
        flag_type: dto.flag_type,
        category: dto.category,
        severity: dto.severity,
        status: dto.status ?? 'OPEN',
        confidence: dto.confidence,
        confidence_level: dto.confidence_level,
        title: dto.title,
        description: dto.description ?? '',
        customer_statement: dto.customer_statement ?? null,
        agent_statement: dto.agent_statement ?? null,
        expected_information: dto.expected_information ?? null,
        actual_information: dto.actual_information ?? null,
        evidence: dto.evidence ?? null,
        evidence_start_time: dto.evidence_start_time ?? null,
        evidence_end_time: dto.evidence_end_time ?? null,
        transcript_segment_id: dto.transcript_segment_id ?? null,
        parameter_id: dto.parameter_id ?? null,
        sop_version_id: dto.sop_version_id ?? null,
        source: dto.source ?? 'AI_VERIFIED',
        ai_reasoning: dto.ai_reasoning ?? null,
        recommended_action: dto.recommended_action ?? null,
        requires_manager_attention: dto.requires_manager_attention ?? false,
        dedup_key: dto.dedup_key ?? null,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      // Unique dedup violation means the flag already exists — not an error.
      if (error.code === '23505') {
        logger.info({ call_id: dto.call_id, dedup_key: dto.dedup_key }, '[FlagRepository] Duplicate flag skipped (idempotent)');
        return null;
      }
      logger.error({ err: error.message, call_id: dto.call_id }, '[FlagRepository] Create failed');
      throw new Error(`Flag create failed: ${error.message}`);
    }
    return data as FlagEntity;
  }

  /** Always tenant-scoped. */
  public async findById(tenantId: string, id: string): Promise<FlagEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error.message }, '[FlagRepository] findById failed');
      throw new Error(`Flag lookup failed: ${error.message}`);
    }
    return data as FlagEntity | null;
  }

  public async findByCall(tenantId: string, callId: string): Promise<FlagEntity[]> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('call_id', callId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ err: error.message, callId }, '[FlagRepository] findByCall failed');
      throw new Error(`Flag lookup failed: ${error.message}`);
    }
    return (data || []) as FlagEntity[];
  }

  public async findAll(query: QueryFlagsDto): Promise<FlagListResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const from = (page - 1) * limit;

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', query.tenant_id);

    if (query.call_id) dbQuery = dbQuery.eq('call_id', query.call_id);
    if (query.agent_id) dbQuery = dbQuery.eq('agent_id', query.agent_id);
    if (query.severity) dbQuery = dbQuery.eq('severity', query.severity);
    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.flag_type) dbQuery = dbQuery.eq('flag_type', query.flag_type);
    if (query.min_confidence !== undefined) dbQuery = dbQuery.gte('confidence', query.min_confidence);
    if (query.requires_manager_attention) dbQuery = dbQuery.eq('requires_manager_attention', true);

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      logger.error({ err: error.message }, '[FlagRepository] findAll failed');
      throw new Error(`Flag query failed: ${error.message}`);
    }

    return {
      flags: (data || []) as FlagEntity[],
      total: count || 0,
      page,
      limit,
    };
  }

  public async updateStatus(tenantId: string, flagId: string, dto: ResolveFlagDto): Promise<FlagEntity | null> {
    const patch: Record<string, unknown> = { status: dto.status };
    if (dto.resolution_type) patch.resolution_type = dto.resolution_type;
    if (dto.resolution_note !== undefined) patch.resolution_note = dto.resolution_note;
    if (dto.resolved_by !== undefined) patch.resolved_by = dto.resolved_by;
    if (dto.status === 'CONFIRMED' || dto.status === 'DISMISSED' || dto.status === 'ESCALATED') {
      patch.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', flagId)
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error({ err: error.message, flagId }, '[FlagRepository] updateStatus failed');
      throw new Error(`Flag update failed: ${error.message}`);
    }
    return data as FlagEntity | null;
  }

  /** Aggregate severity/status counts for dashboard KPIs — single query. */
  public async getCounts(tenantId: string, callIds?: string[]): Promise<FlagCounts> {
    let query = supabaseAdminClient
      .from(this.tableName)
      .select('severity, status')
      .eq('tenant_id', tenantId);

    // Optional scoping so dashboard filters (agent / process) narrow the
    // flag metrics exactly like they narrow the call metrics.
    if (callIds) {
      if (callIds.length === 0) {
        return {
          critical: 0, high: 0, medium: 0, low: 0, info: 0,
          open: 0, confirmed: 0, dismissed: 0, escalated: 0, total: 0,
        };
      }
      query = query.in('call_id', callIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error.message }, '[FlagRepository] getCounts failed');
      throw new Error(`Flag counts failed: ${error.message}`);
    }

    const counts: FlagCounts = {
      critical: 0, high: 0, medium: 0, low: 0, info: 0,
      open: 0, confirmed: 0, dismissed: 0, escalated: 0, total: 0,
    };

    for (const row of data || []) {
      const f = row as { severity: FlagSeverity; status: FlagStatus };
      counts.total++;
      if (f.severity === 'CRITICAL') counts.critical++;
      else if (f.severity === 'HIGH') counts.high++;
      else if (f.severity === 'MEDIUM') counts.medium++;
      else if (f.severity === 'LOW') counts.low++;
      else if (f.severity === 'INFO') counts.info++;

      if (f.status === 'OPEN' || f.status === 'DETECTED' || f.status === 'UNDER_REVIEW') counts.open++;
      else if (f.status === 'CONFIRMED') counts.confirmed++;
      else if (f.status === 'DISMISSED') counts.dismissed++;
      else if (f.status === 'ESCALATED') counts.escalated++;
    }
    return counts;
  }

  /** Rate metrics for dashboard KPIs (misinformation rate etc.). */
  public async getTypeRates(tenantId: string, callIds?: string[]): Promise<Record<string, number>> {
    let query = supabaseAdminClient
      .from(this.tableName)
      .select('flag_type')
      .eq('tenant_id', tenantId);

    if (callIds) {
      if (callIds.length === 0) return {};
      query = query.in('call_id', callIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error.message }, '[FlagRepository] getTypeRates failed');
      return {};
    }

    const rates: Record<string, number> = {};
    for (const row of data || []) {
      const t = (row as { flag_type: string }).flag_type;
      rates[t] = (rates[t] || 0) + 1;
    }
    return rates;
  }

  public async recordEvent(dto: {
    flag_id: string;
    tenant_id: string;
    event_type: string;
    actor?: string;
    from_status?: string | null;
    to_status?: string | null;
    note?: string;
  }): Promise<void> {
    const { error } = await supabaseAdminClient.from('flag_events').insert({
      flag_id: dto.flag_id,
      tenant_id: dto.tenant_id,
      event_type: dto.event_type,
      actor: dto.actor ?? null,
      from_status: dto.from_status ?? null,
      to_status: dto.to_status ?? null,
      note: dto.note ?? null,
    });
    if (error) {
      logger.warn({ err: error.message, flag_id: dto.flag_id }, '[FlagRepository] Event recording notice');
    }
  }
}

export const flagRepository = new FlagRepository();
