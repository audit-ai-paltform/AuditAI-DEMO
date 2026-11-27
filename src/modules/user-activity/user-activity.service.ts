import { UserActivityRecord } from './user-activity.types.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

const memoryActivities = new Map<string, UserActivityRecord>();

// Pre-seed some default user activities for instant visibility in admin portal
memoryActivities.set('00000000-0000-0000-0000-000000000001', {
  id: 'act_001',
  user_id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@auditai.io',
  full_name: 'Master Administrator',
  role: 'admin',
  company: 'AuditAI Enterprise Governance',
  login_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  logout_at: null,
  last_heartbeat_at: new Date().toISOString(),
  total_active_seconds: 9000, // 2h 30m
  ip_address: '103.21.244.0 (Cloudflare Edge)',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
  status: 'ONLINE',
});

memoryActivities.set('00000000-0000-0000-0000-000000000002', {
  id: 'act_002',
  user_id: '00000000-0000-0000-0000-000000000002',
  email: 'client@auditai.io',
  full_name: 'Enterprise Quality Client',
  role: 'client',
  company: 'NA Call Center Operations',
  login_at: new Date(Date.now() - 3600000 * 5.2).toISOString(),
  logout_at: null,
  last_heartbeat_at: new Date(Date.now() - 60000 * 12).toISOString(),
  total_active_seconds: 14400, // 4 hours
  ip_address: '49.205.112.54 (Airtel Broadband)',
  user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/125.0.0.0',
  status: 'ONLINE',
});

memoryActivities.set('00000000-0000-0000-0000-000000000003', {
  id: 'act_003',
  user_id: '00000000-0000-0000-0000-000000000003',
  email: 'supervisor@acmetelephony.in',
  full_name: 'Vikram Sengupta',
  role: 'manager',
  company: 'Acme Telephony Solutions',
  login_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  logout_at: new Date(Date.now() - 3600000 * 16).toISOString(),
  last_heartbeat_at: new Date(Date.now() - 3600000 * 16).toISOString(),
  total_active_seconds: 28800, // 8 hours
  ip_address: '115.110.224.18 (Tata Tele)',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/128.0',
  status: 'LOGGED_OUT',
});

export class UserActivityService {
  static recordLogin(params: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    company?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const existing = memoryActivities.get(params.userId);
    const activity: UserActivityRecord = {
      id: existing?.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: params.userId,
      email: params.email,
      full_name: params.fullName,
      role: params.role,
      company: params.company || existing?.company || '',
      login_at: new Date().toISOString(),
      logout_at: null,
      last_heartbeat_at: new Date().toISOString(),
      total_active_seconds: (existing?.total_active_seconds || 0) + 60,
      ip_address: params.ip || '127.0.0.1',
      user_agent: params.userAgent || 'Web Browser',
      status: 'ONLINE',
    };

    memoryActivities.set(params.userId, activity);

    try {
      supabaseAdminClient.from('user_login_activity').insert({
        user_id: params.userId,
        email: params.email,
        login_at: activity.login_at,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        status: 'ACTIVE',
      });
    } catch {}

    return activity;
  }

  static recordHeartbeat(userId: string, secondsIncrement = 30): UserActivityRecord | null {
    const act = memoryActivities.get(userId);
    if (!act) return null;

    act.last_heartbeat_at = new Date().toISOString();
    act.total_active_seconds += secondsIncrement;
    act.status = 'ONLINE';
    memoryActivities.set(userId, act);
    return act;
  }

  static recordLogout(userId: string): UserActivityRecord | null {
    const act = memoryActivities.get(userId);
    if (!act) return null;

    act.logout_at = new Date().toISOString();
    act.status = 'LOGGED_OUT';
    memoryActivities.set(userId, act);
    return act;
  }

  static getAll(): (UserActivityRecord & { formattedActiveTime: string })[] {
    const now = Date.now();
    return Array.from(memoryActivities.values())
      .map((item) => {
        // If no heartbeat for > 10 mins and not logged out, mark AWAY
        const lastHb = new Date(item.last_heartbeat_at).getTime();
        let status = item.status;
        if (status === 'ONLINE' && now - lastHb > 600000) {
          status = 'AWAY';
        }

        const hrs = Math.floor(item.total_active_seconds / 3600);
        const mins = Math.floor((item.total_active_seconds % 3600) / 60);
        const formattedActiveTime = `${hrs}h ${mins}m`;

        return {
          ...item,
          status,
          formattedActiveTime,
        };
      })
      .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
  }
}
