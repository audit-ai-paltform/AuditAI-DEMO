import { IAgentRepository } from './interfaces/agent-repository.interface.js';
import { agentRepository } from './agents.repository.js';
import { AgentEntity, AgentListResult } from './agents.types.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { QueryAgentDto } from './dto/query-agent.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';
import { ValidationException } from '../../core/exceptions/validation.exception.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

export interface AgentInactivityConfig {
  enabled: boolean;
  thresholdHours: 24 | 48;
  lastSweepAt: string | null;
  lastDisabledCount: number;
}

let globalInactivityConfig: AgentInactivityConfig = {
  enabled: true,
  thresholdHours: 24,
  lastSweepAt: null,
  lastDisabledCount: 0,
};

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

  public getInactivityConfig(): AgentInactivityConfig {
    return { ...globalInactivityConfig };
  }

  public updateInactivityConfig(partial: Partial<AgentInactivityConfig>): AgentInactivityConfig {
    if (partial.thresholdHours !== undefined && partial.thresholdHours !== 24 && partial.thresholdHours !== 48) {
      throw new ValidationException('thresholdHours must be 24 or 48');
    }
    globalInactivityConfig = {
      ...globalInactivityConfig,
      ...partial,
    };
    return this.getInactivityConfig();
  }

  /**
   * Automatically disables client-side agents inactive for more than 24–48 hours.
   */
  public async runInactivitySweep(clientId?: string, overrideHours?: number): Promise<{
    thresholdHours: number;
    checkedCount: number;
    disabledCount: number;
    disabledAgents: Array<{ id: string; name: string; code: string; lastActivityAt: string }>;
  }> {
    const thresholdHours = overrideHours === 48 ? 48 : overrideHours === 24 ? 24 : globalInactivityConfig.thresholdHours;
    const cutoffMs = Date.now() - thresholdHours * 3600 * 1000;

    let agentsQuery = supabaseAdminClient.from('agents').select('*').eq('status', 'Active');
    if (clientId) {
      agentsQuery = agentsQuery.eq('client_id', clientId);
    }
    const { data: activeAgents } = await agentsQuery;
    const agents = activeAgents || [];

    const disabledAgents: Array<{ id: string; name: string; code: string; lastActivityAt: string }> = [];

    for (const ag of agents) {
      // Check latest call activity for this agent (by code or id)
      const { data: recentCalls } = await supabaseAdminClient
        .from('calls')
        .select('created_at')
        .or(`agent_id.eq.${ag.code},agent_id.eq.${ag.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastCallAt = recentCalls && recentCalls[0]?.created_at ? new Date(recentCalls[0].created_at).getTime() : 0;
      const lastUpdateAt = ag.updated_at ? new Date(ag.updated_at).getTime() : new Date(ag.created_at || 0).getTime();
      const latestActivityMs = Math.max(lastCallAt, lastUpdateAt);

      if (latestActivityMs > 0 && latestActivityMs < cutoffMs) {
        await supabaseAdminClient
          .from('agents')
          .update({ status: 'Inactive' })
          .eq('id', ag.id);

        disabledAgents.push({
          id: ag.id,
          name: ag.name,
          code: ag.code,
          lastActivityAt: new Date(latestActivityMs).toISOString(),
        });
      }
    }

    globalInactivityConfig.lastSweepAt = new Date().toISOString();
    globalInactivityConfig.lastDisabledCount = disabledAgents.length;

    return {
      thresholdHours,
      checkedCount: agents.length,
      disabledCount: disabledAgents.length,
      disabledAgents,
    };
  }
}

export const agentService = new AgentService();
