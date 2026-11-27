import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { flagRepository } from './flags.repository.js';
import {
  FlagStatus,
  ResolutionType,
  flagStatusSchema,
  resolutionTypeSchema,
} from './flags.types.js';
import { z } from 'zod';

export class FlagController extends BaseController {
  private getTenantId(req: Request, res: Response): string {
    const fromLocals = res.locals.tenantId as string | undefined;
    if (fromLocals) return fromLocals;
    return (
      (req.headers['x-tenant-id'] as string) ||
      (req.query.tenant_id as string) ||
      (req.body?.tenant_id as string) ||
      ''
    );
  }

  /**
   * GET /flags — paginated, filtered, always tenant-scoped.
   * Filters: severity, status, flag_type, agent_id, call_id,
   * min_confidence, requires_manager_attention.
   */
  public list = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const result = await flagRepository.findAll({
      tenant_id: tenantId,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      call_id: req.query.call_id as string | undefined,
      agent_id: req.query.agent_id as string | undefined,
      severity: req.query.severity as never,
      status: req.query.status as never,
      flag_type: req.query.flag_type as string | undefined,
      min_confidence: req.query.min_confidence ? parseFloat(req.query.min_confidence as string) : undefined,
      requires_manager_attention: req.query.requires_manager_attention === 'true',
    });
    return this.ok(res, result.flags, { page: result.page, limit: result.limit, total: result.total });
  };

  /** GET /flags/:id */
  public getById = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const flag = await flagRepository.findById(tenantId, req.params.id as string);
    if (!flag) {
      return this.fail(res, 'Flag not found', 404);
    }
    return this.ok(res, flag);
  };

  /** GET /flags/counts — aggregate KPI counts for the dashboard. */
  public counts = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const counts = await flagRepository.getCounts(tenantId);
    return this.ok(res, counts);
  };

  /** GET /flags/types — backend-owned taxonomy for the UI. */
  public types = async (_req: Request, res: Response): Promise<Response> => {
    const { FLAG_TYPES, FLAG_SEVERITIES, FLAG_STATUSES, RESOLUTION_TYPES } = await import('./flags.types.js');
    return this.ok(res, {
      flag_types: FLAG_TYPES,
      severities: FLAG_SEVERITIES,
      statuses: FLAG_STATUSES,
      resolution_types: RESOLUTION_TYPES,
    });
  };

  /**
   * PATCH /flags/:id — resolution workflow.
   * Body: { status, resolution_type?, resolution_note?, resolved_by?, tenant_id }
   * Dismissals require a reason.
   */
  public resolve = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);

    const bodySchema = z.object({
      status: flagStatusSchema,
      resolution_type: resolutionTypeSchema.optional(),
      resolution_note: z.string().max(2000).optional(),
      resolved_by: z.string().max(100).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return this.fail(res, `Invalid flag resolution: ${parsed.error.message}`, 400);
    }

    const { status, resolution_type, resolution_note, resolved_by } = parsed.data;

    // Dismissal requires a reason
    if (status === 'DISMISSED' && (!resolution_note || resolution_note.trim().length < 3)) {
      return this.fail(res, 'A dismissal reason (resolution_note) is required', 400);
    }

    const existing = await flagRepository.findById(tenantId, req.params.id as string);
    if (!existing) {
      return this.fail(res, 'Flag not found', 404);
    }

    // Marking as transcription issue is a dedicated resolution type
    const finalResolutionType: ResolutionType | undefined =
      resolution_type ?? (status === 'DISMISSED' ? 'FALSE_POSITIVE' : status === 'CONFIRMED' ? 'CONFIRMED_ISSUE' : undefined);

    const updated = await flagRepository.updateStatus(tenantId, req.params.id as string, {
      status: status as FlagStatus,
      resolution_type: finalResolutionType,
      resolution_note,
      resolved_by,
    });

    await flagRepository.recordEvent({
      flag_id: req.params.id as string,
      tenant_id: tenantId,
      event_type:
        status === 'CONFIRMED' ? 'CONFIRMED' :
        status === 'DISMISSED' ? 'DISMISSED' :
        status === 'ESCALATED' ? 'ESCALATED' :
        finalResolutionType === 'TRANSCRIPTION_ISSUE' ? 'MARKED_TRANSCRIPTION_ISSUE' :
        'STATUS_CHANGED',
      actor: resolved_by,
      from_status: existing.status,
      to_status: status,
      note: resolution_note,
    });

    return this.ok(res, updated);
  };
}

export const flagController = new FlagController();
