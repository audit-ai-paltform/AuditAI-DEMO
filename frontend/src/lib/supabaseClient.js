import { createClient } from '@supabase/supabase-js';

// Public, client-safe configuration only. The publishable/anon key is
// designed for browser use; service-role and AI provider keys never reach
// this bundle (they live server-side only).
const defaultUrl = 'https://ixuutllrfapiawzumvvl.supabase.co';
const defaultAnonKey = 'sb_publishable_CXJV_XrH4Y5acMz5H2xm6Q_ETH6mGPu';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** True only when the client could actually be constructed. */
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

/* ------------------------------------------------------------------ */
/*  Realtime connection status — reported by the sockets themselves,   */
/*  never assumed. The header badge reads this instead of claiming     */
/*  "Live" whether or not the channel ever subscribed.                 */
/* ------------------------------------------------------------------ */
let realtimeStatus = 'UNKNOWN';
const statusListeners = new Set();

function publishStatus(status) {
  realtimeStatus = status;
  statusListeners.forEach((l) => l(status));
}

export const getRealtimeStatus = () => realtimeStatus;

export const onRealtimeStatusChange = (listener) => {
  statusListeners.add(listener);
  listener(realtimeStatus);
  return () => statusListeners.delete(listener);
};

export const subscribeToTable = (table, callback) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe((status) => publishStatus(status));

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToCalls = (onNewCall) => subscribeToTable('calls', onNewCall);
export const subscribeToAgents = (onAgentChange) => subscribeToTable('agents', onAgentChange);
export const subscribeToParameters = (onParamChange) => subscribeToTable('parameters', onParamChange);
export const subscribeToScripts = (onScriptChange) => subscribeToTable('scripts', onScriptChange);

/**
 * Tenant-scoped alert channel. The backend flag engine broadcasts
 * CALL_FLAG_CREATED / NOTIFICATION_CREATED events on this channel after
 * persisting flags. Channel is namespaced by tenant id so no
 * cross-tenant events are ever received.
 */
export const subscribeToTenantAlerts = (tenantId, { onFlagCreated, onNotificationCreated }) => {
  if (!supabase || !tenantId) return () => {};

  const channel = supabase
    .channel(`tenant:${tenantId}:alerts`)
    .on('broadcast', { event: 'CALL_FLAG_CREATED' }, (payload) => {
      if (onFlagCreated) onFlagCreated(payload.payload);
    })
    .on('broadcast', { event: 'NOTIFICATION_CREATED' }, (payload) => {
      if (onNotificationCreated) onNotificationCreated(payload.payload);
    })
    .subscribe((status) => publishStatus(status));

  return () => {
    supabase.removeChannel(channel);
  };
};

/** Call flags table changes (INSERT = new flag persisted). */
export const subscribeToCallFlags = (tenantId, onFlagInsert) => {
  if (!supabase || !tenantId) return () => {};

  const channel = supabase
    .channel(`public:call_flags:${tenantId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'call_flags', filter: `tenant_id=eq.${tenantId}` },
      (payload) => onFlagInsert(payload.new)
    )
    .subscribe((status) => publishStatus(status));

  return () => {
    supabase.removeChannel(channel);
  };
};
