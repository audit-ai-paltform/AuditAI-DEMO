import { IAgentRepository } from './interfaces/agent-repository.interface.js';
import { agentRepository } from './agents.repository.js';
import { AgentEntity, AgentListResult } from './agents.types.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { QueryAgentDto } from './dto/query-agent.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';
import { ValidationException } from '../../core/exceptions/validation.exception.js';

export class AgentService {
  constructor(private readonly repo: IAgentRepository = agentRepository) {}

  public async createAgent(dto: CreateAgentDto): Promise<AgentEntity> {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) {
      throw new ValidationException(`Agent code '${dto.code}' already exists`);
    }
    return this.repo.create(dto);
  }

  public async getAgentById(id: string): Promise<AgentEntity> {
    const agent = await this.repo.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID '${id}' not found`);
    }
    return agent;
  }

  public async listAgents(query: QueryAgentDto): Promise<AgentListResult> {
    return this.repo.findAll(query);
  }

  public async updateAgent(id: string, dto: UpdateAgentDto): Promise<AgentEntity> {
    await this.getAgentById(id);

    if (dto.code) {
      const existing = await this.repo.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ValidationException(`Agent code '${dto.code}' is already assigned to another agent`);
      }
    }

    return this.repo.update(id, dto);
  }

  public async deleteAgent(id: string): Promise<void> {
    await this.getAgentById(id);
    await this.repo.delete(id);
  }
}

export const agentService = new AgentService();
