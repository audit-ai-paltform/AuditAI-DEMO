export interface UserActivityRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  company?: string;
  login_at: string;
  logout_at?: string | null;
  last_heartbeat_at: string;
  total_active_seconds: number;
  ip_address?: string;
  user_agent?: string;
  status: 'ONLINE' | 'AWAY' | 'LOGGED_OUT';
}
