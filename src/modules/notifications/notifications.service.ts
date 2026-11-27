import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';
import { FlagEntity } from '../flags/flags.types.js';
import {
  DashboardNotificationProvider,
  INotificationProvider,
  NotificationPayload,
} from './notification-provider.interface.js';

export interface NotificationEntity {
  id: string;
  tenant_id: string;
  recipient_role: string;
  channel: string;
  event_type: string;
  title: string;
  body: string;
  severity: string | null;
  flag_id: string | null;
  call_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Notification service — dispatches through registered providers.
 * Providers are pluggable (dashboard today; email/Slack/Teams later).
 * Tenant notification preferences gate which severities actually
 * create manager notifications, preventing spam.
 */
export class NotificationService {
  private readonly providers: INotificationProvider[] = [];

  constructor() {
    this.registerProvider(new DashboardNotificationProvider());
  }

  public registerProvider(provider: INotificationProvider): void {
    this.providers.push(provider);
  }

  /** Tenant severity preferences from tenant_config (defaults: CRITICAL only). */
  private async shouldNotifySeverity(tenantId: string, severity: string): Promise<boolean> {
    try {
      const { data } = await supabaseAdminClient
        .from('tenant_config')
        .select('critical_notify, high_notify, medium_notify')
        .eq('client_id', tenantId)
        .maybeSingle();

      if (!data) return severity === 'CRITICAL';
      if (severity === 'CRITICAL') return data.critical_notify !== false;
      if (severity === 'HIGH') return Boolean(data.high_notify);
      if (severity === 'MEDIUM') return Boolean(data.medium_notify);
      return false;
    } catch {
      return severity === 'CRITICAL';
    }
  }

  /** Called by the flag engine after a flag is persisted. */
  public async notifyFlagCreated(flag: FlagEntity): Promise<void> {
    const shouldNotify = await this.shouldNotifySeverity(flag.tenant_id, flag.severity);
    if (!shouldNotify) {
      logger.info({ flagId: flag.id, severity: flag.severity }, '[Notifications] Skipped by tenant preference');
      return;
    }

    const payload: NotificationPayload = {
      tenantId: flag.tenant_id,
      eventType: 'FLAG_CREATED',
      title: `[${flag.severity}] ${flag.title}`,
      body: flag.description,
      severity: flag.severity,
      flagId: flag.id,
      callId: flag.call_id,
      // Group identical flag types per call so bursts don't spam managers
      dedupKey: `flag:${flag.call_id}:${flag.flag_type}:${flag.severity}`,
      recipientRole: 'MANAGER',
    };

    await Promise.allSettled(this.providers.map((p) => p.send(payload)));
  }

  public async list(tenantId: string, unreadOnly = false, limit = 50): Promise<NotificationEntity[]> {
    let query = supabaseAdminClient
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.min(200, limit));
    if (unreadOnly) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw new Error(`Notification list failed: ${error.message}`);
    return (data || []) as NotificationEntity[];
  }

  public async markRead(tenantId: string, notificationId: string): Promise<void> {
    const { error } = await supabaseAdminClient
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', notificationId);
    if (error) throw new Error(`Notification update failed: ${error.message}`);
  }

  public async markAllRead(tenantId: string): Promise<void> {
    const { error } = await supabaseAdminClient
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('read', false);
    if (error) throw new Error(`Notification update failed: ${error.message}`);
  }
}

export const notificationService = new NotificationService();
