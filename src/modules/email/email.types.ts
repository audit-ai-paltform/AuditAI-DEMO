export type EmailProviderType = 'resend' | 'brevo';

export type EmailTemplateKey =
  | 'enquiry_clicked'
  | 'enquiry_submitted'
  | 'payment_success'
  | 'payment_reminder'
  | 'maintenance_update'
  | 'client_approved'
  | 'critical_alert'
  | 'daily_report'
  | 'welcome'
  | 'team_invite';

export interface EmailTemplateConfig {
  key: EmailTemplateKey;
  label: string;
  description: string;
  recipientType: 'Customer / Client' | 'Administrator' | 'Broadcast (All Clients)';
  enabled: boolean;
  subject: string;
  body: string;
  variables: string[];
}

export interface EmailConfig {
  id: string;
  provider: EmailProviderType;
  api_key: string;
  resend_api_key?: string;
  brevo_api_key?: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  admin_email: string;
  daily_report_enabled: boolean;
  daily_report_hour_utc: number;
  is_active: boolean;
  templates: Record<EmailTemplateKey, EmailTemplateConfig>;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateType: EmailTemplateKey | 'custom';
  tenantId?: string;
}

export interface EmailLog {
  id: string;
  tenant_id?: string;
  recipient: string;
  subject: string;
  template_type: string;
  provider: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  provider_message_id?: string;
  error_message?: string;
  created_at: string;
}
