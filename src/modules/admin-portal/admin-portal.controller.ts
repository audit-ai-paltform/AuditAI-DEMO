import { Request, Response } from 'express';
import { AdminPortalService } from './admin-portal.service.js';

export class AdminPortalController {
  /**
   * Public: Get Home Page CMS
   */
  static async getPublicHomePageCMS(_req: Request, res: Response): Promise<void> {
    try {
      const cms = AdminPortalService.getHomePageCMS();
      res.status(200).json({ success: true, data: cms });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Public: Inbound Enquiry Submission
   */
  static async submitPublicEnquiry(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, company_name, team_size, service_interest, message, preferred_schedule } = req.body;
      if (!name || !email || !message) {
        res.status(400).json({ success: false, message: 'Name, email, and requirements message are required.' });
        return;
      }

      const enquiry = AdminPortalService.createEnquiry({
        name,
        email,
        phone: phone || '',
        company_name: company_name || 'Individual / Startup',
        team_size,
        service_interest,
        message,
        preferred_schedule,
      });

      res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully. Our team will contact you shortly.',
        data: enquiry,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Get Home Page CMS for editing
   */
  static async getAdminHomePageCMS(_req: Request, res: Response): Promise<void> {
    try {
      const cms = AdminPortalService.getHomePageCMS();
      res.status(200).json({ success: true, data: cms });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Update Home Page CMS
   */
  static async updateAdminHomePageCMS(req: Request, res: Response): Promise<void> {
    try {
      const updated = AdminPortalService.updateHomePageCMS(req.body);
      res.status(200).json({
        success: true,
        message: 'Home Page CMS content updated and published successfully.',
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: List Inbound Enquiries with Lifecycle Filters
   */
  static async listEnquiries(req: Request, res: Response): Promise<void> {
    try {
      const filter = (req.query.status as string) || 'ALL';
      const enquiries = AdminPortalService.listEnquiries(filter);
      res.status(200).json({
        success: true,
        count: enquiries.length,
        data: enquiries,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Update Enquiry Status / Notes
   */
  static async updateEnquiry(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ success: false, message: 'Enquiry ID is required.' });
        return;
      }
      const updated = AdminPortalService.updateEnquiry(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Enquiry not found.' });
        return;
      }
      res.status(200).json({
        success: true,
        message: `Enquiry ${id} updated successfully.`,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: List Platform Users & Access Control
   */
  static async listAccessUsers(req: Request, res: Response): Promise<void> {
    try {
      const userType = req.query.type as string;
      const users = AdminPortalService.listUsers(userType);
      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Add Client or Employee User
   */
  static async addAccessUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, company_name, user_type, role, subscription_tier } = req.body;
      if (!name || !email || !user_type) {
        res.status(400).json({ success: false, message: 'Name, email, and user type are required.' });
        return;
      }

      const newUser = AdminPortalService.addUser({
        name,
        email,
        phone: phone || '',
        company_name: company_name || 'Independent',
        user_type,
        role: role || (user_type === 'client' ? 'Client Administrator' : 'Staff Auditor'),
        subscription_tier,
      });

      res.status(201).json({
        success: true,
        message: `${user_type === 'client' ? 'Client' : 'Employee'} user created successfully.`,
        data: newUser,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Grant or Revoke Access to Client or Employee
   */
  static async updateUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ success: false, message: 'User ID is required.' });
        return;
      }
      const updated = AdminPortalService.updateUserAccess(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'User record not found.' });
        return;
      }
      res.status(200).json({
        success: true,
        message: `User access status updated to ${updated.status}.`,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: Universal Search across Name / Email / Company Name / Phone
   */
  static async universalSearch(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const results = AdminPortalService.universalSearch(q);
      res.status(200).json({
        success: true,
        count: results.length,
        query: q,
        data: results,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Admin: One-Click Send Automated Payment Reminder
   */
  static async sendPaymentReminder(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId is required.' });
        return;
      }

      const result = AdminPortalService.sendPaymentReminder(userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
