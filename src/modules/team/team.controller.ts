import { Request, Response } from 'express';
import { TeamService } from './team.service.js';

export class TeamController {
  static async getPublicTeam(_req: Request, res: Response): Promise<void> {
    try {
      const team = await TeamService.getAll(true);
      res.json({ success: true, data: team });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async getAdminTeam(_req: Request, res: Response): Promise<void> {
    try {
      const team = await TeamService.getAll(false);
      res.json({ success: true, data: team });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async createMember(req: Request, res: Response): Promise<void> {
    try {
      const created = await TeamService.create(req.body);
      res.status(201).json({ success: true, message: 'Team member created', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async updateMember(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await TeamService.update(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Team member not found' });
        return;
      }
      res.json({ success: true, message: 'Team member updated', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async deleteMember(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const deleted = await TeamService.delete(id);
      res.json({ success: deleted, message: deleted ? 'Team member deleted' : 'Member not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }
}
