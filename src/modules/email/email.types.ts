export type EmailProviderType = 'resend' | 'brevo';

export interface EmailConfig {
  id: string;
  provider: EmailProviderType;
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  is_active: boolean;
  templates?: {
    welcome?: { enabled: boolean; subject: string };
    payment_success?: { enabled: boolean; subject: string };
    payment_reminder?: { enabled: boolean; subject: string };
    team_invite?: { enabled: boolean; subject: string };
  };
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType: 'welcome' | 'payment_success' | 'payment_reminder' | 'team_invite' | 'custom';
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
