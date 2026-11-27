/**
 * AuditAI frontend API layer.
 * All backend access goes through here — typed, tenant-scoped,
 * no AI provider calls from the browser.
 */
import { supabase } from "./supabaseClient";

const API_BASE = "/api";
const TENANT_ID = import.meta.env.VITE_TENANT_ID || "00000000-0000-0000-0000-000000000001";

function withTenant(params = {}) {
  return { tenant_id: TENANT_ID, ...params };
}

async function handleEnvelope(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      // Two backend error shapes: { message } and { error: { message } }.
      message = body?.message || body?.error?.message || (typeof body?.error === "string" ? body.error : message);
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  return res.json();
}

async function handle(res) {
  const body = await handleEnvelope(res);
  // BaseController.ok format: { success, message, data, pagination? }
  return body?.data !== undefined ? body.data : body;
}

async function get(path, params = {}) {
  const qs = new URLSearchParams(withTenant(params)).toString();
  const res = await fetch(`${API_BASE}${path}?${qs}`, { headers: await authHeaders() });
  return handle(res);
}

/** Same as get(), but keeps the pagination envelope for list screens. */
async function getList(path, params = {}) {
  const qs = new URLSearchParams(withTenant(params)).toString();
  const res = await fetch(`${API_BASE}${path}?${qs}`, { headers: await authHeaders() });
  return handleEnvelope(res);
}

async function post(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(withTenant(body)),
  });
  return handle(res);
}

async function patch(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(withTenant(body)),
  });
  return handle(res);
}

async function put(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, { method: "PUT", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(withTenant(body)) });
  return handle(res);
}

async function del(path) {
  const qs = new URLSearchParams(withTenant()).toString();
  const res = await fetch(`${API_BASE}${path}?${qs}`, { method: "DELETE", headers: await authHeaders() });
  return handle(res);
}

async function authHeaders() {
  const localToken = localStorage.getItem("auditai_token");
  if (localToken) {
    return { Authorization: `Bearer ${localToken}`, "x-tenant-id": TENANT_ID };
  }
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    return { Authorization: `Bearer ${data.session.access_token}`, "x-tenant-id": TENANT_ID };
  }
  return { "x-tenant-id": TENANT_ID };
}

/* -------------------- Dedicated Auth & Admin Controls ------------------ */
export const authApi = {
  login: async ({ email, password, role }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    const result = await handleEnvelope(res);
    if (result.data?.token) {
      localStorage.setItem("auditai_token", result.data.token);
      localStorage.setItem("auditai_user", JSON.stringify(result.data.user));
    }
    return result.data;
  },
  register: async (data) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleEnvelope(res);
  },
  getMe: () => get("/auth/me"),
  logout: () => {
    localStorage.removeItem("auditai_token");
    localStorage.removeItem("auditai_user");
  },
  getCurrentUser: () => {
    try {
      const u = localStorage.getItem("auditai_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  // Admin-governed user and login management
  adminListUsers: () => get("/auth/admin/users"),
  adminCreateUser: (body) => post("/auth/admin/users", body),
  adminToggleLogin: (userId, { login_enabled, status, role }) =>
    patch(`/auth/admin/users/${userId}/toggle-login`, { login_enabled, status, role }),
  adminResetPassword: (userId, password) =>
    post(`/auth/admin/users/${userId}/reset-password`, { password }),
  adminDeleteUser: (userId) => del(`/auth/admin/users/${userId}`),
  adminGetControls: () => get("/auth/admin/login-controls"),
  adminUpdateControls: (body) => put("/auth/admin/login-controls", body),
  adminGetAuditLogs: () => get("/auth/admin/audit-logs"),
};

/* ----------------- PayU Payment Gateway & Subscriptions --------------- */
export const payuApi = {
  getConfig: () => get("/payments/config"),
  initiate: (body) => post("/payments/payu/initiate", body),
  getSubscription: () => get("/payments/subscription"),
  getTransactions: () => get("/payments/transactions"),
  adminUpdateConfig: (body) => post("/payments/admin/config", body),
};

/* ----------------------------- Dashboard ---------------------------- */
export const dashboardApi = {
  /**
   * KPIs are aggregated server-side for the active tenant.
   * Filters (days / agent / process) are applied in the SQL query —
   * changing a filter changes the numbers, not just the labels.
   */
  getKpis: (days = 30, filters = {}) => get("/dashboard/kpis", { days, ...filters }),
  getAlerts: (limit = 10) => get("/dashboard/alerts", { limit }),
};

/* ------------------------------- Flags ------------------------------ */
export const flagsApi = {
  list: (params = {}) => get("/flags", params),
  get: (id) => get(`/flags/${id}`),
  counts: () => get("/flags/counts"),
  types: () => get("/flags/types"),
  forCall: (callId) => get(`/calls/${callId}/flags`),
  resolve: (id, body) => patch(`/flags/${id}`, body),
  confirm: (id, note, resolvedBy) => patch(`/flags/${id}`, { status: "CONFIRMED", resolution_type: "CONFIRMED_ISSUE", resolution_note: note, resolved_by: resolvedBy }),
  dismiss: (id, note, resolvedBy) => patch(`/flags/${id}`, { status: "DISMISSED", resolution_type: "FALSE_POSITIVE", resolution_note: note, resolved_by: resolvedBy }),
  escalate: (id, note, resolvedBy) => patch(`/flags/${id}`, { status: "ESCALATED", resolution_type: "ESCALATED", resolution_note: note, resolved_by: resolvedBy }),
  markTranscriptionIssue: (id, note, resolvedBy) => patch(`/flags/${id}`, { status: "DISMISSED", resolution_type: "TRANSCRIPTION_ISSUE", resolution_note: note, resolved_by: resolvedBy }),
};

/* -------------------------- Notifications --------------------------- */
export const notificationsApi = {
  list: (unreadOnly = false) => get("/notifications", { unread: unreadOnly ? "true" : "false" }),
  markRead: (id) => patch(`/notifications/${id}/read`),
  markAllRead: () => post("/notifications/read-all"),
};

/* ---------------------------- Settings ------------------------------ */
export const settingsApi = {
  getConfig: () => get("/settings"),
  uploadSop: (sections, process = "General", language = "English") =>
    post("/settings/sop-versions", { process, language, sections }),
  processSop: (payload) => post("/settings/sop/process", payload),
  approveParameters: (parameters) => post("/settings/sop/parameters/approve", { parameters }),
  activateSop: (sopVersionId) => post(`/settings/sop-versions/${sopVersionId}/activate`),
  activateConfiguration: (sopVersionId) => post("/settings/activate", { sop_version_id: sopVersionId }),
  updatePreferences: (prefs) => patch("/settings/preferences", prefs),
};

export const integrationsApi = {
  list: () => get("/integrations"),
  test: (provider, apiKey) => post("/integrations/test", { provider, api_key: apiKey }),
  save: (provider, apiKey) => put("/integrations", { provider, api_key: apiKey }),
  remove: (provider) => del(`/integrations/${provider}`),
  getKnowlarityStatus: () => get("/webhook/knowlarity/status"),
};

export const reportsApi = {
  list: () => get("/reports"),
  generate: (businessDate, timezone) => post("/reports", { business_date: businessDate, timezone }),
  download: (id) => get(`/reports/${id}/download`),
  regenerate: (id) => post(`/reports/${id}/regenerate`),
};

/* ----------------------------- AI ops ------------------------------- */
export const aiApi = {
  /** RCA generation — routed through the backend, never a browser→AI call. */
  generateRca: ({ callId, defect, rootCauseHint, channel }) =>
    post("/ai/rca", { call_id: callId, defect, root_cause_hint: rootCauseHint, channel }),
};

/* ------------------------------ Calls ------------------------------- */
export const callsApi = {
  /** Tenant-scoped, paginated call list from the backend (never a raw table read). */
  list: (params = {}) => getList("/calls", { client_id: TENANT_ID, limit: 200, ...params }),
  get: (id) => get(`/calls/${id}`),
  update: (id, patch) => patch(`/calls/${id}`, patch),
  events: (callId) => get(`/calls/${callId}/events`),
  /** Tenant-wide real backend event log for the Audit Trail screen. */
  recentEvents: (limit = 100) => getList("/calls/events/recent", { limit }),
  flags: (callId) => get(`/calls/${callId}/flags`),
  /** Re-evaluate completed call using applicable SOP and parameters without overwrite. */
  reEvaluate: (id, { reason, retranscribe }) => post(`/calls/${id}/re-evaluate`, { reason, retranscribe }),
  /** View history of all evaluation runs (scores, versions, reasons) for a call. */
  evaluations: (id) => get(`/calls/${id}/evaluations`),
};

/* ---------------------------- Setup data ---------------------------- */
export const agentsApi = {
  list: (params = {}) => getList("/agents", { client_id: TENANT_ID, limit: 200, ...params }),
  create: (body) => post("/agents", { client_id: TENANT_ID, ...body }),
  update: (id, patch) => patch(`/agents/${id}`, patch),
  remove: (id) => del(`/agents/${id}`),
};

export const parametersApi = {
  list: (params = {}) => getList("/parameters", { client_id: TENANT_ID, limit: 200, ...params }),
  create: (body) => post("/parameters", { client_id: TENANT_ID, ...body }),
  update: (id, patch) => patch(`/parameters/${id}`, patch),
  remove: (id) => del(`/parameters/${id}`),
  /** Server-side AI suggestion. Throws with the real reason if Gemini is unavailable. */
  suggest: (currentParameters = []) => post("/parameters/ai-suggest", { currentParameters }),
};

export const scriptsApi = {
  list: (params = {}) => getList("/scripts", { client_id: TENANT_ID, limit: 200, ...params }),
  create: (body) => post("/scripts", { client_id: TENANT_ID, ...body }),
  update: (id, patch) => patch(`/scripts/${id}`, patch),
  remove: (id) => del(`/scripts/${id}`),
  /** Returns { rules: [{ rule, suggestedWeight }] } extracted from real script text. */
  extractRules: (scriptText) => post("/scripts/extract-rules", { scriptText }),
};

/* ----------------- Qalyzer v2.0 PRD Extended APIs ----------------- */
export const salesForecastingApi = {
  get: () => get("/ai/sales-forecasting"),
};

export const dataFishingApi = {
  ask: (query, channel = "All") => post("/ai/ask-qalyzer", { query, channel }),
  getClusters: () => get("/ai/trends/clusters"),
};

export const coachingApi = {
  getCallCoaching: (callId) => get(`/ai/coaching/calls/${callId}`),
  dispatch: (body) => post("/ai/coaching/dispatch", body),
};

export const knowledgeHubApi = {
  list: () => get("/ai/knowledge-hub"),
  create: (body) => post("/ai/knowledge-hub", body),
  getBusinessImpact: (effectiveDate = "2026-02-15") => get(`/ai/reports/business-impact?effectiveDate=${encodeURIComponent(effectiveDate)}`),
};

/* ----------------- Home Page CMS & Admin Portal APIs ----------------- */
export const homeCmsApi = {
  getPublic: () => get("/public/home-cms"),
  submitEnquiry: (body) => post("/public/enquiries", body),
  getAdmin: () => get("/admin-portal/home-cms"),
  updateAdmin: (body) => put("/admin-portal/home-cms", body),
};

export const adminPortalApi = {
  getEnquiries: (status = "ALL") => get("/admin-portal/enquiries", { status }),
  updateEnquiry: (id, patch) => patch(`/admin-portal/enquiries/${id}`, patch),
  getAccessUsers: (type) => get("/admin-portal/access-control", type ? { type } : {}),
  addAccessUser: (body) => post("/admin-portal/access-control", body),
  updateUserAccess: (id, patch) => patch(`/admin-portal/access-control/${id}`, patch),
  universalSearch: (q = "") => get("/admin-portal/universal-search", { q }),
  sendPaymentReminder: (userId) => post("/admin-portal/send-payment-reminder", { userId }),
};

/* ----------------- Dual Billing & Gateways (PayU + Razorpay) ----------------- */
export const billingApi = {
  getPublicPlans: () => get("/public/plans"),
  getAdminPlans: () => get("/admin/v1/plans"),
  initiateCheckout: (body) => post("/billing/checkout", body),
  verifyRazorpay: (body) => post("/billing/razorpay/verify", body),
  getSubscription: () => get("/billing/subscription"),
  getAllSubscriptions: () => get("/admin/v1/subscriptions"),
  extendSubscription: (id, days = 30) => post(`/admin/v1/subscriptions/${id}/extend`, { days }),
  getInvoices: () => get("/billing/invoices"),
  getAllPayments: () => get("/admin/v1/payments"),
  refundPayment: (id, body = {}) => post(`/admin/v1/payments/${id}/refund`, body),
  getGatewayConfigs: () => get("/admin/v1/gateways/config"),
  updateGatewayConfig: (gateway, updates) => put("/admin/v1/gateways/config", { gateway, updates }),
};

/* ----------------- Dual Email Engine (Resend & Brevo) ----------------- */
export const emailAdminApi = {
  getConfig: () => get("/admin/v1/email/config"),
  updateConfig: (body) => put("/admin/v1/email/config", body),
  sendTestEmail: (body) => post("/admin/v1/email/test", body),
  sendPaymentReminder: (body) => post("/admin/v1/email/send-reminder", body),
  sendMaintenanceUpdate: (body) => post("/admin/v1/email/send-maintenance", body),
  sendDailyReportNow: (body = {}) => post("/admin/v1/email/send-daily-report", body),
  trackEnquiryClick: (body = {}) => post("/public/enquiry-click", body),
  getLogs: () => get("/admin/v1/email/logs"),
};

/* ----------------- Team Profiles & Leadership ----------------- */
export const teamAdminApi = {
  getPublicTeam: () => get("/public/team"),
  getAdminTeam: () => get("/admin/v1/team"),
  createMember: (body) => post("/admin/v1/team", body),
  updateMember: (id, body) => put(`/admin/v1/team/${id}`, body),
  deleteMember: (id) => del(`/admin/v1/team/${id}`),
};

/* ----------------- User Activity, Heartbeats & Login Analytics ----------------- */
export const userActivityApi = {
  heartbeat: (userId, metadata = {}) => post("/auth/heartbeat", { userId, metadata }),
  logoutActivity: (userId) => post("/auth/logout-activity", { userId }),
  getActivityList: () => get("/admin/v1/users/activity"),
};

export const TENANT = TENANT_ID;
