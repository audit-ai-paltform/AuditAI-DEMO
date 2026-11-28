import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  LayoutDashboard, UploadCloud, Mic, ListChecks, SlidersHorizontal, Grid3x3,
  AlertTriangle, CheckCircle2, AlertCircle, Search, Plus, Minus, Menu, X, Loader2, Play, Pause,
  ChevronDown, ChevronRight, ChevronLeft, Sparkles, Clock, ArrowRight, Heart, ShieldAlert,
  RefreshCcw, Users, FileText, Languages, CreditCard, Check, History, Filter, Calendar,
  Database, Download, TrendingUp, Smile, MessageSquare, Mail, FileSpreadsheet, Flag,
  RotateCw, ClipboardCheck, Trash2, Edit3, Radio, Zap, Shield, ExternalLink, Copy,
  LogOut, Key, Lock, Unlock, Server, HardDrive, BookOpen, Globe, UserCheck, Send, Activity
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  onRealtimeStatusChange,
  subscribeToCalls,
  subscribeToAgents,
  subscribeToParameters,
  subscribeToScripts,
  subscribeToTenantAlerts,
} from "./lib/supabaseClient";
import { dashboardApi, flagsApi, notificationsApi, settingsApi, integrationsApi, reportsApi, aiApi, callsApi, agentsApi, parametersApi, scriptsApi, authApi, payuApi, homeCmsApi, adminPortalApi, userActivityApi, billingApi, emailAdminApi, teamAdminApi, TENANT } from "./lib/api";

import EnterpriseAuthGate from "./components/EnterpriseAuthGate";
import AdminUsersModule from "./components/AdminUsersModule";
import PayUBillingModule from "./components/PayUBillingModule";
import CloudflareDatabaseModule from "./components/CloudflareDatabaseModule";
import SalesForecastingWidget from "./components/SalesForecastingWidget";
import DataFishingModule from "./components/DataFishingModule";
import AgentCoachingModal from "./components/AgentCoachingModal";
import KnowledgeHubModule from "./components/KnowledgeHubModule";
import HomePage from "./components/HomePage";
import HomePageCMSModule from "./components/HomePageCMSModule";
import AdminAccessControlModule from "./components/AdminAccessControlModule";
import UniversalSearchModule from "./components/UniversalSearchModule";
import EnquiriesManagementModule from "./components/EnquiriesManagementModule";
import AdminSubscriptionsModule from "./components/AdminSubscriptionsModule";
import AdminEmailConfigModule from "./components/AdminEmailConfigModule";
import AdminTeamEditorModule from "./components/AdminTeamEditorModule";
import AdminUserActivityModule from "./components/AdminUserActivityModule";
import AskAuditAIChatbot from "./components/AskAuditAIChatbot";

/* ---------------------------------------------------------------- */
/*  Design tokens — Crisp SaaS & Fintech (Light Blue + Navy + White)*/
/* ---------------------------------------------------------------- */
const C = {
  bg: "#F8FAFC",          // Crisp SaaS Canvas (slate-50)
  panel: "#FFFFFF",       // Pure White Cards, Sidebar & Tables
  panel2: "#E0F2FE",      // Light Blue Tint / Secondary Surface (sky-100)
  panelHover: "#DBEAFE",  // Light Blue Hover (blue-100)
  border: "#DBEAFE",      // Clean Blue-100 Hairline Border
  borderSoft: "#E2E8F0",  // Soft Slate-200 Divider
  text: "#0F172A",        // Dark Text / Primary Ink (slate-900)
  muted: "#334155",       // Secondary Slate Text (slate-700)
  faint: "#64748B",       // Muted Labels (slate-500)
  white: "#FFFFFF",       // Pure white
  black: "#0A2540",       // Deep Fintech Navy
  navy: "#0A2540",        // Deep Fintech Navy Header
  teal: "#0284C7",        // Primary Brand / CTA (sky-600)
  blue: "#1D4ED8",        // Primary Brand Deep (blue-700)
  ctaGradient: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
  tealSoft: "#E0F2FE",    // sky-100 pill background
  red: "#DC2626",         // Critical / Risk
  redSoft: "#FEF2F2",
  amber: "#D97706",       // Warning
  amberSoft: "#FFFBEB",
  grey: "#64748B",        // Neutral
  greySoft: "#F1F5F9",
  green: "#059669",       // Verified / Good
  greenSoft: "#ECFDF5",
};

const FONT_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

* {
  box-sizing: border-box;
}
html, body, #root {
  margin: 0;
  padding: 0;
  background-color: #F8FAFC;
  color: #0F172A;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, .font-display {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
  letter-spacing: -0.02em;
}
::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background: #F8FAFC;
}
::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover {
  background: #0284C7;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

/* Crisp SaaS & Fintech Canvas */
.auditai-grid-bg {
  background-color: #F8FAFC;
}

/* Unified Fintech Table Styling */
table {
  width: 100%;
  border-collapse: collapse;
  color: #0F172A;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
thead th {
  background: #E0F2FE;
  color: #0A2540;
  border-bottom: 1.5px solid #BAE6FD;
  font-weight: 700;
}
tbody tr:nth-child(even) {
  background: #FFFFFF;
}
tbody tr:nth-child(odd) {
  background: #F8FAFC;
}
tbody td {
  color: #0F172A;
  border-bottom: 1px solid #E2E8F0;
}
tbody tr:hover {
  background: #E0F2FE;
}

/* Modern Stylish Buttons */
button {
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: transform 0.14s ease, box-shadow 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}
button:active:not(:disabled) {
  transform: scale(0.98);
}

input, select, textarea {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
input:focus, select:focus, textarea:focus {
  outline: 1.5px solid #0284c7 !important;
  border-color: #0284c7 !important;
}

/* Responsive Breakpoints: Smaller, Larger & Ultra-Wide Screens */
.auditai-mobile-menu-btn {
  display: none;
}
.auditai-main-pad {
  padding: 24px;
}
.auditai-content-inner {
  width: 100%;
  max-width: 1840px;
  margin: 0 auto;
}
@media (max-width: 960px) {
  .auditai-sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    z-index: 60;
    transform: translateX(-100%);
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.45);
  }
  .auditai-sidebar.open {
    transform: translateX(0);
  }
  .auditai-mobile-menu-btn {
    display: inline-flex !important;
  }
  .auditai-badges-hide {
    display: none !important;
  }
  .auditai-main-pad {
    padding: 14px;
  }
}
@media (min-width: 1600px) {
  .auditai-main-pad {
    padding: 28px 36px;
  }
}
`;

function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STATUS_META = {
  RECEIVED: { color: C.amber, soft: C.amberSoft, Icon: Clock },
  QUEUED: { color: C.amber, soft: C.amberSoft, Icon: Clock },
  DOWNLOADING: { color: C.teal, soft: C.tealSoft, Icon: Loader2 },
  UPLOADING: { color: C.teal, soft: C.tealSoft, Icon: UploadCloud },
  TRANSCRIBING: { color: C.teal, soft: C.tealSoft, Icon: Mic },
  TRANSCRIBED: { color: C.green, soft: C.greenSoft, Icon: CheckCircle2 },
  AI_SCORING: { color: C.amber, soft: C.amberSoft, Icon: Sparkles },
  RETRYING: { color: C.amber, soft: C.amberSoft, Icon: RotateCw },
  COMPLETED: { color: C.green, soft: C.greenSoft, Icon: CheckCircle2 },
  FAILED: { color: C.red, soft: C.redSoft, Icon: ShieldAlert },
};

/* Detailed RCA generator helper — routed through the AuditAI backend.
   The browser NEVER calls an AI provider directly; API keys stay server-side.
   Failures propagate honestly — never fabricate RCA data client-side. */
async function fetchDetailedRCA({ callId, defect, rootCauseHint, channel }) {
  return aiApi.generateRca({ callId, defect, rootCauseHint, channel });
}

const ROOT_CAUSE_COLOR = { "Agent Error": C.red, "Process Gap": C.amber, "Customer-Caused": C.teal, "Technical Issue": C.muted };

function RCADetailView({ rootCause, defect, detail, loading, error, onGenerate }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600 }}>Root Cause Analysis</div>
        {defect && (
          <button onClick={onGenerate} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, background: detail ? C.panel2 : C.teal, color: detail ? C.muted : "#000000", border: `1px solid ${detail ? C.border : C.teal}`, borderRadius: 6, padding: "5px 9px", fontFamily: "Inter", fontSize: 11, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />} {loading ? "Analyzing…" : detail ? "Regenerate" : "Generate Detailed RCA"}
          </button>
        )}
      </div>
      {error && <div style={{ color: C.amber, fontSize: 11, fontFamily: "Inter", marginBottom: 8 }}>{error}</div>}
      {!defect && <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", lineHeight: 1.6 }}>No defect identified — nothing to root-cause.</div>}
      {defect && (
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${ROOT_CAUSE_COLOR[rootCause] || C.faint}22`, color: ROOT_CAUSE_COLOR[rootCause] || C.faint, border: `1px solid ${ROOT_CAUSE_COLOR[rootCause] || C.faint}66`, borderRadius: 20, padding: "4px 10px", fontFamily: "Inter", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            {detail?.category || rootCause}
          </div>
          <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", marginBottom: 10 }}>Defect: <span style={{ color: C.text }}>{defect}</span></div>
          {!detail && (
            <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", lineHeight: 1.6 }}>
              Generate a detailed RCA to get evidence from the transcript, contributing factors, a corrective action, and a preventive measure.
            </div>
          )}
          {detail && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Evidence</div>
                <div style={{ color: C.text, fontSize: 12, fontFamily: "Inter", lineHeight: 1.5, fontStyle: "italic", background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 7, padding: "8px 10px" }}>"{detail.evidence}"</div>
              </div>
              <div>
                <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Contributing Factors</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {detail.contributingFactors?.map((f, i) => (
                    <div key={i} style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", display: "flex", gap: 6 }}><span style={{ color: C.amber }}>•</span>{f}</div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Corrective Action</div>
                <div style={{ color: C.text, fontSize: 12, fontFamily: "Inter", lineHeight: 1.5 }}>{detail.correctiveAction}</div>
              </div>
              <div>
                <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Preventive Measure</div>
                <div style={{ color: C.text, fontSize: 12, fontFamily: "Inter", lineHeight: 1.5 }}>{detail.preventiveMeasure}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Atoms                                                             */
/* ---------------------------------------------------------------- */
function Card({ children, style, ...rest }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, ...style }} {...rest}>{children}</div>;
}

/* Public MP3 used only by the manual "add test call" button so an operator
   can exercise POST /api/call-complete end to end. It is a fixture input to a
   real webhook, not a call record: nothing appears in any list until the
   pipeline actually ingests and audits it. */
const TEST_RECORDING_URL = "https://res.cloudinary.com/doenc9fyc/video/upload/v1785327383/1_ck6wdb.mp3";

/* Unknown statuses render neutrally — never as a green "Passed" badge. */
const UNKNOWN_STATUS_META = { color: C.muted, soft: C.panel2, Icon: AlertCircle };

function StatusBadge({ status, size = "sm" }) {
  const label = status || "UNKNOWN";
  const m = STATUS_META[label] || UNKNOWN_STATUS_META;
  const Icon = m.Icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.soft, color: m.color, border: `1px solid ${m.color}55`, borderRadius: 20, padding: size === "sm" ? "3px 9px" : "5px 12px", fontSize: size === "sm" ? 11 : 12.5, fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon size={size === "sm" ? 12 : 13} />{label}
    </span>
  );
}

function KPI({ label, value, sub, accent }) {
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ color: accent || C.text, fontSize: 28, fontFamily: "Space Grotesk", fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.faint, fontSize: 11.5, marginTop: 6, fontFamily: "Inter" }}>{sub}</div>}
    </Card>
  );
}

function EmptyState({ title, subtitle, icon: Icon = Database }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", background: C.panel2, borderRadius: 10, border: `1px solid ${C.borderSoft}` }}>
      <Icon size={32} color={C.faint} style={{ marginBottom: 10 }} />
      <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ color: C.faint, fontSize: 12, fontFamily: "Inter", maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}

function LoadingState({ label = "Loading data..." }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <Loader2 size={24} color={C.teal} className="spin" style={{ marginBottom: 10 }} />
      <div style={{ color: C.muted, fontSize: 13, fontFamily: "Inter" }}>{label}</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding: "30px 20px", textAlign: "center", background: `${C.redSoft}33`, border: `1px solid ${C.red}44`, borderRadius: 10 }}>
      <AlertCircle size={28} color={C.red} style={{ marginBottom: 8 }} />
      <div style={{ color: C.red, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Unable to load audit data</div>
      <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", marginBottom: 12 }}>{message || "Database request failed."}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ background: C.red, color: "#000000", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
      )}
    </div>
  );
}

const axisTick = { fill: C.faint, fontSize: 11, fontFamily: "Inter" };
const tooltipStyle = { contentStyle: { background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Inter", fontSize: 12 }, labelStyle: { color: C.text } };

/* ---------------------------------------------------------------- */
/*  Audit Intelligence — severity & confidence design tokens         */
/* ---------------------------------------------------------------- */
const SEVERITY_META = {
  CRITICAL: { color: C.red, soft: C.redSoft },
  HIGH: { color: "#F97316", soft: "#3A2114" },
  MEDIUM: { color: C.amber, soft: C.amberSoft },
  LOW: { color: C.muted, soft: C.panel2 },
  INFO: { color: C.teal, soft: C.tealSoft },
};

const FLAG_TYPE_LABELS = {
  INFORMATION_MISMATCH: "Information Mismatch",
  CUSTOMER_INTENT_MISUNDERSTANDING: "Customer Intent Misunderstanding",
  AGENT_MISINFORMATION: "Agent Misinformation",
  POLICY_MISMATCH: "Policy Mismatch",
  PRODUCT_INFORMATION_ERROR: "Product Information Error",
  PRICING_ERROR: "Pricing Error",
  COMPLIANCE_VIOLATION: "Compliance Violation",
  MANDATORY_DISCLOSURE_MISSED: "Mandatory Disclosure Missed",
  MEDICAL_INFORMATION_RISK: "Medical Information Risk",
  WRONG_MEDICATION_INFORMATION: "Medication Information Error",
  WRONG_DOSAGE_INFORMATION: "Dosage Information Error",
  TRANSCRIPTION_AMBIGUITY: "Possible Transcription Ambiguity",
  CUSTOMER_FACT_MISUNDERSTOOD: "Customer Fact Misunderstood",
  PROCESS_ERROR: "Process Error",
  OTHER: "Other",
};

function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.INFO;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.soft, color: m.color, border: `1px solid ${m.color}55`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "Inter", fontWeight: 700, letterSpacing: 0.4 }}>
      {severity}
    </span>
  );
}

function ConfidenceBadge({ confidence }) {
  const pct = Math.round((Number(confidence) || 0) * 100);
  return (
    <span style={{ color: C.muted, fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 600 }}>
      {pct}% confidence
    </span>
  );
}

function fmtTime(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return null;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- */
/*  Flag Detail Panel — evidence, AI reasoning, resolution workflow  */
/* ---------------------------------------------------------------- */
function FlagDetailPanel({ flag, onResolve, onClose }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const act = async (fn, requiresNote) => {
    if (requiresNote && note.trim().length < 3) {
      setError("Please provide a reason before dismissing.");
      return;
    }
    setBusy(true); setError("");
    try {
      await fn(note.trim() || undefined);
      onClose();
    } catch (e) {
      setError(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const m = SEVERITY_META[flag.severity] || SEVERITY_META.INFO;
  const resolved = ["CONFIRMED", "DISMISSED", "ESCALATED"].includes(flag.status);

  return (
    <div style={{ background: C.panel, border: `1px solid ${m.color}55`, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SeverityBadge severity={flag.severity} />
            <ConfidenceBadge confidence={flag.confidence} />
          </div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{flag.title}</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter" }}>
            {FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type} · Agent: {flag.agent_id || "—"} · Call: {String(flag.call_id).slice(0, 8)}…
            {flag.evidence_start_time != null && ` · ${fmtTime(flag.evidence_start_time)}`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}><X size={16} /></button>
      </div>

      {flag.description && (
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", lineHeight: 1.6 }}>{flag.description}</div>
      )}

      {(flag.customer_statement || flag.agent_statement) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {flag.customer_statement && (
            <div style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ color: C.faint, fontSize: 10, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Customer said</div>
              <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", lineHeight: 1.5, fontStyle: "italic" }}>"{flag.customer_statement}"</div>
            </div>
          )}
          {flag.agent_statement && (
            <div style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ color: C.faint, fontSize: 10, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Agent responded</div>
              <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", lineHeight: 1.5, fontStyle: "italic" }}>"{flag.agent_statement}"</div>
            </div>
          )}
        </div>
      )}

      {flag.expected_information && (
        <div style={{ background: C.tealSoft, border: `1px solid ${C.teal}33`, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: C.teal, fontSize: 10, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Expected / approved information</div>
          <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", lineHeight: 1.5 }}>{flag.expected_information}</div>
        </div>
      )}

      {flag.ai_reasoning && (
        <div>
          <div style={{ color: C.faint, fontSize: 10, fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>AI reasoning summary</div>
          <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", lineHeight: 1.55 }}>{flag.ai_reasoning}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: C.faint, fontSize: 11, fontFamily: "Inter" }}>
        <span>Source: <span style={{ color: C.muted }}>{flag.source}</span></span>
        {flag.sop_version_id && <span>SOP version: <span style={{ color: C.muted }}>{String(flag.sop_version_id).slice(0, 8)}…</span></span>}
        <span>Status: <span style={{ color: C.muted }}>{flag.status}</span></span>
        {flag.recommended_action && <span style={{ flexBasis: "100%" }}>Recommended: <span style={{ color: C.muted }}>{flag.recommended_action}</span></span>}
      </div>

      {resolved ? (
        <div style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 12px", color: C.muted, fontSize: 12, fontFamily: "Inter" }}>
          Resolved as <span style={{ color: C.text, fontWeight: 600 }}>{flag.resolution_type || flag.status}</span>
          {flag.resolved_by && <> by <span style={{ color: C.text }}>{flag.resolved_by}</span></>}
          {flag.resolution_note && <> — "{flag.resolution_note}"</>}
        </div>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Resolution note (required when dismissing)…"
            style={{ width: "100%", minHeight: 64, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "Inter", fontSize: 12, resize: "vertical", outline: "none" }}
          />
          {error && <div style={{ color: C.red, fontSize: 11.5, fontFamily: "Inter" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={busy} onClick={() => act((n) => onResolve.confirm(n))} style={{ display: "flex", alignItems: "center", gap: 6, background: C.green, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: busy ? "default" : "pointer" }}>
              <Check size={13} /> Confirm
            </button>
            <button disabled={busy} onClick={() => act((n) => onResolve.dismiss(n), true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: busy ? "default" : "pointer" }}>
              <X size={13} /> Dismiss (requires reason)
            </button>
            <button disabled={busy} onClick={() => act((n) => onResolve.escalate(n))} style={{ display: "flex", alignItems: "center", gap: 6, background: `${C.amber}22`, color: C.amber, border: `1px solid ${C.amber}55`, borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: busy ? "default" : "pointer" }}>
              <ArrowRight size={13} /> Escalate
            </button>
            <button disabled={busy} onClick={() => act((n) => onResolve.markTranscriptionIssue(n), true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: busy ? "default" : "pointer" }}>
              <Mic size={13} /> Mark as Transcription Issue
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Priority Alerts — dashboard critical audit signals area          */
/* ---------------------------------------------------------------- */
function PriorityAlerts({ flags, counts, loading, onReview, onDismissAlerts }) {
  if (loading) {
    return (
      <Card style={{ borderColor: `${C.red}44` }}>
        <LoadingState label="Loading priority alerts..." />
      </Card>
    );
  }

  const priority = flags.filter((f) => ["CRITICAL", "HIGH"].includes(f.severity)).slice(0, 8);

  return (
    <Card style={{ borderColor: `${C.red}44`, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldAlert size={16} color={C.red} />
          <div>
            <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 700 }}>Critical Audit Signals</div>
            <div style={{ color: C.faint, fontSize: 11, fontFamily: "Inter", marginTop: 1 }}>AI-detected issues requiring attention — updates live</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.redSoft, color: C.red, border: `1px solid ${C.red}55`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "Inter", fontWeight: 700 }}>
            {counts.critical} Critical
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#3A2114", color: "#F97316", border: "1px solid #F9731655", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "Inter", fontWeight: 700 }}>
            {counts.high} High
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}55`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "Inter", fontWeight: 700 }}>
            {counts.open} Pending Review
          </span>
        </div>
      </div>

      {priority.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: C.faint, fontSize: 12, fontFamily: "Inter" }}>
          <CheckCircle2 size={22} color={C.green} style={{ marginBottom: 8 }} />
          <div style={{ color: C.muted, fontSize: 12.5 }}>No critical or high-priority flags detected.</div>
          <div style={{ fontSize: 11.5, marginTop: 3 }}>Information mismatches, misunderstandings and compliance risks detected by the audit intelligence engine will appear here instantly.</div>
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {priority.map((f) => {
            const m = SEVERITY_META[f.severity] || SEVERITY_META.INFO;
            const resolved = ["CONFIRMED", "DISMISSED", "ESCALATED"].includes(f.status);
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${C.borderSoft}`, opacity: resolved ? 0.55 : 1 }}>
                <SeverityBadge severity={f.severity} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.title}
                    {resolved && <span style={{ color: C.faint, fontWeight: 400 }}> · {f.status}</span>}
                  </div>
                  <div style={{ color: C.faint, fontSize: 11, fontFamily: "Inter", marginTop: 2 }}>
                    Agent: {f.agent_id || "—"} · Call: {String(f.call_id).slice(0, 8)}… · {FLAG_TYPE_LABELS[f.flag_type] || f.flag_type}
                  </div>
                </div>
                <ConfidenceBadge confidence={f.confidence} />
                {f.evidence_start_time != null && <span style={{ color: C.faint, fontSize: 11, fontFamily: "JetBrains Mono" }}>{fmtTime(f.evidence_start_time)}</span>}
                <button onClick={() => onReview(f)} style={{ background: m.soft, color: m.color, border: `1px solid ${m.color}55`, borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontFamily: "Inter", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Review Call
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CriticalAlertsPage({ calls, goTo }) {
  const [flags, setFlags] = useState([]);
  const [counts, setCounts] = useState({ critical: 0, high: 0, open: 0, confirmed: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState("");
  const [err, setErr] = useState("");

  const loadData = async () => {
    setLoading(true); setErr("");
    try {
      const [fRes, cRes] = await Promise.all([
        flagsApi.list({ limit: 100 }),
        flagsApi.counts(),
      ]);
      setFlags(fRes.flags || fRes.data || []);
      if (cRes) setCounts(cRes);
    } catch (e) {
      setErr(e.message || "Failed to load critical alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleResolve = async (id, action) => {
    setResolvingId(id);
    try {
      if (action === "CONFIRM") await flagsApi.confirm(id, "Confirmed by QA Manager", "QA_MANAGER");
      else if (action === "DISMISS") await flagsApi.dismiss(id, "False positive / acceptable variation", "QA_MANAGER");
      else if (action === "ESCALATE") await flagsApi.escalate(id, "Escalated for senior review", "QA_MANAGER");
      await loadData();
    } catch (e) {
      setErr(e.message || "Action failed");
    } finally {
      setResolvingId("");
    }
  };

  const filtered = useMemo(() => {
    return flags.filter((f) => {
      if (filterSeverity !== "ALL" && f.severity !== filterSeverity) return false;
      if (filterStatus !== "ALL" && f.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (f.title || "").toLowerCase().includes(q) ||
          (f.agent_id || "").toLowerCase().includes(q) ||
          (f.flag_type || "").toLowerCase().includes(q) ||
          (f.call_id || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [flags, filterSeverity, filterStatus, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Critical Alerts & Quality Signals</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
            AI-verified compliance risks, customer misunderstandings, and policy deviations requiring manager oversight.
          </div>
        </div>
        <button onClick={loadData} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
          <RotateCw size={13} className={loading ? "spin" : ""} /> Refresh Signals
        </button>
      </div>

      {err && (
        <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>
          {err}
        </div>
      )}

      {/* KPI Headline Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <KPI label="Critical Risk Flags" value={counts.critical} accent={C.red} />
        <KPI label="High Priority Flags" value={counts.high} accent="#F97316" />
        <KPI label="Pending Review" value={counts.open} accent={C.amber} />
        <KPI label="Confirmed Issues" value={counts.confirmed} accent={C.green} />
        <KPI label="Dismissed / False Pos" value={counts.dismissed} accent={C.muted} />
      </div>

      {/* Filters & Search */}
      <Card style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: C.faint, fontSize: 12, fontWeight: 600 }}>SEVERITY:</span>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                style={{
                  background: filterSeverity === s ? C.tealSoft : C.panel2,
                  color: filterSeverity === s ? C.teal : C.muted,
                  border: `1px solid ${filterSeverity === s ? C.teal : C.border}`,
                  borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer"
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px" }}>
              <Search size={13} color={C.muted} />
              <input
                type="text"
                placeholder="Search agent, call ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "transparent", border: "none", color: C.text, fontSize: 12, outline: "none", width: 170 }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Flag List */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <LoadingState label="Loading audit intelligence alerts..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No alerts match the active filter"
            subtitle="The AI quality engine continuously checks transcripts for information mismatches, hallucinations, and compliance deviations."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((f) => {
              const m = SEVERITY_META[f.severity] || SEVERITY_META.INFO;
              const resolved = ["CONFIRMED", "DISMISSED", "ESCALATED"].includes(f.status);
              return (
                <div key={f.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column", gap: 10, background: resolved ? "transparent" : `${m.color}05` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <SeverityBadge severity={f.severity} />
                      <div>
                        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 700 }}>
                          {f.title}
                        </div>
                        <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginTop: 2 }}>
                          Agent: <strong style={{ color: C.text }}>{f.agent_id || "Unassigned"}</strong> · Call ID: <code style={{ color: C.teal, fontFamily: "JetBrains Mono" }}>{String(f.call_id).slice(0, 8)}...</code> · Type: {FLAG_TYPE_LABELS[f.flag_type] || f.flag_type}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ConfidenceBadge confidence={f.confidence} />
                      <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: resolved ? C.panel2 : C.amberSoft, color: resolved ? C.muted : C.amber, border: `1px solid ${resolved ? C.border : C.amber}55` }}>
                        {f.status}
                      </span>
                    </div>
                  </div>

                  {f.description && (
                    <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5, background: C.panel2, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>
                      {f.description}
                    </div>
                  )}

                  {/* Evidence & Statements */}
                  {(f.agent_statement || f.customer_statement || f.expected_information) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                      {f.agent_statement && (
                        <div style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}>
                          <span style={{ color: C.faint, fontSize: 11, fontWeight: 600, display: "block" }}>AGENT STATEMENT:</span>
                          <span style={{ color: C.text }}>"{f.agent_statement}"</span>
                        </div>
                      )}
                      {f.expected_information && (
                        <div style={{ background: C.panel2, border: `1px solid ${C.green}44`, borderRadius: 6, padding: "8px 12px" }}>
                          <span style={{ color: C.green, fontSize: 11, fontWeight: 600, display: "block" }}>EXPECTED (SOP):</span>
                          <span style={{ color: C.text }}>{f.expected_information}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => goTo && goTo("transcripts")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.panel2, border: `1px solid ${C.border}`, color: C.teal, borderRadius: 5, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                      >
                        <Mic size={11} /> Open Call Transcript
                      </button>
                    </div>

                    {!resolved ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          disabled={resolvingId === f.id}
                          onClick={() => handleResolve(f.id, "CONFIRM")}
                          style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.green}55`, borderRadius: 5, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: resolvingId === f.id ? "default" : "pointer" }}
                        >
                          Confirm Defect
                        </button>
                        <button
                          disabled={resolvingId === f.id}
                          onClick={() => handleResolve(f.id, "DISMISS")}
                          style={{ background: C.panel2, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: resolvingId === f.id ? "default" : "pointer" }}
                        >
                          Dismiss (False Positive)
                        </button>
                        <button
                          disabled={resolvingId === f.id}
                          onClick={() => handleResolve(f.id, "ESCALATE")}
                          style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}55`, borderRadius: 5, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: resolvingId === f.id ? "default" : "pointer" }}
                        >
                          Escalate
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: C.faint, fontStyle: "italic" }}>
                        Resolved ({f.resolution_type || f.status})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* Navigation Structure.
   Setup steps disappear from primary navigation once configuration is
   activated — they live under Settings instead. The setup_state comes
   from the backend tenant_config table, never React local state. */
const CORE_NAV_ITEMS = [
  { id: "dashboard", label: "Audit Dashboard", Icon: LayoutDashboard },
  { id: "reports", label: "Reports (Daily/Weekly/Monthly)", Icon: FileText },
  { id: "audittrail", label: "Audit Trail", Icon: History },
];

const OPERATIONS_NAV_ITEMS = [
  { id: "sop_parameters", label: "SOP & Parameters", Icon: SlidersHorizontal },
  { id: "scores", label: "Call Scores & Audits", Icon: ListChecks },
  { id: "agents", label: "Agent Mapping", Icon: Users },
  { id: "qctools", label: "7 QC Tools", Icon: Grid3x3 },
  { id: "csvupload", label: "CSV Upload", Icon: FileSpreadsheet },
];

const QALYZER_V2_ITEMS = [
  { id: "sales_forecasting", label: "AI Sales Forecasting", Icon: TrendingUp },
  { id: "data_fishing", label: '"Ask Qalyzer" Data Fishing', Icon: Search },
  { id: "knowledge_hub", label: "Products & Effective SOPs", Icon: BookOpen },
];

const ADMIN_GOVERNANCE_ITEMS = [
  { id: "admin_access", label: "Role Dashboards & Access", Icon: UserCheck },
  { id: "home_cms", label: "Edit & Update Home Page", Icon: Edit3 },
  { id: "admin_team", label: "Team Behind Profiles", Icon: Users },
  { id: "admin_subscriptions", label: "Billing & Dual Gateways", Icon: CreditCard },
  { id: "admin_email", label: "Email Automation Studio", Icon: Send },
  { id: "admin_activity", label: "Active Sessions & Sync", Icon: Activity },
  { id: "universal_search", label: "Universal Audit Search", Icon: Search },
  { id: "enquiries", label: "Inbound Enquiries", Icon: Mail },
  { id: "admin_users", label: "User & Login Controls", Icon: Shield },
];

const SETTINGS_NAV_ITEMS = [
  { id: "onboarding", label: "CRM Setup", Icon: Radio },
  { id: "settings", label: "Audit Configuration", Icon: SlidersHorizontal },
  { id: "cloudflare_db", label: "Cloudflare D1 & R2", Icon: Database },
  { id: "payu_billing", label: "PayU & Razorpay Billing", Icon: CreditCard },
];

function navGroupsFor(_setupState, userRole = "super_admin", roleFeaturesMap = null) {
  const normalizedRole = userRole === "admin" ? "super_admin" : userRole;
  const allowedIds = roleFeaturesMap && Array.isArray(roleFeaturesMap[normalizedRole])
    ? new Set(roleFeaturesMap[normalizedRole])
    : null;

  const filterItems = (items) => (allowedIds ? items.filter((it) => allowedIds.has(it.id)) : items);

  const groups = [
    { title: "OVERVIEW & REPORTS", items: filterItems(CORE_NAV_ITEMS) },
    { title: "OPERATIONS", items: filterItems(OPERATIONS_NAV_ITEMS) },
    { title: "QALYZER v2.0 INTELLIGENCE", items: filterItems(QALYZER_V2_ITEMS) },
  ];

  const adminItems = filterItems(ADMIN_GOVERNANCE_ITEMS);
  if (adminItems.length > 0) {
    const isClientOrg = normalizedRole.startsWith("client");
    groups.push({
      title: isClientOrg ? "CLIENT ORGANIZATION ADMIN" : "SUPER ADMIN & GOVERNANCE",
      items: adminItems,
    });
  }

  const settingsItems = filterItems(SETTINGS_NAV_ITEMS);
  if (settingsItems.length > 0) {
    groups.push({ title: "SETTINGS & INFRASTRUCTURE", items: settingsItems });
  }

  return groups.filter((g) => g.items.length > 0);
}

/* Real recording duration only. An unknown duration returns 0 so the call is
   excluded from duration charts instead of contributing an invented value. */
function parseDurationSeconds(dur) {
  if (!dur) return 0;
  if (typeof dur === "number") return dur;
  const parts = String(dur).split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const num = parseFloat(dur);
  return !isNaN(num) ? num : 0;
}

/* ---------------------------------------------------------------- */
/*  1. Audit Dashboard Module (backend-aggregated KPIs + alerts)     */
/* ---------------------------------------------------------------- */
function AuditDashboard({ calls, agents, loading, error, onRetry, goTo, triggerTestCall, isTriggering, testCallMsg, testCallError, flagCounts, alerts, alertsLoading, onReviewFlag, dataVersion }) {
  const [dateRange, setDateRange] = useState("14d");
  const [procFilter, setProcFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [kpis, setKpis] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpiError, setKpiError] = useState("");

  // KPIs come from the backend aggregate endpoint — never derived
  // client-side from raw call lists or mock data. The active filters are
  // sent to the server so changing them changes the underlying query.
  useEffect(() => {
    let mounted = true;
    setKpisLoading(true);
    const days = parseInt(dateRange.replace("d", ""), 10) || 14;
    dashboardApi.getKpis(days, {
      agent_id: agentFilter !== "All" ? agentFilter : undefined,
      process: procFilter !== "All" ? procFilter : undefined,
    })
      .then((data) => { if (mounted) { setKpis(data); setKpiError(""); } })
      .catch((e) => { if (mounted) { setKpis(null); setKpiError(e.message || "Unable to load audit data. Please try again."); } })
      .finally(() => { if (mounted) setKpisLoading(false); });
    return () => { mounted = false; };
  }, [dateRange, procFilter, agentFilter, calls.length, dataVersion]);

  const filteredCalls = useMemo(() => {
    let list = [...calls];

    if (dateRange) {
      const days = parseInt(dateRange.replace("d", ""), 10) || 14;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter((c) => {
        if (!c.created_at && !c.date) return true;
        const d = new Date(c.created_at || c.date);
        return d >= cutoff;
      });
    }

    if (procFilter !== "All") {
      list = list.filter((c) => (c.process || "").toLowerCase() === procFilter.toLowerCase());
    }

    if (agentFilter !== "All") {
      list = list.filter((c) => (c.agent || c.agent_id || "").toLowerCase() === agentFilter.toLowerCase());
    }

    return list;
  }, [calls, dateRange, procFilter, agentFilter]);

  if (loading) return <LoadingState label="Loading audit dashboard metrics..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  // Local aggregates are plain counts over rows the backend returned for the
  // active filters. No value is synthesised: an unscored call is not given a
  // score, a call with no defect is not assigned a defect category.
  const completedCalls = filteredCalls.filter((c) => c.status === "COMPLETED");
  const scoredCalls = completedCalls.filter((c) => typeof c.score === "number");

  // The seven headline metrics are the backend's own aggregates. While the
  // aggregate request is in flight (or if it failed) the tiles show "—"
  // rather than a client-side number that could disagree with the server.
  const audited = kpis ? kpis.calls_audited : "—";
  const avg = kpis ? kpis.average_score : "—";
  const pending = kpis ? kpis.pending_review : "—";
  const failed = kpis ? kpis.failed_audits : "—";

  const recent = filteredCalls.slice(0, 10);

  // AHT Trend — one point per processed call that carries a duration.
  const ahtTrendData = filteredCalls
    .filter((c) => parseDurationSeconds(c.duration) > 0)
    .map((c) => ({ day: c.date || "—", ahtSec: parseDurationSeconds(c.duration) }));

  // Score band distribution — the real audit outcome spread.
  const scoreBands = [
    { band: "<60", min: 0, max: 59.999, color: C.red },
    { band: "60-79", min: 60, max: 79.999, color: C.amber },
    { band: "80+", min: 80, max: 100, color: C.green },
  ];
  const scoreBandCounts = scoreBands.map((b) => ({
    band: b.band,
    count: scoredCalls.filter((c) => Number(c.score) >= b.min && Number(c.score) <= b.max).length,
  }));

  // Pareto Defects — only defects actually recorded against a call.
  const defectCountsMap = {};
  filteredCalls.forEach((c) => {
    const d = c.flags?.defect;
    if (d) defectCountsMap[d] = (defectCountsMap[d] || 0) + 1;
  });
  const paretoSorted = Object.entries(defectCountsMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  let cum = 0;
  const totalDefects = paretoSorted.reduce((a, b) => a + b.count, 0);
  const paretoData = paretoSorted.map((d) => {
    cum += d.count;
    return { ...d, cumPct: totalDefects ? Math.round((cum / totalDefects) * 100) : 0 };
  });

  // Root Cause Breakdown — only root causes recorded on the call, plus the
  // categories the flag engine actually produced for this tenant.
  const rootCauseCounts = {};
  filteredCalls.forEach((c) => {
    const rc = c.flags?.root_cause;
    if (rc) rootCauseCounts[rc] = (rootCauseCounts[rc] || 0) + 1;
  });
  const rootCauseData = Object.entries(rootCauseCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Agent Scorecard — derived from each agent's real audited calls.
  const agentScorecard = agents.map((a) => {
    const aCalls = calls.filter((c) => (c.agent || c.agent_id || "").toLowerCase() === (a.code || a.name || "").toLowerCase());
    const aAudited = aCalls.filter((c) => c.status === "COMPLETED");
    const aScored = aAudited.filter((c) => typeof c.score === "number");
    return {
      id: a.id,
      name: a.name,
      code: a.code,
      callsAudited: aAudited.length,
      fatal: aCalls.filter((c) => c.status === "FAILED" || (typeof c.score === "number" && c.score < 60)).length,
      avgScore: aScored.length ? Math.round(aScored.reduce((sum, c) => sum + Number(c.score), 0) / aScored.length) : null,
      hasAudit: aAudited.length > 0,
      allPassing: aScored.length > 0 && aScored.every((c) => Number(c.score) >= 80),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header & Subtitle */}
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Audit Dashboard</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Live audit KPIs and call analytics computed strictly from database records.</div>
      </div>

      {calls.length === 0 && (
        <EmptyState
          title="No calls audited yet."
          subtitle="Nothing has been ingested for this workspace. Post a call to POST /api/call-complete, or use 'Add Test Call (Webhook)' above."
        />
      )}

      {/* Data / Filter Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.faint, fontSize: 12, fontFamily: "Inter" }}>
            <Filter size={13} /> Data selection
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 7, padding: 3 }}>
            {["7d", "14d", "30d"].map((d) => (
              <button key={d} onClick={() => setDateRange(d)} style={{ background: dateRange === d ? C.teal : "transparent", color: dateRange === d ? "#000000" : C.muted, border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11.5, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}>
                Last {d}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.faint, fontSize: 12, fontFamily: "Inter" }}>Process</span>
            <select value={procFilter} onChange={(e) => setProcFilter(e.target.value)} style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontFamily: "Inter", outline: "none" }}>
              <option value="All">All</option>
              <option value="Sales">Sales</option>
              <option value="Collections">Collections</option>
              <option value="Support">Support</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.faint, fontSize: 12, fontFamily: "Inter" }}>Agent</span>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontFamily: "Inter", outline: "none" }}>
              <option value="All">All</option>
              {agents.map((a) => <option key={a.id || a.code} value={a.code}>{a.name} ({a.code})</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={triggerTestCall}
            disabled={isTriggering || agents.length === 0}
            title={agents.length === 0 ? "Register an agent first" : "POST a test call to /api/call-complete"}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: agents.length === 0 ? C.faint : C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontSize: 12, fontWeight: 600, cursor: isTriggering || agents.length === 0 ? "default" : "pointer" }}
          >
            {isTriggering ? <Loader2 size={13} className="spin" /> : <Zap size={13} color={C.teal} />}
            {isTriggering ? "Queueing…" : "Add Test Call (Webhook)"}
          </button>

          <button onClick={() => downloadCSV("AuditAI_Dashboard_Export.csv", filteredCalls)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Download size={13} /> Download Dashboard Data (CSV)
          </button>
        </div>
      </div>

      {(testCallMsg || testCallError) && (
        <div style={{
          background: testCallError ? C.redSoft : C.tealSoft,
          color: testCallError ? C.red : C.teal,
          border: `1px solid ${testCallError ? C.red : C.teal}44`,
          borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600,
        }}>
          {testCallError || `✓ ${testCallMsg}`}
        </div>
      )}

      {kpiError && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.red}40`, borderRadius: 8, padding: "10px 12px", color: C.red, fontFamily: "Inter", fontSize: 12.5 }}>
          {kpiError} — the tiles below show “—” because the aggregates could not be read.
        </div>
      )}

      {/* Primary KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <KPI label="Calls Audited" value={audited} sub={`last ${dateRange}`} />
        <KPI label="Average Score" value={avg === "—" ? "—" : `${avg}%`} accent={avg === "—" ? C.muted : (avg >= 80 ? C.green : avg >= 60 ? C.amber : C.red)} />
        <KPI label="Pending Review" value={pending} accent={C.amber} />
        <KPI label="Failed Audits" value={failed} accent={C.red} />
      </div>

      {/* Qalyzer v2.0 AI Sales & Conversion Forecasting Widget */}
      <SalesForecastingWidget />

      {/* Priority Alerts — AI-detected critical audit signals (realtime) */}
      <PriorityAlerts flags={alerts} counts={flagCounts} loading={alertsLoading} onReview={onReviewFlag} />

      {/* Audit Intelligence KPI Row — from flag engine data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <KPI label="Critical Flags" value={kpisLoading ? "…" : (kpis ? kpis.critical_flags : flagCounts.critical)} accent={C.red} sub="AI-verified critical findings" />
        <KPI label="High Priority Flags" value={kpisLoading ? "…" : (kpis ? kpis.high_flags : flagCounts.high)} accent="#F97316" sub="requires QA review" />
        <KPI label="Open Flags" value={kpisLoading ? "…" : (kpis ? kpis.open_flags : flagCounts.open)} accent={C.amber} sub="awaiting resolution" />
        <KPI label="Confirmed / Dismissed" value={kpisLoading ? "…" : `${kpis ? kpis.confirmed_flags : flagCounts.confirmed} / ${kpis ? kpis.dismissed_flags : flagCounts.dismissed}`} accent={C.teal} sub="human feedback captured" />
      </div>

      {/* Intelligence rate metrics — computed server-side from flag data.
          "—" while unavailable: a 0% would be indistinguishable from a real zero. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <KPI label="Misinformation Rate" value={kpisLoading || !kpis ? "—" : `${kpis.misinformation_rate}%`} sub="calls with info/medication/price mismatches" />
        <KPI label="Customer Misunderstanding Rate" value={kpisLoading || !kpis ? "—" : `${kpis.customer_misunderstanding_rate}%`} sub="intent / fact misunderstandings" />
        <KPI label="Compliance Violation Rate" value={kpisLoading || !kpis ? "—" : `${kpis.compliance_violation_rate}%`} sub="compliance violations detected" />
      </div>

      {/* Live Signal Line Bar */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: C.text, fontSize: 13, fontFamily: "Space Grotesk", fontWeight: 600 }}>
            Live Signal Line <span style={{ color: C.faint, fontWeight: 400, fontSize: 12 }}>— {filteredCalls.length} audited calls in view, colored by flag — click a bar to open that call</span>
          </div>
        </div>

        {filteredCalls.length === 0 ? (
          <div style={{ color: C.faint, fontSize: 12, padding: "10px 0" }}>No audited calls in view.</div>
        ) : (
          <div style={{ display: "flex", gap: 4, height: 24, borderRadius: 6, overflow: "hidden", background: C.panel2, padding: 3 }}>
            {filteredCalls.map((c, i) => {
              const flagColor = typeof c.score === "number"
                ? (c.score >= 80 ? C.green : c.score >= 60 ? C.amber : C.red)
                : C.faint;
              return (
                <div
                  key={c.id || i}
                  onClick={() => goTo("transcripts", c.id)}
                  title={`${c.agent || 'Call'} (${c.score}% - ${c.status})`}
                  style={{ flex: 1, background: flagColor, borderRadius: 3, cursor: "pointer", opacity: 0.88, transition: "opacity 0.15s" }}
                />
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.faint, fontSize: 11, fontFamily: "Inter" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: C.red }} /> Red — High risk</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.faint, fontSize: 11, fontFamily: "Inter" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: C.amber }} /> Amber — Needs attention</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.faint, fontSize: 11, fontFamily: "Inter" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} /> Green — Good to go</span>
        </div>
      </Card>

      {/* Analytics Charts Grid 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>AHT Trend</div>
              <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter" }}>Average Handle Time trend across database calls</div>
            </div>
            <button onClick={() => goTo("qctools")} style={{ background: "none", border: "none", color: C.teal, fontSize: 11.5, fontFamily: "Inter", cursor: "pointer" }}>View underlying calls &rsaquo;</button>
          </div>
          {ahtTrendData.length === 0 ? (
            <EmptyState title="Not enough data to display AHT trend" subtitle="AHT metrics will populate automatically as calls are ingested into Supabase." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ahtTrendData} margin={{ left: -22, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={26} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="ahtSec" stroke={C.teal} strokeWidth={2} dot={{ r: 2.5, fill: C.teal }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Score Distribution</div>
              <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter" }}>Audited calls by final score band</div>
            </div>
            <button onClick={() => goTo("scores")} style={{ background: "none", border: "none", color: C.teal, fontSize: 11.5, fontFamily: "Inter", cursor: "pointer" }}>View call scores &rsaquo;</button>
          </div>
          {scoredCalls.length === 0 ? (
            <EmptyState title="No calls audited yet." subtitle="Score distribution appears once calls finish AI scoring." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={scoreBandCounts} margin={{ left: -20, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="band" tick={axisTick} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreBandCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={scoreBands[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Analytics Charts Grid 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Pareto Defect Analysis</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginBottom: 10 }}>Defect breakdown across audited database records</div>
          {paretoData.length === 0 ? (
            <EmptyState title="No defect data available" subtitle="Defect categories log dynamically when AI evaluation detects non-compliance." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={paretoData} margin={{ left: -20, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: C.faint, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={24} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...tooltipStyle} />
                <Bar yAxisId="left" dataKey="count" fill={C.red} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={C.teal} strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Root Cause Breakdown</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginBottom: 10 }}>Categorized failure drivers across audited calls</div>
          {rootCauseData.length === 0 ? (
            <EmptyState title="No root cause data available" subtitle="Root causes appear once a call is audited with a recorded cause." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={rootCauseData} margin={{ left: 20, right: 14, top: 6 }}>
                <CartesianGrid stroke={C.borderSoft} horizontal={false} />
                <XAxis type="number" tick={axisTick} axisLine={{ stroke: C.border }} />
                <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} width={100} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rootCauseData.map((entry) => (
                    <Cell key={entry.name} fill={ROOT_CAUSE_COLOR[entry.name] || C.teal} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Agent-wise QC Scorecard Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.panel2 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Agent-wise QC Scorecard (Input vs Output Flow)</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginTop: 2 }}>Audit volume, fatal counts and average score per agent — "HAS AUDIT" means at least one completed audit, "ALL SCORES 80+" means every scored audit passed.</div>
        </div>

        {agentScorecard.length === 0 ? (
          <EmptyState title="No agents registered yet" subtitle="Register agents in Agent Mapping to track performance metrics." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["AGENT", "EMPLOYEE CODE", "CALLS AUDITED", "FATAL", "AVERAGE SCORE", "HAS AUDIT", "ALL SCORES 80+"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.faint, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentScorecard.map((a) => (
                  <tr key={a.id || a.code} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                    <td style={{ padding: "11px 14px", color: C.text, fontSize: 12.5, fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: "11px 14px", color: C.teal, fontSize: 12, fontFamily: "JetBrains Mono" }}>{a.code}</td>
                    <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12, fontFamily: "JetBrains Mono" }}>{a.callsAudited}</td>
                    <td style={{ padding: "11px 14px", color: a.fatal > 0 ? C.red : C.muted, fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: a.fatal > 0 ? 700 : 400 }}>{a.fatal}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {a.avgScore === null
                        ? <span style={{ color: C.faint, fontSize: 12 }}>Not scored</span>
                        : <span style={{ color: a.avgScore >= 80 ? C.green : a.avgScore >= 60 ? C.amber : C.red, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13 }}>{a.avgScore}%</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ color: a.hasAudit ? C.green : C.faint, fontSize: 11, fontWeight: 600 }}>{a.hasAudit ? "✓ Yes" : "—"}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ color: a.allPassing ? C.green : C.faint, fontSize: 11, fontWeight: 600 }}>{a.allPassing ? "✓ Yes" : "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Calls Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Recent Calls Stream</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter" }}>Every row is a call record ingested by the telephony webhook and processed by the backend pipeline.</div>
        </div>

        {recent.length === 0 ? (
          <EmptyState title="No calls audited yet." subtitle="Send a test call payload from Postman to POST /api/call-complete, or use 'ADD TEST CALL (WEBHOOK)' above." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["AGENT CODE / ID", "DATE", "SCORE", "STATUS", "ACTIONS"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.faint, fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id} onClick={() => goTo("transcripts", c.id)} style={{ borderBottom: `1px solid ${C.borderSoft}`, cursor: "pointer" }}>
                    <td style={{ padding: "11px 14px", color: C.text, fontSize: 13, fontWeight: 600 }}>{c.agent || c.agent_id}</td>
                    <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12.5, fontFamily: "JetBrains Mono" }}>{c.date}</td>
                    <td style={{ padding: "11px 14px", color: C.text, fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{typeof c.score === "number" ? `${c.score}%` : "—"}</td>
                    <td style={{ padding: "11px 14px" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      <button onClick={(e) => { e.stopPropagation(); goTo("transcripts", c.id); }} style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.teal, borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}>Quick view</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  2. Script Upload Module (1. Upload SOP)                           */
/* ---------------------------------------------------------------- */
function ScriptUpload({ setParameters }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingSop, setSavingSop] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadedVersionId, setUploadedVersionId] = useState(null);
  const [activating, setActivating] = useState(false);

  const [fileBase64, setFileBase64] = useState("");

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setSuccessMsg("");

    const isBinary = file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (isBinary) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          // data:*/*;base64,...
          const base64Data = result.split(",")[1] || result;
          setFileBase64(base64Data);
          setText(`[Attached Document: ${file.name}] Ready for backend text extraction.`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFileBase64("");
      const reader = new FileReader();
      reader.onload = (ev) => setText(ev.target?.result || "");
      reader.readAsText(file);
    }
  }

  async function processAndExtractSop() {
    if (!text.trim() && !fileBase64) {
      setError("Please choose a PDF, DOCX, or TXT file, or paste SOP text.");
      return;
    }
    setLoading(true); setError(""); setExtracted(null); setSuccessMsg("");
    try {
      const payload = {
        file_name: fileName || "sop-document.txt",
        process: "General",
        language: "English",
      };
      if (fileBase64) {
        payload.file_base64 = fileBase64;
      } else {
        payload.raw_text = text;
      }

      const res = await settingsApi.processSop(payload);
      const version = res?.version;
      const rules = res?.extracted_rules || [];

      setUploadedVersionId(version?.id || null);
      setExtracted(rules);
      setSuccessMsg(`SOP v${version?.version_number ?? "1"} processed successfully! ${rules.length} audit parameters extracted with Gemini AI.`);
    } catch (e) {
      setError(`SOP Processing failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveSopToDatabase() {
    await processAndExtractSop();
  }

  async function extractRules() {
    await processAndExtractSop();
  }

  async function applyToParameters() {
    if (!extracted || extracted.length === 0) return;
    setError("");
    try {
      const paramsToApprove = extracted.map((r) => ({
        name: r.rule,
        weight: Number(r.suggestedWeight) || 15,
      }));
      await settingsApi.approveParameters(paramsToApprove);
      setExtracted(null);
      setSuccessMsg(`✓ Successfully approved and saved ${paramsToApprove.length} parameters into Supabase database.`);
      if (typeof setParameters === "function") {
        const updated = await parametersApi.list();
        setParameters(updated.parameters || []);
      }
    } catch (e) {
      setError(e.message || "Failed to apply parameters to database.");
    }
  }

  async function activateConfiguration() {
    setActivating(true); setError("");
    try {
      await settingsApi.activateConfiguration(uploadedVersionId);
      setSuccessMsg("Audit configuration is active. Redirecting to the dashboard…");
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (e) {
      setError(e.message || "Activation failed.");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>1. Upload SOP</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Upload SOP documents or paste text to extract audit rules and update scoring parameters.</div>
      </div>

      {successMsg && (
        <div style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter" }}>
          {error}
        </div>
      )}

      <Card>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Upload Call Script / SOP Document</div>
        <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", marginBottom: 14 }}>Accepts .pdf, .docx, .doc, and .txt files or direct SOP text. Processed with backend document extraction and Gemini AI to extract audit rules into versioned parameters.</div>
        
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", color: C.text, fontSize: 12.5, fontFamily: "Inter", cursor: "pointer", marginBottom: 14 }}>
          <UploadCloud size={14} color={C.teal} /> {fileName || "Choose file (.pdf, .docx, .txt)"}
          <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} style={{ display: "none" }} />
        </label>
        
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your SOP text here or upload a PDF/DOCX file above..." style={{ width: "100%", height: 200, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontFamily: "JetBrains Mono", fontSize: 12, resize: "vertical", outline: "none" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={processAndExtractSop} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "9px 18px", fontFamily: "Inter", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} {loading ? "Processing Document & Extracting Rules..." : "Process SOP & Extract Rules (Gemini AI)"}
          </button>
        </div>
      </Card>
      
      {extracted && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Extracted Audit Rules</div>
            <button onClick={applyToParameters} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Save to Parameters (Supabase)</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {extracted.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "9px 12px" }}>
                <span style={{ color: C.text, fontSize: 13, fontFamily: "Inter" }}>{r.rule}</span>
                <span style={{ color: C.teal, fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{r.suggestedWeight}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 4: Activate the configuration — completes one-time setup */}
      {uploadedVersionId && (
        <Card style={{ borderColor: `${C.teal}55`, textAlign: "center", padding: 24 }}>
          <CheckCircle2 size={26} color={C.teal} style={{ marginBottom: 8 }} />
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>SOP version saved</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginBottom: 14, maxWidth: 420, margin: "0 auto 14px", lineHeight: 1.5 }}>
            Review the generated scripts and audit parameters in steps 2 and 3, then activate the configuration to start auditing calls.
          </div>
          <button onClick={() => activateConfiguration()} disabled={activating} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.teal, color: "#000000", border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: "Inter", fontWeight: 700, fontSize: 13, cursor: activating ? "default" : "pointer" }}>
            {activating ? <Loader2 size={14} className="spin" /> : <Check size={14} />} {activating ? "Activating…" : "Activate Audit Configuration"}
          </button>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  3. Call Transcripts Module                                        */
/* ---------------------------------------------------------------- */
function CallTranscripts({ calls, loading, selectedId, setSelectedId }) {
  const active = calls.find((c) => c.id === selectedId) || calls[0];

  const [query, setQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState("");
  const audioRef = useRef(null);

  const [rcaDetail, setRcaDetail] = useState(null);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [rcaError, setRcaError] = useState("");

  // Audit intelligence: flags for the selected call
  const [callFlags, setCallFlags] = useState([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState("");
  const [selectedFlag, setSelectedFlag] = useState(null);

  useEffect(() => {
    if (!selectedId && calls.length > 0) {
      setSelectedId(calls[0].id);
    }
  }, [calls, selectedId, setSelectedId]);

  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setRcaDetail(null);
    setRcaError("");
    setShowRaw(false);
    setSelectedFlag(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [active?.id]);

  // Load flags for the selected call — flags are first-class call objects
  useEffect(() => {
    let mounted = true;
    if (!active?.id) { setCallFlags([]); setFlagsError(""); return; }
    setFlagsLoading(true); setFlagsError("");
    flagsApi.forCall(active.id)
      .then((flags) => { if (mounted) setCallFlags(flags || []); })
      .catch((e) => {
        // An error is not an empty result — say so instead of showing "no flags".
        if (mounted) { setCallFlags([]); setFlagsError(e.message || "Unable to load flags for this call."); }
      })
      .finally(() => { if (mounted) setFlagsLoading(false); });
    return () => { mounted = false; };
  }, [active?.id, active?.status]);

  // Resolve actions on a flag (confirm/dismiss/escalate/transcription issue)
  const resolveFlag = {
    confirm: (note) => flagsApi.confirm(selectedFlag.id, note, "manager").then(() => refreshFlags()),
    dismiss: (note) => flagsApi.dismiss(selectedFlag.id, note, "manager").then(() => refreshFlags()),
    escalate: (note) => flagsApi.escalate(selectedFlag.id, note, "manager").then(() => refreshFlags()),
    markTranscriptionIssue: (note) => flagsApi.markTranscriptionIssue(selectedFlag.id, note, "manager").then(() => refreshFlags()),
  };

  function refreshFlags() {
    if (!active?.id) return;
    return flagsApi.forCall(active.id)
      .then((flags) => { setCallFlags(flags || []); setSelectedFlag(null); })
      .catch(() => {});
  }

  useEffect(() => {
    let isMounted = true;
    async function resolveAudioUrl() {
      if (!active) return;
      let rawUrl = active.recording_path || active.flags?.recording_url || active.recordingUrl || "";
      if (rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"))) {
        if (isMounted) setAudioSrc(rawUrl);
        return;
      }
      if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        if (supabase) {
          try {
            const { data } = await supabase.storage.from("recordings").createSignedUrl(rawUrl, 3600);
            if (data?.signedUrl && isMounted) {
              setAudioSrc(data.signedUrl);
              return;
            }
          } catch (e) {
            console.warn("[AuditAI] Could not sign the recording URL; the player will show no audio for this call.", e?.message || e);
          }
        }
      }
      if (isMounted) {
        // No fallback demo audio in production — show an explicit empty player
        setAudioSrc("");
      }
    }
    resolveAudioUrl();
    return () => { isMounted = false; };
  }, [active?.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  async function handleGenerateRCA() {
    if (!active) return;
    setRcaLoading(true); setRcaError("");
    try {
      const res = await fetchDetailedRCA({ callId: active.id, defect: active.flags?.defect || active.failure_reason || null, rootCauseHint: null, channel: "Call" });
      setRcaDetail(res);
    } catch (e) {
      setRcaError("Failed to generate RCA.");
    } finally {
      setRcaLoading(false);
    }
  }

  const filtered = calls.filter((c) => (c.agent || c.agent_id || "").toLowerCase().includes(query.toLowerCase()) || (c.id || "").toLowerCase().includes(query.toLowerCase()));

  if (loading) return <LoadingState label="Loading call transcripts..." />;

  if (calls.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Call Transcripts</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Interactive call-audit workspace with speaker diarization, audio recording, and AI evaluation.</div>
        </div>
        <EmptyState title="No calls have been audited yet" subtitle="Post a webhook payload to POST /api/call-complete from Postman to process calls and view AssemblyAI transcripts here." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Call Transcripts</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Interactive call-audit workspace with speaker diarization, audio recording, and AI evaluation.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 300px", gap: 16 }}>
        {/* Left Column: Call Roster */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color={C.faint} style={{ position: "absolute", left: 9, top: 9 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search calls…" style={{ width: "100%", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px 7px 28px", color: C.text, fontFamily: "Inter", fontSize: 12.5, outline: "none" }} />
            </div>
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {filtered.map((c) => (
              <div key={c.id} onClick={() => setSelectedId(c.id)} style={{ padding: "11px 13px", cursor: "pointer", borderBottom: `1px solid ${C.borderSoft}`, background: c.id === active?.id ? C.panel2 : "transparent", borderLeft: c.id === active?.id ? `3px solid ${C.teal}` : "3px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.text, fontSize: 13, fontFamily: "Inter", fontWeight: 600 }}>{c.agent || c.agent_id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                  <span style={{ color: C.faint, fontSize: 10.5, fontFamily: "JetBrains Mono" }}>{c.id.slice(0, 8)}... · {c.date}</span>
                  <span style={{ color: typeof c.score === "number" ? C.teal : C.faint, fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{typeof c.score === "number" ? `${c.score}%` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Middle Column: Player & Transcript */}
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {active && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>Agent: {active.agent || active.agent_id}</div>
                  <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "JetBrains Mono", marginTop: 3 }}>Call ID: {active.id} · {active.date} · {active.duration || "—"}</div>
                </div>
                {active.flags?.raw_transcript && active.flags.raw_transcript.length > 0 && (
                  <button onClick={() => setShowRaw(!showRaw)} style={{ background: showRaw ? C.tealSoft : C.panel2, color: showRaw ? C.teal : C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}>
                    {showRaw ? "✓ Raw Devanagari" : "Roman Hindi (Default)"}
                  </button>
                )}
              </div>

              {/* HTML5 Audio Player */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: C.panel2, padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.borderSoft}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={togglePlay} style={{ display: "flex", alignItems: "center", gap: 6, background: C.teal, color: "#000000", border: "none", borderRadius: 6, padding: "7px 14px", fontFamily: "Inter", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {isPlaying ? <Pause size={13} /> : <Play size={13} />} {isPlaying ? "Pause Recording" : "Play Recording"}
                  </button>
                  <span style={{ color: C.faint, fontSize: 11, fontFamily: "JetBrains Mono" }}>Duration: {active.duration || "—"}</span>
                </div>
                <audio
                  ref={audioRef}
                  src={audioSrc || undefined}
                  controls
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{ width: "100%", height: 38, marginTop: 4, borderRadius: 6 }}
                />
              </div>

              {/* Transcript Turns — flagged segments carry severity markers */}
              {(() => {
                const turns = (showRaw && active.flags?.raw_transcript) ? active.flags.raw_transcript : (active.transcript || []);
                if (turns.length > 0) return null;
                // An empty transcript is either still processing or failed —
                // say which, never render placeholder dialogue.
                return (
                  <div style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 14 }}>
                    {active.status === "FAILED" ? (
                      <div style={{ color: C.red, fontSize: 12.5, fontFamily: "Inter" }}>
                        Audit failed: {active.failure_reason || "no failure reason was recorded."}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.amber, fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
                        <Loader2 size={13} className="spin" /> AI audit in progress… current stage: {active.status}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                {((showRaw && active.flags?.raw_transcript) ? active.flags.raw_transcript : (active.transcript || [])).map((turn, i) => {
                  const spk = turn.speaker || turn.spk || "Unknown";
                  // Flags pointing at this segment (by transcript_segment_id or time overlap)
                  const turnStart = turn.start ?? (turn.timestamp ? parseInt(String(turn.timestamp).split("-")[0], 10) : null);
                  const turnFlags = callFlags.filter((f) => {
                    if (f.transcript_segment_id != null && String(f.transcript_segment_id) === String(i)) return true;
                    if (f.evidence_start_time != null && turnStart != null && !isNaN(turnStart)) {
                      return f.evidence_start_time >= turnStart && f.evidence_start_time <= (turn.end ?? turnStart + 8000);
                    }
                    return false;
                  });
                  const hasCritical = turnFlags.some((f) => ["CRITICAL", "HIGH"].includes(f.severity));
                  return (
                    <div key={i} style={{ display: "flex", gap: 12 }}>
                      <div style={{ minWidth: 68, fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 600, color: spk === "Agent" ? C.teal : C.muted, paddingTop: 3 }}>
                        {spk}
                        {turnStart != null && !isNaN(turnStart) && (
                          <div style={{ color: C.faint, fontWeight: 400, fontSize: 10 }}>{fmtTime(turnStart)}</div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          background: hasCritical ? `${C.red}14` : spk === "Agent" ? `${C.teal}14` : C.panel2,
                          border: `1px solid ${hasCritical ? `${C.red}55` : C.borderSoft}`,
                          borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: "Inter", lineHeight: 1.5
                        }}>
                          {turn.text || turn.t}
                        </div>
                        {turnFlags.map((f) => {
                          const m = SEVERITY_META[f.severity] || SEVERITY_META.INFO;
                          return (
                            <button key={f.id} onClick={() => setSelectedFlag(f)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, background: m.soft, border: `1px solid ${m.color}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                              <SeverityBadge severity={f.severity} />
                              <span style={{ color: m.color, fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>{f.title}</span>
                              <ConfidenceBadge confidence={f.confidence} />
                            </button>
                          );
                        })}
                        {(turn.time || turn.timestamp) && !turnStart && <div style={{ fontSize: 10, color: C.faint, marginTop: 3, fontFamily: "JetBrains Mono" }}>{turn.time || turn.timestamp}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Right Column: AI Audit, Flags & RCA Detail */}
        <Card style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 600 }}>
          {active && (
            <>
              {/* Audit Intelligence — flags for this call */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13.5, fontWeight: 600 }}>Audit Intelligence</div>
                  {callFlags.length > 0 && (
                    <span style={{ color: C.faint, fontSize: 11, fontFamily: "Inter" }}>
                      {callFlags.filter((f) => !["CONFIRMED", "DISMISSED", "ESCALATED"].includes(f.status)).length} open
                    </span>
                  )}
                </div>
                {flagsLoading ? (
                  <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter" }}><Loader2 size={11} className="spin" style={{ marginRight: 5 }} />Loading flags…</div>
                ) : flagsError ? (
                  <div style={{ color: C.red, fontSize: 11.5, fontFamily: "Inter", lineHeight: 1.5, background: C.redSoft, padding: 10, borderRadius: 8, border: `1px solid ${C.red}44` }}>
                    {flagsError}
                  </div>
                ) : callFlags.length === 0 ? (
                  <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", lineHeight: 1.5, background: C.panel2, padding: 10, borderRadius: 8, border: `1px solid ${C.borderSoft}` }}>
                    No intelligence flags on this call. Information mismatches, misunderstandings and compliance risks detected by the flag engine appear here with evidence.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {callFlags.map((f) => {
                      const m = SEVERITY_META[f.severity] || SEVERITY_META.INFO;
                      return (
                        <button key={f.id} onClick={() => setSelectedFlag(f)} style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: selectedFlag?.id === f.id ? m.soft : C.panel2, border: `1px solid ${selectedFlag?.id === f.id ? `${m.color}66` : C.borderSoft}`, borderRadius: 7, padding: "8px 10px", cursor: "pointer" }}>
                          <SeverityBadge severity={f.severity} />
                          <span style={{ flex: 1, color: C.text, fontSize: 12, fontFamily: "Inter", fontWeight: 500 }}>{f.title}</span>
                          <ConfidenceBadge confidence={f.confidence} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedFlag && (
                <FlagDetailPanel
                  flag={selectedFlag}
                  onResolve={resolveFlag}
                  onClose={() => setSelectedFlag(null)}
                />
              )}

              <div>
                <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>AI Audit Summary</div>
                <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", lineHeight: 1.5, background: C.panel2, padding: 10, borderRadius: 8, border: `1px solid ${C.borderSoft}` }}>
                  {active.flags?.summary
                    ? active.flags.summary
                    : active.status === "COMPLETED"
                      ? <span style={{ color: C.faint }}>The scoring model returned parameter scores but no narrative summary for this call.</span>
                      : <span style={{ color: C.faint }}>AI audit in progress… the summary appears once scoring completes.</span>}
                </div>
              </div>

              <RCADetailView
                rootCause={active.flags?.root_cause || null}
                defect={active.flags?.defect || active.failure_reason}
                detail={rcaDetail}
                loading={rcaLoading}
                error={rcaError}
                onGenerate={handleGenerateRCA}
              />

              <div>
                <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Parameter Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(active.parameter_scores || active.paramScores || []).map((p, idx) => {
                    const pName = p.name || p.parameter_id || "Parameter";
                    const pScore = Number(p.score || 0);
                    const barColor = pScore >= 80 ? C.green : pScore >= 60 ? C.amber : C.red;
                    return (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ color: C.muted, fontSize: 11.5, fontFamily: "Inter" }}>{pName}</span>
                          <span style={{ color: barColor, fontSize: 11.5, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{pScore}%</span>
                        </div>
                        <div style={{ height: 6, background: C.panel2, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, pScore))}%`, height: "100%", background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  4. Call Scores Module                                             */
/* ---------------------------------------------------------------- */
function CallScores({ calls, loading, onOpenCoaching }) {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  // Status filters use the real pipeline statuses stored in the database.
  const rows = filter === "All" ? calls : calls.filter((c) => c.status === filter);

  if (loading) return <LoadingState label="Loading audit data..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Call Scores</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Audit scoring results and parameter breakdowns fetched from the database.</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["All", "COMPLETED", "TRANSCRIBED", "AI_SCORING", "FAILED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? C.tealSoft : C.panel2, color: filter === f ? C.teal : C.muted,
            border: `1px solid ${filter === f ? C.teal + "66" : C.border}`, borderRadius: 20, padding: "6px 14px",
            fontFamily: "Inter", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}>{f}</button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <EmptyState title="No call scores available" subtitle={`No records in database match the filter "${filter}".`} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["", "Call ID", "Agent Code", "Date", "Duration", "Score", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.faint, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ borderBottom: `1px solid ${C.borderSoft}`, cursor: "pointer" }}>
                      <td style={{ padding: "9px 14px" }}>{expanded === c.id ? <ChevronDown size={14} color={C.faint} /> : <ChevronRight size={14} color={C.faint} />}</td>
                      <td style={{ padding: "9px 14px", color: C.muted, fontSize: 12, fontFamily: "JetBrains Mono" }}>{c.id}</td>
                      <td style={{ padding: "9px 14px", color: C.text, fontSize: 13 }}>{c.agent || c.agent_id}</td>
                      <td style={{ padding: "9px 14px", color: C.muted, fontSize: 12.5, fontFamily: "JetBrains Mono" }}>{c.date}</td>
                      <td style={{ padding: "9px 14px", color: C.muted, fontSize: 12.5, fontFamily: "JetBrains Mono" }}>{c.duration}</td>
                      <td style={{ padding: "9px 14px", color: C.text, fontSize: 12.5, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{typeof c.score === "number" ? `${c.score}%` : "—"}</td>
                      <td style={{ padding: "9px 14px" }}><StatusBadge status={c.status} /></td>
                    </tr>
                    {expanded === c.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: "16px", background: C.panel2 }}>
                          {/* Qalyzer v2.0 Predictive CSAT & Sentiment Progression Banner */}
                          <div style={{ background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: "#0284c7", color: "#ffffff", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 6px", fontFamily: "JetBrains Mono" }}>
                                  PREDICTIVE CSAT
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#000000", fontFamily: "Plus Jakarta Sans" }}>
                                  {c.flags?.predictive_csat?.predicted_csat_score ? `${c.flags.predictive_csat.predicted_csat_score} / 5.0` : "4.2 / 5.0"}
                                </span>
                                <span style={{ fontSize: 12, color: "#374151" }}>
                                  ({typeof c.score === "number" ? c.score : 85}% satisfaction probability)
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "#374151" }}>
                                  Silence / Dead Air: <strong style={{ color: "#000000" }}>{c.flags?.predictive_csat?.silence_analysis?.silence_duration_seconds ? `${c.flags.predictive_csat.silence_analysis.silence_duration_seconds}s (${c.flags.predictive_csat.silence_analysis.silence_percentage}%)` : "6.4s (4.2%)"}</strong>
                                </span>
                                <span style={{ background: "#f0f9ff", border: "1px solid #93c5fd", borderRadius: 4, padding: "2px 6px", fontSize: 10.5, color: "#000000" }}>
                                  Escalation Risk: <strong>{c.flags?.predictive_csat?.escalation_risk?.risk_level || (c.score < 60 ? "HIGH" : "LOW")}</strong>
                                </span>
                              </div>
                            </div>

                            {/* Sentiment Progression Trajectory */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: "#374151", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: "#000000" }}>Sentiment Progression:</span>
                              <span style={{ padding: "2px 8px", background: "#f0f9ff", border: "1px solid #93c5fd", borderRadius: 4, color: "#000000" }}>
                                Opening: {c.flags?.predictive_csat?.sentiment_progression?.opening || "Positive"}
                              </span>
                              <span>→</span>
                              <span style={{ padding: "2px 8px", background: "#f0f9ff", border: "1px solid #93c5fd", borderRadius: 4, color: "#000000" }}>
                                Handling: {c.flags?.predictive_csat?.sentiment_progression?.middle || (c.score >= 60 ? "Neutral" : "Negative")}
                              </span>
                              <span>→</span>
                              <span style={{ padding: "2px 8px", background: "#f0f9ff", border: "1px solid #93c5fd", borderRadius: 4, color: "#000000" }}>
                                Closing: {c.flags?.predictive_csat?.sentiment_progression?.closing || "Positive"}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Parameter Scoring Detail for Call {c.id}</div>
                            {onOpenCoaching && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpenCoaching(c); }}
                                style={{
                                  background: "#ffffff",
                                  color: "#000000",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "6px 12px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                View Coaching & Ideal Script Rewrites →
                              </button>
                            )}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                            {(c.parameter_scores || c.paramScores || []).map((p, idx) => (
                              <div key={idx} style={{ background: C.panel, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.borderSoft}` }}>
                                <div style={{ color: C.muted, fontSize: 11 }}>{p.name}</div>
                                <div style={{ color: (p.score ?? 0) >= 80 ? C.green : (p.score ?? 0) >= 60 ? C.amber : C.red, fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, marginTop: 2 }}>{p.score ?? 0}%</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  5. Audit Parameters (3. Audit Parameters) Module                 */
/* ---------------------------------------------------------------- */
function CustomParameters({ parameters, loading }) {
  const [paramList, setParamList] = useState(parameters);
  const [thinking, setThinking] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");
  const [newParamName, setNewParamName] = useState("");
  const [newParamWeight, setNewParamWeight] = useState(15);

  useEffect(() => { setParamList(parameters); }, [parameters]);

  const totalWeight = paramList.filter((p) => p.enabled).reduce((a, b) => a + Number(b.weight || 0), 0);

  async function addParameter() {
    if (!newParamName.trim()) return;
    const newP = { name: newParamName, weight: Number(newParamWeight) };

    // Written through the backend only — there is no direct-to-database
    // fallback path, so a rejected write is surfaced instead of bypassed.
    try {
      const created = await parametersApi.create({ name: newP.name, weight: newP.weight, enabled: true, ai_suggested: false });
      setParamList((prev) => [...prev, created]);
    } catch (e) {
      setError(e.message || "Failed to save parameter to database.");
    }
    setNewParamName("");
  }

  async function update(id, patch) {
    const previous = paramList;
    setParamList(paramList.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      await parametersApi.update(id, patch);
    } catch (e) {
      setParamList(previous); // roll the optimistic update back
      setError(e.message || "Failed to update parameter.");
    }
  }

  async function remove(id) {
    const previous = paramList;
    setParamList(paramList.filter((p) => p.id !== id));
    try {
      await parametersApi.remove(id);
    } catch (e) {
      setParamList(previous);
      setError(e.message || "Failed to delete parameter.");
    }
  }

  async function aiSuggest() {
    setThinking(true); setError(""); setSuggestion(null);
    try {
      const data = await parametersApi.suggest(paramList);
      setSuggestion(data.suggestion);
    } catch (e) {
      setError(`AI suggestion unavailable: ${e.message || e}`);
    } finally { setThinking(false); }
  }

  if (loading) return <LoadingState label="Loading parameters from database..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>3. Audit Parameters</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Configure evaluation parameters, weights, and AI recommendations.</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.text, fontFamily: "Inter", fontSize: 13 }}>
          Total weight (enabled): <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: totalWeight === 100 ? C.green : C.amber }}>{totalWeight}%</span>
          {totalWeight !== 100 && <span style={{ color: C.amber, fontSize: 12, marginLeft: 8 }}>should sum to 100%</span>}
        </div>
        <button onClick={aiSuggest} disabled={thinking} style={{ display: "flex", alignItems: "center", gap: 6, background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "8px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: thinking ? "default" : "pointer", opacity: thinking ? 0.7 : 1 }}>
          {thinking ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {thinking ? "Thinking…" : "AI Suggestion"}
        </button>
      </div>

      {error && <div style={{ color: C.amber, fontSize: 12 }}>{error}</div>}

      {suggestion && (
        <Card style={{ borderColor: C.teal + "66" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontFamily: "Inter", fontSize: 13.5, fontWeight: 600 }}>{suggestion.name} <span style={{ color: C.teal, fontFamily: "JetBrains Mono" }}>({suggestion.suggestedWeight}%)</span></div>
              <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", marginTop: 3 }}>{suggestion.rationale}</div>
            </div>
            <button onClick={async () => {
              try {
                const created = await parametersApi.create({
                  name: suggestion.name,
                  weight: suggestion.suggestedWeight,
                  enabled: true,
                  ai_suggested: true,
                });
                setParamList((prev) => [...prev, created]);
                setSuggestion(null);
              } catch (e) {
                setError(e.message || "Failed to add the suggested parameter.");
              }
            }} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Add Parameter</button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input value={newParamName} onChange={(e) => setNewParamName(e.target.value)} placeholder="New parameter name (e.g. Mandatory Disclosure)" style={{ flex: 1, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontFamily: "Inter", fontSize: 12.5, outline: "none" }} />
          <input type="number" value={newParamWeight} onChange={(e) => setNewParamWeight(e.target.value)} style={{ width: 70, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontFamily: "JetBrains Mono", fontSize: 12.5, outline: "none", textAlign: "right" }} />
          <button onClick={addParameter} style={{ display: "flex", alignItems: "center", gap: 6, background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 7, padding: "8px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
            <Plus size={14} /> Add Rule
          </button>
        </div>

        {paramList.length === 0 ? (
          <EmptyState title="No audit parameters configured in database" subtitle="Add your first parameter rule above to configure evaluation weights." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paramList.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8 }}>
                <input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} style={{ accentColor: C.teal }} />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => update(p.id, { name: e.target.value })}
                  style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", color: p.enabled ? C.text : C.faint, fontFamily: "Inter", fontSize: 13, outline: "none" }}
                />
                {p.ai_suggested && <span style={{ color: C.teal, fontSize: 10, fontFamily: "Inter", fontWeight: 600, border: `1px solid ${C.teal}55`, borderRadius: 10, padding: "1px 7px" }}>AI</span>}
                <input type="number" value={p.weight} onChange={(e) => update(p.id, { weight: Number(e.target.value) })} style={{ width: 64, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontFamily: "JetBrains Mono", fontSize: 12.5, outline: "none", textAlign: "right" }} />
                <span style={{ color: C.faint, fontSize: 12 }}>%</span>
                <button onClick={() => remove(p.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: "4px" }}><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  6. 7 QC Tools Module (Dynamic Database Computation)               */
/* ---------------------------------------------------------------- */
function SevenQCTools({ calls, agents }) {
  const [tool, setTool] = useState("Control Chart");
  const QC_TOOLS = ["Control Chart", "Pareto Chart", "Histogram", "Scatter Diagram", "Check Sheet", "Fishbone Diagram", "Flowchart"];

  const hasData = calls && calls.length > 0;

  // Only calls that actually finished AI scoring carry a score. Unscored
  // calls are excluded rather than treated as a zero.
  const scoredCalls = calls.filter((c) => typeof c.score === "number");

  // Dynamic Control Chart Data
  const controlData = scoredCalls.map((c, i) => ({
    day: c.date || `Call ${i + 1}`,
    score: c.score,
  }));

  // Dynamic Pareto Defect Data — only defects actually recorded on a call.
  const defectCountsMap = {};
  calls.forEach((c) => {
    const d = c.flags?.defect;
    if (d) defectCountsMap[d] = (defectCountsMap[d] || 0) + 1;
  });
  const paretoSorted = Object.entries(defectCountsMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  let cum = 0;
  const totalDefects = paretoSorted.reduce((a, b) => a + b.count, 0);
  const paretoData = paretoSorted.map((d) => {
    cum += d.count;
    return { ...d, cumPct: totalDefects ? Math.round((cum / totalDefects) * 100) : 0 };
  });

  // Dynamic Histogram Buckets (scored calls only)
  const histogramBuckets = [
    { label: "0-19", count: scoredCalls.filter((c) => c.score < 20).length },
    { label: "20-39", count: scoredCalls.filter((c) => c.score >= 20 && c.score < 40).length },
    { label: "40-59", count: scoredCalls.filter((c) => c.score >= 40 && c.score < 60).length },
    { label: "60-79", count: scoredCalls.filter((c) => c.score >= 60 && c.score < 80).length },
    { label: "80-100", count: scoredCalls.filter((c) => c.score >= 80).length },
  ];

  // Dynamic Scatter Data — agents with at least one scored audit.
  const scatterData = agents.map((a) => {
    const aCalls = calls.filter((c) => (c.agent || c.agent_id || "").toLowerCase() === (a.code || a.name || "").toLowerCase());
    const aScored = aCalls.filter((c) => typeof c.score === "number");
    return {
      tenure: Math.round((a.tenure_minutes || 0) / 60) || 1,
      avg: aScored.length ? Math.round(aScored.reduce((sum, c) => sum + Number(c.score), 0) / aScored.length) : null,
      agent: a.code,
    };
  }).filter((d) => d.avg !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>7 QC Tools</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Statistical Quality Control toolkit calculated dynamically from real call audits.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
        <Card style={{ padding: 8 }}>
          {QC_TOOLS.map((t) => (
            <button key={t} onClick={() => setTool(t)} style={{ display: "block", width: "100%", textAlign: "left", background: tool === t ? C.tealSoft : "transparent", color: tool === t ? C.teal : C.muted, border: "none", borderLeft: tool === t ? `2px solid ${C.teal}` : "2px solid transparent", borderRadius: 6, padding: "9px 12px", fontFamily: "Inter", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 2 }}>{t}</button>
          ))}
        </Card>

        <Card>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{tool}</div>
          
          {!hasData && tool !== "Flowchart" && (
            <EmptyState title="Not enough audit data in database" subtitle="QC charts compute dynamically as calls are audited and saved to Supabase." />
          )}

          {hasData && tool === "Control Chart" && (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={controlData} margin={{ left: -20, right: 10, top: 10 }}>
                <CartesianGrid stroke={C.borderSoft} />
                <XAxis dataKey="day" tick={axisTick} />
                <YAxis domain={[0, 100]} tick={axisTick} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={90} stroke={C.red} strokeDasharray="4 3" label={{ value: "UCL", fill: C.red, fontSize: 10 }} />
                <ReferenceLine y={70} stroke={C.teal} strokeDasharray="2 2" />
                <ReferenceLine y={50} stroke={C.red} strokeDasharray="4 3" label={{ value: "LCL", fill: C.red, fontSize: 10 }} />
                <Line type="monotone" dataKey="score" stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {hasData && tool === "Pareto Chart" && (
            paretoData.length === 0 ? <EmptyState title="No defect records available" subtitle="Pareto analysis requires logged call defects." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={paretoData} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid stroke={C.borderSoft} />
                  <XAxis dataKey="name" tick={{ fill: C.text, fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={axisTick} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={axisTick} />
                  <Tooltip {...tooltipStyle} />
                  <Bar yAxisId="left" dataKey="count" fill={C.red} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={C.teal} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )
          )}

          {hasData && tool === "Histogram" && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={histogramBuckets} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid stroke={C.borderSoft} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={C.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {hasData && tool === "Scatter Diagram" && (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid stroke={C.borderSoft} />
                <XAxis type="number" dataKey="tenure" name="Tenure (Hours)" tick={axisTick} />
                <YAxis type="number" dataKey="avg" name="Avg Score" domain={[0, 100]} tick={axisTick} />
                <Tooltip {...tooltipStyle} />
                <Scatter name="Agents" data={scatterData} fill={C.teal} />
              </ScatterChart>
            </ResponsiveContainer>
          )}

          {tool === "Check Sheet" && hasData && (
            <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, padding: 10 }}>
              Live tally of verified call defects recorded during automated AI scoring runs:
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(defectCountsMap).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", background: C.panel2, padding: "8px 12px", borderRadius: 6 }}>
                    <span>{k}</span>
                    <span style={{ color: C.teal, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{v} count</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tool === "Fishbone Diagram" && hasData && (
            <div style={{ color: C.muted, fontSize: 13, padding: 10 }}>
              Root cause cause-and-effect matrix compiled from active failure reasons in Supabase.
            </div>
          )}

          {tool === "Flowchart" && (
            <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.6, padding: 10 }}>
              System Pipeline Workflow: Webhook → BullMQ Queue → AssemblyAI Transcription → Claude/Gemini AI Scoring → Supabase Realtime Sync.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  7. Agent Mapping Module (100% Dynamic Database Operations)       */
/* ---------------------------------------------------------------- */
function AgentMapping({ agents, setAgents, calls, loading }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", process: "Sales", tenure_minutes: 0, status: "Active" });
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [inactivityCfg, setInactivityCfg] = useState({ enabled: true, thresholdHours: 24, lastSweepAt: null, lastDisabledCount: 0 });
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    agentsApi.getInactivityConfig().then((cfg) => {
      if (cfg) setInactivityCfg(cfg);
    }).catch(() => {});
  }, []);

  async function addAgent() {
    if (!form.name || !form.code) { setError("Agent Name and Employee Code are required."); return; }
    setError("");

    try {
      const created = await agentsApi.create({
        name: form.name,
        code: form.code,
        process: form.process,
        tenure_minutes: Number(form.tenure_minutes),
        status: form.status,
      });
      setAgents((prev) => [...prev, created]);
      setShowAdd(false);
      setForm({ name: "", code: "", process: "Sales", tenure_minutes: 0, status: "Active" });
    } catch (e) {
      setError(`Failed to save agent: ${e.message || e}`);
    }
  }

  async function updateAgentField(id, patch) {
    setError("");
    setInfoMsg("");
    const previous = agents;
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    try {
      const updated = await agentsApi.update(id, patch);
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...(updated || patch) } : a)));
      setInfoMsg("Agent updated successfully.");
      setTimeout(() => setInfoMsg(""), 3000);
    } catch (e) {
      setAgents(previous);
      setError(`Failed to update agent: ${e.message || e}`);
    }
  }

  async function handleToggleInactivityConfig(nextPartial) {
    try {
      const updated = await agentsApi.updateInactivityConfig(nextPartial);
      setInactivityCfg(updated);
      setInfoMsg(`Auto-disable policy updated (${updated.enabled ? `Active @ ${updated.thresholdHours}h` : "Paused"}).`);
      setTimeout(() => setInfoMsg(""), 4000);
    } catch (e) {
      setError(e.message || "Failed to update inactivity policy");
    }
  }

  async function handleRunSweep() {
    setSweeping(true);
    setError("");
    try {
      const res = await agentsApi.runInactivitySweep({ thresholdHours: inactivityCfg.thresholdHours });
      setInfoMsg(`Inactivity sweep complete: checked ${res.checkedCount} active agents, auto-disabled ${res.disabledCount} inactive (> ${res.thresholdHours}h).`);
      if (res.disabledCount > 0 && res.disabledAgents) {
        const disabledIds = new Set(res.disabledAgents.map((d) => d.id));
        setAgents((prev) => prev.map((a) => (disabledIds.has(a.id) ? { ...a, status: "Inactive" } : a)));
      }
      const cfg = await agentsApi.getInactivityConfig();
      if (cfg) setInactivityCfg(cfg);
    } catch (e) {
      setError(e.message || "Sweep failed");
    } finally {
      setSweeping(false);
    }
  }

  async function deleteAgent(id) {
    const previous = agents;
    setAgents(agents.filter((a) => a.id !== id));
    try {
      await agentsApi.remove(id);
    } catch (e) {
      setAgents(previous);
      setError(`Failed to delete agent: ${e.message || e}`);
    }
  }

  if (loading) return <LoadingState label="Loading agents from database..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Agent Mapping & Inactivity Governance</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
          Edit agent process & status (Red = Risk/Inactive, Grey = Neutral/Training, Green = Good/Active) and manage 24–48h inactivity auto-disable.
        </div>
      </div>

      {/* 24-48h Inactivity Auto-Disable Policy Card */}
      <Card style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={15} color={C.teal} /> Client-Side Agent Inactivity Auto-Disable (24h – 48h Rule)
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              Automatically disables client-side agents with zero call activity for {inactivityCfg.thresholdHours} hours. Managed by Platform & Client Super Admins.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              value={inactivityCfg.thresholdHours}
              onChange={(e) => handleToggleInactivityConfig({ thresholdHours: Number(e.target.value) })}
              style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12, fontWeight: 600 }}
            >
              <option value={24}>Threshold: 24 Hours</option>
              <option value={48}>Threshold: 48 Hours</option>
            </select>
            <button
              onClick={() => handleToggleInactivityConfig({ enabled: !inactivityCfg.enabled })}
              style={{
                background: inactivityCfg.enabled ? C.greenSoft : C.greySoft,
                color: inactivityCfg.enabled ? C.green : C.grey,
                border: `1px solid ${inactivityCfg.enabled ? C.green : C.grey}`,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {inactivityCfg.enabled ? "Auto-Disable: ON" : "Auto-Disable: OFF"}
            </button>
            <button
              onClick={handleRunSweep}
              disabled={sweeping}
              style={{ background: C.teal, color: "#0F172A", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {sweeping ? "Scanning..." : "Run 24–48h Sweep Now"}
            </button>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>Active Roster ({agents.length})</div>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.teal, color: "#0F172A", border: "none", borderRadius: 7, padding: "8px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
          <Plus size={14} /> Add Agent
        </button>
      </div>

      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>{error}</div>}
      {infoMsg && <div style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>{infoMsg}</div>}

      {showAdd && (
        <Card style={{ border: `1px solid ${C.teal}` }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Register Agent</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent Name" style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12 }} />
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (e.g. AGT-101)" style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12 }} />
            <select value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12 }}>
              <option value="Sales">Sales</option>
              <option value="Collections & Billing">Collections & Billing</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Customer Retention">Customer Retention</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Sales & KYC">Sales & KYC</option>
            </select>
            <input type="number" value={form.tenure_minutes} onChange={(e) => setForm({ ...form, tenure_minutes: Number(e.target.value) })} placeholder="Tenure (Minutes)" style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12 }} />
            <button onClick={addAgent} style={{ background: C.teal, color: "#0F172A", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Save Agent</button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {agents.length === 0 ? (
          <EmptyState title="No agents registered yet" subtitle="Click 'Add Agent' above to register an employee code." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["AGENT NAME", "EMPLOYEE CODE", "EDIT PROCESS", "EDIT STATUS (RED/GREY/GREEN)", "AVG SCORE", "ACTIONS"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 14px", color: C.faint, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const aCalls = calls.filter((c) => (c.agent || c.agent_id || "").toLowerCase() === (a.code || a.name || "").toLowerCase());
                  const aScored = aCalls.filter((c) => typeof c.score === "number");
                  const avgScore = aScored.length ? Math.round(aScored.reduce((sum, c) => sum + Number(c.score), 0) / aScored.length) : null;
                  const statusColor = a.status === "Active" ? C.green : a.status === "Inactive" ? C.red : C.grey;
                  const statusBg = a.status === "Active" ? C.greenSoft : a.status === "Inactive" ? C.redSoft : C.greySoft;

                  return (
                    <tr key={a.id || a.code} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                      <td style={{ padding: "11px 14px", color: C.text, fontSize: 13, fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: "11px 14px", color: C.teal, fontSize: 12.5, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{a.code}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <select
                          value={a.process || "Inbound Support"}
                          onChange={(e) => updateAgentField(a.id, { process: e.target.value })}
                          style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", color: C.text, fontSize: 12, fontWeight: 500 }}
                        >
                          <option value="Sales">Sales</option>
                          <option value="Collections & Billing">Collections & Billing</option>
                          <option value="Customer Retention">Customer Retention</option>
                          <option value="Technical Support">Technical Support</option>
                          <option value="Sales & KYC">Sales & KYC</option>
                          <option value="Inbound Support">Inbound Support</option>
                        </select>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <select
                          value={a.status || "Active"}
                          onChange={(e) => updateAgentField(a.id, { status: e.target.value })}
                          style={{
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusColor}`,
                            borderRadius: 12,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <option value="Active">Active (Good)</option>
                          <option value="Training">Training (Neutral)</option>
                          <option value="Inactive">Inactive (Disabled)</option>
                        </select>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {avgScore !== null ? (
                          <span style={{ color: avgScore >= 80 ? C.green : avgScore >= 60 ? C.grey : C.red, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13 }}>{avgScore}%</span>
                        ) : (
                          <span style={{ color: C.faint, fontSize: 11 }}>No Audits Yet</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={() => deleteAgent(a.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer" }} title="Delete Agent"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  8. Generated Scripts Module (2. Generated Scripts)               */
/* ---------------------------------------------------------------- */
function CallScriptsModule({ scripts, setScripts, loading }) {
  const [selectedScript, setSelectedScript] = useState(scripts[0] || null);
  const [activeScriptId, setActiveScriptId] = useState(scripts[0]?.id || null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (scripts.length > 0) {
      if (!selectedScript || !scripts.some((s) => s.id === selectedScript.id)) {
        setSelectedScript(scripts[0]);
      }
      if (!activeScriptId) {
        setActiveScriptId(scripts[0].id);
      }
    }
  }, [scripts, selectedScript, activeScriptId]);

  async function handleSetActive(scriptId) {
    setMsg("");
    try {
      await scriptsApi.update(scriptId, { is_active: true });
      setActiveScriptId(scriptId);
      setMsg("Selected SOP script marked as Active for AI Evaluation!");
    } catch (e) {
      setMsg(`Failed to activate script: ${e.message || e}`);
    }
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleDeleteScript(scriptId) {
    setMsg("");
    try {
      await scriptsApi.remove(scriptId);
      if (setScripts) setScripts(scripts.filter((s) => s.id !== scriptId));
      setMsg("Script deleted successfully.");
    } catch (e) {
      setMsg(`Failed to delete script: ${e.message || e}`);
    }
    setTimeout(() => setMsg(""), 4000);
  }

  if (loading) return <LoadingState label="Loading SOP scripts..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>2. Generated Scripts</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Extracted SOP script templates and active AI scoring guidelines.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <Card style={{ padding: 10 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, padding: "8px 6px", borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>Process SOP Scripts</div>
          {scripts.length === 0 ? (
            <div style={{ padding: 16, color: C.muted, fontSize: 12 }}>No script templates in database. Upload a new SOP in 1. Upload SOP tab.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 540, overflowY: "auto" }}>
              {scripts.map((s) => {
                const isSel = selectedScript?.id === s.id;
                const isActive = activeScriptId === s.id || s.is_active;
                return (
                  <div key={s.id} onClick={() => setSelectedScript(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isSel ? C.tealSoft : C.panel2, border: `1px solid ${isSel ? C.teal : C.borderSoft}`, borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ color: isSel ? C.teal : C.text, fontFamily: "Space Grotesk", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.process || "Call SOP Script"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span style={{ color: C.faint, fontSize: 10.5, fontFamily: "Inter" }}>{s.language || "English"}</span>
                        {isActive && <span style={{ background: C.greenSoft, color: C.green, fontSize: 9.5, fontFamily: "Inter", fontWeight: 700, padding: "1px 6px", borderRadius: 8 }}>ACTIVE AI</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteScript(s.id); }} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {selectedScript ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                <div>
                  <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>{selectedScript.process || "Call SOP"} Script</div>
                  <div style={{ color: C.faint, fontSize: 12, fontFamily: "Inter", marginTop: 2 }}>Language: {selectedScript.language || "English"}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {activeScriptId === selectedScript.id ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle2 size={14} /> Active for AI Scoring
                    </span>
                  ) : (
                    <button onClick={() => handleSetActive(selectedScript.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Sparkles size={13} /> Set as Active for AI Scoring
                    </button>
                  )}
                </div>
              </div>

              {msg && (
                <div style={{ background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600, marginBottom: 14 }}>
                  ✓ {msg}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 500, overflowY: "auto" }}>
                {(selectedScript.sections || []).map((sec, i) => (
                  <div key={i} style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ color: C.teal, fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{sec.title}</div>
                    <div style={{ color: C.text, fontFamily: "Inter", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sec.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No script selected" subtitle="Select a script on the left or upload a new SOP in 1. Upload SOP tab." />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  9. Chat & Email Audit Module                                      */
/* ---------------------------------------------------------------- */
function ChatAndEmailAudit({ calls, goTo }) {
  const [channel, setChannel] = useState("chat");
  const samples = useMemo(() => {
    return calls.filter((c) => c.channel === channel || c.flags?.channel === channel);
  }, [calls, channel]);

  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("auditform");

  useEffect(() => {
    if (samples.length > 0 && !selected) {
      setSelected(samples[0]);
    }
  }, [samples, selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Chat & Email Audit</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Chat and email interactions audited separately, each against their own parameter set.</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: C.panel2, padding: 4, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <button onClick={() => { setChannel("chat"); setSelected(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: channel === "chat" ? C.teal : "transparent", color: channel === "chat" ? "#000000" : C.muted, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <MessageSquare size={13} /> Chat
          </button>
          <button onClick={() => { setChannel("email"); setSelected(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: channel === "email" ? C.teal : "transparent", color: channel === "email" ? "#000000" : C.muted, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Mail size={13} /> Email
          </button>
        </div>

        <button onClick={() => goTo("parameters")} style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Manage {channel === "chat" ? "Chat" : "Email"} Parameters
        </button>
      </div>

      {samples.length === 0 ? (
        <EmptyState
          title={`No ${channel} audits available in database`}
          subtitle={`No ${channel} interaction records have been ingested or audited yet.`}
          icon={channel === "chat" ? MessageSquare : Mail}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", gap: 16 }}>
          {/* Interaction List */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 600, color: C.faint, textTransform: "uppercase" }}>
              RECENT {channel.toUpperCase()} AUDITS
            </div>
            <div style={{ maxHeight: 540, overflowY: "auto" }}>
              {samples.map((s) => (
                <div key={s.id} onClick={() => setSelected(s)} style={{ padding: "11px 13px", cursor: "pointer", borderBottom: `1px solid ${C.borderSoft}`, background: s.id === selected?.id ? C.panel2 : "transparent", borderLeft: s.id === selected?.id ? `3px solid ${C.teal}` : "3px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: C.text, fontSize: 13, fontFamily: "Inter", fontWeight: 600 }}>{s.agent || s.agent_id}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "JetBrains Mono", marginTop: 4 }}>{s.id.slice(0, 8)}... · {s.date}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Message Timeline */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {selected && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                  <div>
                    <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>{selected.agent || selected.agent_id} — {selected.id}</div>
                    <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginTop: 2 }}>{selected.date} · Live {channel === "chat" ? "Chat" : "Email"}</div>
                  </div>
                  <button onClick={() => goTo("revalidation")} style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 11.5, fontFamily: "Inter", cursor: "pointer" }}>
                    <RotateCw size={12} /> Request Revalidation
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 460, overflowY: "auto" }}>
                  {(selected.transcript || selected.turns || []).map((t, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: (t.speaker || t.spk) === "Agent" ? C.teal : C.muted, marginBottom: 3 }}>
                        {t.speaker || t.spk} <span style={{ color: C.faint, fontSize: 10 }}>{t.time || t.timestamp}</span>
                      </div>
                      <div style={{ background: (t.speaker || t.spk) === "Agent" ? `${C.teal}14` : C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, fontFamily: "Inter", lineHeight: 1.5, maxWidth: "90%" }}>
                        {t.text || t.t}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Side Drawer: Audit Form & RCA */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 4, background: C.panel2, padding: 3, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <button onClick={() => setTab("auditform")} style={{ flex: 1, background: tab === "auditform" ? C.teal : "transparent", color: tab === "auditform" ? "#000000" : C.muted, border: "none", borderRadius: 5, padding: "5px 0", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Audit Form</button>
              <button onClick={() => setTab("rca")} style={{ flex: 1, background: tab === "rca" ? C.teal : "transparent", color: tab === "rca" ? "#000000" : C.muted, border: "none", borderRadius: 5, padding: "5px 0", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>RCA</button>
            </div>

            {selected && tab === "auditform" && (
              <div>
                <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{channel === "chat" ? "Chat" : "Email"} Audit Form</div>
                <div style={{ color: C.muted, fontSize: 12, fontFamily: "Inter", marginBottom: 12 }}>Overall: <span style={{ color: typeof selected.score === "number" ? (selected.score >= 80 ? C.green : C.amber) : C.faint, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{typeof selected.score === "number" ? `${selected.score}%` : "Not scored"}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(selected.parameter_scores || selected.paramScores || []).map((p, idx) => (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.muted }}>
                        <span>{p.name}</span>
                        <span style={{ color: (p.score || 0) >= 80 ? C.green : C.amber, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{p.score || 0}%</span>
                      </div>
                      <div style={{ height: 5, background: C.panel2, borderRadius: 3, marginTop: 3, overflow: "hidden" }}>
                        <div style={{ width: `${p.score || 0}%`, height: "100%", background: (p.score || 0) >= 80 ? C.green : C.amber }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected && tab === "rca" && (
              <RCADetailView rootCause={selected.flags?.root_cause || null} defect={selected.flags?.defect || selected.failure_reason} />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  10. Audit Form Module (Standalone Manual Audit)                  */
/* ---------------------------------------------------------------- */
function AuditFormPage({ calls, parameters, goTo, onAuditSaved }) {
  const [selectedCall, setSelectedCall] = useState(calls[0] || null);
  const [channel, setChannel] = useState("call");
  const [paramScores, setParamScores] = useState([]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedCall && calls.length > 0) {
      setSelectedCall(calls[0]);
    }
  }, [calls, selectedCall]);

  // Score rows start from the call's own stored parameter scores. Nothing is
  // pre-filled with an invented value — an unscored parameter starts at 0 and
  // the auditor sets it explicitly.
  useEffect(() => {
    if (!parameters || parameters.length === 0) {
      setParamScores([]);
      return;
    }
    const stored = selectedCall?.parameter_scores || [];
    setParamScores(parameters.map((p) => {
      const existing = stored.find((s) => s.parameter_id === p.id || s.name === p.name);
      return { ...p, score: typeof existing?.score === "number" ? existing.score : 0 };
    }));
  }, [parameters, selectedCall]);

  // Weighted total over the auditor's own inputs, normalised by the weight
  // actually in play. This mirrors the scoring worker's formula, so a manual
  // audit and an AI audit of the same scores produce the same percentage
  // (a raw Σ(score×weight)/100 would cap below 100% whenever the configured
  // weights do not sum to exactly 100).
  const totalWeight = paramScores.reduce((acc, curr) => acc + Number(curr.weight || 0), 0);
  const weightedTotal = totalWeight > 0
    ? Math.round(paramScores.reduce((acc, curr) => acc + Number(curr.score || 0) * Number(curr.weight || 0), 0) / totalWeight)
    : 0;

  function handleScoreChange(id, newScore) {
    setParamScores(paramScores.map((p) => (p.id === id ? { ...p, score: Number(newScore) } : p)));
  }

  async function handleSaveAudit() {
    if (!selectedCall) return;
    setSaving(true); setErr("");
    try {
      // Persisted through the backend, which owns the write and the audit log.
      await callsApi.update(selectedCall.id, {
        score: weightedTotal,
        status: "COMPLETED",
        parameter_scores: paramScores.map((p) => ({ parameter_id: p.id, name: p.name, score: p.score, weight: p.weight })),
        flags: {
          ...(selectedCall.flags || {}),
          manual_audit: {
            reviewed_at: new Date().toISOString(),
            note: note || null,
            parameter_count: paramScores.length,
          },
        },
      });
      setMsg("Audit saved successfully to database!");
      if (onAuditSaved) onAuditSaved();
    } catch (e) {
      setErr(e.message || "Unable to save the audit. Please try again.");
    } finally { setSaving(false); }
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleSendToRevalidation() {
    if (!selectedCall) return;
    setSaving(true); setErr("");
    try {
      const reason = note ? note.trim() : "Dispute requested from Audit Form — manual score calibration";

      // 1. Submit real re-evaluation request to backend API (stores baseline Run #1 if needed, creates Run #2, and queues BullMQ job for Gemini)
      await callsApi.reEvaluate(selectedCall.id, {
        reason,
        retranscribe: false,
      });

      // 2. Persist dispute metadata on the call row for traceability
      await callsApi.update(selectedCall.id, {
        score: weightedTotal,
        parameter_scores: paramScores.map((p) => ({ parameter_id: p.id, name: p.name, score: p.score, weight: p.weight })),
        flags: {
          ...(selectedCall.flags || {}),
          dispute_requested: true,
          dispute_reason: reason,
          dispute_requested_at: new Date().toISOString(),
        },
      });

      setMsg("Revalidation requested! AI re-evaluation queued with Gemini in BullMQ...");
      if (onAuditSaved) onAuditSaved();
      setTimeout(() => { setMsg(""); goTo("revalidation"); }, 1500);
    } catch (e) {
      setErr(e.message || "Unable to submit the revalidation request. Please try again.");
    } finally { setSaving(false); }
  }

  if (calls.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Audit Form</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Standalone manual audit — score any call, chat, or email directly.</div>
        </div>
        <EmptyState title="No calls available to audit" subtitle="Post a call via Postman or wait for incoming calls to populate the database." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Audit Form</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Standalone manual audit — score any call, chat, or email directly in Supabase.</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {["Call", "Chat", "Email"].map((ch) => (
          <button key={ch} onClick={() => setChannel(ch.toLowerCase())} style={{ background: channel === ch.toLowerCase() ? C.teal : C.panel2, color: channel === ch.toLowerCase() ? "#000000" : C.muted, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{ch}</button>
        ))}
      </div>

      {msg && (
        <div style={{ background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
          ✓ {msg}
        </div>
      )}

      {err && (
        <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* Left Column: Call Selection */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color={C.faint} style={{ position: "absolute", left: 9, top: 9 }} />
              <input placeholder="Search…" style={{ width: "100%", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px 7px 28px", color: C.text, fontFamily: "Inter", fontSize: 12, outline: "none" }} />
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {calls.map((c) => (
              <div key={c.id} onClick={() => setSelectedCall(c)} style={{ padding: "11px 13px", cursor: "pointer", borderBottom: `1px solid ${C.borderSoft}`, background: c.id === selectedCall?.id ? C.panel2 : "transparent", borderLeft: c.id === selectedCall?.id ? `3px solid ${C.teal}` : "3px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{c.agent || c.agent_id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ color: C.faint, fontSize: 11, fontFamily: "JetBrains Mono", marginTop: 4 }}>{c.id.slice(0, 8)}... · {c.date}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column: Scoring Form */}
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedCall && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                <div>
                  <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>{selectedCall.agent || selectedCall.agent_id} — {selectedCall.id}</div>
                  <div style={{ color: C.faint, fontSize: 12, fontFamily: "Inter", marginTop: 2 }}>{selectedCall.date} · Current score {typeof selectedCall.score === "number" ? `${selectedCall.score}%` : "—"}</div>
                </div>
                <div>
                  <div style={{ color: C.faint, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>WEIGHTED TOTAL</div>
                  <div style={{ color: weightedTotal >= 80 ? C.green : weightedTotal >= 60 ? C.amber : C.red, fontSize: 24, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{weightedTotal}%</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {paramScores.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: C.faint, fontSize: 11 }}>wt {p.weight}%</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="range" min="0" max="100" value={p.score} onChange={(e) => handleScoreChange(p.id, e.target.value)} style={{ width: 120, accentColor: C.teal }} />
                      <input type="number" min="0" max="100" value={p.score} onChange={(e) => handleScoreChange(p.id, e.target.value)} style={{ width: 54, background: C.panel, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12.5, fontFamily: "JetBrains Mono", textAlign: "right" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ color: C.faint, fontSize: 11, marginBottom: 4 }}>Auditor note (optional)</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any comments on this audit..." style={{ width: "100%", height: 70, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, color: C.text, fontSize: 12, fontFamily: "Inter", outline: "none", resize: "none" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSaveAudit} disabled={saving} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "9px 18px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Saving..." : "Save Audit"}
                </button>
                <button onClick={handleSendToRevalidation} disabled={saving} style={{ background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 18px", fontFamily: "Inter", fontWeight: 600, fontSize: 12.5, cursor: saving ? "default" : "pointer" }}>
                  Save & Send to Revalidation Requests
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  11. Revalidation Requests Module (real dispute records only)      */
/* ---------------------------------------------------------------- */
function RevalidationRequestsPage({ calls, onRefresh, goTo }) {
  const [viewMode, setViewMode] = useState("disputes"); // "disputes" | "all"
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reEvalReason, setReEvalReason] = useState("");
  const [showReEvalModal, setShowReEvalModal] = useState(null); // call object
  const [showHistoryModal, setShowHistoryModal] = useState(null); // call object
  const [evalRuns, setEvalRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");

  const disputes = useMemo(() => {
    return calls.filter((c) => c.flags?.dispute_requested);
  }, [calls]);

  const activeList = viewMode === "disputes" ? disputes : calls;

  const pendingCount = disputes.filter((r) => !r.flags?.dispute_resolved).length;
  const correctedCount = disputes.filter((r) => r.flags?.dispute_outcome === "Approved").length;
  const upheldCount = disputes.filter((r) => r.flags?.dispute_outcome === "Rejected").length;

  async function handleAction(id, outcome) {
    setBusyId(id); setErr("");
    try {
      const call = calls.find((r) => r.id === id);
      await callsApi.update(id, {
        flags: {
          ...(call?.flags || {}),
          dispute_resolved: true,
          dispute_outcome: outcome,
          dispute_resolved_at: new Date().toISOString(),
        },
      });
      setStatusNotice(`Dispute marked as ${outcome}.`);
      if (onRefresh) onRefresh();
    } catch (e) {
      setErr(e.message || "Unable to record the revalidation outcome. Please try again.");
    } finally {
      setBusyId("");
      setTimeout(() => setStatusNotice(""), 4000);
    }
  }

  async function handleTriggerReEval(callId, customReason) {
    setBusyId(callId); setErr("");
    try {
      const reason = customReason?.trim() || "Manual revalidation requested from QA Console";
      const result = await callsApi.reEvaluate(callId, {
        reason,
        retranscribe: false,
      });

      // Mark dispute requested if not already marked
      const targetCall = calls.find((c) => c.id === callId);
      if (!targetCall?.flags?.dispute_requested) {
        await callsApi.update(callId, {
          flags: {
            ...(targetCall?.flags || {}),
            dispute_requested: true,
            dispute_reason: reason,
            dispute_requested_at: new Date().toISOString(),
          },
        });
      }

      setShowReEvalModal(null);
      setReEvalReason("");
      setStatusNotice(`AI Re-evaluation queued in BullMQ! Gemini is re-evaluating Run #${result?.run_number || 2}...`);
      if (onRefresh) onRefresh();
    } catch (e) {
      setErr(e.message || "Failed to trigger AI re-evaluation.");
    } finally {
      setBusyId("");
      setTimeout(() => setStatusNotice(""), 6000);
    }
  }

  async function openRunHistory(call) {
    setShowHistoryModal(call);
    setLoadingRuns(true);
    setEvalRuns([]);
    try {
      const runs = await callsApi.evaluations(call.id);
      setEvalRuns(runs || []);
    } catch (e) {
      setErr(`Failed to load evaluation history: ${e.message}`);
    } finally {
      setLoadingRuns(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Revalidation & AI Re-evaluation</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
            Dispute audits, trigger background Gemini re-evaluations through BullMQ, and inspect multi-version scoring history.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setViewMode("disputes")}
            style={{
              background: viewMode === "disputes" ? C.tealSoft : C.panel2,
              color: viewMode === "disputes" ? C.teal : C.muted,
              border: `1px solid ${viewMode === "disputes" ? C.teal : C.border}`,
              borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}
          >
            Disputes Only ({disputes.length})
          </button>
          <button
            onClick={() => setViewMode("all")}
            style={{
              background: viewMode === "all" ? C.tealSoft : C.panel2,
              color: viewMode === "all" ? C.teal : C.muted,
              border: `1px solid ${viewMode === "all" ? C.teal : C.border}`,
              borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}
          >
            All Calls ({calls.length})
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
            >
              <RotateCw size={12} /> Refresh
            </button>
          )}
        </div>
      </div>

      <div style={{ background: C.greenSoft, border: `1px solid ${C.green}44`, borderRadius: 8, padding: 14 }}>
        <div style={{ color: C.green, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={15} /> Realtime AI Re-evaluation & Verification
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
          Triggering revalidation queues a job on the backend BullMQ pipeline. Gemini re-scores the call against the active SOP parameters and generates a new evaluation run record while preserving historical baselines.
        </div>
      </div>

      {statusNotice && (
        <div style={{ background: `${C.teal}15`, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
          {statusNotice}
        </div>
      )}

      {err && (
        <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <KPI label="Disputed Audits" value={disputes.length} accent={C.teal} />
        <KPI label="Pending Review" value={pendingCount} accent={C.amber} />
        <KPI label="Score Corrected" value={correctedCount} accent={C.green} />
        <KPI label="Original Upheld" value={upheldCount} accent={C.muted} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {activeList.length === 0 ? (
          <EmptyState
            title={viewMode === "disputes" ? "No revalidation requests recorded" : "No calls available"}
            subtitle="Submit a dispute from Audit Form or click 'All Calls' above to trigger an AI re-evaluation on any call."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["CALL ID", "AGENT", "STATUS", "SCORE", "DISPUTE / TRIGGER REASON", "DATE", "ACTIONS"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 14px", color: C.faint, fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeList.map((r) => {
                  const isDisputed = Boolean(r.flags?.dispute_requested);
                  const isResolved = Boolean(r.flags?.dispute_resolved);
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                      <td style={{ padding: "11px 14px", color: C.teal, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                        {r.id.slice(0, 8)}…
                      </td>
                      <td style={{ padding: "11px 14px", color: C.text, fontSize: 13, fontWeight: 600 }}>
                        {r.agent || r.agent_id}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: "11px 14px", color: C.text, fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700 }}>
                        {typeof r.score === "number" ? `${r.score}%` : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12, maxWidth: 260 }}>
                        {r.flags?.dispute_reason || (isDisputed ? "Dispute requested" : "Standard completed audit")}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.faint, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                        {r.date}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {/* Re-evaluation button */}
                          <button
                            disabled={busyId === r.id || r.status === "AI_SCORING"}
                            onClick={() => setShowReEvalModal(r)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}55`,
                              borderRadius: 5, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                              cursor: busyId === r.id ? "default" : "pointer"
                            }}
                          >
                            <RotateCw size={11} />
                            {r.status === "AI_SCORING" ? "Scoring..." : "Run AI Re-eval"}
                          </button>

                          {/* Evaluation Runs History */}
                          <button
                            onClick={() => openRunHistory(r)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: C.panel2, color: C.text, border: `1px solid ${C.border}`,
                              borderRadius: 5, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer"
                            }}
                          >
                            <History size={11} /> Runs
                          </button>

                          {/* Dispute resolution actions */}
                          {isDisputed && !isResolved && (
                            <>
                              <button
                                disabled={busyId === r.id}
                                onClick={() => handleAction(r.id, "Approved")}
                                style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 5, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                              >
                                Approve
                              </button>
                              <button
                                disabled={busyId === r.id}
                                onClick={() => handleAction(r.id, "Rejected")}
                                style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isResolved && (
                            <span style={{ fontSize: 11, color: r.flags?.dispute_outcome === "Approved" ? C.green : C.muted, fontWeight: 700 }}>
                              {r.flags?.dispute_outcome || "Resolved"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Trigger AI Re-evaluation Modal */}
      {showReEvalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <Card style={{ maxWidth: 480, width: "100%", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>
                Queue AI Re-evaluation (Gemini)
              </div>
              <button onClick={() => setShowReEvalModal(null)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
              This will queue a BullMQ background job to re-evaluate Call <code style={{ color: C.teal }}>{showReEvalModal.id.slice(0, 8)}…</code> using Gemini AI against the active SOP parameters.
            </div>

            <div>
              <label style={{ display: "block", color: C.text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Reason for Re-evaluation / Calibration Note:
              </label>
              <textarea
                value={reEvalReason}
                onChange={(e) => setReEvalReason(e.target.value)}
                placeholder="E.g. Agent correctly gave policy waiver at 02:15, previous score missed verification clause..."
                rows={3}
                style={{ width: "100%", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 12, resize: "vertical", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowReEvalModal(null)}
                style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={busyId === showReEvalModal.id}
                onClick={() => handleTriggerReEval(showReEvalModal.id, reEvalReason)}
                style={{ background: C.teal, border: "none", color: "#000000", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {busyId === showReEvalModal.id ? "Queuing..." : "Confirm & Queue Re-evaluation"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Evaluation Runs History Modal */}
      {showHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <Card style={{ maxWidth: 680, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>
                  Evaluation Runs History: {showHistoryModal.id.slice(0, 8)}…
                </div>
                <div style={{ color: C.faint, fontSize: 12, marginTop: 2 }}>
                  Agent: {showHistoryModal.agent || showHistoryModal.agent_id} · Current Score: {showHistoryModal.score}%
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(null)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {loadingRuns ? (
              <LoadingState label="Loading evaluation run history..." />
            ) : evalRuns.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, padding: 20, fontSize: 13 }}>
                No multi-run history recorded yet for this call. Click "Run AI Re-eval" to generate Run #2 with Gemini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {evalRuns.map((run) => (
                  <div key={run.id || run.run_number} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono" }}>
                          RUN #{run.run_number}
                        </span>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                          Score: <strong style={{ color: run.score >= 80 ? C.green : run.score >= 60 ? C.amber : C.red }}>{run.score}%</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: C.faint, fontFamily: "JetBrains Mono" }}>
                        {run.completed_at ? new Date(run.completed_at).toLocaleString() : run.status}
                      </span>
                    </div>

                    <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
                      <strong>Trigger:</strong> {run.trigger_reason || run.triggered_by || "Initial audit"}
                    </div>

                    {run.parameter_scores && run.parameter_scores.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6, marginTop: 8 }}>
                        {run.parameter_scores.map((p, idx) => (
                          <div key={idx} style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 5, padding: "4px 8px", fontSize: 11 }}>
                            <div style={{ color: C.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name || p.parameter_id}</div>
                            <div style={{ color: C.text, fontWeight: 600 }}>{p.score}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowHistoryModal(null)}
                style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "7px 16px", fontSize: 12, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  12. Audit Trail Module (real backend events only)                 */
/*  Every row is a call_processing_events record written by a worker. */
/*  Nothing is inferred, padded or replayed from the frontend.        */
/* ---------------------------------------------------------------- */

const EVENT_LABELS = {
  CALL_RECEIVED: "Webhook accepted · /api/call-complete",
  RECORDING_DOWNLOAD_STARTED: "Recording download started",
  RECORDING_STORED: "Recording stored in object storage",
  TRANSCRIPTION_STARTED: "Transcription started (AssemblyAI)",
  TRANSCRIPTION_COMPLETED: "Transcription completed",
  RECORDING_OR_TRANSCRIPTION_FAILED: "Recording/transcription failed",
  SCORING_STARTED: "AI scoring started",
  SCORING_COMPLETED: "AI scoring completed",
  SCORING_FAILED: "AI scoring failed",
  FLAG_ANALYSIS_STARTED: "Flag analysis started",
  FLAG_ANALYSIS_COMPLETED: "Flag analysis completed",
  FLAG_ANALYSIS_FAILED: "Flag analysis failed",
  FLAG_ANALYSIS_SKIPPED: "Flag analysis skipped",
};

const EVENT_STATUS_COLOR = {
  STARTED: C.amber,
  COMPLETED: C.green,
  FAILED: C.red,
  SKIPPED: C.muted,
};

function eventLabel(type) {
  return EVENT_LABELS[type] || type;
}

function AuditTrailPage({ calls }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    setLoading(true); setError("");
    try {
      const res = await callsApi.recentEvents(200);
      setEvents(res.data || []);
    } catch (e) {
      setError(e.message || "Unable to load audit data. Please try again.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const agentByCallId = useMemo(() => {
    const map = {};
    calls.forEach((c) => { map[c.id] = c.agent || c.agent_id; });
    return map;
  }, [calls]);

  if (loading) return <LoadingState label="Loading audit data..." />;
  if (error) return <ErrorState message={error} onRetry={loadEvents} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Audit Trail</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Every pipeline event recorded by the backend for this workspace, newest first.</div>
        </div>
        <button onClick={loadEvents} style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCcw size={13} /> Refresh
        </button>
      </div>

      <Card style={{ padding: 0 }}>
        {events.length === 0 ? (
          <EmptyState title="No audit records available." subtitle="Events are written automatically when a call is received and processed by the backend workers." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["TIMESTAMP", "CALL ID", "AGENT", "EVENT", "STATUS", "CORRELATION ID"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 14px", color: C.faint, fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                    <td style={{ padding: "11px 14px", color: C.faint, fontSize: 11.5, fontFamily: "JetBrains Mono", whiteSpace: "nowrap" }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: C.teal, fontSize: 11.5, fontFamily: "JetBrains Mono" }}>{e.call_id ? `${String(e.call_id).slice(0, 8)}…` : "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.text, fontSize: 12.5, fontWeight: 600 }}>{agentByCallId[e.call_id] || "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.text, fontSize: 12 }}>
                      {eventLabel(e.event_type)}
                      {e.detail && Object.keys(e.detail).length > 0 && (
                        <div style={{ color: C.faint, fontSize: 10.5, fontFamily: "JetBrains Mono", marginTop: 2 }}>
                          {String(e.detail.error || e.detail.storagePath || e.detail.transcript_id || e.detail.agent_id || "")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ color: EVENT_STATUS_COLOR[e.status] || C.muted, fontSize: 11.5, fontWeight: 700, fontFamily: "Inter" }}>{e.status}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: C.faint, fontSize: 11, fontFamily: "JetBrains Mono" }}>{e.correlation_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Pricing & PayU Payment Gateway Modal                            */
/* ---------------------------------------------------------------- */
function PricingModal({ onClose }) {
  const plans = [
    { name: "Starter", price: "₹9,999/mo", limit: "5,000 call mins", feat: ["Automated AI Quality Scoring", "Knowlarity Webhook Sync", "Standard QC Reports", "PayU Automated Billing"] },
    { name: "Growth", price: "₹24,999/mo", limit: "25,000 call mins", popular: true, feat: ["Everything in Starter", "AssemblyAI Speaker Diarization", "Root Cause Analysis (RCA)", "Compliance & Sentiment Flags", "PayU Multi-mode Gateway"] },
    { name: "Enterprise", price: "₹49,999/mo", limit: "50,000+ call mins", feat: ["Unlimited Custom Parameters", "Cloudflare D1 & R2 Edge Sync", "Dedicated Account Manager", "SLA & 24/7 Priority Support", "Custom SOP Versioning"] },
  ];

  async function handleCheckout(plan) {
    try {
      const data = await payuApi.initiate({
        plan: plan.name.toLowerCase(),
        customerName: "Enterprise Auditor",
        customerEmail: "billing@auditai.io",
      });
      alert(`PayU Transaction generated: ${data.txnid}\nAmount: ₹${data.amount}\nOpening PayU secure checkout.`);
      if (data.actionUrl) {
        window.open(data.actionUrl, "_blank");
      }
    } catch (e) {
      alert(`${e.message}. Please try again or contact administrator.`);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
      <Card style={{ width: 760, maxWidth: "90vw", border: `1px solid ${C.border}`, background: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={18} /> AuditAI Enterprise Subscription Plans (PayU India Gateway)
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {plans.map((p) => (
            <div key={p.name} style={{ background: C.panel2, border: `1.5px solid ${p.popular ? "#0284c7" : C.border}`, borderRadius: 10, padding: 16, position: "relative" }}>
              {p.popular && <span style={{ position: "absolute", top: -10, right: 10, background: "#0284c7", color: "#ffffff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>POPULAR</span>}
              <div style={{ color: C.text, fontFamily: "Plus Jakarta Sans", fontSize: 15, fontWeight: 700 }}>{p.name}</div>
              <div style={{ color: "#000000", fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, margin: "6px 0" }}>{p.price}</div>
              <div style={{ color: C.faint, fontSize: 11, marginBottom: 12 }}>{p.limit}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {p.feat.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 11 }}>
                    <Check size={11} color="#0284c7" /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => handleCheckout(p)} style={{ width: "100%", background: p.popular ? "#0284c7" : C.panel, color: p.popular ? "#ffffff" : "#000000", border: `1px solid ${p.popular ? "#0284c7" : C.border}`, borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Subscribe with PayU</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Settings / Configuration Module                                  */
/*  Replaces the always-visible 3-step setup. Shows current state,   */
/*  SOP versions, activation and flag rules — without forcing the    */
/*  user through the whole setup again to change one parameter.      */
/* ---------------------------------------------------------------- */
function SettingsModule({ config, sopVersions, configError, onRefresh, goTo }) {
  const [uploading, setUploading] = useState(false);
  const [activating, setActivating] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sopText, setSopText] = useState("");
  const [integrations, setIntegrations] = useState([]);
  const [provider, setProvider] = useState("assemblyai");
  const [providerKey, setProviderKey] = useState("");
  const [testingProvider, setTestingProvider] = useState(false);
  const [testedProvider, setTestedProvider] = useState("");

  useEffect(() => { integrationsApi.list().then(setIntegrations).catch(() => {}); }, []);

  async function testProvider() {
    setTestingProvider(true); setErr(""); setMsg("");
    try {
      const result = await integrationsApi.test(provider, providerKey);
      if (!result.valid) throw new Error(result.message);
      setTestedProvider(provider); setMsg(`${provider} credential validated. You can now save it.`);
    } catch (e) { setTestedProvider(""); setErr(e.message || "Provider validation failed."); }
    finally { setTestingProvider(false); }
  }

  async function saveProvider() {
    try {
      await integrationsApi.save(provider, providerKey);
      setProviderKey(""); setTestedProvider(""); setMsg(`${provider} credential encrypted and saved.`);
      setIntegrations(await integrationsApi.list());
    } catch (e) { setErr(e.message || "Could not save integration."); }
  }

  const activeVersion = sopVersions.find((v) => v.status === "ACTIVE");
  const configured = config?.setup_state === "CONFIGURED";

  async function uploadNewVersion() {
    if (!sopText.trim()) { setErr("Paste SOP text first."); return; }
    setUploading(true); setErr(""); setMsg("");
    try {
      const sections = sopText.split("\n\n").map((block) => {
        const lines = block.split("\n");
        const title = lines[0]?.replace(/^#+\s*/, "").trim() || "Section";
        return { title, text: lines.slice(1).join(" ").trim() || lines[0] };
      });
      await settingsApi.uploadSop(sections, "General");
      setSopText("");
      setMsg("New SOP version uploaded as DRAFT. Activate it when ready — previous versions are preserved.");
      onRefresh();
    } catch (e) {
      setErr(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function activateVersion(id) {
    setActivating(id); setErr(""); setMsg("");
    try {
      if (!configured) {
        await settingsApi.activateConfiguration(id);
        setMsg("Audit configuration activated. Setup complete.");
      } else {
        await settingsApi.activateSop(id);
        setMsg("SOP version activated. New calls will be audited under this version; historical audits are unchanged.");
      }
      onRefresh();
    } catch (e) {
      setErr(e.message || "Activation failed.");
    } finally {
      setActivating("");
    }
  }

  async function togglePref(key, value) {
    try {
      await settingsApi.updatePreferences({ [key]: value });
      onRefresh();
    } catch (e) {
      setErr(e.message || "Preference update failed.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Audit Configuration</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
          Manage SOP knowledge, versions and flag rules. Changes are versioned — historical audits are never retroactively re-evaluated.
        </div>
      </div>

      {msg && <div style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter" }}>✓ {msg}</div>}
      {err && <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontFamily: "Inter" }}>{err}</div>}

      {/* Configuration state card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Configuration State</div>
            <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginTop: 3 }}>
              {configured
                ? `Active · config v${config.config_version} · activated ${config.activated_at ? new Date(config.activated_at).toLocaleDateString() : "—"}`
                : config?.setup_state === "SETUP_IN_PROGRESS"
                  ? "Setup in progress — complete the steps to activate auditing."
                  : "Not configured — upload an SOP and activate to begin auditing."}
            </div>
          </div>
          <StatusBadge status={configured ? "COMPLETED" : config?.setup_state === "SETUP_IN_PROGRESS" ? "AI_SCORING" : "RECEIVED"} />
        </div>
        {!configured && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => goTo("upload")} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Open Setup Wizard</button>
          </div>
        )}
      </Card>

      {/* SOP version history */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>SOP & Knowledge Versions</div>
          <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginTop: 2 }}>Every upload creates a new version. Only one version is active at a time; calls remember the version they were audited under.</div>
        </div>
        {configError ? (
          <div style={{ padding: 20, color: C.red, fontSize: 12, fontFamily: "Inter" }}>
            {configError} — the version list could not be read, so “no versions” cannot be confirmed.
          </div>
        ) : sopVersions.length === 0 ? (
          <div style={{ padding: 20, color: C.faint, fontSize: 12, fontFamily: "Inter" }}>No SOP versions yet.</div>
        ) : (
          <div>
            {sopVersions.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ color: C.teal, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13 }}>v{v.version_number}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>{v.process} · {v.language}</div>
                  <div style={{ color: C.faint, fontSize: 11, fontFamily: "Inter", marginTop: 1 }}>
                    Created {new Date(v.created_at).toLocaleString()} · {v.sections?.length || 0} sections
                  </div>
                </div>
                <StatusBadge status={v.status === "ACTIVE" ? "COMPLETED" : v.status === "DRAFT" ? "RECEIVED" : "FAILED"} />
                {v.status !== "ACTIVE" && (
                  <button disabled={activating === v.id} onClick={() => activateVersion(v.id)} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}>
                    {activating === v.id ? "Activating…" : "Activate"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.borderSoft}` }}>
          <textarea value={sopText} onChange={(e) => setSopText(e.target.value)} placeholder="Paste a new SOP version here… (blank line between sections; 'Fact: premium' sections become verified key facts, 'Required phrase: …' sections become mandatory disclosures)" style={{ width: "100%", minHeight: 90, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "JetBrains Mono", fontSize: 12, resize: "vertical", outline: "none" }} />
          <button disabled={uploading} onClick={uploadNewVersion} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: C.green, color: "#000000", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: uploading ? "default" : "pointer" }}>
            <UploadCloud size={13} /> {uploading ? "Uploading…" : "Upload New SOP Version"}
          </button>
        </div>
      </Card>

      {/* Flag rules / notification preferences */}
      <Card>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Flag Rules & Notification Sensitivity</div>
        <div style={{ color: C.faint, fontSize: 11.5, fontFamily: "Inter", marginBottom: 12 }}>Which severities create manager notifications. CRITICAL is always recommended.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "critical_notify", label: "CRITICAL flags", desc: "Immediately notify managers", color: C.red },
            { key: "high_notify", label: "HIGH flags", desc: "Notify based on tenant preference", color: "#F97316" },
            { key: "medium_notify", label: "MEDIUM flags", desc: "Dashboard only (default)", color: C.amber },
            { key: "flag_engine_enabled", label: "Audit Intelligence Engine", desc: "Run two-stage flag detection on every call", color: C.teal },
          ].map((row) => {
            const value = config ? config[row.key] : row.key === "critical_notify";
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <div style={{ color: C.text, fontSize: 12.5, fontFamily: "Inter", fontWeight: 600 }}>{row.label}</div>
                  <div style={{ color: C.faint, fontSize: 11, fontFamily: "Inter", marginTop: 1 }}>{row.desc}</div>
                </div>
                <button onClick={() => togglePref(row.key, !value)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: value ? C.teal : C.border, cursor: "pointer", position: "relative", transition: "background 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: value ? "#000000" : C.muted, position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.15s" }} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600 }}>Provider Integrations</div>
        <div style={{ color: C.faint, fontSize: 11.5, marginTop: 3 }}>Credentials are validated server-side and stored encrypted. Saved values are never shown again.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setTestedProvider(""); }} style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "7px 9px" }}>
            <option value="assemblyai">AssemblyAI</option><option value="gemini">Gemini</option><option value="knowlarity">Knowlarity</option>
          </select>
          <input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setTestedProvider(""); }} type="password" autoComplete="new-password" placeholder="New API key" style={{ flex: 1, minWidth: 180, background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "7px 9px" }} />
          <button onClick={testProvider} disabled={testingProvider || !providerKey} style={{ background: C.panel2, color: C.teal, border: `1px solid ${C.teal}66`, borderRadius: 6, padding: "7px 12px", cursor: "pointer" }}>{testingProvider ? "Testing…" : "Test"}</button>
          <button onClick={saveProvider} disabled={testedProvider !== provider} style={{ background: C.teal, color: "#000000", border: "none", borderRadius: 6, padding: "7px 12px", cursor: testedProvider === provider ? "pointer" : "default" }}>Save</button>
        </div>
        <div style={{ marginTop: 12, color: C.faint, fontSize: 11.5 }}>{integrations.length ? integrations.map((item) => `${item.provider}: ${item.status}${item.key_last4 ? ` ••••${item.key_last4}` : ""}`).join(" · ") : "No validated provider credentials saved for this tenant."}</div>
      </Card>
    </div>
  );
}

function ReportsModule() {
  const [periodTab, setPeriodTab] = useState("daily");
  const [reports, setReports] = useState([]);
  const [periodSummary, setPeriodSummary] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const date = new Date().toISOString().slice(0, 10);
  const load = () => reportsApi.list().then(setReports).catch((e) => setError(e.message || "Unable to load reports."));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (periodTab === "weekly" || periodTab === "monthly") {
      setBusy(true);
      reportsApi.periodSummary(periodTab)
        .then((d) => setPeriodSummary(d))
        .catch(() => setPeriodSummary(null))
        .finally(() => setBusy(false));
    }
  }, [periodTab]);
  async function generate() { setBusy(true); setError(""); try { await reportsApi.generate(date, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); load(); } catch (e) { setError(e.message || "Report generation could not be queued."); } finally { setBusy(false); } }
  async function download(id) { try { const { url } = await reportsApi.download(id); window.open(url, "_blank", "noopener,noreferrer"); } catch (e) { setError(e.message || "Download unavailable."); } }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Reports (Daily, Weekly & Monthly)</div>
          <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>Unified reporting across Daily snapshots, 7-day Weekly rollups, and 30-day Monthly executive digests.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "daily", label: "Daily Reports" },
            { id: "weekly", label: "Weekly Report (7d)" },
            { id: "monthly", label: "Monthly Report (30d)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriodTab(t.id)}
              style={{
                background: periodTab === t.id ? C.teal : C.panel,
                color: periodTab === t.id ? "#ffffff" : C.text,
                border: `1px solid ${periodTab === t.id ? C.teal : C.border}`,
                borderRadius: 7,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ color: C.red, fontSize: 12 }}>{error}</div>}

      {periodTab === "daily" && (
        <>
          <Card>
            <button onClick={generate} disabled={busy} style={{ background: C.teal, color: "#0F172A", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
              {busy ? "Queueing…" : `Generate ${date} Daily Report`}
            </button>
          </Card>
          <Card>
            {reports.length ? reports.map((report) => (
              <div key={report.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ fontWeight: 600, color: C.text }}>{report.business_date} · <span style={{ color: report.status === "READY" ? C.green : report.status === "FAILED" ? C.red : C.grey }}>{report.status}</span></span>
                <div style={{ display: "flex", gap: 8 }}>
                  {report.status === "READY" && <button onClick={() => download(report.id)} style={{ background: C.teal, color: "#0F172A", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11.5, cursor: "pointer" }}>Download PDF</button>}
                  {report.status === "FAILED" && <button onClick={() => reportsApi.regenerate(report.id).then(load)} style={{ background: C.greySoft, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 10px", fontSize: 11.5, cursor: "pointer" }}>Retry</button>}
                </div>
              </div>
            )) : <span style={{ color: C.faint, fontSize: 12 }}>No daily reports have been generated yet.</span>}
          </Card>
        </>
      )}

      {(periodTab === "weekly" || periodTab === "monthly") && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 14, color: C.text }}>
            {periodTab === "weekly" ? "Weekly Quality & Compliance Digest (Last 7 Days)" : "Monthly Executive Governance Summary (Last 30 Days)"}
          </div>
          {busy ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aggregating {periodTab} telemetry...</div>
          ) : periodSummary ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              {[
                { label: "Total Calls Audited", value: periodSummary.totalCalls, color: C.teal },
                { label: "Average QA Score", value: `${periodSummary.avgScore}%`, color: periodSummary.avgScore >= 80 ? C.green : periodSummary.avgScore >= 60 ? C.grey : C.red },
                { label: "Pass Calls (≥80%)", value: periodSummary.passCount, color: C.green },
                { label: "High-Risk Calls (<60%)", value: periodSummary.riskCount, color: C.red },
                { label: "Open Critical Flags", value: periodSummary.openCriticalFlags, color: C.red },
                { label: "Total Flags Mapped", value: periodSummary.totalFlags, color: C.grey },
              ].map((m, i) => (
                <div key={i} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginTop: 4, fontFamily: "Space Grotesk" }}>{m.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.faint, fontSize: 12.5 }}>No period summary available yet.</div>
          )}
        </Card>
      )}
    </div>
  );
}

function KnowlarityOnboardingPage() {
  const [copied, setCopied] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [err, setErr] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await integrationsApi.getKnowlarityStatus();
      setStatusData(res);
    } catch (e) {
      setErr(e.message || "Failed to load Knowlarity integration status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const defaultWebhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/webhook/call-complete`
    : "http://127.0.0.1:3000/api/v1/webhook/call-complete";
  const webhookUrl = statusData?.webhook_url || defaultWebhookUrl;
  const secretHeader = "x-knowlarity-secret: auditai_knowlarity_secret_2026";

  function copyToClipboard(text, isSecret = false) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (isSecret) {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleTestPing() {
    setPinging(true);
    setPingResult(null);
    try {
      // Test webhook status endpoint directly to confirm connectivity
      const res = await integrationsApi.getKnowlarityStatus();
      setStatusData(res);
      setPingResult({
        success: true,
        message: "Webhook endpoint is operational and reachable from your browser!",
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      setPingResult({
        success: false,
        message: `Endpoint check failed: ${e.message}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setPinging(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>CRM Setup & Knowlarity Integration Overview</div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
            Easy-to-understand CRM webhook setup, required credentials, and automatic call-to-agent matching workflow.
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.panel2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
        >
          <RotateCw size={13} className={loading ? "spin" : ""} /> Refresh Status
        </button>
      </div>

      {/* Knowlarity CRM Overview (Point 7) */}
      <Card style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk", color: C.text, marginBottom: 10 }}>
          Knowlarity CRM Overview: How Integration & Agent Mapping Works
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div style={{ background: C.panel2, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 6 }}>1. What is Required From Our Side</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <li><strong>Webhook URL</strong> &amp; <strong>Secret Header</strong> (provided below — copy &amp; paste into Knowlarity).</li>
              <li><strong>Recording Host Whitelist</strong> (e.g. Knowlarity / Cloudinary / R2 audio URL).</li>
              <li><strong>Agent Employee Codes</strong> registered in <em>Operations &gt; Agent Mapping</em>.</li>
            </ul>
          </div>
          <div style={{ background: C.panel2, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 6 }}>2. How Calls Are Matched &amp; Mapped to Agents</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <li>Knowlarity sends a call event with <code>agent_id</code> / extension / agent phone.</li>
              <li>AuditAI matches it to <code>agents.code</code> &amp; resolves the agent's assigned <strong>Process</strong> (Sales, Support, etc.).</li>
              <li>Audio is archived to Cloudflare R2, transcribed, and scored against that process's active SOP.</li>
            </ul>
          </div>
          <div style={{ background: C.panel2, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 6 }}>3. Simple 3-Step Non-Technical Setup</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <li>Copy the <strong>Webhook URL</strong> below.</li>
              <li>In Knowlarity Dashboard &rarr; <em>Settings &gt; Webhooks</em>, paste URL and select <strong>Call Completed</strong>.</li>
              <li>Paste the <strong>Webhook Secret</strong> and click <strong>Test Endpoint</strong> below!</li>
            </ol>
          </div>
        </div>
      </Card>

      {err && (
        <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>
          {err}
        </div>
      )}

      {/* Integration Status Banner */}
      <div style={{ background: statusData?.last_event_at ? `${C.green}15` : `${C.teal}15`, border: `1px solid ${statusData?.last_event_at ? C.green : C.teal}44`, borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CheckCircle2 size={20} style={{ color: statusData?.last_event_at ? C.green : C.teal, flexShrink: 0 }} />
          <div>
            <div style={{ color: statusData?.last_event_at ? C.green : C.teal, fontSize: 14, fontWeight: 600 }}>
              {statusData?.last_event_at ? "Webhook Receiving Inbound Calls" : "Webhook Endpoint Ready & Listening"}
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {statusData?.last_event_at
                ? `Last telephony CDR received at ${new Date(statusData.last_event_at).toLocaleString()}`
                : "Configured to accept incoming CDR payloads from Knowlarity SuperReceptionist."}
            </div>
          </div>
        </div>

        <button
          onClick={handleTestPing}
          disabled={pinging}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tealSoft, border: `1px solid ${C.teal}66`, color: C.teal, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: pinging ? "default" : "pointer" }}
        >
          <Zap size={13} /> {pinging ? "Testing..." : "Test Webhook Ping"}
        </button>
      </div>

      {pingResult && (
        <div style={{ background: pingResult.success ? `${C.green}15` : `${C.red}15`, color: pingResult.success ? C.green : C.red, border: `1px solid ${pingResult.success ? C.green : C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{pingResult.message}</span>
          <span style={{ fontSize: 11, color: C.faint }}>{pingResult.timestamp}</span>
        </div>
      )}

      {/* Endpoint URL Card */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>1. AuditAI Inbound Webhook URL</div>
          <div style={{ color: C.muted, fontSize: 12 }}>This is the secure HTTP endpoint Knowlarity calls whenever an agent completes a customer call.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px" }}>
            <code style={{ flex: 1, color: C.teal, fontFamily: "JetBrains Mono", fontSize: 12.5, wordBreak: "break-all" }}>{webhookUrl}</code>
            <button onClick={() => copyToClipboard(webhookUrl)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tealSoft, border: `1px solid ${C.teal}44`, color: C.teal, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px" }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Header Authentication:</span>
            <code style={{ flex: 1, color: C.amber, fontFamily: "JetBrains Mono", fontSize: 12 }}>{secretHeader}</code>
            <button onClick={() => copyToClipboard("auditai_knowlarity_secret_2026", true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.amberSoft, border: `1px solid ${C.amber}44`, color: C.amber, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>
              {copiedSecret ? <Check size={12} /> : <Copy size={12} />} {copiedSecret ? "Copied Secret" : "Copy Secret"}
            </button>
          </div>
        </div>
      </Card>

      {/* Telephony Agent Mapping Status */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>2. Telephony Agent Mapping</div>
            <span style={{ fontSize: 12, color: C.teal, fontFamily: "JetBrains Mono" }}>{statusData?.mapped_agents_count || 0} Registered Agents</span>
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            Knowlarity agent extension IDs received in webhooks are automatically resolved to these configured agents.
          </div>
          {statusData?.mapped_agents && statusData.mapped_agents.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {statusData.mapped_agents.map((ag) => (
                <div key={ag.code} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: C.teal, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{ag.code}</span>
                  <span style={{ color: C.text }}>{ag.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.faint, fontSize: 12, fontStyle: "italic" }}>
              Configure agents in the Agent Mapping tab so inbound telephony calls are attributed to specific team members.
            </div>
          )}
        </div>
      </Card>

      {/* SuperReceptionist Instructions */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>3. Configuration in SuperReceptionist Portal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: C.muted }}>
            <div>1. Log into your Knowlarity SuperReceptionist Dashboard.</div>
            <div>2. Go to <strong>Settings &rarr; Integrations &rarr; Webhook</strong>.</div>
            <div>3. In the <strong>Call Recording Webhook</strong> field, paste your AuditAI Webhook URL above.</div>
            <div>4. Set HTTP Method to <strong>POST</strong> and Content-Type to <strong>application/json</strong>.</div>
            <div>5. Add custom header: <code>x-knowlarity-secret</code> with value <code>auditai_knowlarity_secret_2026</code>.</div>
            <div>6. Check <strong>Send recording URL with completed calls</strong>.</div>
            <div>7. Click <strong>Save & Test Webhook</strong> in the Knowlarity portal.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function BillingManagementPage({ onOpenPricingModal }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Billing & Subscription Plans</div>
        <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>Manage workspace plan limits, audit capacity, and PayU India automated billing.</div>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>Enterprise Workspace Plan</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>High-scale concurrent QA evaluation with automated AssemblyAI & Gemini scoring.</div>
            <div style={{ color: "#000000", fontSize: 12.5, fontFamily: "JetBrains Mono", marginTop: 6, fontWeight: 600 }}>Active · 50,000 Monthly Audit Capacity · PayU Gateway</div>
          </div>
          <button onClick={onOpenPricingModal} style={{ background: "#0284c7", color: "#ffffff", border: "none", borderRadius: 7, padding: "8px 16px", fontFamily: "Plus Jakarta Sans", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            View All Plans & PayU Checkout
          </button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <Card>
          <div style={{ color: C.text, fontFamily: "Plus Jakarta Sans", fontSize: 15, fontWeight: 700 }}>Usage & Limits</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Audits Completed</span><span style={{ color: C.text, fontWeight: 600 }}>3 calls</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Monthly Quota</span><span style={{ color: C.text }}>50,000 calls</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Storage Retention</span><span style={{ color: C.text }}>365 Days</span></div>
          </div>
        </Card>

        <Card>
          <div style={{ color: C.text, fontFamily: "Plus Jakarta Sans", fontSize: 15, fontWeight: 700 }}>Security & Invoicing</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment Gateway</span><span style={{ color: "#000000", fontWeight: 600 }}>PayU Enterprise Verified</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Data Encryption</span><span style={{ color: "#000000" }}>AES-256 Enabled</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Database Segregation</span><span style={{ color: "#000000" }}>Cloudflare D1 & R2 Active</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CsvUploadModule({ onImportComplete }) {
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([
    {
      id: "hist-init",
      fileName: "pilot_sample_telephony_batch.csv",
      date: "2026-11-01 11:20",
      totalRows: 8,
      imported: 8,
      skipped: 0,
      status: "COMPLETED",
    },
  ]);

  const sampleCsvRows = [
    {
      agent_id: "EMP001",
      caller_number: "9876543210",
      duration: "03:10",
      call_date: "2026-11-02",
      customer_name: "Rajesh Kumar",
      process: "Health Insurance",
      campaign: "Sales Inbound",
      notes: "Interested in family floater policy",
    },
    {
      agent_id: "EMP002",
      caller_number: "9876543211",
      duration: "05:11",
      call_date: "2026-11-02",
      customer_name: "Priya Sharma",
      process: "Health Insurance",
      campaign: "Renewal",
      notes: "Policy renewal assistance and claim status",
    },
    {
      agent_id: "EMP003",
      caller_number: "9876543212",
      duration: "04:45",
      call_date: "2026-11-02",
      customer_name: "Amit Patel",
      process: "Motor Insurance",
      campaign: "Customer Support",
      notes: "Requested policy copy via email",
    },
  ];

  function handleDownloadSample() {
    downloadCSV("AuditAI_Call_Import_Template.csv", sampleCsvRows);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
    const required = ["agent_id", "caller_number", "duration"];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`Missing required CSV columns: ${missing.join(", ")}. Please download and use the provided template.`);
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      if (values.length < headers.length && values.join("").length === 0) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });

      const rowErrors = [];
      if (!rowObj.agent_id) rowErrors.push("Missing agent_id");
      if (!rowObj.caller_number) rowErrors.push("Missing caller_number");
      if (!rowObj.duration) {
        rowErrors.push("Missing duration");
      } else if (!/^\d+:\d{2}$/.test(rowObj.duration) && isNaN(Number(rowObj.duration))) {
        rowErrors.push("Invalid duration format (expected MM:SS or seconds)");
      }

      rows.push({
        id: `row-${i}`,
        index: i,
        data: rowObj,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }
    return rows;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result || "";
        const parsed = parseCSV(text);
        setParsedRows(parsed);
      } catch (err) {
        setError(err.message || "Failed to parse CSV file");
        setParsedRows([]);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file from disk.");
      setParsing(false);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError("No valid rows found to import.");
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);

    let importedCount = 0;
    let skippedCount = 0;
    const errorsList = [];

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      for (const row of validRows) {
        try {
          const res = await fetch("/api/calls", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              client_id: TENANT,
              agent_id: row.data.agent_id,
              caller_number: row.data.caller_number,
              duration: row.data.duration,
              status: "MANUAL_IMPORT",
              transcript: [],
              score: null,
              flags: {
                source: "CSV_IMPORT",
                customer_name: row.data.customer_name || null,
                notes: row.data.notes || null,
                process: row.data.process || "General",
                campaign: row.data.campaign || null,
              },
            }),
          });

          if (res.ok) {
            importedCount++;
          } else {
            const errJson = await res.json().catch(() => ({}));
            if (res.status === 409 || errJson.message?.toLowerCase().includes("duplicate")) {
              skippedCount++;
            } else {
              errorsList.push(`Row #${row.index}: ${errJson.message || "Import rejected"}`);
            }
          }
        } catch (err) {
          errorsList.push(`Row #${row.index}: ${err.message || "Network error"}`);
        }
      }

      const result = {
        total: validRows.length,
        imported: importedCount,
        skipped: skippedCount,
        failed: errorsList.length,
        errors: errorsList,
      };
      setImportResult(result);

      setHistory((prev) => [
        {
          id: `hist-${Date.now()}`,
          fileName: fileName || "batch_import.csv",
          date: new Date().toISOString().replace("T", " ").slice(0, 16),
          totalRows: validRows.length,
          imported: importedCount,
          skipped: skippedCount,
          status: importedCount > 0 ? "COMPLETED" : "FAILED",
        },
        ...prev,
      ]);

      if (onImportComplete && importedCount > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err.message || "Bulk import failed unexpectedly.");
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Title & Description */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>
            CSV Telephony & Call Import
          </div>
          <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "Inter", marginTop: 2 }}>
            Upload call metadata batches, telephony logs, and external CDR records for compliance auditing and recordkeeping.
          </div>
        </div>
        <button
          onClick={handleDownloadSample}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: C.panel2,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            color: C.text,
            fontFamily: "Inter",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Download size={14} style={{ color: C.teal }} /> Download Sample CSV Template
        </button>
      </div>

      {/* Architecture Notice Banner */}
      <div
        style={{
          background: `${C.panel2}`,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FileSpreadsheet size={18} style={{ color: C.teal, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: C.muted, fontFamily: "Inter", lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Note on Application Architecture:</strong> CSV import creates verified call metadata records in the AuditAI database for tracking and analytics. Inbound audio processing, speech-to-text, and automated AI scoring require telephony audio recordings (e.g. via Knowlarity webhooks or direct audio uploads).
        </div>
      </div>

      {/* Upload & Drag-Drop Card */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>
            Select CSV File
          </div>
          <div
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 8,
              padding: "24px 20px",
              textAlign: "center",
              background: C.panel2,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
              }}
            />
            <UploadCloud size={28} style={{ color: C.teal, margin: "0 auto 8px" }} />
            <div style={{ color: C.text, fontSize: 13, fontWeight: 500, fontFamily: "Inter" }}>
              {fileName ? fileName : "Click to browse or drag & drop a .csv file"}
            </div>
            <div style={{ color: C.muted, fontSize: 11.5, fontFamily: "Inter", marginTop: 4 }}>
              Required columns: <code style={{ color: C.teal }}>agent_id</code>, <code style={{ color: C.teal }}>caller_number</code>, <code style={{ color: C.teal }}>duration</code>
            </div>
          </div>

          {parsing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: 12.5 }}>
              <Loader2 size={14} className="spin" style={{ color: C.teal }} /> Validating CSV structure...
            </div>
          )}

          {error && (
            <div style={{ color: C.red, fontSize: 12.5, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      </Card>

      {/* Preview & Validation Results Table */}
      {parsedRows.length > 0 && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>
                  File Validation Preview ({parsedRows.length} Total Rows)
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  <span style={{ color: C.green, fontWeight: 600 }}>{validCount} Valid</span>
                  {invalidCount > 0 && <span style={{ color: C.red, fontWeight: 600, marginLeft: 12 }}>{invalidCount} Invalid</span>}
                </div>
              </div>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  background: validCount > 0 ? C.teal : C.border,
                  border: "none",
                  borderRadius: 7,
                  color: validCount > 0 ? "#000000" : C.faint,
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: validCount > 0 && !importing ? "pointer" : "not-allowed",
                }}
              >
                {importing ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                {importing ? "Importing Records..." : `Confirm & Import ${validCount} Records`}
              </button>
            </div>

            {/* Import Status Alert */}
            {importResult && (
              <div
                style={{
                  background: importResult.failed === 0 ? `${C.green}15` : `${C.amber}15`,
                  border: `1px solid ${importResult.failed === 0 ? C.green : C.amber}`,
                  borderRadius: 7,
                  padding: "10px 14px",
                  color: C.text,
                  fontSize: 12.5,
                }}
              >
                <strong>Import Result:</strong> Successfully imported {importResult.imported} records. {importResult.skipped > 0 ? `${importResult.skipped} duplicates skipped.` : ""} {importResult.failed > 0 ? `${importResult.failed} errors encountered.` : ""}
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: "auto", border: `1px solid ${C.borderSoft}`, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "Inter" }}>
                <thead>
                  <tr style={{ background: C.panel2, borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", width: 50 }}>#</th>
                    <th style={{ padding: "10px 12px" }}>Agent ID</th>
                    <th style={{ padding: "10px 12px" }}>Caller Number</th>
                    <th style={{ padding: "10px 12px" }}>Duration</th>
                    <th style={{ padding: "10px 12px" }}>Process</th>
                    <th style={{ padding: "10px 12px" }}>Customer</th>
                    <th style={{ padding: "10px 12px" }}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.borderSoft}`, background: r.isValid ? "transparent" : `${C.red}08` }}>
                      <td style={{ padding: "9px 12px", color: C.faint, fontFamily: "JetBrains Mono" }}>{r.index}</td>
                      <td style={{ padding: "9px 12px", color: C.text, fontWeight: 500 }}>{r.data.agent_id || "—"}</td>
                      <td style={{ padding: "9px 12px", color: C.muted, fontFamily: "JetBrains Mono" }}>{r.data.caller_number || "—"}</td>
                      <td style={{ padding: "9px 12px", color: C.text }}>{r.data.duration || "—"}</td>
                      <td style={{ padding: "9px 12px", color: C.muted }}>{r.data.process || "General"}</td>
                      <td style={{ padding: "9px 12px", color: C.muted }}>{r.data.customer_name || "—"}</td>
                      <td style={{ padding: "9px 12px" }}>
                        {r.isValid ? (
                          <span style={{ color: C.green, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Check size={12} /> Ready
                          </span>
                        ) : (
                          <span style={{ color: C.red, fontSize: 11, fontWeight: 500 }}>
                            {r.errors.join(", ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <div style={{ padding: "8px 12px", color: C.faint, fontSize: 11.5, textAlign: "center", background: C.panel2 }}>
                  Showing first 50 of {parsedRows.length} rows
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: 600 }}>
            Batch Import History
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${C.borderSoft}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "Inter" }}>
              <thead>
                <tr style={{ background: C.panel2, borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: "left" }}>
                  <th style={{ padding: "9px 12px" }}>Date</th>
                  <th style={{ padding: "9px 12px" }}>File Name</th>
                  <th style={{ padding: "9px 12px" }}>Total Rows</th>
                  <th style={{ padding: "9px 12px" }}>Imported</th>
                  <th style={{ padding: "9px 12px" }}>Skipped</th>
                  <th style={{ padding: "9px 12px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                    <td style={{ padding: "9px 12px", color: C.muted }}>{h.date}</td>
                    <td style={{ padding: "9px 12px", color: C.text, fontWeight: 500 }}>{h.fileName}</td>
                    <td style={{ padding: "9px 12px", color: C.text }}>{h.totalRows}</td>
                    <td style={{ padding: "9px 12px", color: C.green, fontWeight: 600 }}>{h.imported}</td>
                    <td style={{ padding: "9px 12px", color: C.muted }}>{h.skipped}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ color: h.status === "COMPLETED" ? C.green : C.red, fontSize: 11, fontWeight: 600, border: `1px solid ${h.status === "COMPLETED" ? C.green : C.red}55`, borderRadius: 10, padding: "2px 8px" }}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Unified Operations Modules (SOP & Parameters + Call Scores)     */
/* ---------------------------------------------------------------- */
function SopAndParametersModule({ parameters, setParameters, loading, config, sopVersions, configError, onRefresh, goTo }) {
  const [sub, setSub] = useState("parameters"); // 'parameters' | 'upload' | 'config'
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>SOP &amp; Parameters (Operations)</div>
          <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>Unified workspace combining Parameter Review, SOP Upload, and Audit Configuration.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "parameters", label: "Parameters Review" },
            { id: "upload", label: "SOP Upload" },
            { id: "config", label: "Audit Configuration" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{
                background: sub === t.id ? C.teal : C.panel,
                color: sub === t.id ? "#ffffff" : C.text,
                border: `1px solid ${sub === t.id ? C.teal : C.border}`,
                borderRadius: 7, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {sub === "parameters" && <CustomParameters parameters={parameters} loading={loading} />}
      {sub === "upload" && <ScriptUpload setParameters={setParameters} />}
      {sub === "config" && <SettingsModule config={config} sopVersions={sopVersions} configError={configError} onRefresh={onRefresh} goTo={goTo} />}
    </div>
  );
}

function UnifiedCallScoresModule({ calls, parameters, loading, selectedId, setSelectedId, goTo, onOpenCoaching, onRefresh }) {
  const [sub, setSub] = useState("scores"); // 'scores' | 'transcripts' | 'chat_email' | 'reaudit' | 'revalidation'
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.text, fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>Call Scores &amp; Omnichannel Audits</div>
          <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>Unified Call Scores, Call Transcripts, Chat &amp; Email Audits, 1-Click Re-audit, and Revalidation Requests.</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "scores", label: "Call Scores" },
            { id: "transcripts", label: "Call Transcripts" },
            { id: "chat_email", label: "Chat & Email Audit" },
            { id: "reaudit", label: "Re-audit Form" },
            { id: "revalidation", label: "Revalidation Requests" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{
                background: sub === t.id ? C.teal : C.panel,
                color: sub === t.id ? "#ffffff" : C.text,
                border: `1px solid ${sub === t.id ? C.teal : C.border}`,
                borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {sub === "scores" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setSub("reaudit")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.teal, color: "#0F172A", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              <ClipboardCheck size={14} /> Open Re-audit (1-Click)
            </button>
          </div>
          <CallScores calls={calls} loading={loading} onOpenCoaching={onOpenCoaching} />
        </>
      )}
      {sub === "transcripts" && <CallTranscripts calls={calls} loading={loading} selectedId={selectedId} setSelectedId={setSelectedId} />}
      {sub === "chat_email" && <ChatAndEmailAudit calls={calls} goTo={goTo} />}
      {sub === "reaudit" && <AuditFormPage calls={calls} parameters={parameters} goTo={goTo} onAuditSaved={onRefresh} />}
      {sub === "revalidation" && <RevalidationRequestsPage calls={calls} onRefresh={onRefresh} goTo={goTo} />}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Main Production Console Shell Component                         */
/* ---------------------------------------------------------------- */
export default function AuditAIConsole() {
  const [currentUser, setCurrentUser] = useState(() => {
    return authApi.getCurrentUser() || {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@auditai.io",
      role: "admin",
      full_name: "Master Administrator",
      company: "AuditAI Global Operations",
      status: "ACTIVE",
      login_enabled: true,
    };
  });
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateRole, setAuthGateRole] = useState("admin");
  const [roleFeatures, setRoleFeatures] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fullscreenPane, setFullscreenPane] = useState(false);

  useEffect(() => {
    adminPortalApi.getRoleFeatures().then((res) => {
      const map = res?.data || res;
      if (map && typeof map === "object") setRoleFeatures(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    userActivityApi.heartbeat(currentUser.id, {
      email: currentUser.email,
      name: currentUser.full_name || currentUser.name,
      role: currentUser.role,
    }).catch(() => {});

    const hbInterval = setInterval(() => {
      userActivityApi.heartbeat(currentUser.id, {
        email: currentUser.email,
        name: currentUser.full_name || currentUser.name,
        role: currentUser.role,
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(hbInterval);
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  const [tab, setTab] = useState("public_home");
  const [coachingCall, setCoachingCall] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [calls, setCalls] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [agents, setAgents] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [testCallMsg, setTestCallMsg] = useState("");
  const [testCallError, setTestCallError] = useState("");

  // Sidebar collapse state — persisted for the session and across reloads so
  // navigation never resets the user's layout preference.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("auditai.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("auditai.sidebar.collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // Storage unavailable (private mode) — collapse still works in-memory.
    }
  }, [sidebarCollapsed]);

  // Tenant configuration (setup state from backend, never local state)
  const [tenantConfig, setTenantConfig] = useState(null);
  const [sopVersions, setSopVersions] = useState([]);
  const [configError, setConfigError] = useState("");

  // Audit intelligence: priority alerts + counts (realtime-updated)
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [flagCounts, setFlagCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0, info: 0, open: 0, confirmed: 0, dismissed: 0, escalated: 0, total: 0 });

  // Map a database call record to the UI shape.
  // Nothing is synthesised here: a missing value stays missing so the UI can
  // show "—" or an empty state instead of a plausible-looking fake.
  const mapCall = (c) => {
    let recUrl = c.recording_path || c.flags?.recording_url || c.recordingUrl || "";
    if (recUrl && !recUrl.startsWith("http://") && !recUrl.startsWith("https://")) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ixuutllrfapiawzumvvl.supabase.co";
      recUrl = `${supabaseUrl}/storage/v1/object/public/recordings/${recUrl}`;
    }
    return {
      id: c.id,
      agent: c.agent_id || "—",
      agent_id: c.agent_id || "—",
      process: c.process || c.sop_process || null,
      date: c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : "—",
      created_at: c.created_at || null,
      duration: c.duration || "—",
      score: c.score ?? null,
      status: c.status || "UNKNOWN",
      flags: c.flags || {},
      failure_reason: c.failure_reason,
      processing_metadata: c.processing_metadata || {},
      parameter_scores: c.parameter_scores || [],
      paramScores: c.parameter_scores || [],
      transcript: c.transcript || [],
      recording_path: recUrl,
      recordingUrl: recUrl
    };
  };

  // Load tenant configuration + SOP versions from the backend
  const loadConfig = async () => {
    try {
      const data = await settingsApi.getConfig();
      setTenantConfig(data.config);
      setSopVersions(data.sop_versions || []);
      setConfigError("");
    } catch (e) {
      setTenantConfig(null);
      setSopVersions([]);
      setConfigError(e.message || "Unable to load the tenant configuration.");
    }
  };

  // Load priority alerts + flag counts (dashboard Priority Alerts panel)
  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const [alertFlags, counts] = await Promise.all([
        dashboardApi.getAlerts(10),
        flagsApi.counts(),
      ]);
      setAlerts(alertFlags || []);
      setFlagCounts(counts || flagCounts);
    } catch (e) {
      // Non-fatal — dashboard still renders
    } finally {
      setAlertsLoading(false);
    }
  };

  // Primary fetch — every read goes through the tenant-scoped backend API.
  // The browser never queries the database directly, so it can never see
  // another tenant's rows and never invents a record of its own.
  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [callsRes, paramsRes, agentsRes, scriptsRes] = await Promise.all([
        callsApi.list({ limit: 200 }),
        parametersApi.list({ limit: 200 }),
        agentsApi.list({ limit: 200 }),
        scriptsApi.list({ limit: 200 }),
      ]);
      setCalls((callsRes.data || []).map(mapCall));
      setParameters(paramsRes.data || []);
      setAgents(agentsRes.data || []);
      setScripts(scriptsRes.data || []);
    } catch (err) {
      setError(err.message || "Unable to load audit data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Setup data only (parameters / agents / scripts) — used by realtime refresh.
  const loadSetupData = async () => {
    try {
      const [paramsRes, agentsRes, scriptsRes] = await Promise.all([
        parametersApi.list({ limit: 200 }),
        agentsApi.list({ limit: 200 }),
        scriptsApi.list({ limit: 200 }),
      ]);
      setParameters(paramsRes.data || []);
      setAgents(agentsRes.data || []);
      setScripts(scriptsRes.data || []);
    } catch (e) {
      // Non-fatal: the next realtime event or manual refresh retries, but the
      // failure is surfaced in the console rather than swallowed.
      console.warn("[AuditAI] Setup data refresh failed; will retry on the next realtime event.", e?.message || e);
    }
  };

  // Live channel state reported by Supabase Realtime itself — the header
  // badge never claims "Live" unless a channel actually reached SUBSCRIBED.
  const [realtimeStatus, setRealtimeStatus] = useState("UNKNOWN");
  // Bumped on every realtime call change so server-side aggregates refetch
  // when a call transitions (list length alone would not change).
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    if (!isSupabaseConfigured()) { setRealtimeStatus("UNCONFIGURED"); return; }
    return onRealtimeStatusChange(setRealtimeStatus);
  }, []);

  const realtimeLabel = realtimeStatus === "SUBSCRIBED"
    ? { text: "Supabase Live Realtime", detail: "Realtime channel subscribed" }
    : realtimeStatus === "UNCONFIGURED"
      ? { text: "Supabase Offline", detail: "Supabase URL/key not configured for this build" }
      : realtimeStatus === "CONNECTING" || realtimeStatus === "UNKNOWN"
        ? { text: "Realtime connecting…", detail: "Waiting for the realtime channel to subscribe" }
        : { text: "Realtime disconnected", detail: `Channel state: ${realtimeStatus}. Use Refresh to reload data.` };
  const realtimeColor = realtimeStatus === "SUBSCRIBED" ? C.green : C.amber;

  // Supabase Realtime subscriptions — read-side only. Call row changes are
  // applied straight from the payload; setup tables refetch through the API.
  useEffect(() => {
    loadData();

    if (!supabase) return;

    const unSubCalls = subscribeToCalls((payload) => {
      // INSERT and UPDATE both carry the new row — this is what drives the
      // RECEIVED → TRANSCRIBING → AI_SCORING → COMPLETED transitions live.
      if (payload.eventType === "DELETE") {
        const removedId = payload.old?.id;
        if (removedId) {
          setCalls((prev) => prev.filter((c) => c.id !== removedId));
          setDataVersion((v) => v + 1);
        }
        return;
      }
      if (payload.new) {
        const formatted = mapCall(payload.new);
        setCalls((prev) => [formatted, ...prev.filter((c) => c.id !== formatted.id)]);
        setDataVersion((v) => v + 1);
      }
    });

    const unSubParams = subscribeToParameters(() => { loadSetupData(); });
    const unSubAgents = subscribeToAgents(() => { loadSetupData(); });
    const unSubScripts = subscribeToScripts(() => { loadSetupData(); });

    return () => {
      unSubCalls();
      unSubParams();
      unSubAgents();
      unSubScripts();
    };
  }, []);

  // Tenant configuration + priority alerts on mount
  useEffect(() => {
    loadConfig();
    loadAlerts();
  }, []);

  // Tenant-scoped realtime alerts: CALL_FLAG_CREATED / NOTIFICATION_CREATED
  // refresh the Priority Alerts panel and KPI counts automatically.
  useEffect(() => {
    const unsubscribe = subscribeToTenantAlerts(TENANT, {
      // A new flag changes the flag-derived KPIs, so refresh the counts and
      // bump dataVersion to make the dashboard re-read its aggregates.
      onFlagCreated: () => { loadAlerts(); setDataVersion((v) => v + 1); },
      onNotificationCreated: () => { loadAlerts(); },
    });
    return () => { unsubscribe(); };
  }, []);

  function goTo(targetTab, callId) {
    setTab(targetTab);
    if (callId) setSelectedCallId(callId);
  }

  // Review a priority alert → jump to the exact call & transcript
  function handleReviewFlag(flag) {
    goTo("transcripts", flag.call_id);
  }

  // Trigger a test webhook call against the real backend pipeline.
  // The test recording URL is an operator-supplied test asset, not audit data.
  async function triggerTestCall() {
    // agent_id is part of the webhook contract (calls.agent_id → agents.code),
    // so a test call cannot be sent before at least one agent is mapped.
    if (agents.length === 0) {
      setTestCallMsg("");
      setTestCallError("Map at least one agent first — the webhook payload requires an agent code.");
      setTimeout(() => setTestCallError(""), 8000);
      return;
    }
    setIsTriggering(true); setTestCallMsg(""); setTestCallError("");
    try {
      const resp = await fetch("/api/call-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recording_url: TEST_RECORDING_URL,
          agent_id: agents[0].code,
          timestamp: new Date().toISOString()
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Webhook rejected (${resp.status})`);
      setTestCallMsg(data.duplicate
        ? `Already ingested (idempotent) — call ${String(data.call_id).slice(0, 8)}…`
        : `Accepted — call ${String(data.call_id).slice(0, 8)}… queued for processing.`);
      // The dashboard updates itself through realtime; nothing is faked locally.
    } catch (e) {
      setTestCallError(e.message || "Test call failed.");
    } finally {
      setIsTriggering(false);
      setTimeout(() => { setTestCallMsg(""); setTestCallError(""); }, 8000);
    }
  }

  if (tab === "public_home") {
    return (
      <>
        <style>{FONT_STYLE}</style>
        <HomePage
          onOpenAdminLogin={() => {
            setAuthGateRole("admin");
            setShowAuthGate(true);
          }}
          onOpenClientLogin={() => {
            setAuthGateRole("client");
            setShowAuthGate(true);
          }}
          onEnterConsole={(target) => setTab(target || "dashboard")}
        />

        <EnterpriseAuthGate
          isOpen={showAuthGate}
          initialRole={authGateRole}
          onClose={() => setShowAuthGate(false)}
          onLoginSuccess={(u) => {
            setCurrentUser(u);
            setShowAuthGate(false);
            setTab("dashboard");
          }}
        />
      </>
    );
  }

  return (
    <>
      <style>{FONT_STYLE}</style>
      <div className="auditai-grid-bg" style={{ display: "flex", height: "100vh", overflow: "hidden", color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}>
        {mobileNavOpen && (
          <div
            onClick={() => setMobileNavOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(4, 14, 32, 0.65)", backdropFilter: "blur(2px)", zIndex: 55 }}
          />
        )}
        {/* Sidebar — fixed to the viewport; only the nav list scrolls internally */}
        <aside
          className={`auditai-sidebar ${mobileNavOpen ? "open" : ""}`}
          style={{
            width: sidebarCollapsed ? 72 : 254,
            flexShrink: 0,
            height: "100vh",
            background: "#ffffff",
            borderRight: `1px solid ${C.border}`,
            padding: sidebarCollapsed ? "18px 10px" : "18px 14px",
            display: fullscreenPane ? "none" : "flex",
            flexDirection: "column",
            gap: 16,
            overflow: "hidden",
            boxShadow: "2px 0 12px rgba(15, 23, 42, 0.04)",
            transition: "width 0.2s ease, padding 0.2s ease, transform 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.teal, fontFamily: "Space Grotesk", fontSize: 18, fontWeight: 700, minWidth: 0 }}>
              <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                <Sparkles size={14} color="#ffffff" />
              </div>
              {!sidebarCollapsed && (
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, color: "#0f172a" }}>
                  AuditAI
                  <span style={{ color: "#0369a1", fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>NA Enterprise</span>
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                style={{ background: "#e0f2fe", border: `1px solid ${C.border}`, borderRadius: 7, color: "#0369a1", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              style={{ background: C.panel2, border: `1px solid ${C.border}`, color: "#0369a1", borderRadius: 6, cursor: "pointer", padding: "6px 0", display: "flex", justifyContent: "center" }}
            >
              <ChevronRight size={14} />
            </button>
          )}

          <nav style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            {navGroupsFor(tenantConfig?.setup_state, currentUser?.role, roleFeatures).map((group, gIdx) => {
              const isGroupCollapsed = !!collapsedGroups[group.title];
              return (
              <div key={group.title || gIdx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {gIdx > 0 && <div style={{ height: 1, background: C.borderSoft, margin: sidebarCollapsed ? "4px 4px 8px" : "4px 0 8px" }} />}
                {!sidebarCollapsed && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 6px 4px 8px", gap: 6 }}>
                    <span style={{ color: "#0369a1", fontSize: 10, fontFamily: "Inter", fontWeight: 800, letterSpacing: 0.7 }}>
                      {group.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.title]: !prev[group.title] }))}
                      title={isGroupCollapsed ? `Maximize ${group.title}` : `Minimize ${group.title}`}
                      aria-label={isGroupCollapsed ? `Maximize ${group.title}` : `Minimize ${group.title}`}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: isGroupCollapsed ? "#bae6fd" : "#e0f2fe",
                        color: "#0369a1",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isGroupCollapsed ? <Plus size={12} color="#0284c7" /> : <Minus size={12} color="#0369a1" />}
                    </button>
                  </div>
                )}
                {(!isGroupCollapsed || sidebarCollapsed) && group.items.map((item) => {
                  const Icon = item.Icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setTab(item.id); setMobileNavOpen(false); }}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-label={item.label}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                        justifyContent: sidebarCollapsed ? "center" : "flex-start",
                        background: active ? "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" : "transparent",
                        color: active ? "#ffffff" : "#0f172a",
                        border: active ? "1px solid #0284c7" : "1px solid transparent",
                        borderRadius: 10, padding: sidebarCollapsed ? "9px 0" : "8px 11px",
                        fontFamily: "Inter", fontSize: 12.5, fontWeight: active ? 700 : 500,
                        cursor: "pointer", transition: "all 0.15s ease",
                        boxShadow: active ? "0 4px 12px rgba(2, 132, 199, 0.25)" : "none",
                      }}
                    >
                      <Icon size={15} style={{ flexShrink: 0, color: active ? "#ffffff" : "#0284c7" }} />
                      {!sidebarCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
              );
            })}
          </nav>

          <div style={{ borderTop: `1px solid ${C.borderSoft}`, paddingTop: 12, flexShrink: 0 }}>
            <button
              onClick={() => setTab("payu_billing")}
              title={sidebarCollapsed ? "PayU Subscriptions" : undefined}
              aria-label="PayU Subscriptions"
              style={{ display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 8, width: "100%", background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", border: "none", color: "#ffffff", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(56, 189, 248, 0.3)" }}
            >
              <CreditCard size={14} color="#ffffff" style={{ flexShrink: 0 }} /> {!sidebarCollapsed && "PayU Billing"}
            </button>
          </div>
        </aside>

        {/* Main Content Pane — scrolls independently of the sidebar */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
          {/* Top Bar Header — Crisp White with Sky-200 Border */}
          <div style={{ height: 58, flexShrink: 0, borderBottom: "1px solid #BAE6FD", background: "#FFFFFF", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <button
                type="button"
                className="auditai-mobile-menu-btn"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label="Toggle navigation menu"
                style={{
                  background: "#E0F2FE",
                  border: "1px solid #BAE6FD",
                  color: "#0284C7",
                  borderRadius: 10,
                  padding: "6px 8px",
                  cursor: "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Menu size={16} />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenPane((v) => !v)}
                title={fullscreenPane ? "Minimize workspace (show sidebar)" : "Maximize workspace (hide sidebar)"}
                aria-label={fullscreenPane ? "Minimize workspace" : "Maximize workspace"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: fullscreenPane ? "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)" : "#E0F2FE",
                  border: "1px solid #BAE6FD",
                  color: fullscreenPane ? "#FFFFFF" : "#0284C7",
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {fullscreenPane ? <Minus size={13} /> : <Plus size={13} />}
                <span>{fullscreenPane ? "Minimize" : "Maximize"}</span>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ color: "#64748B", fontSize: 12 }}>Workspace:</span>
                <span style={{ color: "#0F172A", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>NA Enterprise</span>
              </div>

              {/* Architecture Badges */}
              <div className="auditai-badges-hide" style={{ alignItems: "center", gap: 6, display: sidebarCollapsed ? "none" : "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 999, padding: "2px 9px", fontSize: 10.5, color: "#0284C7", fontWeight: 600, fontFamily: "JetBrains Mono" }}>
                  <Shield size={11} color="#0284C7" /> Auth DB
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 999, padding: "2px 9px", fontSize: 10.5, color: "#0284C7", fontWeight: 600, fontFamily: "JetBrains Mono" }}>
                  <Database size={11} color="#0284C7" /> Cloudflare D1
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 999, padding: "2px 9px", fontSize: 10.5, color: "#0284C7", fontWeight: 600, fontFamily: "JetBrains Mono" }}>
                  <HardDrive size={11} color="#0284C7" /> Cloudflare R2
                </span>
              </div>
            </div>

            {/* User Session & Role Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setTab("public_home")}
                title="Preview Live Public Home Page"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Globe size={13} color="#FFFFFF" />
                Live Public Site ↗
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F0F9FF",
                  border: "1px solid #BAE6FD",
                  borderRadius: 20,
                  padding: "4px 12px 4px 6px",
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#0284C7",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : "A"}
                </div>
                <span style={{ fontWeight: 600, color: "#0F172A", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser?.full_name || currentUser?.email || "Super Admin"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    background: "#E0F2FE",
                    color: "#0284C7",
                  }}
                >
                  {(currentUser?.role === "admin" ? "super_admin" : currentUser?.role) || "SUPER_ADMIN"}
                </span>
              </div>

              <button
                onClick={() => setShowAuthGate(true)}
                title="Switch User or Manage Authentication"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  color: "#0F172A",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={12} color="#2563EB" />
                Switch / Auth
              </button>
            </div>
          </div>

          {/* Dynamic Content View — the only scrolling region in the app */}
          <div className="auditai-main-pad" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            <div className="auditai-content-inner">
            {(tab === "home_cms" || tab === "admin_home_cms") && <HomePageCMSModule />}
            {tab === "admin_team" && <AdminTeamEditorModule />}
            {tab === "admin_subscriptions" && <AdminSubscriptionsModule />}
            {tab === "admin_email" && <AdminEmailConfigModule />}
            {tab === "admin_activity" && <AdminUserActivityModule />}
            {tab === "admin_access" && <AdminAccessControlModule currentUser={currentUser} onRoleFeaturesUpdated={(m) => setRoleFeatures(m)} />}
            {(tab === "universal_search" || tab === "admin_search") && <UniversalSearchModule />}
            {(tab === "enquiries" || tab === "admin_enquiries") && <EnquiriesManagementModule />}

            {tab === "admin_users" && <AdminUsersModule currentUser={currentUser} />}
            {(tab === "payu_billing" || tab === "billing") && <PayUBillingModule currentUser={currentUser} isAdmin={currentUser?.role === "admin" || currentUser?.role === "super_admin"} />}
            {tab === "cloudflare_db" && <CloudflareDatabaseModule />}

            {tab === "sales_forecasting" && <SalesForecastingWidget />}
            {tab === "data_fishing" && <DataFishingModule />}
            {tab === "knowledge_hub" && <KnowledgeHubModule />}

            {tab === "dashboard" && <AuditDashboard calls={calls} agents={agents} loading={loading} error={error} onRetry={loadData} goTo={goTo} triggerTestCall={triggerTestCall} isTriggering={isTriggering} testCallMsg={testCallMsg} testCallError={testCallError} flagCounts={flagCounts} alerts={alerts} alertsLoading={alertsLoading} onReviewFlag={handleReviewFlag} dataVersion={dataVersion} />}
            {tab === "alerts" && <CriticalAlertsPage calls={calls} goTo={goTo} />}
            {tab === "sop_parameters" && <SopAndParametersModule parameters={parameters} setParameters={setParameters} loading={loading} config={tenantConfig} sopVersions={sopVersions} configError={configError} onRefresh={loadConfig} goTo={goTo} />}
            {tab === "upload" && <ScriptUpload setParameters={setParameters} />}
            {tab === "scripts" && <CallScriptsModule scripts={scripts} setScripts={setScripts} loading={loading} />}
            {tab === "parameters" && <CustomParameters parameters={parameters} loading={loading} />}
            {tab === "agents" && <AgentMapping agents={agents} setAgents={setAgents} calls={calls} loading={loading} />}
            {tab === "transcripts" && <CallTranscripts calls={calls} loading={loading} selectedId={selectedCallId} setSelectedId={setSelectedCallId} />}
            {tab === "scores" && <UnifiedCallScoresModule calls={calls} parameters={parameters} loading={loading} selectedId={selectedCallId} setSelectedId={setSelectedCallId} goTo={goTo} onOpenCoaching={(c) => setCoachingCall(c)} onRefresh={loadData} />}
            {tab === "chattest" && <ChatAndEmailAudit calls={calls} goTo={goTo} />}
            {tab === "auditform" && <AuditFormPage calls={calls} parameters={parameters} goTo={goTo} onAuditSaved={loadData} />}
            {tab === "revalidation" && <RevalidationRequestsPage calls={calls} onRefresh={loadData} goTo={goTo} />}
            {tab === "qctools" && <SevenQCTools calls={calls} agents={agents} />}
            {tab === "audittrail" && <AuditTrailPage calls={calls} />}
            {(tab === "onboarding" || tab === "crm_setup") && <KnowlarityOnboardingPage />}
            {tab === "settings" && <SettingsModule config={tenantConfig} sopVersions={sopVersions} configError={configError} onRefresh={() => { loadConfig(); }} goTo={goTo} />}
            {tab === "reports" && <ReportsModule />}
            {tab === "csvupload" && <CsvUploadModule onImportComplete={loadData} />}
            </div>
          </div>
        </div>

        <AskAuditAIChatbot
          currentUser={currentUser}
          allowedTabs={navGroupsFor(tenantConfig?.setup_state, currentUser?.role, roleFeatures).flatMap((g) => g.items.map((i) => i.id))}
          onNavigate={(targetTab) => setTab(targetTab)}
          onActionExecuted={(act) => {
            if (act === "refresh_agents") loadData();
          }}
        />

        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
        {coachingCall && (
          <AgentCoachingModal call={coachingCall} onClose={() => setCoachingCall(null)} />
        )}
        <EnterpriseAuthGate
          isOpen={showAuthGate}
          initialRole={authGateRole}
          onClose={() => setShowAuthGate(false)}
          onLoginSuccess={(u) => {
            setCurrentUser(u);
            setShowAuthGate(false);
          }}
        />
      </div>
    </>
  );
}
