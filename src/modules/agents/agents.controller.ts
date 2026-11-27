import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { agentService, AgentService } from './agents.service.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { QueryAgentDto } from './dto/query-agent.dto.js';

export class AgentController extends BaseController {
  constructor(private readonly service: AgentService = agentService) {
    super();
  }

  private getTenantId(req: Request, res: Response): string {
    const fromLocals = res.locals.tenantId as string | undefined;
    if (fromLocals) return fromLocals;
    return (
      (req.headers['x-tenant-id'] as string) ||
      (req.query.tenant_id as string) ||
      (req.query.client_id as string) ||
      (req.body?.tenant_id as string) ||
      (req.body?.client_id as string) ||
      ''
    );
  }

  public create = async (req: Request, res: Response): Promise<Response> => {
    const dto = req.body as CreateAgentDto;
    const tenantId = this.getTenantId(req, res);
    if (tenantId && !dto.client_id) {
      dto.client_id = tenantId;
    }
    const agent = await this.service.createAgent(dto);
    return this.created(res, agent);
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const agent = await this.service.getAgentById(id);
    return this.ok(res, agent);
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    const query = (req.query as unknown as QueryAgentDto) || {};
    const tenantId = this.getTenantId(req, res);
    if (tenantId) {
      query.client_id = tenantId;
    }
    const result = await this.service.listAgents(query);
    return this.ok(res, result.agents, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateAgentDto;
    const updated = await this.service.updateAgent(id, dto);
    return this.ok(res, updated);
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    await this.service.deleteAgent(id);
    return this.ok(res, { message: 'Agent deleted successfully' });
  };
}

export const agentController = new AgentController();
