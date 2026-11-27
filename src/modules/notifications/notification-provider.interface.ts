import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { supabaseRealtimeProvider } from '../../providers/realtime/supabase-realtime.provider.js';

/**
 * Notification provider abstraction. The flag engine depends only on
 * this interface — Email/Slack/Teams/SMS/WhatsApp/webhook providers
 * can be plugged in later without touching business logic.
 */
export interface NotificationPayload {
  tenantId: string;
  eventType: string;
  title: string;
  body: string;
  severity?: string;
  flagId?: string | null;
  callId?: string | null;
  dedupKey?: string | null;
  recipientRole?: 'MANAGER' | 'QA' | 'CLIENT_ADMIN' | 'SUPER_ADMIN';
}

export interface INotificationProvider {
  readonly channel: string;
  send(payload: NotificationPayload): Promise<void>;
}

/**
 * Internal dashboard notification provider. Persists a row in the
 * notifications table (deduplicated via tenant_id + dedup_key unique
 * index) and broadcasts a realtime event to the tenant channel.
 */
export class DashboardNotificationProvider implements INotificationProvider {
  readonly channel = 'DASHBOARD';

  public async send(payload: NotificationPayload): Promise<void> {
    const { error } = await supabaseAdminClient.from('notifications').insert({
      tenant_id: payload.tenantId,
      recipient_role: payload.recipientRole ?? 'MANAGER',
      channel: 'DASHBOARD',
      event_type: payload.eventType,
      title: payload.title,
      body: payload.body,
      severity: payload.severity ?? null,
      flag_id: payload.flagId ?? null,
      call_id: payload.callId ?? null,
      dedup_key: payload.dedupKey ?? null,
    });

    if (error) {
      // 23505 = duplicate dedup_key: identical alert already sent — skip silently
      if (error.code === '23505') return;
      throw new Error(`Dashboard notification insert failed: ${error.message}`);
    }

    try {
      await supabaseRealtimeProvider.broadcastEvent(
        `tenant:${payload.tenantId}:alerts`,
        'NOTIFICATION_CREATED',
        {
          notificationTitle: payload.title,
          severity: payload.severity ?? null,
          flagId: payload.flagId ?? null,
          callId: payload.callId ?? null,
          eventType: payload.eventType,
        },
      );
    } catch {
      // Realtime failure must not fail the notification flow
    }
  }
}
