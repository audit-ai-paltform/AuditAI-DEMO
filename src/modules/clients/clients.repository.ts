import { IClientRepository } from './interfaces/client-repository.interface.js';
import { ClientEntity, ClientListResult } from './clients.types.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { QueryClientDto } from './dto/query-client.dto.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { DatabaseUtils } from '../../database/utils.js';

export class ClientRepository implements IClientRepository {
  private readonly tableName = 'clients';

  public async create(dto: CreateClientDto): Promise<ClientEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .insert({
        name: dto.name,
        email: dto.email,
        plan: dto.plan,
        call_limit: dto.call_limit,
        razorpay_subscription_id: dto.razorpay_subscription_id || null,
      })
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ClientEntity>(data, error);
  }

  public async findById(id: string): Promise<ClientEntity | null> {
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

  public async findByEmail(email: string): Promise<ClientEntity | null> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      DatabaseUtils.unwrapResponse(null, error);
    }
    return data;
  }

  public async findAll(query: QueryClientDto): Promise<ClientListResult> {
    const { page = 1, limit = 20, search } = query;
    const { from, to } = DatabaseUtils.calculatePaginationOffset(page, limit);

    let dbQuery = supabaseAdminClient
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (search && search.trim()) {
      dbQuery = dbQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const clients = DatabaseUtils.unwrapResponse<ClientEntity[]>(data, error);

    return {
      clients,
      total: count || 0,
      page,
      limit,
    };
  }

  public async update(id: string, dto: UpdateClientDto): Promise<ClientEntity> {
    const { data, error } = await supabaseAdminClient
      .from(this.tableName)
      .update(dto)
      .eq('id', id)
      .select('*')
      .single();

    return DatabaseUtils.unwrapResponse<ClientEntity>(data, error);
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

export const clientRepository = new ClientRepository();
