import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { callService, CallService } from './calls.service.js';
import { CreateCallDto } from './dto/create-call.dto.js';
import { UpdateCallDto } from './dto/update-call.dto.js';
import { QueryCallDto } from './dto/query-call.dto.js';

export class CallController extends BaseController {
  constructor(private readonly service: CallService = callService) {
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
    const dto = req.body as CreateCallDto;
    const tenantId = this.getTenantId(req, res);
    if (tenantId && !dto.client_id) {
      dto.client_id = tenantId;
    }
    const call = await this.service.createCall(dto);
    return this.created(res, call);
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    const call = await this.service.getCallById(id);
    if (tenantId && call.client_id !== tenantId) {
      return this.fail(res, 'Call not found', 404);
    }
    return this.ok(res, call);
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    const query = (req.query as unknown as QueryCallDto) || {};
    const tenantId = this.getTenantId(req, res);
    if (tenantId) {
      query.client_id = tenantId;
    }
    const result = await this.service.listCalls(query);
    return this.ok(res, result.calls, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    const existing = await this.service.getCallById(id);
    if (tenantId && existing.client_id !== tenantId) {
      return this.fail(res, 'Call not found', 404);
    }
    const dto = req.body as UpdateCallDto;
    const updated = await this.service.updateCall(id, dto);
    return this.ok(res, updated);
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    const existing = await this.service.getCallById(id);
    if (tenantId && existing.client_id !== tenantId) {
      return this.fail(res, 'Call not found', 404);
    }
    await this.service.deleteCall(id);
    return this.ok(res, { message: 'Call deleted successfully' });
  };

  public reEvaluate = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    if (!tenantId) {
      return this.fail(res, 'Tenant context is required', 400);
    }

    const { reason, retranscribe, triggered_by } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return this.fail(res, 'A specific re-evaluation reason is required (at least 3 characters)', 400);
    }

    const outcome = await this.service.requestReEvaluation(id, tenantId, {
      reason: reason.trim(),
      retranscribe: Boolean(retranscribe),
      triggeredBy: triggered_by || (res.locals.tenantRole ? `${res.locals.tenantRole}` : 'MANAGER'),
    });

    return res.status(202).json({
      success: true,
      message: outcome.message,
      data: outcome,
    });
  };

  public listEvaluations = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    if (!tenantId) {
      return this.fail(res, 'Tenant context is required', 400);
    }
    const runs = await this.service.listEvaluations(id, tenantId);
    return this.ok(res, runs);
  };
}

export const callController = new CallController();
