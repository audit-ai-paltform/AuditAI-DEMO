import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { AuthUser, AdminLoginControls, AdminAuditLog } from './auth.types.js';
import { AuthCrypto } from './auth.crypto.js';

// In-memory fallback cache for development or when PostgreSQL connection is configuring
const memoryUsers = new Map<string, AuthUser & { password_hash: string; salt: string }>();
const memoryLogs: AdminAuditLog[] = [];
let memoryControls: AdminLoginControls = {
  id: '00000000-0000-0000-0000-000000000001',
  require_admin_approval: false,
  max_login_attempts: 5,
  lockout_minutes: 15,
  session_timeout_hours: 24,
  allow_client_self_registration: true,
  enforce_password_complexity: true,
  updated_at: new Date().toISOString(),
};

// Seed default users in memory store
const adminCreds = AuthCrypto.hashPassword('Admin@12345');
memoryUsers.set('admin@auditai.io', {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@auditai.io',
  password_hash: adminCreds.hash,
  salt: adminCreds.salt,
  role: 'super_admin',
  full_name: 'Main Super Admin',
  company: 'AuditAI Enterprise Governance',
  phone: '+1-800-AUDIT-AI',
  status: 'ACTIVE',
  login_enabled: true,
  failed_login_attempts: 0,
  tenant_id: '00000000-0000-0000-0000-000000000001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const extraDemoAccounts: Array<{ id: string; email: string; pass: string; role: any; name: string; company: string }> = [
  { id: '00000000-0000-0000-0000-000000000003', email: 'administrator@auditai.io', pass: 'Admin@12345', role: 'admin', name: 'Platform Administrator', company: 'AuditAI Enterprise Governance' },
  { id: '00000000-0000-0000-0000-000000000004', email: 'manager@auditai.io', pass: 'Manager@12345', role: 'manager', name: 'QA Operations Manager', company: 'AuditAI Enterprise Governance' },
  { id: '00000000-0000-0000-0000-000000000005', email: 'sales@auditai.io', pass: 'Sales@12345', role: 'sales', name: 'Enterprise Sales Lead', company: 'AuditAI Enterprise Governance' },
  { id: '00000000-0000-0000-0000-000000000006', email: 'client.superadmin@auditai.io', pass: 'Client@12345', role: 'client_super_admin', name: 'Client Super Admin', company: 'Acme Telephony Solutions' },
  { id: '00000000-0000-0000-0000-000000000007', email: 'client.admin@auditai.io', pass: 'Client@12345', role: 'client_admin', name: 'Client Administrator', company: 'Acme Telephony Solutions' },
  { id: '00000000-0000-0000-0000-000000000008', email: 'client.manager@auditai.io', pass: 'Client@12345', role: 'client_manager', name: 'Client QA Manager', company: 'Acme Telephony Solutions' },
];

for (const acc of extraDemoAccounts) {
  const c = AuthCrypto.hashPassword(acc.pass);
  memoryUsers.set(acc.email, {
    id: acc.id,
    email: acc.email,
    password_hash: c.hash,
    salt: c.salt,
    role: acc.role,
    full_name: acc.name,
    company: acc.company,
    phone: '+91-9876543210',
    status: 'ACTIVE',
    login_enabled: true,
    failed_login_attempts: 0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

const clientCreds = AuthCrypto.hashPassword('Client@12345');
memoryUsers.set('client@auditai.io', {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'client@auditai.io',
  password_hash: clientCreds.hash,
  salt: clientCreds.salt,
  role: 'client',
  full_name: 'Enterprise Quality Client',
  company: 'NA Call Center Operations',
  phone: '+1-555-019-2834',
  status: 'ACTIVE',
  login_enabled: true,
  failed_login_attempts: 0,
  tenant_id: '00000000-0000-0000-0000-000000000001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export class AuthRepository {
  /**
   * Find user by email from auth database
   */
  static async findByEmail(email: string): Promise<(AuthUser & { password_hash: string; salt: string }) | null> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('auth_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        return data as (AuthUser & { password_hash: string; salt: string });
      }
    } catch {
      // Fallback to memory store
    }
    return memoryUsers.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('auth_users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const { password_hash, salt, ...safeUser } = data as any;
        return safeUser;
      }
    } catch {
      // Fallback
    }

    for (const u of memoryUsers.values()) {
      if (u.id === id) {
        const { password_hash, salt, ...safeUser } = u;
        return safeUser;
      }
    }
    return null;
  }

  /**
   * List all users for Admin
   */
  static async listAll(): Promise<AuthUser[]> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('auth_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((u: any) => {
          const { password_hash, salt, ...safeUser } = u;
          return safeUser;
        });
      }
    } catch {
      // Fallback
    }

    return Array.from(memoryUsers.values()).map(u => {
      const { password_hash, salt, ...safeUser } = u;
      return safeUser;
    });
  }

  /**
   * Create new user in Auth database
   */
  static async create(user: {
    email: string;
    password_hash: string;
    salt: string;
    role: 'admin' | 'client';
    full_name: string;
    company?: string;
    phone?: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
    login_enabled: boolean;
    tenant_id?: string;
  }): Promise<AuthUser> {
    const id = crypto.randomUUID();
    const newUser = {
      id,
      email: user.email.toLowerCase().trim(),
      password_hash: user.password_hash,
      salt: user.salt,
      role: user.role,
      full_name: user.full_name,
      company: user.company || 'Enterprise Partner',
      phone: user.phone || '',
      status: user.status,
      login_enabled: user.login_enabled,
      failed_login_attempts: 0,
      tenant_id: user.tenant_id || '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabaseAdminClient
        .from('auth_users')
        .insert(newUser)
        .select('*')
        .single();

      if (!error && data) {
        const { password_hash, salt, ...safeUser } = data as any;
        memoryUsers.set(newUser.email, newUser);
        return safeUser;
      }
    } catch {
      // In-memory fallback
    }

    memoryUsers.set(newUser.email, newUser);
    const { password_hash, salt, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Update user record (e.g. login_enabled, status, role, lock)
   */
  static async update(id: string, updates: Partial<AuthUser & { password_hash: string; salt: string }>): Promise<AuthUser | null> {
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabaseAdminClient
        .from('auth_users')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        const { password_hash, salt, ...safeUser } = data as any;
        return safeUser;
      }
    } catch {
      // Fallback
    }

    for (const [email, user] of memoryUsers.entries()) {
      if (user.id === id) {
        const updated = { ...user, ...updatePayload };
        memoryUsers.set(email, updated);
        const { password_hash, salt, ...safeUser } = updated;
        return safeUser;
      }
    }
    return null;
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await supabaseAdminClient.from('auth_users').delete().eq('id', id);
    } catch {
      // Fallback
    }

    for (const [email, user] of memoryUsers.entries()) {
      if (user.id === id) {
        memoryUsers.delete(email);
        return true;
      }
    }
    return true;
  }

  /**
   * Get global admin login controls
   */
  static async getControls(): Promise<AdminLoginControls> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('admin_login_controls')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        return data as AdminLoginControls;
      }
    } catch {
      // Fallback
    }
    return memoryControls;
  }

  /**
   * Update admin login controls
   */
  static async updateControls(controls: Partial<AdminLoginControls>): Promise<AdminLoginControls> {
    const updated = {
      ...memoryControls,
      ...controls,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabaseAdminClient
        .from('admin_login_controls')
        .upsert(updated)
        .select('*')
        .single();

      if (!error && data) {
        memoryControls = data as AdminLoginControls;
        return memoryControls;
      }
    } catch {
      // Fallback
    }

    memoryControls = updated;
    return memoryControls;
  }

  /**
   * Record admin audit log
   */
  static async recordLog(log: Omit<AdminAuditLog, 'id' | 'created_at'>): Promise<void> {
    const entry: AdminAuditLog = {
      id: crypto.randomUUID(),
      ...log,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseAdminClient.from('admin_audit_logs').insert(entry);
    } catch {
      // Fallback
    }
    memoryLogs.unshift(entry);
    if (memoryLogs.length > 500) memoryLogs.pop();
  }

  /**
   * Get recent admin audit logs
   */
  static async getLogs(): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        return data as AdminAuditLog[];
      }
    } catch {
      // Fallback
    }
    return memoryLogs;
  }
}
