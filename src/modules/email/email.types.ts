export type EmailProviderType = 'resend' | 'brevo';

export type LogoPlacement = 'top-left' | 'top-center' | 'top-right' | 'hidden';
export type SignaturePlacement = 'bottom-left' | 'bottom-center' | 'above-footer' | 'hidden';

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
  cc?: string;
  bcc?: string;
  provider?: EmailProviderType;
  from_domain?: string;
  variables: string[];
}

export interface EmailConfig {
  id: string;
  provider: EmailProviderType;
  api_key: string;
  resend_api_key?: string;
  brevo_api_key?: string;
  from_email: string;
  from_local: string;
  selected_domain: string;
  available_domains: string[];
  from_name: string;
  reply_to?: string;
  admin_email: string;
  logo_url: string;
  logo_placement: LogoPlacement;
  signature_html: string;
  signature_placement: SignaturePlacement;
  daily_report_enabled: boolean;
  daily_report_hour_utc: number;
  is_active: boolean;
  templates: Record<EmailTemplateKey, EmailTemplateConfig>;
}

export interface EmailPayload {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  templateType: EmailTemplateKey | 'custom';
  tenantId?: string;
  provider?: EmailProviderType;
  fromDomain?: string;
  scheduledAt?: string;
}

export interface ScheduledEmailJob {
  id: string;
  payload: EmailPayload;
  scheduled_at: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  created_at: string;
}

export interface EmailLog {
  id: string;
  tenant_id?: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  from_email?: string;
  subject: string;
  template_type: string;
  provider: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  provider_message_id?: string;
  error_message?: string;
  created_at: string;
}
