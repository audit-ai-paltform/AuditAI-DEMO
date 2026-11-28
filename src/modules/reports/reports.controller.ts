import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/http/base.controller.js';
import { reportsService } from './reports.service.js';
import { reportQueue } from '../../queues/call-pipeline.queue.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

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

  public periodSummary = async (req: Request, res: Response): Promise<Response> => {
    const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const days = period === 'monthly' ? 30 : 7;
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
    const clientId = tenant(req);

    const [{ data: calls }, { data: flags }] = await Promise.all([
      supabaseAdminClient.from('calls').select('id, score, status, agent_id, sentiment, created_at').eq('client_id', clientId).gte('created_at', sinceIso),
      supabaseAdminClient.from('call_flags').select('id, severity, status').eq('tenant_id', clientId).gte('created_at', sinceIso),
    ]);

    const callList = calls || [];
    const flagList = flags || [];
    const scored = callList.filter((c: any) => typeof c.score === 'number');
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((a: number, c: any) => a + c.score, 0) / scored.length) : 0;

    return this.ok(res, {
      period,
      days,
      since: sinceIso,
      totalCalls: callList.length,
      avgScore,
      openCriticalFlags: flagList.filter((f: any) => f.severity === 'CRITICAL' && f.status === 'OPEN').length,
      totalFlags: flagList.length,
      positiveSentimentCount: callList.filter((c: any) => String(c.sentiment || '').toLowerCase() === 'positive').length,
      passCount: scored.filter((c: any) => c.score >= 80).length,
      riskCount: scored.filter((c: any) => c.score < 60).length,
    });
  };
}
export const reportsController = new ReportsController();
