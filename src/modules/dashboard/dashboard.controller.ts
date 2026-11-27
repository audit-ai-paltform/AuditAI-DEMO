import { Request, Response } from 'express';


import { dashboardService } from './dashboard.service.js';
import { HttpStatus } from '../../constants/status.constants.js';

import { BaseController } from '../../core/http/base.controller.js';

export class DashboardController extends BaseController {
  /** GET /dashboard/kpis?days=30&agent_id=...&process=... — aggregate KPIs from real data. */
  public kpis = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = res.locals.tenantId as string;

    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthenticated', data: null });
    }

    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string, 10) || 30));
    const agentId = (req.query.agent_id as string) || undefined;
    const process = (req.query.process as string) || undefined;

    // Filters are applied in the query, not after the fact in the browser.
    const kpis = await dashboardService.getKpis(tenantId, days, { agent_id: agentId, process });
    return this.ok(res, kpis);
  };

  /** GET /dashboard/alerts — recent priority flags. */
  public alerts = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = res.locals.tenantId as string;

    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthenticated', data: null });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const flags = await dashboardService.getRecentPriorityFlags(tenantId, limit);
    return this.ok(res, flags);
  };
}

export const dashboardController = new DashboardController();
