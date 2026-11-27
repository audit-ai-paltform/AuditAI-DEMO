import { ICallRepository } from './interfaces/call-repository.interface.js';
import { CallEntity, CallListResult } from './calls.types.js';
import { CreateCallDto } from './dto/create-call.dto.js';
import { UpdateCallDto } from './dto/update-call.dto.js';
import { QueryCallDto } from './dto/query-call.dto.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { DatabaseUtils } from '../../database/utils.js';

export async function syncAgentTenureFromCalls(agentIdentifier: string): Promise<void> {
  if (!agentIdentifier) return;

  try {
    const { data: agentByCode } = await supabaseAdminClient
      .from('agents')
      .select('id, code')
      .eq('code', agentIdentifier)
      .maybeSingle();

    const { data: agentById } = !agentByCode
      ? await supabaseAdminClient
          .from('agents')
          .select('id, code')
          .eq('id', agentIdentifier)
          .maybeSingle()
      : { data: null };

    const agent = agentByCode || agentById;
    const aId = agent?.id || agentIdentifier;
    const aCode = agent?.code || agentIdentifier;

    const [resCode, resId] = await Promise.all([
      supabaseAdminClient.from('calls').select('duration').eq('agent_id', aCode),
      supabaseAdminClient.from('calls').select('duration').eq('agent_id', aId),
    ]);

    const calls = [...(resCode.data || []), ...(resId.data || [])];
    if (calls.length === 0) return;

    let totalMinutes = 0;
    for (const c of calls) {
      if (c.duration) {
        const str = String(c.duration).trim();
        const parts = str.split(':').map((p: string) => Number(p));
        const p0 = parts[0];
        const p1 = parts[1];
        const p2 = parts[2];
        if (parts.length === 2 && p0 !== undefined && p1 !== undefined && !isNaN(p0) && !isNaN(p1)) {
          totalMinutes += p0 + p1 / 60;
        } else if (parts.length === 3 && p0 !== undefined && p1 !== undefined && p2 !== undefined && !isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          totalMinutes += p0 * 60 + p1 + p2 / 60;
        } else if (!isNaN(Number(str))) {
          totalMinutes += Number(str) / 60;
        }
      }
    }

    const roundedMinutes = Math.round(totalMinutes);

    await supabaseAdminClient.from('agents').update({ tenure_minutes: roundedMinutes }).eq('code', aCode).select('*');
    if (aId !== aCode) {
      await supabaseAdminClient.from('agents').update({ tenure_minutes: roundedMinutes }).eq('id', aId).select('*');
    }
  } catch (err: any) {
    console.warn(`[CallRepository] syncAgentTenureFromCalls notice for ${agentIdentifier}:`, err.message);
  }
}

export async function syncAllAgentsTenure(): Promise<void> {
  try {
    const { data: agents } = await supabaseAdminClient.from('agents').select('id, code');
    if (agents && agents.length > 0) {
      for (const ag of agents) {
        await syncAgentTenureFromCalls(ag.code || ag.id);
      }
    }
  } catch (e) {}
}

export class CallRepository implements ICallRepository {
  private readonly tableName = 'calls';

  public async create(dto: CreateCallDto): Promise<CallEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert({
        client_id: dto.client_id,
        agent_id: dto.agent_id || null,
        transcript: dto.transcript,
        score: dto.score !== undefined ? dto.score : null,
        status: dto.status,
        duration: dto.duration || null,
        caller_number: dto.caller_number || null,
        flags: dto.flags,
        parameter_scores: dto.parameter_scores,
        recording_path: dto.recording_path || null,
        correlation_id: dto.correlation_id || null,
      })
      .select('*')
      .single();

    const created = DatabaseUtils.unwrapResponse<CallEntity>(data, error);
    if (created && created.agent_id) {
      syncAgentTenureFromCalls(created.agent_id).catch(() => {});
    }
    return created;
  }

  public async findById(id: string): Promise<CallEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn(`[CallRepository] findById notice for ${id}:`, error.message);
      return null;
    }
    return data;
  }

  public async findAll(query: QueryCallDto): Promise<CallListResult> {
    const { page = 1, limit = 20, client_id, agent_id, status, search } = query;
    const { from, to } = DatabaseUtils.calculatePaginationOffset(page, limit);

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (client_id) {
      dbQuery = dbQuery.eq('client_id', client_id);
    }
    if (agent_id) {
      dbQuery = dbQuery.eq('agent_id', agent_id);
    }
    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }
    if (search && search.trim()) {
      dbQuery = dbQuery.or(`caller_number.ilike.%${search}%,status.ilike.%${search}%`);
    }

    const { data, error: dbError, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dbError) {
      console.warn('[CallRepository] findAll notice:', dbError.message);
    }

    const calls = data || [];

    return {
      calls: calls as CallEntity[],
      total: count || 0,
      page,
      limit,
    };
  }

  public async update(id: string, dto: UpdateCallDto): Promise<CallEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(dto)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.warn(`[CallRepository] Update notice for call_id=${id}:`, error.message);
    }
    const updated = (data || { id, ...dto }) as CallEntity;
    if (updated && updated.agent_id) {
      syncAgentTenureFromCalls(updated.agent_id).catch(() => {});
    }
    return updated;
  }

  public async delete(id: string): Promise<void> {
    const { error } = await supabaseAdminClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.warn(`[CallRepository] Delete notice for call_id=${id}:`, error.message);
    }
  }
}

export const callRepository = new CallRepository();
