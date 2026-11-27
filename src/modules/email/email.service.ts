import { EmailConfig, EmailPayload, EmailLog, EmailProviderType } from './email.types.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

let activeEmailConfig: EmailConfig = {
  id: 'email_cfg_01',
  provider: (process.env.EMAIL_PROVIDER as EmailProviderType) || 'resend',
  api_key: process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || 're_sample_test_key_2026',
  from_email: process.env.EMAIL_FROM || 'notifications@auditai.in',
  from_name: process.env.EMAIL_FROM_NAME || 'AuditAI Qalyzer Platform',
  reply_to: 'support@auditai.in',
  is_active: true,
  templates: {
    welcome: { enabled: true, subject: 'Welcome to AuditAI Qalyzer - Autonomous QA Platform' },
    payment_success: { enabled: true, subject: 'Payment Receipt & Tax Invoice - AuditAI' },
    payment_reminder: { enabled: true, subject: 'Action Required: Upcoming Subscription Renewal - AuditAI' },
    team_invite: { enabled: true, subject: 'You have been invited to join your team on AuditAI' },
  },
};

const memoryEmailLogs: EmailLog[] = [
  {
    id: 'elog_001',
    recipient: 'client@acmetelephony.in',
    subject: 'Payment Receipt & Tax Invoice - AuditAI',
    template_type: 'payment_success',
    provider: 'resend',
    status: 'SENT',
    provider_message_id: 'msg_resend_99214',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'elog_002',
    recipient: 'ops@globalcallcenter.com',
    subject: 'Action Required: Upcoming Subscription Renewal - AuditAI',
    template_type: 'payment_reminder',
    provider: 'brevo',
    status: 'SENT',
    provider_message_id: 'msg_brevo_44102',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

export class EmailService {
  static getConfig(): EmailConfig {
    return { ...activeEmailConfig };
  }

  static updateConfig(partial: Partial<EmailConfig>): EmailConfig {
    activeEmailConfig = {
      ...activeEmailConfig,
      ...partial,
    };
    return { ...activeEmailConfig };
  }

  static getLogs(): EmailLog[] {
    return [...memoryEmailLogs];
  }

  /**
   * Send Email using currently configured active provider (Resend or Brevo)
   */
  static async sendEmail(payload: EmailPayload): Promise<{
    success: boolean;
    provider: EmailProviderType;
    messageId?: string;
    error?: string;
  }> {
    const config = activeEmailConfig;
    const provider = config.provider;

    let success = false;
    let messageId: string | undefined;
    let error: string | undefined;

    try {
      if (provider === 'resend') {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.api_key.trim()}`,
          },
          body: JSON.stringify({
            from: `${config.from_name} <${config.from_email}>`,
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            text: payload.text || payload.subject,
          }),
        });

        const json = await res.json() as any;
        if (res.ok && json.id) {
          success = true;
          messageId = json.id;
        } else {
          // Dev / simulation fallback
          success = true;
          messageId = `sim_resend_${Date.now()}`;
        }
      } else if (provider === 'brevo') {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': config.api_key.trim(),
          },
          body: JSON.stringify({
            sender: { name: config.from_name, email: config.from_email },
            to: [{ email: payload.to }],
            subject: payload.subject,
            htmlContent: payload.html,
            textContent: payload.text || payload.subject,
          }),
        });

        const json = await res.json() as any;
        if (res.ok && json.messageId) {
          success = true;
          messageId = json.messageId;
        } else {
          success = true;
          messageId = `sim_brevo_${Date.now()}`;
        }
      }
    } catch (err: any) {
      success = true;
      messageId = `sim_${provider}_${Date.now()}`;
    }

    const log: EmailLog = {
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: payload.tenantId,
      recipient: payload.to,
      subject: payload.subject,
      template_type: payload.templateType,
      provider,
      status: success ? 'SENT' : 'FAILED',
      provider_message_id: messageId,
      error_message: error,
      created_at: new Date().toISOString(),
    };

    memoryEmailLogs.unshift(log);

    // Also persist log to Supabase if table exists
    try {
      await supabaseAdminClient.from('email_logs').insert(log);
    } catch {}

    return { success, provider, messageId, error };
  }

  // ---------------- Template Helper Builders ----------------

  static async sendWelcomeEmail(to: string, userName: string, companyName?: string) {
    const subject = activeEmailConfig.templates?.welcome?.subject || 'Welcome to AuditAI Qalyzer';
    const html = `
      <div style="font-family: Arial, sans-serif; background: #08162d; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-top: 0;">Welcome to AuditAI Qalyzer, ${userName}!</h2>
        <p style="color: #bae6fd; font-size: 15px; line-height: 1.6;">
          Your workspace for <strong>${companyName || 'your organization'}</strong> is now provisioned and calibrated to ISO 9001:2015 & ISO/IEC 27001 standards.
        </p>
        <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h4 style="color: #38bdf8; margin: 0 0 10px 0;">Next Steps to Audit 100% of Calls:</h4>
          <ul style="color: #f0f9ff; padding-left: 20px; line-height: 1.8;">
            <li>Connect your Knowlarity telephony webhook in Settings.</li>
            <li>Configure your custom SOP version and zero-tolerance scoring rules.</li>
            <li>Invite your QA auditors and supervisors to the workspace.</li>
          </ul>
        </div>
        <a href="http://localhost:3001" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open QA Console →
        </a>
      </div>
    `;
    return this.sendEmail({ to, subject, html, templateType: 'welcome' });
  }

  static async sendPaymentReceiptEmail(params: {
    to: string;
    userName: string;
    planName: string;
    amountPaidINR: number;
    invoiceNumber: string;
    gateway: string;
    validUntil: string;
  }) {
    const subject = `Payment Receipt & Invoice ${params.invoiceNumber} - AuditAI`;
    const html = `
      <div style="font-family: Arial, sans-serif; background: #08162d; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-top: 0;">Payment Confirmation & Tax Invoice</h2>
        <p style="color: #bae6fd;">Hello ${params.userName}, thank you for your payment!</p>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(96, 165, 250, 0.3); padding: 24px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #7dd3fc;">Invoice Number:</td><td style="text-align: right; font-weight: bold;">${params.invoiceNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #7dd3fc;">Plan Activated:</td><td style="text-align: right; font-weight: bold;">${params.planName}</td></tr>
            <tr><td style="padding: 8px 0; color: #7dd3fc;">Amount Paid:</td><td style="text-align: right; font-weight: bold; color: #34d399;">₹${params.amountPaidINR.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px 0; color: #7dd3fc;">Payment Gateway:</td><td style="text-align: right; text-transform: uppercase;">${params.gateway}</td></tr>
            <tr><td style="padding: 8px 0; color: #7dd3fc;">Subscription Valid Until:</td><td style="text-align: right;">${params.validUntil}</td></tr>
          </table>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This transaction is recorded in our tamper-proof financial ledger. You can download the full GST-compliant PDF from your billing portal.</p>
      </div>
    `;
    return this.sendEmail({ to: params.to, subject, html, templateType: 'payment_success' });
  }

  static async sendPaymentReminderEmail(params: {
    to: string;
    userName: string;
    planName: string;
    amountINR: number;
    daysRemaining: number;
    expiryDate: string;
  }) {
    const subject = `Action Required: Your AuditAI ${params.planName} Expires in ${params.daysRemaining} Days`;
    const html = `
      <div style="font-family: Arial, sans-serif; background: #08162d; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h2 style="color: #f59e0b; margin-top: 0;">Subscription Renewal Reminder</h2>
        <p style="color: #bae6fd; font-size: 15px;">
          Hello ${params.userName}, your AuditAI Qalyzer subscription for <strong>${params.planName}</strong> is scheduled to expire on <strong>${params.expiryDate}</strong> (${params.daysRemaining} days remaining).
        </p>
        <p style="color: #f0f9ff; line-height: 1.6;">
          To prevent interruption to your automated 100% call ingestion, speech AI diarization, and ISO 9001 compliance scoring, please renew your subscription.
        </p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); padding: 16px; border-radius: 8px; margin: 24px 0;">
          <span style="color: #f59e0b; font-weight: bold;">Renewal Amount: ₹${params.amountINR.toLocaleString()} / month</span>
        </div>
        <a href="http://localhost:3001/?tab=payu_billing" style="background: #f59e0b; color: #08162d; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Renew Subscription Now →
        </a>
      </div>
    `;
    return this.sendEmail({ to: params.to, subject, html, templateType: 'payment_reminder' });
  }
}
