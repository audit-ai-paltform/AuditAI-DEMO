import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { scriptService, ScriptService } from './scripts.service.js';
import { CreateScriptDto } from './dto/create-script.dto.js';
import { UpdateScriptDto } from './dto/update-script.dto.js';
import { QueryScriptDto } from './dto/query-script.dto.js';
import { GeminiProvider } from '../../providers/gemini.provider.js';

const geminiProvider = new GeminiProvider();

export class ScriptController extends BaseController {
  constructor(private readonly service: ScriptService = scriptService) {
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
    const dto = req.body as CreateScriptDto;
    const tenantId = this.getTenantId(req, res);
    if (tenantId && !dto.client_id) {
      dto.client_id = tenantId;
    }
    const script = await this.service.createScript(dto);
    return this.created(res, script);
  };

  public extractRules = async (req: Request, res: Response): Promise<Response> => {
    const { scriptText } = req.body as { scriptText?: string };
    if (!scriptText) {
      return res.status(400).json({ error: 'scriptText is required' });
    }
    const rules = await geminiProvider.extractAuditRules(scriptText);
    return this.ok(res, { rules });
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const script = await this.service.getScriptById(id);
    return this.ok(res, script);
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    const query = (req.query as unknown as QueryScriptDto) || {};
    const tenantId = this.getTenantId(req, res);
    if (tenantId) {
      query.client_id = tenantId;
    }
    const result = await this.service.listScripts(query);
    return this.ok(res, result.scripts, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateScriptDto;
    const updated = await this.service.updateScript(id, dto);
    return this.ok(res, updated);
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    await this.service.deleteScript(id);
    return this.ok(res, { message: 'Script deleted successfully' });
  };
}

export const scriptController = new ScriptController();
