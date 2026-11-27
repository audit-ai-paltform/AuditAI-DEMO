import { Request, Response } from 'express';
import { EmailService } from './email.service.js';

function splitEmails(val?: string | string[]): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => s.trim()).filter(Boolean);
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

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
      res.json({ success: true, message: 'Email automation settings, branding & templates saved.', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { key, subject, body, logo_url, logo_placement, signature_html, signature_placement, selected_domain, from_name } = req.body;
      const preview = EmailService.previewTemplate({
        key: key || 'enquiry_submitted',
        subject,
        body,
        logo_url,
        logo_placement,
        signature_html,
        signature_placement,
        selected_domain,
        from_name,
      });
      res.json({ success: true, data: preview });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const yearParam = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const stats = EmailService.getAuditStats(yearParam && !isNaN(yearParam) ? yearParam : undefined);
      const scheduled = EmailService.getScheduledEmails();
      res.json({ success: true, data: { ...stats, scheduled } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async scheduleEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, cc, bcc, template, subject, html, scheduledAt, provider, fromDomain } = req.body;
      if (!to || !scheduledAt) {
        res.status(400).json({ success: false, error: 'Recipient and scheduledAt date/time are required' });
        return;
      }

      if (template) {
        const preview = EmailService.previewTemplate({ key: template, subject, body: html });
        const job = EmailService.scheduleEmail(
          {
            to: splitEmails(to),
            cc: splitEmails(cc),
            bcc: splitEmails(bcc),
            subject: preview.subject,
            html: preview.html,
            templateType: template,
            provider,
            fromDomain,
          },
          scheduledAt,
        );
        res.json({ success: true, message: `Email scheduled for ${new Date(scheduledAt).toLocaleString()}`, data: job });
        return;
      }

      const job = EmailService.scheduleEmail(
        {
          to: splitEmails(to),
          cc: splitEmails(cc),
          bcc: splitEmails(bcc),
          subject: subject || 'Scheduled AuditAI Notification',
          html: html || '<p>Scheduled Notification</p>',
          templateType: 'custom',
          provider,
          fromDomain,
        },
        scheduledAt,
      );
      res.json({ success: true, message: `Email scheduled for ${new Date(scheduledAt).toLocaleString()}`, data: job });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message });
    }
  }

  static async cancelScheduled(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ success: false, error: 'Job ID required' });
        return;
      }
      const ok = EmailService.cancelScheduledEmail(id);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Scheduled job not found or already processed' });
        return;
      }
      res.json({ success: true, message: 'Scheduled email cancelled' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, cc, bcc, template, provider, fromDomain, scheduledAt } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient email is required' });
        return;
      }

      const templates = EmailService.getConfig().templates;
      const result =
        template && templates[template as keyof typeof templates]
          ? await EmailService.sendFromTemplate(
              template,
              splitEmails(to),
              {
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
              },
              {
                cc: splitEmails(cc),
                bcc: splitEmails(bcc),
                provider,
                fromDomain,
                scheduledAt,
              },
            )
          : await EmailService.sendEmail({
              to: splitEmails(to),
              cc: splitEmails(cc),
              bcc: splitEmails(bcc),
              subject: 'Test Email Delivery - AuditAI Automated Email Engine',
              html: `<p>Verified test email dispatched via <strong>${(provider || EmailService.getConfig().provider).toUpperCase()}</strong>.</p>`,
              templateType: 'custom',
              provider,
              fromDomain,
              scheduledAt,
            });

      res.json({
        success: result.success,
        message: scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}` : `Test email dispatched via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendPaymentReminder(req: Request, res: Response): Promise<void> {
    try {
      const { to, cc, bcc, userName, planName, amountINR, daysRemaining, expiryDate, paymentLink, provider, fromDomain, scheduledAt } = req.body;
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
        cc: splitEmails(cc),
        bcc: splitEmails(bcc),
        provider,
        fromDomain,
        scheduledAt,
      });

      res.json({
        success: result.success,
        message: scheduledAt
          ? `Payment reminder scheduled for ${new Date(scheduledAt).toLocaleString()}`
          : `Payment reminder with link sent to ${to} via ${result.provider}`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  }

  static async sendMaintenanceUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { recipients, cc, bcc, title, maintenanceWindow, impact, details, provider, fromDomain, scheduledAt } = req.body;
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
        cc: splitEmails(cc),
        bcc: splitEmails(bcc),
        title,
        maintenanceWindow: maintenanceWindow || 'Scheduled Maintenance Window',
        impact: impact || 'Zero service interruption',
        details,
        provider,
        fromDomain,
        scheduledAt,
      });

      res.json({
        success: result.success,
        message: scheduledAt
          ? `Maintenance update scheduled for ${new Date(scheduledAt).toLocaleString()}`
          : `Maintenance / platform update notification dispatched via ${result.provider}`,
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
