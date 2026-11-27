import { Request, Response } from 'express';
import { UserActivityService } from './user-activity.service.js';

export class UserActivityController {
  static async heartbeat(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.body?.userId || res.locals?.userId) as string;
      if (!userId) {
        res.status(400).json({ success: false, error: 'User ID is required for heartbeat' });
        return;
      }

      const updated = UserActivityService.recordHeartbeat(userId, 30);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const activities = UserActivityService.getAll();
      res.json({ success: true, data: activities });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.body?.userId || res.locals?.userId) as string;
      if (userId) {
        UserActivityService.recordLogout(userId);
      }
      res.json({ success: true, message: 'Session closed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }
}
