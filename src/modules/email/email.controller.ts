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
      res.json({ success: true, message: 'Email automation settings & templates saved.', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, template } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient email is required' });
        return;
      }

      const result = template && EmailService.getConfig().templates[template as keyof ReturnType<typeof EmailService.getConfig>['templates']]
        ? await EmailService.sendFromTemplate(template, to, {
            name: 'Enterprise Test User',
            email: to,
            company: 'Acme Telephony Solutions',
            plan: 'Growth Professional',
            amount: '9,999',
            invoice_number: 'INV-TEST-2026',
            gateway: 'PAYU',
            valid_until: '30 Days',
            due_date: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
            days_remaining: 3,
            payment_link: 'http://localhost:3001/?checkout=Growth%20Professional',
            title: 'Scheduled Edge Infrastructure Upgrade',
            maintenance_window: 'Sunday 02:00 UTC - 02:30 UTC',
            impact: 'Zero downtime expected',
            details: 'Deploying Qalyzer v2.1 voice diarization enhancements.',
            call_id: 'CALL-TEST-9910',
            agent_id: 'AGT-101',
            severity: 'CRITICAL',
            flag_type: 'COMPLIANCE_VIOLATION',
            description: 'Test critical compliance alert simulation.',
            evidence: 'Sample detected phrase for testing alert format.',
            recommended_action: 'Supervisor review required.',
            confidence: 98,
            date: new Date().toLocaleDateString(),
            total_calls: 124,
            avg_score: '92.4',
            critical_flags: 2,
            active_agents: 8,
            top_agent: 'Priya Patel (96%)',
            enquiries_count: 5,
            role: 'Client Administrator',
            login_url: 'http://localhost:3001/',
            console_url: 'http://localhost:3001/?tab=dashboard',
            timestamp: new Date().toLocaleString(),
          })
        : await EmailService.sendEmail({
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
      const { to, userName, planName, amountINR, daysRemaining, expiryDate, paymentLink } = req.body;
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
        paymentLink,
      });

      res.json({
        success: result.success,
        message: `Payment reminder with link sent to ${to} via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendMaintenanceUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { recipients, title, maintenanceWindow, impact, details } = req.body;
      if (!title || !details) {
        res.status(400).json({ success: false, error: 'Title and details are required for platform updates' });
        return;
      }

      const targetRecipients = Array.isArray(recipients)
        ? recipients
        : typeof recipients === 'string' && recipients.trim()
        ? recipients.split(',').map((s: string) => s.trim())
        : ['ALL'];

      const result = await EmailService.sendMaintenanceUpdateEmail({
        recipients: targetRecipients,
        title,
        maintenanceWindow: maintenanceWindow || 'Scheduled Maintenance Window',
        impact: impact || 'Zero service interruption',
        details,
      });

      res.json({
        success: result.success,
        message: `Maintenance / platform update notification dispatched via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendDailyReportNow(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body || {};
      const result = await EmailService.sendDailyReportEmail(to);
      res.json({
        success: result.success,
        message: `Daily executive report sent via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async trackEnquiryClick(req: Request, res: Response): Promise<void> {
    try {
      const { plan, source, email } = req.body || {};
      const result = await EmailService.sendEnquiryClickedEmail({ plan, source, email });
      res.json({ success: true, data: result });
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
