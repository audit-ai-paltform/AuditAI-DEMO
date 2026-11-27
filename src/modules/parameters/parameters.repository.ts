import { IParameterRepository } from './interfaces/parameter-repository.interface.js';
import { ParameterEntity, ParameterListResult } from './parameters.types.js';
import { CreateParameterDto } from './dto/create-parameter.dto.js';
import { UpdateParameterDto } from './dto/update-parameter.dto.js';
import { QueryParameterDto } from './dto/query-parameter.dto.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { DatabaseUtils } from '../../database/utils.js';

export class ParameterRepository implements IParameterRepository {
  private readonly tableName = 'parameters';

  public async create(dto: CreateParameterDto): Promise<ParameterEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert({
        client_id: dto.client_id,
        name: dto.name,
        weight: dto.weight,
        enabled: dto.enabled,
        ai_suggested: dto.ai_suggested,
      })
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ParameterEntity>(data, error);
  }

  public async findById(id: string): Promise<ParameterEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      DatabaseUtils.unwrapResponse(null, error);
    }
    return data;
  }

  public async findAll(query: QueryParameterDto): Promise<ParameterListResult> {
    const { page = 1, limit = 20, client_id, enabled, search } = query;
    const { from, to } = DatabaseUtils.calculatePaginationOffset(page, limit);

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (client_id) {
      dbQuery = dbQuery.eq('client_id', client_id);
    }
    if (enabled !== undefined) {
      dbQuery = dbQuery.eq('enabled', enabled);
    }
    if (search && search.trim()) {
      dbQuery = dbQuery.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const parameters = DatabaseUtils.unwrapResponse<ParameterEntity[]>(data, error);

    return {
      parameters,
      total: count || 0,
      page,
      limit,
    };
  }

  public async update(id: string, dto: UpdateParameterDto): Promise<ParameterEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(dto)
      .eq('id', id)
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ParameterEntity>(data, error);
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

export const parameterRepository = new ParameterRepository();
