import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { tenantConfigService } from './tenant-config.service.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { z } from 'zod';

function tenantOf(res: Response): string {
  const id = res.locals.tenantId as string | undefined;
  if (!id) throw new Error('Tenant context is required');
  return id;
}


export class SettingsController extends BaseController {
  /** GET /settings — current tenant configuration + setup state + SOP versions + client name. */
  public getConfig = async (_req: Request, res: Response): Promise<Response> => {
    const tenantId = tenantOf(res);
    const [config, sopVersions, clientRes] = await Promise.all([
      tenantConfigService.getConfig(tenantId),
      tenantConfigService.listSopVersions(tenantId),
      supabaseAdminClient.from('clients').select('name, plan').eq('id', tenantId).maybeSingle(),
    ]);
    return this.ok(res, {
      config,
      sop_versions: sopVersions,
      client_name: clientRes?.data?.name || null,
      plan: clientRes?.data?.plan || null,
    });
  };

  /** POST /settings/sop-versions — upload new SOP version (never overwrites). */
  public uploadSop = async (req: Request, res: Response): Promise<Response> => {
    const schema = z.object({
      tenant_id: z.string().uuid().optional(),
      process: z.string().min(1).default('General'),
      language: z.string().optional(),
      sections: z.array(z.record(z.unknown())).min(1),
      created_by: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return this.fail(res, `Invalid SOP upload: ${parsed.error.message}`, 400);

    const { tenant_id, process, language, sections, created_by } = parsed.data;
    const version = await tenantConfigService.uploadSopVersion({
      tenantId: tenant_id || tenantOf(res),
      process, language, sections, createdBy: created_by,
    });
    return this.created(res, version);
  };

  /** POST /settings/sop-versions/:id/activate */
  public activateSop = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = tenantOf(res);
    const { activated_by } = (req.body || {}) as { activated_by?: string };
    const config = await tenantConfigService.activateSopVersion(tenantId, req.params.id as string, activated_by);
    return this.ok(res, config);
  };

  /** POST /settings/activate — complete first-time setup / re-activation. */
  public activateConfiguration = async (req: Request, res: Response): Promise<Response> => {
    const schema = z.object({
      tenant_id: z.string().uuid().optional(),
      sop_version_id: z.string().uuid().optional(),
      activated_by: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return this.fail(res, parsed.error.message, 400);

    const { tenant_id, sop_version_id, activated_by } = parsed.data;
    const config = await tenantConfigService.activateConfiguration(
      tenant_id || tenantOf(res),
      { sopVersionId: sop_version_id, activatedBy: activated_by },
    );
    return this.ok(res, config);
  };

  /** PATCH /settings/preferences — notification severity toggles etc. */
  public updatePreferences = async (req: Request, res: Response): Promise<Response> => {
    const schema = z.object({
      tenant_id: z.string().uuid().optional(),
      flag_engine_enabled: z.boolean().optional(),
      critical_notify: z.boolean().optional(),
      high_notify: z.boolean().optional(),
      medium_notify: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return this.fail(res, parsed.error.message, 400);

    const { tenant_id, ...prefs } = parsed.data;
    const config = await tenantConfigService.updatePreferences(
      tenant_id || tenantOf(res),
      prefs,
    );
    return this.ok(res, config);
  };

  /** POST /settings/sop/process — extract text from PDF/DOCX/TXT, create version, and extract parameters via Gemini */
  public processSop = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = tenantOf(res);
    const { raw_text, file_base64, file_name, process = 'General', language = 'English', created_by = 'manager' } = req.body || {};

    let textToProcess = raw_text || '';
    if (file_base64 && file_name) {
      const buffer = Buffer.from(file_base64, 'base64');
      const { sopService } = await import('./sop.service.js');
      textToProcess = await sopService.extractTextFromFile(buffer, file_name);
    }

    if (!textToProcess.trim()) {
      return this.fail(res, 'No readable text content found in uploaded SOP.', 400);
    }

    const { sopService } = await import('./sop.service.js');
    const result = await sopService.processUploadedSop(tenantId, process, language, textToProcess, created_by);
    return this.ok(res, result);
  };

  /** POST /settings/sop/parameters/approve — store approved extracted parameters into parameters table */
  public approveParameters = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = tenantOf(res);
    const { parameters } = req.body || {};

    if (!Array.isArray(parameters) || parameters.length === 0) {
      return this.fail(res, 'Parameters list is required.', 400);
    }

    const { sopService } = await import('./sop.service.js');
    const approved = await sopService.approveParameters(tenantId, parameters);
    return this.ok(res, { approved_count: approved.length, parameters: approved });
  };
}

export const settingsController = new SettingsController();
