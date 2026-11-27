import { AgentEntity, AgentListResult } from '../agents.types.js';
import { CreateAgentDto } from '../dto/create-agent.dto.js';
import { UpdateAgentDto } from '../dto/update-agent.dto.js';
import { QueryAgentDto } from '../dto/query-agent.dto.js';

export interface IAgentRepository {
  create(dto: CreateAgentDto): Promise<AgentEntity>;
  findById(id: string): Promise<AgentEntity | null>;
  findByCode(code: string): Promise<AgentEntity | null>;
  findAll(query: QueryAgentDto): Promise<AgentListResult>;
  update(id: string, dto: UpdateAgentDto): Promise<AgentEntity>;
  delete(id: string): Promise<void>;
}
