import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/http/base.controller.js';
import { integrationsService, ProviderName } from './integrations.service.js';

const providerSchema = z.enum(['assemblyai', 'gemini', 'knowlarity']);
const credentialSchema = z.object({ provider: providerSchema, api_key: z.string().min(8).max(512), config: z.record(z.string()).optional() });

function tenant(req: Request): string { return resTenant(req); }
function resTenant(req: Request): string {
  const value = req.res?.locals.tenantId as string | undefined;
  if (!value) throw new Error('Tenant context is missing');
  return value;
}

export class IntegrationsController extends BaseController {
  public list = async (req: Request, res: Response): Promise<Response> => this.ok(res, await integrationsService.list(tenant(req)));
  public test = async (req: Request, res: Response): Promise<Response> => {
    const value = credentialSchema.parse(req.body);
    const outcome = await integrationsService.test(value.provider as ProviderName, { apiKey: value.api_key, config: value.config });
    return this.ok(res, outcome);
  };
  public save = async (req: Request, res: Response): Promise<Response> => {
    const value = credentialSchema.parse(req.body);
    return this.ok(res, await integrationsService.save(tenant(req), value.provider as ProviderName, { apiKey: value.api_key, config: value.config }));
  };
  public remove = async (req: Request, res: Response): Promise<Response> => {
    const provider = providerSchema.parse(req.params.provider);
    await integrationsService.remove(tenant(req), provider);
    return res.status(204).send();
  };
}
export const integrationsController = new IntegrationsController();
