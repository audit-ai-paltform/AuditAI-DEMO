import { ClientEntity, ClientListResult } from '../clients.types.js';
import { CreateClientDto } from '../dto/create-client.dto.js';
import { UpdateClientDto } from '../dto/update-client.dto.js';
import { QueryClientDto } from '../dto/query-client.dto.js';

export interface IClientRepository {
  create(dto: CreateClientDto): Promise<ClientEntity>;
  findById(id: string): Promise<ClientEntity | null>;
  findByEmail(email: string): Promise<ClientEntity | null>;
  findAll(query: QueryClientDto): Promise<ClientListResult>;
  update(id: string, dto: UpdateClientDto): Promise<ClientEntity>;
  delete(id: string): Promise<void>;
}
