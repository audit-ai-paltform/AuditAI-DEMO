import { Request, Response } from 'express';
import { EmailService } from './email.service.js';

export class EmailController {
  static async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = EmailService.getConfig();
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const updated = EmailService.updateConfig(req.body);
      res.json({ success: true, message: 'Email configuration updated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient email is required' });
        return;
      }

      const result = await EmailService.sendEmail({
        to,
        subject: 'Test Email Delivery - AuditAI Automated Email Engine',
        html: `
          <div style="font-family: Arial, sans-serif; background: #08162d; color: #ffffff; padding: 30px; border-radius: 8px;">
            <h3 style="color: #38bdf8;">AuditAI Automated Email System Connected</h3>
            <p>This is a verified test email sent via <strong>${EmailService.getConfig().provider.toUpperCase()}</strong>.</p>
            <p style="color: #bae6fd;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        templateType: 'custom',
      });

      res.json({ success: result.success, message: `Test email dispatched via ${result.provider}`, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendPaymentReminder(req: Request, res: Response): Promise<void> {
    try {
      const { to, userName, planName, amountINR, daysRemaining, expiryDate } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient email is required' });
        return;
      }

      const result = await EmailService.sendPaymentReminderEmail({
        to,
        userName: userName || 'Valued Customer',
        planName: planName || 'Growth Professional',
        amountINR: Number(amountINR) || 9999,
        daysRemaining: Number(daysRemaining) || 3,
        expiryDate: expiryDate || new Date(Date.now() + 3 * 86400000).toLocaleDateString(),
      });

      res.json({
        success: result.success,
        message: `Payment reminder sent to ${to} via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async getLogs(_req: Request, res: Response): Promise<void> {
    try {
      const logs = EmailService.getLogs();
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }
}
