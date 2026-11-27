import { IScriptRepository } from './interfaces/script-repository.interface.js';
import { ScriptEntity, ScriptListResult } from './scripts.types.js';
import { CreateScriptDto } from './dto/create-script.dto.js';
import { UpdateScriptDto } from './dto/update-script.dto.js';
import { QueryScriptDto } from './dto/query-script.dto.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { DatabaseUtils } from '../../database/utils.js';

export class ScriptRepository implements IScriptRepository {
  private readonly tableName = 'scripts';

  public async create(dto: CreateScriptDto): Promise<ScriptEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert({
        client_id: dto.client_id,
        process: dto.process,
        language: dto.language,
        sections: dto.sections,
      })
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ScriptEntity>(data, error);
  }

  public async findById(id: string): Promise<ScriptEntity | null> {
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

  public async findAll(query: QueryScriptDto): Promise<ScriptListResult> {
    const { page = 1, limit = 20, client_id, process, language, search } = query;
    const { from, to } = DatabaseUtils.calculatePaginationOffset(page, limit);

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (client_id) {
      dbQuery = dbQuery.eq('client_id', client_id);
    }
    if (process) {
      dbQuery = dbQuery.eq('process', process);
    }
    if (language) {
      dbQuery = dbQuery.eq('language', language);
    }
    if (search && search.trim()) {
      dbQuery = dbQuery.or(`process.ilike.%${search}%,language.ilike.%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const scripts = DatabaseUtils.unwrapResponse<ScriptEntity[]>(data, error);

    return {
      scripts,
      total: count || 0,
      page,
      limit,
    };
  }

  public async update(id: string, dto: UpdateScriptDto): Promise<ScriptEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(dto)
      .eq('id', id)
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ScriptEntity>(data, error);
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

export const scriptRepository = new ScriptRepository();
