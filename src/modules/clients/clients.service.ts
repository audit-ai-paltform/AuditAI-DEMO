import { IClientRepository } from './interfaces/client-repository.interface.js';
import { clientRepository } from './clients.repository.js';
import { ClientEntity, ClientListResult } from './clients.types.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { QueryClientDto } from './dto/query-client.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';
import { ValidationException } from '../../core/exceptions/validation.exception.js';

export class ClientService {
  constructor(private readonly repo: IClientRepository = clientRepository) {}

  public async createClient(dto: CreateClientDto): Promise<ClientEntity> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ValidationException(`Client with email '${dto.email}' already exists`);
    }
    return this.repo.create(dto);
  }

  public async getClientById(id: string): Promise<ClientEntity> {
    const client = await this.repo.findById(id);
    if (!client) {
      throw new NotFoundException(`Client with ID '${id}' not found`);
    }
    return client;
  }

  public async listClients(query: QueryClientDto): Promise<ClientListResult> {
    return this.repo.findAll(query);
  }

  public async updateClient(id: string, dto: UpdateClientDto): Promise<ClientEntity> {
    await this.getClientById(id);

    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ValidationException(`Email '${dto.email}' is already taken by another client`);
      }
    }

    return this.repo.update(id, dto);
  }

  public async deleteClient(id: string): Promise<void> {
    await this.getClientById(id);
    await this.repo.delete(id);
  }
}

export const clientService = new ClientService();
