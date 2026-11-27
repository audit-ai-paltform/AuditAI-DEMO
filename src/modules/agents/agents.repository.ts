import { IAgentRepository } from './interfaces/agent-repository.interface.js';
import { AgentEntity, AgentListResult } from './agents.types.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { QueryAgentDto } from './dto/query-agent.dto.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { DatabaseUtils } from '../../database/utils.js';

export class AgentRepository implements IAgentRepository {
  private readonly tableName = 'agents';

  private mapAgentRecord(record: any): AgentEntity {
    if (!record) return record;
    const tenure_minutes = record.tenure_minutes ?? record.tenure_months ?? 0;
    return {
      ...record,
      tenure_minutes,
    };
  }

  public async create(dto: CreateAgentDto): Promise<AgentEntity> {
    const payload: any = {
      client_id: dto.client_id,
      name: dto.name,
      code: dto.code,
      process: dto.process,
      tenure_minutes: dto.tenure_minutes ?? 0,
      status: dto.status,
    };

    let { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert(payload)
      .select('*')
      .single();

    if (error && error.message?.includes('tenure_minutes')) {
      delete payload.tenure_minutes;
      payload.tenure_months = dto.tenure_minutes ?? 0;
      const res = await supabaseAdminClient
        .from(this.tableName)
        .insert(payload)
        .select('*')
        .single();
      data = res.data;
      error = res.error;
    }

    const entity = DatabaseUtils.unwrapResponse<any>(data, error);
    return this.mapAgentRecord(entity);
  }

  public async findById(id: string): Promise<AgentEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      DatabaseUtils.unwrapResponse(null, error);
    }
    return data ? this.mapAgentRecord(data) : null;
  }

  public async findByCode(code: string): Promise<AgentEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      DatabaseUtils.unwrapResponse(null, error);
    }
    return data ? this.mapAgentRecord(data) : null;
  }

  public async findAll(query: QueryAgentDto): Promise<AgentListResult> {
    const { page = 1, limit = 20, client_id, code, status, process, search } = query;
    const { from, to } = DatabaseUtils.calculatePaginationOffset(page, limit);

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (client_id) {
      dbQuery = dbQuery.eq('client_id', client_id);
    }
    if (code) {
      dbQuery = dbQuery.eq('code', code);
    }
    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }
    if (process) {
      dbQuery = dbQuery.eq('process', process);
    }
    if (search && search.trim()) {
      dbQuery = dbQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,process.ilike.%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const rawAgents = DatabaseUtils.unwrapResponse<any[]>(data, error);
    const agents = (rawAgents || []).map((a) => this.mapAgentRecord(a));

    return {
      agents,
      total: count || 0,
      page,
      limit,
    };
  }

  public async update(id: string, dto: UpdateAgentDto): Promise<AgentEntity> {
    const updatePayload: any = { ...dto };
    if (updatePayload.tenure_minutes !== undefined) {
      updatePayload.tenure_minutes = dto.tenure_minutes;
    }

    let { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error && error.message?.includes('tenure_minutes')) {
      delete updatePayload.tenure_minutes;
      updatePayload.tenure_months = dto.tenure_minutes;
      const res = await supabaseAdminClient
        .from(this.tableName)
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();
      data = res.data;
      error = res.error;
    }

    const entity = DatabaseUtils.unwrapResponse<any>(data, error);
    return this.mapAgentRecord(entity);
  }

  public async delete(id: string): Promise<void> {
    const { error } = await supabaseAdminClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      DatabaseUtils.unwrapResponse(null, error);
    }
  }
}

export const agentRepository = new AgentRepository();
