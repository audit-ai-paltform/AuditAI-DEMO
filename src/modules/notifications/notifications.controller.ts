import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { notificationService } from './notifications.service.js';

export class NotificationController extends BaseController {
  private getTenantId(req: Request, res: Response): string {
    const fromLocals = res.locals.tenantId as string | undefined;
    if (fromLocals) return fromLocals;
    return (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || (req.body?.tenant_id as string) || '';
  }

  public list = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.list(tenantId, unreadOnly);
    return this.ok(res, notifications);
  };

  public markRead = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const tenantId = this.getTenantId(req, res);
    await notificationService.markRead(tenantId, id);
    return this.ok(res, { message: 'Notification marked as read' });
  };

  public markAllRead = async (req: Request, res: Response): Promise<Response> => {
    const tenantId = this.getTenantId(req, res);
    await notificationService.markAllRead(tenantId);
    return this.ok(res, { message: 'All notifications marked as read' });
  };
}

export const notificationController = new NotificationController();
