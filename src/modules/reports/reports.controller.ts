import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/http/base.controller.js';
import { reportsService } from './reports.service.js';
import { reportQueue } from '../../queues/call-pipeline.queue.js';

const input = z.object({ business_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.string().min(1).max(64).default('UTC') });
function tenant(req: Request): string { const id = req.res?.locals.tenantId as string | undefined; if (!id) throw new Error('Tenant context is required'); return id; }

export class ReportsController extends BaseController {
  public list = async (req: Request, res: Response): Promise<Response> => this.ok(res, await reportsService.list(tenant(req)));
  public generate = async (req: Request, res: Response): Promise<Response> => {
    const body = input.parse(req.body); const report = await reportsService.createOrGet(tenant(req), body.business_date, body.timezone);
    if (report.status !== 'READY') await reportQueue.add('generate-daily-report', { report_id: report.id as string }, { jobId: `report-${report.id}` });
    return this.created(res, report);
  };
  public regenerate = async (req: Request, res: Response): Promise<Response> => {
    const reportId = z.string().uuid().parse(req.params.id); await reportQueue.add('generate-daily-report', { report_id: reportId }, { jobId: `report-regenerate-${reportId}-${Date.now()}` }); return this.ok(res, { status: 'QUEUED' });
  };
  public download = async (req: Request, res: Response): Promise<Response> => this.ok(res, { url: await reportsService.download(tenant(req), z.string().uuid().parse(req.params.id)) });
}
export const reportsController = new ReportsController();
