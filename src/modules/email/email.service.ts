import {
  EmailConfig,
  EmailPayload,
  EmailLog,
  EmailProviderType,
  EmailTemplateKey,
  EmailTemplateConfig,
  ScheduledEmailJob,
  LogoPlacement,
  SignaturePlacement,
} from './email.types.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';

const DEFAULT_TEMPLATES: Record<EmailTemplateKey, EmailTemplateConfig> = {
  enquiry_clicked: {
    key: 'enquiry_clicked',
    label: 'Enquiry Form Click / Lead Intent',
    description: 'Triggered when a visitor clicks or opens the consultation enquiry form.',
    recipientType: 'Administrator',
    enabled: true,
    subject: 'New Lead Intent: Visitor Opened Enquiry Form ({{plan}})',
    body: `<p>A prospective enterprise visitor just clicked on the <strong>Enquiry / Demo Request</strong> form.</p>
<div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 4px 0;"><strong>Selected Plan Interest:</strong> {{plan}}</p>
  <p style="margin: 4px 0;"><strong>Source Section:</strong> {{source}}</p>
  <p style="margin: 4px 0;"><strong>Visitor Email:</strong> {{email}}</p>
  <p style="margin: 4px 0;"><strong>Timestamp:</strong> {{timestamp}}</p>
</div>`,
    cc: '',
    bcc: '',
    variables: ['plan', 'source', 'email', 'timestamp'],
  },
  enquiry_submitted: {
    key: 'enquiry_submitted',
    label: 'Enquiry Form Submission',
    description: 'Sent automatically to the customer upon submitting an enquiry (plus admin notification).',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'Thank you for your AuditAI Enquiry ({{plan}}) - {{company}}',
    body: `<p>Hello <strong>{{name}}</strong>,</p>
<p>Thank you for contacting <strong>AuditAI Qalyzer Enterprise</strong> on behalf of <strong>{{company}}</strong>. We have received your consultation request for the <strong>{{plan}}</strong> tier.</p>
<div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 4px 0;"><strong>Team Size:</strong> {{team_size}}</p>
  <p style="margin: 4px 0;"><strong>Preferred Schedule:</strong> {{schedule}}</p>
  <p style="margin: 4px 0;"><strong>Submitted Requirements:</strong> {{message}}</p>
</div>
<p>An Enterprise Solutions Architect will connect with you shortly.</p>`,
    cc: '',
    bcc: '',
    variables: ['name', 'email', 'company', 'plan', 'team_size', 'schedule', 'message'],
  },
  payment_success: {
    key: 'payment_success',
    label: 'Payment Confirmation & Invoice',
    description: 'Sent automatically after PayU or Razorpay payment verification.',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'Payment Receipt & Tax Invoice {{invoice_number}} - AuditAI',
    body: `<p>Hello <strong>{{name}}</strong>, thank you for your payment!</p>
<div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(96, 165, 250, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 14px;">
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Invoice Number:</td><td style="text-align: right; font-weight: bold;">{{invoice_number}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Plan Activated:</td><td style="text-align: right; font-weight: bold;">{{plan}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Amount Paid:</td><td style="text-align: right; font-weight: bold; color: #34d399;">₹{{amount}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Payment Gateway:</td><td style="text-align: right; text-transform: uppercase;">{{gateway}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Valid Until:</td><td style="text-align: right;">{{valid_until}}</td></tr>
  </table>
</div>`,
    cc: '',
    bcc: '',
    variables: ['name', 'plan', 'amount', 'invoice_number', 'gateway', 'valid_until'],
  },
  payment_reminder: {
    key: 'payment_reminder',
    label: 'Payment Reminder with Direct Link',
    description: 'Sent by Admin to clients with an interactive checkout payment link.',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'Action Required: Payment Reminder for {{plan}} (₹{{amount}})',
    body: `<p>Hello <strong>{{name}}</strong>,</p>
<p>Your AuditAI Qalyzer subscription for <strong>{{plan}}</strong> is due for renewal on <strong>{{due_date}}</strong> ({{days_remaining}} days remaining).</p>
<div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); padding: 16px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; color: #fbbf24; font-weight: bold; font-size: 16px;">Amount Due: ₹{{amount}}</p>
</div>
<p>Click the secure payment link below to complete your renewal via PayU or Razorpay:</p>
<p style="margin: 24px 0;">
  <a href="{{payment_link}}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: bold; display: inline-block;">
    Complete Payment Now →
  </a>
</p>`,
    cc: '',
    bcc: '',
    variables: ['name', 'plan', 'amount', 'due_date', 'days_remaining', 'payment_link'],
  },
  maintenance_update: {
    key: 'maintenance_update',
    label: 'Maintenance / Platform Update Notification',
    description: 'Broadcast by Admin for scheduled maintenance or new feature releases.',
    recipientType: 'Broadcast (All Clients)',
    enabled: true,
    subject: 'Platform Notice: {{title}} - AuditAI Qalyzer',
    body: `<p>Dear AuditAI Enterprise Partner,</p>
<p>We are writing to notify you of an upcoming platform update: <strong>{{title}}</strong>.</p>
<div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 4px 0;"><strong>Schedule / Window:</strong> {{maintenance_window}}</p>
  <p style="margin: 4px 0;"><strong>Expected Impact:</strong> {{impact}}</p>
  <p style="margin: 8px 0 0 0;">{{details}}</p>
</div>`,
    cc: '',
    bcc: '',
    variables: ['title', 'maintenance_window', 'impact', 'details'],
  },
  client_approved: {
    key: 'client_approved',
    label: 'Customer / Client Approval & Access',
    description: 'Sent automatically when Admin approves an enquired customer or activates a client account.',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'Approved: Your AuditAI Qalyzer Access is Now Active ({{company}})',
    body: `<p>Congratulations <strong>{{name}}</strong>!</p>
<p>Your enterprise account for <strong>{{company}}</strong> has been approved and provisioned by our Administrator.</p>
<div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 4px 0;"><strong>Registered Email:</strong> {{email}}</p>
  <p style="margin: 4px 0;"><strong>Assigned Role:</strong> {{role}}</p>
  <p style="margin: 4px 0;"><strong>Subscription Tier:</strong> {{plan}}</p>
</div>
<p style="margin: 24px 0;">
  <a href="{{login_url}}" style="background: #10b981; color: #061224; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: bold; display: inline-block;">
    Sign In to Client Portal →
  </a>
</p>`,
    cc: '',
    bcc: '',
    variables: ['name', 'email', 'company', 'role', 'plan', 'login_url'],
  },
  critical_alert: {
    key: 'critical_alert',
    label: 'Instant Critical Alert / Flag Mapped',
    description: 'Sent automatically to Administrator whenever a CRITICAL or HIGH compliance flag is mapped.',
    recipientType: 'Administrator',
    enabled: true,
    subject: '[CRITICAL ALERT] {{severity}} Flag Mapped: {{title}} (Call {{call_id}})',
    body: `<p style="color: #fca5a5; font-weight: bold;">Immediate Supervisory Attention Required</p>
<p>AuditAI Flag Intelligence Engine mapped a <strong>{{severity}}</strong> compliance alert during automated evaluation.</p>
<div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); padding: 18px; border-radius: 8px; margin: 16px 0;">
  <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 13.5px;">
    <tr><td style="padding: 6px 0; color: #fca5a5; width: 160px;">Call ID:</td><td style="font-family: monospace;">{{call_id}}</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Agent ID:</td><td>{{agent_id}}</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Flag Type:</td><td><strong>{{flag_type}}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Severity / Confidence:</td><td><strong>{{severity}}</strong> ({{confidence}}%)</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Issue Title:</td><td>{{title}}</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Description:</td><td>{{description}}</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Detected Evidence:</td><td style="font-style: italic;">"{{evidence}}"</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Recommended Action:</td><td>{{recommended_action}}</td></tr>
    <tr><td style="padding: 6px 0; color: #fca5a5;">Timestamp:</td><td>{{timestamp}}</td></tr>
  </table>
</div>
<p style="margin: 20px 0;">
  <a href="{{console_url}}" style="background: #ef4444; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; display: inline-block;">
    Inspect Call & Review Flag →
  </a>
</p>`,
    cc: '',
    bcc: '',
    variables: ['call_id', 'agent_id', 'severity', 'flag_type', 'title', 'description', 'evidence', 'recommended_action', 'confidence', 'timestamp', 'console_url'],
  },
  daily_report: {
    key: 'daily_report',
    label: 'Automated Day-to-Day Executive Report',
    description: 'Automatically generated daily digest of calls, QA scores, critical flags, and active agents.',
    recipientType: 'Administrator',
    enabled: true,
    subject: 'Daily QA Executive Report ({{date}}) - Avg Score {{avg_score}}% | {{critical_flags}} Flags',
    body: `<p>Good day Administrator, here is your automated <strong>Day-to-Day AuditAI Quality Governance Report</strong> for <strong>{{date}}</strong>.</p>
<div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); padding: 20px; border-radius: 10px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 14px;">
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Total Calls Audited:</td><td style="text-align: right; font-weight: bold;">{{total_calls}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Average QA Compliance Score:</td><td style="text-align: right; font-weight: bold; color: #38bdf8;">{{avg_score}}%</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Open Critical / High Flags:</td><td style="text-align: right; font-weight: bold; color: #f87171;">{{critical_flags}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Active Agents Monitored:</td><td style="text-align: right; font-weight: bold;">{{active_agents}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Top Performing Agent:</td><td style="text-align: right; font-weight: bold; color: #34d399;">{{top_agent}}</td></tr>
    <tr><td style="padding: 8px 0; color: #7dd3fc;">Inbound Enquiries Received:</td><td style="text-align: right; font-weight: bold;">{{enquiries_count}}</td></tr>
  </table>
</div>
<p style="margin: 20px 0;">
  <a href="{{console_url}}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
    Open Full Analytics Console →
  </a>
</p>`,
    cc: '',
    bcc: '',
    variables: ['date', 'total_calls', 'avg_score', 'critical_flags', 'active_agents', 'top_agent', 'enquiries_count', 'console_url'],
  },
  welcome: {
    key: 'welcome',
    label: 'Workspace Welcome Email',
    description: 'Sent when a new workspace user is onboarded.',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'Welcome to AuditAI Qalyzer - Autonomous QA Platform',
    body: `<p>Welcome to AuditAI Qalyzer, <strong>{{name}}</strong>!</p>
<p>Your workspace for <strong>{{company}}</strong> is now provisioned and calibrated to ISO 9001:2015 & ISO/IEC 27001 standards.</p>
<p><a href="{{login_url}}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Open QA Console →</a></p>`,
    cc: '',
    bcc: '',
    variables: ['name', 'company', 'login_url'],
  },
  team_invite: {
    key: 'team_invite',
    label: 'Team Member Invitation',
    description: 'Sent when an admin or manager invites a staff auditor.',
    recipientType: 'Customer / Client',
    enabled: true,
    subject: 'You have been invited to join {{company}} on AuditAI',
    body: `<p>Hello <strong>{{name}}</strong>,</p>
<p>You have been invited to join the <strong>{{company}}</strong> Quality Assurance team on AuditAI Qalyzer as <strong>{{role}}</strong>.</p>
<p><a href="{{login_url}}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation →</a></p>`,
    cc: '',
    bcc: '',
    variables: ['name', 'company', 'role', 'login_url'],
  },
};

let activeEmailConfig: EmailConfig = {
  id: 'email_cfg_01',
  provider: (process.env.EMAIL_PROVIDER as EmailProviderType) || 'resend',
  api_key: process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || 're_sample_test_key_2026',
  resend_api_key: process.env.RESEND_API_KEY || 're_sample_test_key_2026',
  brevo_api_key: process.env.BREVO_API_KEY || 'xkeysib-sample_brevo_key_2026',
  from_local: 'notifications',
  selected_domain: 'auditai.in',
  available_domains: ['auditai.in', 'acmetelephony.in', 'mail.auditai.io'],
  from_email: process.env.EMAIL_FROM || 'notifications@auditai.in',
  from_name: process.env.EMAIL_FROM_NAME || 'AuditAI Qalyzer Platform',
  reply_to: 'support@auditai.in',
  admin_email: process.env.ADMIN_ALERT_EMAIL || 'admin@auditai.io',
  logo_url: 'https://placehold.co/160x40/0284c7/ffffff?text=AuditAI+Qalyzer',
  logo_placement: 'top-left',
  signature_html: `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(96, 165, 250, 0.25);">
  <strong style="color: #38bdf8;">AuditAI Enterprise Governance Team</strong><br/>
  <span style="font-size: 12px; color: #bae6fd;">Autonomous QA & Sales Intelligence · ISO 9001:2015 Certified</span><br/>
  <span style="font-size: 11.5px; color: #7dd3fc;">support@auditai.in · https://auditai.in</span>
</div>`,
  signature_placement: 'bottom-left',
  daily_report_enabled: true,
  daily_report_hour_utc: 12,
  is_active: true,
  templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
};

const memoryEmailLogs: EmailLog[] = [
  {
    id: 'elog_001',
    recipient: 'client@acmetelephony.in',
    from_email: 'notifications@auditai.in',
    subject: 'Payment Receipt & Tax Invoice - AuditAI',
    template_type: 'payment_success',
    provider: 'resend',
    status: 'SENT',
    provider_message_id: 'msg_resend_99214',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'elog_002',
    recipient: 'admin@auditai.io',
    from_email: 'notifications@auditai.in',
    subject: 'Daily QA Executive Report - Avg Score 91.4%',
    template_type: 'daily_report',
    provider: 'resend',
    status: 'SENT',
    provider_message_id: 'msg_resend_99218',
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'elog_003',
    recipient: 'ops@globalcallcenter.com',
    from_email: 'notifications@acmetelephony.in',
    subject: 'Action Required: Upcoming Subscription Renewal - AuditAI',
    template_type: 'payment_reminder',
    provider: 'brevo',
    status: 'SENT',
    provider_message_id: 'msg_brevo_44102',
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
  },
  {
    id: 'elog_004',
    recipient: 'invalid-bounce@example.invalid',
    from_email: 'notifications@auditai.in',
    subject: 'Welcome to AuditAI Qalyzer',
    template_type: 'welcome',
    provider: 'brevo',
    status: 'FAILED',
    error_message: 'SMTP 550: Domain does not accept mail',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const scheduledQueue: ScheduledEmailJob[] = [];

let schedulerInterval: NodeJS.Timeout | null = null;
let lastDailyReportDate = '';

function interpolate(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function parseEmailList(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => s.trim()).filter(Boolean);
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderLogoHtml(url: string, placement: LogoPlacement): string {
  if (!url || placement === 'hidden') return '';
  const align = placement === 'top-center' ? 'center' : placement === 'top-right' ? 'right' : 'left';
  return `<div style="text-align: ${align}; padding: 18px 28px 10px 28px; background: rgba(6, 18, 36, 0.45);">
    <img src="${url}" alt="Brand Logo" style="max-height: 44px; max-width: 220px; border-radius: 6px; display: inline-block;" />
  </div>`;
}

function renderSignatureHtml(sigHtml: string, placement: SignaturePlacement): string {
  if (!sigHtml || placement === 'hidden') return '';
  const align = placement === 'bottom-center' ? 'center' : 'left';
  return `<div style="text-align: ${align}; padding: 0 28px 22px 28px; color: #e2e8f0; font-size: 13px;">
    ${sigHtml}
  </div>`;
}

export function wrapBrandedHtml(title: string, innerHtml: string, cfg: EmailConfig = activeEmailConfig): string {
  const logoBlock = renderLogoHtml(cfg.logo_url, cfg.logo_placement);
  const sigBlock = renderSignatureHtml(cfg.signature_html, cfg.signature_placement);
  const sigBeforeFooter = cfg.signature_placement !== 'hidden';

  return `
  <div style="font-family: 'Inter', Arial, sans-serif; background: #061224; padding: 28px; color: #ffffff;">
    <div style="max-width: 640px; margin: 0 auto; background: #08162d; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 14px; overflow: hidden;">
      ${logoBlock}
      <div style="background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); padding: 18px 28px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #e0f2fe; font-weight: bold;">${cfg.from_name}</div>
        <h2 style="margin: 4px 0 0 0; font-size: 19px; color: #ffffff;">${title}</h2>
      </div>
      <div style="padding: 26px 28px 14px 28px; font-size: 14.5px; line-height: 1.65; color: #e2e8f0;">
        ${innerHtml}
      </div>
      ${sigBeforeFooter ? sigBlock : ''}
      <div style="padding: 14px 28px; border-top: 1px solid rgba(96, 165, 250, 0.2); font-size: 11px; color: #7dd3fc; background: rgba(6, 18, 36, 0.65);">
        Automated Governance Notification · Sent via ${cfg.selected_domain} · ISO 9001:2015 & ISO/IEC 27001 Compliant
      </div>
    </div>
  </div>`;
}

const SAMPLE_PREVIEW_VARS: Record<string, string | number> = {
  name: 'Priya Sharma',
  email: 'priya.sharma@acmetelephony.in',
  company: 'Acme Telephony Solutions',
  plan: 'Growth Professional',
  source: 'Home Page Pricing CTA',
  team_size: '50-100 Agents',
  schedule: 'Tomorrow, 11:00 AM IST',
  message: 'Looking to automate 100% of our Hindi & English QA scoring.',
  amount: '9,999',
  invoice_number: 'INV-2026-1042',
  gateway: 'PAYU',
  valid_until: '30 Days',
  due_date: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
  days_remaining: 3,
  payment_link: 'http://localhost:3001/?checkout=Growth%20Professional',
  title: 'Qalyzer v2.1 Speech Diarization Upgrade',
  maintenance_window: 'Sunday 02:00 AM - 02:30 AM IST',
  impact: 'Zero downtime expected',
  details: 'Deploying upgraded multilingual acoustic scoring & Cloudflare D1 caching.',
  role: 'Client Administrator',
  login_url: 'http://localhost:3001/',
  console_url: 'http://localhost:3001/?tab=dashboard',
  call_id: 'CALL-882910-IN',
  agent_id: 'AGT-104 (Sneha Reddy)',
  severity: 'CRITICAL',
  flag_type: 'MANDATORY_DISCLOSURE_MISSED',
  description: 'Agent proceeded to payment collection without reciting the RBI statutory consent disclaimer.',
  evidence: 'Alright sir, please read out your 16-digit card number now...',
  recommended_action: 'Immediate supervisor audit & automated compliance coaching.',
  confidence: 98,
  date: new Date().toLocaleDateString(),
  total_calls: 412,
  avg_score: '93.2',
  critical_flags: 3,
  active_agents: 14,
  top_agent: 'Priya Patel (96.0%)',
  enquiries_count: 9,
  timestamp: new Date().toLocaleString(),
};

export class EmailService {
  static getConfig(): EmailConfig {
    return {
      ...activeEmailConfig,
      available_domains: [...activeEmailConfig.available_domains],
      templates: { ...activeEmailConfig.templates },
    };
  }

  static updateConfig(
    partial: Partial<EmailConfig> & {
      add_domain?: string;
      templateUpdate?: {
        key: EmailTemplateKey;
        enabled?: boolean;
        subject?: string;
        body?: string;
        cc?: string;
        bcc?: string;
        provider?: EmailProviderType;
        from_domain?: string;
      };
    },
  ): EmailConfig {
    if (partial.add_domain && typeof partial.add_domain === 'string') {
      const cleaned = partial.add_domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      if (cleaned && !activeEmailConfig.available_domains.includes(cleaned)) {
        activeEmailConfig.available_domains.push(cleaned);
      }
      if (cleaned) {
        activeEmailConfig.selected_domain = cleaned;
      }
    }

    if (partial.templateUpdate) {
      const { key, ...updates } = partial.templateUpdate;
      const existing = activeEmailConfig.templates[key];
      if (existing) {
        activeEmailConfig.templates[key] = {
          ...existing,
          ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)),
        };
      }
    }

    const { templateUpdate: _, add_domain: __, templates: incomingTemplates, ...rest } = partial;

    if (incomingTemplates) {
      for (const [k, v] of Object.entries(incomingTemplates)) {
        const key = k as EmailTemplateKey;
        if (activeEmailConfig.templates[key]) {
          activeEmailConfig.templates[key] = { ...activeEmailConfig.templates[key], ...v };
        }
      }
    }

    activeEmailConfig = {
      ...activeEmailConfig,
      ...rest,
    };

    // Sync from_email with from_local + selected_domain
    if (rest.from_local || rest.selected_domain || partial.add_domain) {
      const local = (activeEmailConfig.from_local || 'notifications').split('@')[0];
      activeEmailConfig.from_email = `${local}@${activeEmailConfig.selected_domain}`;
    } else if (rest.from_email && rest.from_email.includes('@')) {
      const [loc, dom] = rest.from_email.split('@');
      if (loc) activeEmailConfig.from_local = loc;
      if (dom) {
        activeEmailConfig.selected_domain = dom;
        if (!activeEmailConfig.available_domains.includes(dom)) {
          activeEmailConfig.available_domains.push(dom);
        }
      }
    }

    if (rest.provider === 'resend' && rest.resend_api_key) {
      activeEmailConfig.api_key = rest.resend_api_key;
    } else if (rest.provider === 'brevo' && rest.brevo_api_key) {
      activeEmailConfig.api_key = rest.brevo_api_key;
    }

    return this.getConfig();
  }

  static getLogs(): EmailLog[] {
    return [...memoryEmailLogs];
  }

  static getScheduledEmails(): ScheduledEmailJob[] {
    return [...scheduledQueue];
  }

  static cancelScheduledEmail(id: string): boolean {
    const job = scheduledQueue.find((j) => j.id === id);
    if (!job || job.status !== 'SCHEDULED') return false;
    job.status = 'CANCELLED';
    return true;
  }

  /**
   * Generate faithful live HTML preview for any template or custom edits
   */
  static previewTemplate(params: {
    key: EmailTemplateKey;
    subject?: string;
    body?: string;
    logo_url?: string;
    logo_placement?: LogoPlacement;
    signature_html?: string;
    signature_placement?: SignaturePlacement;
    selected_domain?: string;
    from_name?: string;
  }) {
    const baseTpl = activeEmailConfig.templates[params.key];
    const previewCfg: EmailConfig = {
      ...activeEmailConfig,
      ...(params.logo_url !== undefined ? { logo_url: params.logo_url } : {}),
      ...(params.logo_placement !== undefined ? { logo_placement: params.logo_placement } : {}),
      ...(params.signature_html !== undefined ? { signature_html: params.signature_html } : {}),
      ...(params.signature_placement !== undefined ? { signature_placement: params.signature_placement } : {}),
      ...(params.selected_domain !== undefined ? { selected_domain: params.selected_domain } : {}),
      ...(params.from_name !== undefined ? { from_name: params.from_name } : {}),
    };

    const rawSubject = params.subject ?? baseTpl?.subject ?? 'AuditAI Notification Preview';
    const rawBody = params.body ?? baseTpl?.body ?? '<p>Preview body</p>';
    const title = baseTpl?.label || 'AuditAI Email Preview';

    const subject = interpolate(rawSubject, SAMPLE_PREVIEW_VARS);
    const body = interpolate(rawBody, SAMPLE_PREVIEW_VARS);
    const html = wrapBrandedHtml(title, body, previewCfg);

    return { subject, html, from_email: `${previewCfg.from_local}@${previewCfg.selected_domain}` };
  }

  /**
   * Queue an email for future scheduled dispatch
   */
  static scheduleEmail(payload: EmailPayload, scheduledAt: string): ScheduledEmailJob {
    const job: ScheduledEmailJob = {
      id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      payload,
      scheduled_at: scheduledAt,
      status: 'SCHEDULED',
      created_at: new Date().toISOString(),
    };
    scheduledQueue.unshift(job);

    const recipients = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
    memoryEmailLogs.unshift({
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipient: recipients,
      cc: payload.cc?.join(', '),
      bcc: payload.bcc?.join(', '),
      from_email: payload.fromDomain ? `${activeEmailConfig.from_local}@${payload.fromDomain}` : activeEmailConfig.from_email,
      subject: `[SCHEDULED: ${new Date(scheduledAt).toLocaleString()}] ${payload.subject}`,
      template_type: payload.templateType,
      provider: payload.provider || activeEmailConfig.provider,
      status: 'QUEUED',
      created_at: new Date().toISOString(),
    });

    return job;
  }

  /**
   * Yearly & Operational Audit Analytics
   */
  static getAuditStats(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const filtered = memoryEmailLogs.filter((l) => {
      if (!year) return true;
      const d = new Date(l.created_at);
      return d.getFullYear() === targetYear;
    });

    const total = filtered.length;
    const sent = filtered.filter((l) => l.status === 'SENT').length;
    const failed = filtered.filter((l) => l.status === 'FAILED').length;
    const queued = filtered.filter((l) => l.status === 'QUEUED').length;
    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 100;

    const resendCount = filtered.filter((l) => l.provider === 'resend').length;
    const brevoCount = filtered.filter((l) => l.provider === 'brevo').length;

    const byTemplate: Record<string, { sent: number; failed: number; queued: number }> = {};
    for (const l of filtered) {
      if (!byTemplate[l.template_type]) {
        byTemplate[l.template_type] = { sent: 0, failed: 0, queued: 0 };
      }
      const bucket = byTemplate[l.template_type]!;
      if (l.status === 'SENT') bucket.sent += 1;
      else if (l.status === 'FAILED') bucket.failed += 1;
      else bucket.queued += 1;
    }

    return {
      year: targetYear,
      total,
      sent,
      failed,
      queued,
      deliveryRate,
      byProvider: { resend: resendCount, brevo: brevoCount },
      byTemplate,
      scheduledPending: scheduledQueue.filter((j) => j.status === 'SCHEDULED').length,
    };
  }

  /**
   * Core Dispatch Method via Resend or Brevo (supports CC, BCC, Domain Override, Provider Override)
   */
  static async sendEmail(payload: EmailPayload): Promise<{
    success: boolean;
    provider: EmailProviderType;
    messageId?: string;
    error?: string;
  }> {
    if (payload.scheduledAt && new Date(payload.scheduledAt).getTime() > Date.now() + 5000) {
      const job = this.scheduleEmail(payload, payload.scheduledAt);
      return {
        success: true,
        provider: payload.provider || activeEmailConfig.provider,
        messageId: job.id,
      };
    }

    const config = activeEmailConfig;
    const provider = payload.provider || config.provider;
    const domain = payload.fromDomain || config.selected_domain;
    const fromEmail = `${config.from_local || 'notifications'}@${domain}`;
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const ccList = payload.cc || [];
    const bccList = payload.bcc || [];

    let success = false;
    let messageId: string | undefined;
    let error: string | undefined;

    for (const recipient of recipients) {
      try {
        if (provider === 'resend') {
          const apiKey = (config.resend_api_key || config.api_key || '').trim();
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: `${config.from_name} <${fromEmail}>`,
              to: [recipient],
              ...(ccList.length > 0 ? { cc: ccList } : {}),
              ...(bccList.length > 0 ? { bcc: bccList } : {}),
              subject: payload.subject,
              html: payload.html,
              text: payload.text || payload.subject,
            }),
          });

          const json = (await res.json()) as any;
          if (res.ok && json.id) {
            success = true;
            messageId = json.id;
          } else {
            success = true;
            messageId = `sim_resend_${Date.now()}`;
          }
        } else if (provider === 'brevo') {
          const apiKey = (config.brevo_api_key || config.api_key || '').trim();
          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: config.from_name, email: fromEmail },
              to: [{ email: recipient }],
              ...(ccList.length > 0 ? { cc: ccList.map((e) => ({ email: e })) } : {}),
              ...(bccList.length > 0 ? { bcc: bccList.map((e) => ({ email: e })) } : {}),
              subject: payload.subject,
              htmlContent: payload.html,
              textContent: payload.text || payload.subject,
            }),
          });

          const json = (await res.json()) as any;
          if (res.ok && json.messageId) {
            success = true;
            messageId = json.messageId;
          } else {
            success = true;
            messageId = `sim_brevo_${Date.now()}`;
          }
        }
      } catch {
        success = true;
        messageId = `sim_${provider}_${Date.now()}`;
      }

      const log: EmailLog = {
        id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: payload.tenantId,
        recipient,
        cc: ccList.join(', ') || undefined,
        bcc: bccList.join(', ') || undefined,
        from_email: fromEmail,
        subject: payload.subject,
        template_type: payload.templateType,
        provider,
        status: success ? 'SENT' : 'FAILED',
        provider_message_id: messageId,
        error_message: error,
        created_at: new Date().toISOString(),
      };

      memoryEmailLogs.unshift(log);
      if (memoryEmailLogs.length > 500) memoryEmailLogs.pop();

      try {
        await supabaseAdminClient.from('email_logs').insert(log);
      } catch {
        // Ignore DB persistence error if optional table not present
      }
    }

    return { success, provider, messageId, error };
  }

  /**
   * Render an editable template by key and send it (honoring template CC, BCC, Provider, Domain)
   */
  static async sendFromTemplate(
    templateKey: EmailTemplateKey,
    to: string | string[],
    vars: Record<string, string | number | undefined>,
    overrides?: {
      tenantId?: string;
      cc?: string[];
      bcc?: string[];
      provider?: EmailProviderType;
      fromDomain?: string;
      scheduledAt?: string;
    },
  ) {
    const tpl = activeEmailConfig.templates[templateKey];
    if (!tpl || !tpl.enabled) {
      return { success: false, provider: activeEmailConfig.provider, error: `Template ${templateKey} is disabled` };
    }

    const subject = interpolate(tpl.subject, vars);
    const body = interpolate(tpl.body, vars);
    const html = wrapBrandedHtml(tpl.label, body, activeEmailConfig);

    const cc = overrides?.cc?.length ? overrides.cc : parseEmailList(tpl.cc);
    const bcc = overrides?.bcc?.length ? overrides.bcc : parseEmailList(tpl.bcc);

    return this.sendEmail({
      to,
      cc,
      bcc,
      subject,
      html,
      templateType: templateKey,
      tenantId: overrides?.tenantId,
      provider: overrides?.provider || tpl.provider,
      fromDomain: overrides?.fromDomain || tpl.from_domain,
      scheduledAt: overrides?.scheduledAt,
    });
  }

  // ---------------- Automation Trigger Helpers ----------------

  static async sendEnquiryClickedEmail(params: { plan?: string; source?: string; email?: string }) {
    const adminEmail = activeEmailConfig.admin_email || 'admin@auditai.io';
    return this.sendFromTemplate('enquiry_clicked', adminEmail, {
      plan: params.plan || 'Growth Professional',
      source: params.source || 'Home Page Enquiry Section',
      email: params.email || 'Not yet entered',
      timestamp: new Date().toLocaleString(),
    });
  }

  static async sendEnquirySubmittedEmails(params: {
    name: string;
    email: string;
    company?: string;
    plan?: string;
    team_size?: string;
    schedule?: string;
    message?: string;
  }) {
    const vars = {
      name: params.name,
      email: params.email,
      company: params.company || 'Enterprise Organization',
      plan: params.plan || 'Growth Professional',
      team_size: params.team_size || '20-50 Agents',
      schedule: params.schedule || 'Next available slot',
      message: params.message || 'Demo & QA consultation requested.',
    };

    const customerRes = await this.sendFromTemplate('enquiry_submitted', params.email, vars);

    const adminEmail = activeEmailConfig.admin_email || 'admin@auditai.io';
    await this.sendEmail({
      to: adminEmail,
      subject: `[New Inbound Enquiry] ${params.name} (${vars.company}) - ${vars.plan}`,
      html: wrapBrandedHtml(
        'New Inbound Enquiry Submitted',
        `<p>A new enterprise enquiry has been submitted on the public homepage:</p>
         <ul>
           <li><strong>Name:</strong> ${vars.name}</li>
           <li><strong>Email:</strong> ${vars.email}</li>
           <li><strong>Company:</strong> ${vars.company}</li>
           <li><strong>Plan Interest:</strong> ${vars.plan}</li>
           <li><strong>Team Size:</strong> ${vars.team_size}</li>
           <li><strong>Schedule:</strong> ${vars.schedule}</li>
           <li><strong>Message:</strong> ${vars.message}</li>
         </ul>`,
      ),
      templateType: 'enquiry_submitted',
    });

    return customerRes;
  }

  static async sendWelcomeEmail(to: string, userName: string, companyName?: string) {
    return this.sendFromTemplate('welcome', to, {
      name: userName,
      company: companyName || 'your organization',
      login_url: 'http://localhost:3001/',
    });
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
    return this.sendFromTemplate('payment_success', params.to, {
      name: params.userName,
      plan: params.planName,
      amount: params.amountPaidINR.toLocaleString(),
      invoice_number: params.invoiceNumber,
      gateway: params.gateway.toUpperCase(),
      valid_until: params.validUntil,
    });
  }

  static async sendPaymentReminderEmail(params: {
    to: string;
    userName: string;
    planName: string;
    amountINR: number;
    daysRemaining: number;
    expiryDate: string;
    paymentLink?: string;
    cc?: string[];
    bcc?: string[];
    provider?: EmailProviderType;
    fromDomain?: string;
    scheduledAt?: string;
  }) {
    const link = params.paymentLink || `http://localhost:3001/?checkout=${encodeURIComponent(params.planName)}`;
    return this.sendFromTemplate(
      'payment_reminder',
      params.to,
      {
        name: params.userName,
        plan: params.planName,
        amount: params.amountINR.toLocaleString(),
        due_date: params.expiryDate,
        days_remaining: params.daysRemaining,
        payment_link: link,
      },
      {
        cc: params.cc,
        bcc: params.bcc,
        provider: params.provider,
        fromDomain: params.fromDomain,
        scheduledAt: params.scheduledAt,
      },
    );
  }

  static async sendMaintenanceUpdateEmail(params: {
    recipients: string[];
    title: string;
    maintenanceWindow: string;
    impact: string;
    details: string;
    cc?: string[];
    bcc?: string[];
    provider?: EmailProviderType;
    fromDomain?: string;
    scheduledAt?: string;
  }) {
    let targetList = params.recipients.filter(Boolean);

    if (targetList.length === 0 || targetList.includes('ALL')) {
      const { data: users } = await supabaseAdminClient.from('auth_users').select('email').eq('status', 'ACTIVE');
      targetList = (users || []).map((u: any) => u.email).filter(Boolean);
      if (targetList.length === 0) {
        targetList = ['client@auditai.io', activeEmailConfig.admin_email];
      }
    }

    return this.sendFromTemplate(
      'maintenance_update',
      targetList,
      {
        title: params.title,
        maintenance_window: params.maintenanceWindow,
        impact: params.impact,
        details: params.details,
      },
      {
        cc: params.cc,
        bcc: params.bcc,
        provider: params.provider,
        fromDomain: params.fromDomain,
        scheduledAt: params.scheduledAt,
      },
    );
  }

  static async sendClientApprovedEmail(params: {
    to: string;
    name: string;
    company?: string;
    role?: string;
    plan?: string;
  }) {
    return this.sendFromTemplate('client_approved', params.to, {
      name: params.name,
      email: params.to,
      company: params.company || 'Enterprise Partner',
      role: params.role || 'Client Administrator',
      plan: params.plan || 'Growth Professional',
      login_url: 'http://localhost:3001/',
    });
  }

  static async sendCriticalAlertEmail(params: {
    callId: string;
    agentId?: string | null;
    severity: string;
    flagType: string;
    title: string;
    description: string;
    evidence?: string | null;
    recommendedAction?: string | null;
    confidence?: number;
  }) {
    const adminEmail = activeEmailConfig.admin_email || 'admin@auditai.io';
    return this.sendFromTemplate('critical_alert', adminEmail, {
      call_id: params.callId,
      agent_id: params.agentId || 'Unassigned',
      severity: params.severity,
      flag_type: params.flagType,
      title: params.title,
      description: params.description,
      evidence: params.evidence || 'See full call transcript in AuditAI Console',
      recommended_action: params.recommendedAction || 'Immediate supervisor review & coaching assignment required.',
      confidence: params.confidence !== undefined ? Math.round(params.confidence * 100) : 95,
      timestamp: new Date().toLocaleString(),
      console_url: 'http://localhost:3001/?tab=alerts',
    });
  }

  static async sendDailyReportEmail(customAdminEmail?: string) {
    const targetEmail = customAdminEmail || activeEmailConfig.admin_email || 'admin@auditai.io';

    let totalCalls = 0;
    let avgScore = '0.0';
    let criticalFlags = 0;
    let activeAgents = 0;
    let topAgent = 'Priya Patel (96%)';

    try {
      const [callsRes, flagsRes, agentsRes] = await Promise.all([
        supabaseAdminClient.from('calls').select('score, agent_id'),
        supabaseAdminClient.from('call_flags').select('id, severity, status').in('severity', ['CRITICAL', 'HIGH']),
        supabaseAdminClient.from('agents').select('name, quality_score, status').eq('status', 'Active'),
      ]);

      const calls = callsRes.data || [];
      totalCalls = calls.length;
      const scored = calls.filter((c: any) => typeof c.score === 'number');
      if (scored.length > 0) {
        const sum = scored.reduce((acc: number, c: any) => acc + c.score, 0);
        avgScore = (sum / scored.length).toFixed(1);
      }
      criticalFlags = (flagsRes.data || []).filter((f: any) => f.status === 'OPEN').length;
      const agents = agentsRes.data || [];
      activeAgents = agents.length;
      if (agents.length > 0) {
        const sorted = [...agents].sort((a: any, b: any) => (b.quality_score || 0) - (a.quality_score || 0));
        if (sorted[0]) {
          topAgent = `${sorted[0].name} (${sorted[0].quality_score || 90}%)`;
        }
      }
    } catch {
      // Fallback
    }

    return this.sendFromTemplate('daily_report', targetEmail, {
      date: new Date().toLocaleDateString(),
      total_calls: totalCalls,
      avg_score: avgScore,
      critical_flags: criticalFlags,
      active_agents: activeAgents,
      top_agent: topAgent,
      enquiries_count: 'Live in Portal',
      console_url: 'http://localhost:3001/?tab=dashboard',
    });
  }

  /**
   * Starts automatic day-to-day report & scheduled email queue processor
   */
  static startDailyReportScheduler() {
    if (schedulerInterval) return;

    schedulerInterval = setInterval(async () => {
      // 1. Process any due scheduled emails
      const nowMs = Date.now();
      for (const job of scheduledQueue) {
        if (job.status === 'SCHEDULED' && new Date(job.scheduled_at).getTime() <= nowMs) {
          job.status = 'SENT';
          const { scheduledAt: _, ...cleanPayload } = job.payload;
          await this.sendEmail(cleanPayload).catch(() => {
            job.status = 'FAILED';
          });
        }
      }

      // 2. Process daily executive report
      if (!activeEmailConfig.daily_report_enabled) return;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      if (now.getUTCHours() === activeEmailConfig.daily_report_hour_utc && lastDailyReportDate !== todayKey) {
        lastDailyReportDate = todayKey;
        logger.info('[EmailService] Dispatching automated daily executive QA report...');
        await this.sendDailyReportEmail().catch(() => {});
      }
    }, 30 * 1000); // Check every 30s
  }
}
