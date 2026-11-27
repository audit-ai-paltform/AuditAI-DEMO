import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { flagRepository } from '../flags/flags.repository.js';
import { getProcessingEvents, getRecentProcessingEvents } from './processing-events.js';

export class CallFlagsController extends BaseController {
  private getTenantId(req: Request, res: Response): string {
    const fromLocals = res.locals.tenantId as string | undefined;
    if (fromLocals) return fromLocals;
    return (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || '';
  }

  /** GET /calls/:id/flags — flags for a call, always tenant-scoped. */
  public listForCall = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const flags = await flagRepository.findByCall(tenantId, req.params.id as string);
    return this.ok(res, flags);
  };

  /** GET /calls/:id/events — processing audit trail for a call. */
  public processingEvents = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const events = await getProcessingEvents(tenantId, req.params.id as string);
    return this.ok(res, events);
  };

  /** GET /calls/events/recent — tenant-wide audit trail of real backend events. */
  public recentProcessingEvents = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'tenant_id is required', data: null });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string, 10) || 100));
    const events = await getRecentProcessingEvents(tenantId, limit);
    return this.ok(res, events);
  };
}

export const callFlagsController = new CallFlagsController();
