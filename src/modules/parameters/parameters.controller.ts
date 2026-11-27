import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { parameterService, ParameterService } from './parameters.service.js';
import { CreateParameterDto } from './dto/create-parameter.dto.js';
import { UpdateParameterDto } from './dto/update-parameter.dto.js';
import { QueryParameterDto } from './dto/query-parameter.dto.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';

const geminiProvider = new GeminiProvider();

export class ParameterController extends BaseController {
  constructor(private readonly service: ParameterService = parameterService) {
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
    const dto = req.body as CreateParameterDto;
    const tenantId = this.getTenantId(req, res);
    if (tenantId && !dto.client_id) {
      dto.client_id = tenantId;
    }
    const parameter = await this.service.createParameter(dto);
    return this.created(res, parameter);
  };

  public aiSuggest = async (req: Request, res: Response): Promise<Response> => {
    const { currentParameters } = req.body as { currentParameters?: Array<{ name: string; weight: number }> };
    const suggestion = await geminiProvider.suggestParameter(currentParameters || []);
    return this.ok(res, { suggestion });
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const parameter = await this.service.getParameterById(id);
    return this.ok(res, parameter);
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    const query = (req.query as unknown as QueryParameterDto) || {};
    const tenantId = this.getTenantId(req, res);
    if (tenantId) {
      query.client_id = tenantId;
    }
    const result = await this.service.listParameters(query);
    return this.ok(res, result.parameters, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateParameterDto;
    const updated = await this.service.updateParameter(id, dto);
    return this.ok(res, updated);
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    await this.service.deleteParameter(id);
    return this.ok(res, { message: 'Parameter deleted successfully' });
  };
}

export const parameterController = new ParameterController();
