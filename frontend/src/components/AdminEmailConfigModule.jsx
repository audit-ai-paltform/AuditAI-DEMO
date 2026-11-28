import React, { useState, useEffect } from "react";
import {
  Send,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  Shield,
  Save,
  Clock,
  FileEdit,
  Megaphone,
  BarChart3,
  Link2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Eye,
  Globe,
  Image,
  PenTool,
  Calendar,
  XCircle,
  Filter,
} from "lucide-react";
import { emailAdminApi } from "../lib/api";

export default function AdminEmailConfigModule() {
  const [activeTab, setActiveTab] = useState("templates"); // 'templates' | 'branding' | 'reminder' | 'maintenance' | 'reports' | 'logs'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Yearly Audit Stats State
  const [auditYear, setAuditYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    queued: 0,
    deliveryRate: 100,
    byProvider: { resend: 0, brevo: 0 },
    scheduled: [],
  });

  // Global Config, Domains, Logo & Signature State
  const [config, setConfig] = useState({
    active_provider: "resend",
    resend_api_key: "",
    brevo_api_key: "",
    from_local: "notifications",
    selected_domain: "auditai.in",
    available_domains: ["auditai.in", "acmetelephony.in", "mail.auditai.io"],
    from_address: "notifications@auditai.in",
    from_name: "AuditAI Qalyzer Platform",
    admin_email: "admin@auditai.io",
    logo_url: "https://placehold.co/160x40/0284c7/ffffff?text=AuditAI+Qalyzer",
    logo_placement: "top-left",
    signature_html: "",
    signature_placement: "bottom-left",
    daily_report_enabled: true,
    daily_report_hour_utc: 12,
  });
  const [newDomainInput, setNewDomainInput] = useState("");

  // Editable Automation Templates & Live Preview State
  const [templates, setTemplates] = useState({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("enquiry_submitted");
  const [editorMode, setEditorMode] = useState("simple"); // 'simple' | 'html'
  const [simpleBlocks, setSimpleBlocks] = useState({
    greeting: "Hello {{name}},",
    intro: "Thank you for connecting with AuditAI Qalyzer Enterprise.",
    highlight: "Plan: {{plan}} · Company: {{company}}",
    ctaLabel: "Open AuditAI Portal",
    ctaLink: "http://localhost:3001/",
    closing: "Best regards, AuditAI Governance Team",
  });
  const [previewData, setPreviewData] = useState({ subject: "", html: "", from_email: "" });
  const [testRecipient, setTestRecipient] = useState("admin@auditai.io");
  const [templateScheduleAt, setTemplateScheduleAt] = useState("");

  // Payment Reminder with Link + CC/BCC/Schedule State
  const [reminder, setReminder] = useState({
    to: "finance@partner-client.in",
    cc: "",
    bcc: "",
    userName: "Enterprise Billing Team",
    planName: "Growth Professional",
    amountDueINR: 9999,
    daysRemaining: 3,
    dueDate: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
    paymentLink: "http://localhost:3001/?checkout=Growth%20Professional",
    provider: "",
    fromDomain: "",
    scheduledAt: "",
  });

  // Maintenance / Platform Update Broadcast State
  const [maintenance, setMaintenance] = useState({
    recipients: "ALL",
    cc: "",
    bcc: "",
    title: "Qalyzer v2.1 Speech Diarization & ISO Engine Upgrade",
    maintenanceWindow: "Sunday, 02:00 AM - 02:30 AM IST",
    impact: "Zero call ingestion downtime (Edge Failover Active)",
    details: "We are rolling out enhanced Hinglish speech diarization, faster D1 edge queries, and new ISO 27001 audit trail exports.",
    provider: "",
    fromDomain: "",
    scheduledAt: "",
  });

  // Logs & Filters State
  const [logs, setLogs] = useState([]);
  const [logStatusFilter, setLogStatusFilter] = useState("ALL");
  const [logProviderFilter, setLogProviderFilter] = useState("ALL");
  const [logSearch, setLogSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [auditYear]);

  // Refresh live preview whenever selected template or branding changes
  useEffect(() => {
    const tpl = templates[selectedTemplateKey];
    if (!tpl) return;
    const timer = setTimeout(() => {
      emailAdminApi
        .previewTemplate({
          key: selectedTemplateKey,
          subject: tpl.subject,
          body: tpl.body,
          logo_url: config.logo_url,
          logo_placement: config.logo_placement,
          signature_html: config.signature_html,
          signature_placement: config.signature_placement,
          selected_domain: tpl.from_domain || config.selected_domain,
          from_name: config.from_name,
        })
        .then((res) => {
          const d = res?.data || res;
          if (d?.html) setPreviewData(d);
        })
        .catch(() => {});
    }, 180);
    return () => clearTimeout(timer);
  }, [
    selectedTemplateKey,
    templates,
    config.logo_url,
    config.logo_placement,
    config.signature_html,
    config.signature_placement,
    config.selected_domain,
    config.from_name,
  ]);

  async function loadData() {
    setLoading(true);
    try {
      const [cfgRes, logsRes, statsRes] = await Promise.allSettled([
        emailAdminApi.getConfig(),
        emailAdminApi.getLogs(),
        emailAdminApi.getStats(auditYear === "ALL" ? undefined : auditYear),
      ]);

      if (cfgRes.status === "fulfilled" && cfgRes.value) {
        const raw = cfgRes.value.data || cfgRes.value;
        setConfig({
          active_provider: raw.provider || "resend",
          resend_api_key: raw.resend_api_key || "",
          brevo_api_key: raw.brevo_api_key || "",
          from_local: raw.from_local || "notifications",
          selected_domain: raw.selected_domain || "auditai.in",
          available_domains: raw.available_domains || ["auditai.in", "acmetelephony.in"],
          from_address: raw.from_email || "notifications@auditai.in",
          from_name: raw.from_name || "AuditAI Qalyzer Platform",
          admin_email: raw.admin_email || "admin@auditai.io",
          logo_url: raw.logo_url || "",
          logo_placement: raw.logo_placement || "top-left",
          signature_html: raw.signature_html || "",
          signature_placement: raw.signature_placement || "bottom-left",
          daily_report_enabled: raw.daily_report_enabled !== false,
          daily_report_hour_utc: raw.daily_report_hour_utc ?? 12,
        });
        if (raw.templates) setTemplates(raw.templates);
      }

      if (logsRes.status === "fulfilled" && logsRes.value) {
        setLogs(logsRes.value.data || logsRes.value || []);
      }

      if (statsRes.status === "fulfilled" && statsRes.value) {
        const s = statsRes.value.data || statsRes.value;
        setStats(s);
      }
    } catch (err) {
      console.error("Failed to load email automation data", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleSaveGlobalConfig(extra = {}) {
    setLoading(true);
    try {
      const apiKey = config.active_provider === "resend" ? config.resend_api_key : config.brevo_api_key;
      const res = await emailAdminApi.updateConfig({
        provider: config.active_provider,
        api_key: apiKey,
        resend_api_key: config.resend_api_key,
        brevo_api_key: config.brevo_api_key,
        from_local: config.from_local,
        selected_domain: config.selected_domain,
        from_name: config.from_name,
        admin_email: config.admin_email,
        logo_url: config.logo_url,
        logo_placement: config.logo_placement,
        signature_html: config.signature_html,
        signature_placement: config.signature_placement,
        daily_report_enabled: config.daily_report_enabled,
        daily_report_hour_utc: Number(config.daily_report_hour_utc),
        ...extra,
      });
      const updated = res?.data || res;
      if (updated?.available_domains) {
        setConfig((prev) => ({
          ...prev,
          available_domains: updated.available_domains,
          selected_domain: updated.selected_domain,
          from_address: updated.from_email,
        }));
      }
      showToast("success", "Email branding, domain, provider & automation settings saved!");
    } catch (err) {
      showToast("error", err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTemplate(key) {
    const tpl = templates[key];
    if (!tpl) return;
    setLoading(true);
    try {
      await emailAdminApi.updateConfig({
        templateUpdate: {
          key,
          enabled: tpl.enabled,
          subject: tpl.subject,
          body: tpl.body,
          cc: tpl.cc,
          bcc: tpl.bcc,
          provider: tpl.provider || undefined,
          from_domain: tpl.from_domain || undefined,
        },
      });
      showToast("success", `Saved "${tpl.label}" format, CC/BCC & domain settings!`);
    } catch (err) {
      showToast("error", err.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTemplate(key) {
    const tpl = templates[key];
    if (!tpl) return;
    const nextEnabled = !tpl.enabled;
    setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], enabled: nextEnabled } }));
    try {
      await emailAdminApi.updateConfig({ templateUpdate: { key, enabled: nextEnabled } });
      showToast("success", `${tpl.label} ${nextEnabled ? "enabled" : "paused"}.`);
    } catch {}
  }

  async function handleSendOrScheduleTemplate() {
    const tpl = templates[selectedTemplateKey];
    setLoading(true);
    try {
      const res = await emailAdminApi.sendTestEmail({
        to: testRecipient || config.admin_email,
        cc: tpl?.cc,
        bcc: tpl?.bcc,
        template: selectedTemplateKey,
        provider: tpl?.provider || config.active_provider,
        fromDomain: tpl?.from_domain || config.selected_domain,
        scheduledAt: templateScheduleAt ? new Date(templateScheduleAt).toISOString() : undefined,
      });
      showToast("success", res.message || "Email dispatched!");
      setTemplateScheduleAt("");
      loadData();
    } catch (err) {
      showToast("error", err.message || "Dispatch failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPaymentReminder(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await emailAdminApi.sendPaymentReminder({
        to: reminder.to,
        cc: reminder.cc,
        bcc: reminder.bcc,
        userName: reminder.userName,
        planName: reminder.planName,
        amountINR: Number(reminder.amountDueINR),
        daysRemaining: Number(reminder.daysRemaining),
        expiryDate: reminder.dueDate,
        paymentLink: reminder.paymentLink,
        provider: reminder.provider || config.active_provider,
        fromDomain: reminder.fromDomain || config.selected_domain,
        scheduledAt: reminder.scheduledAt ? new Date(reminder.scheduledAt).toISOString() : undefined,
      });
      showToast("success", res.message || `Payment reminder sent to ${reminder.to}!`);
      setReminder((prev) => ({ ...prev, scheduledAt: "" }));
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to send payment reminder");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMaintenance(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await emailAdminApi.sendMaintenanceUpdate({
        ...maintenance,
        provider: maintenance.provider || config.active_provider,
        fromDomain: maintenance.fromDomain || config.selected_domain,
        scheduledAt: maintenance.scheduledAt ? new Date(maintenance.scheduledAt).toISOString() : undefined,
      });
      showToast("success", res.message || "Platform update dispatched!");
      setMaintenance((prev) => ({ ...prev, scheduledAt: "" }));
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to send update");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelScheduled(id) {
    try {
      await emailAdminApi.cancelScheduled(id);
      showToast("success", "Scheduled email cancelled.");
      loadData();
    } catch (err) {
      showToast("error", err.message || "Could not cancel scheduled job");
    }
  }

  async function handleTriggerDailyReport() {
    setLoading(true);
    try {
      const res = await emailAdminApi.sendDailyReportNow({ to: config.admin_email });
      showToast("success", res.message || `Daily report sent to ${config.admin_email}!`);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to send report");
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerCriticalAlertTest() {
    setLoading(true);
    try {
      const res = await emailAdminApi.sendTestEmail({ to: config.admin_email, template: "critical_alert" });
      showToast("success", res.message || `Critical alert sent to ${config.admin_email}!`);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to trigger critical alert");
    } finally {
      setLoading(false);
    }
  }

  const activeTemplate = templates[selectedTemplateKey];
  const templateKeys = Object.keys(templates);

  const filteredLogs = logs.filter((l) => {
    if (auditYear !== "ALL" && l.created_at && new Date(l.created_at).getFullYear() !== Number(auditYear)) return false;
    if (logStatusFilter !== "ALL" && l.status !== logStatusFilter) return false;
    if (logProviderFilter !== "ALL" && l.provider !== logProviderFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        (l.recipient || "").toLowerCase().includes(q) ||
        (l.subject || "").toLowerCase().includes(q) ||
        (l.template_type || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inputStyle = {
    width: "100%",
    background: "#08162d",
    border: "1px solid rgba(96, 165, 250, 0.3)",
    borderRadius: 8,
    padding: "9px 12px",
    color: "#ffffff",
    fontSize: 12.5,
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header + Year Audit Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
            <Mail size={13} /> Automated Email Studio, Live Preview & Yearly Audit
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "4px 0", fontFamily: "Space Grotesk", color: "#ffffff" }}>
            Email Automation, Branding & Delivery Audit
          </h1>
          <p style={{ fontSize: 13, color: "#bae6fd", margin: 0 }}>
            Preview templates in real time, configure CC/BCC & schedules, manage Logo/Signature placement, select Resend/Brevo & custom domains, and audit yearly delivery.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={auditYear}
            onChange={(e) => setAuditYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            style={{ ...inputStyle, width: 130, padding: "8px 10px", fontWeight: 600 }}
          >
            <option value={2026}>Year: 2026</option>
            <option value={2025}>Year: 2025</option>
            <option value="ALL">All Years</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#0f2752",
              border: "1px solid rgba(96, 165, 250, 0.3)",
              color: "#ffffff",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Audit
          </button>
        </div>
      </div>

      {/* Yearly Email Audit KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12 }}>
        {[
          { label: `Total Dispatched (${auditYear})`, value: stats.total, color: "#38bdf8", sub: `${stats.deliveryRate}% Success Rate` },
          { label: "Sent Successfully", value: stats.sent, color: "#34d399", sub: "Verified API 200 OK" },
          { label: "Failed / Bounced", value: stats.failed, color: "#f87171", sub: "Requires Review" },
          { label: "Scheduled / Queued", value: stats.queued, color: "#fbbf24", sub: `${stats.scheduled?.filter((j) => j.status === "SCHEDULED").length || 0} Pending Jobs` },
          { label: "Resend vs Brevo", value: `${stats.byProvider?.resend || 0} / ${stats.byProvider?.brevo || 0}`, color: "#a78bfa", sub: `Active: ${config.active_provider.toUpperCase()}` },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#7dd3fc", fontWeight: 600, textTransform: "uppercase" }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, margin: "4px 0", fontFamily: "Space Grotesk" }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: "#bae6fd" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          borderRadius: 10,
          background: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
          color: feedback.type === "success" ? "#34d399" : "#f87171",
          fontSize: 13,
          fontWeight: 600,
        }}>
          {feedback.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid rgba(96, 165, 250, 0.2)", paddingBottom: 12 }}>
        {[
          { id: "templates", label: "Editor & Live Preview", icon: FileEdit },
          { id: "branding", label: "Logo, Signature, Domains & Providers", icon: Image },
          { id: "reminder", label: "Payment Reminder + Link", icon: Link2 },
          { id: "maintenance", label: "Maintenance / Updates", icon: Megaphone },
          { id: "reports", label: "Critical Alerts & Daily Reports", icon: BarChart3 },
          { id: "logs", label: `Audit Logs & Scheduled (${logs.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: active ? "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)" : "rgba(15, 39, 82, 0.55)",
                border: `1px solid ${active ? "#38bdf8" : "rgba(96, 165, 250, 0.25)"}`,
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 13px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Editor + Live Visual Email Preview */}
      {activeTab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Trigger Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {templateKeys.map((key) => {
              const tpl = templates[key];
              const isSelected = selectedTemplateKey === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedTemplateKey(key)}
                  style={{
                    background: isSelected ? "rgba(56, 189, 248, 0.16)" : "#0b1d3e",
                    border: `1px solid ${isSelected ? "#38bdf8" : "rgba(96, 165, 250, 0.2)"}`,
                    borderRadius: 9,
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.label}</div>
                    <div style={{ fontSize: 10.5, color: "#7dd3fc", marginTop: 2 }}>{tpl.recipientType}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTemplate(key);
                    }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: tpl.enabled ? "#34d399" : "#64748b", padding: 2, flexShrink: 0 }}
                  >
                    {tpl.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Template Editor */}
          {activeTemplate && (
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", margin: 0 }}>{activeTemplate.label}</h3>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: activeTemplate.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.2)", color: activeTemplate.enabled ? "#34d399" : "#94a3b8" }}>
                  {activeTemplate.enabled ? "ACTIVE" : "PAUSED"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4, fontWeight: 600 }}>Subject Line</label>
                  <input
                    type="text"
                    value={activeTemplate.subject}
                    onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], subject: e.target.value } }))}
                    style={inputStyle}
                  />
                </div>

                {/* CC & BCC */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4, fontWeight: 600 }}>CC (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="manager@company.com"
                      value={activeTemplate.cc || ""}
                      onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], cc: e.target.value } }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4, fontWeight: 600 }}>BCC (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="audit@company.com"
                      value={activeTemplate.bcc || ""}
                      onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], bcc: e.target.value } }))}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Provider & Domain Override */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4, fontWeight: 600 }}>Platform (Resend / Brevo)</label>
                    <select
                      value={activeTemplate.provider || ""}
                      onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], provider: e.target.value } }))}
                      style={inputStyle}
                    >
                      <option value="">Default ({config.active_provider.toUpperCase()})</option>
                      <option value="resend">Resend</option>
                      <option value="brevo">Brevo</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4, fontWeight: 600 }}>Sending Domain</label>
                    <select
                      value={activeTemplate.from_domain || ""}
                      onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], from_domain: e.target.value } }))}
                      style={inputStyle}
                    >
                      <option value="">Default ({config.selected_domain})</option>
                      {config.available_domains.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Plain-English Simple Editor vs Advanced HTML */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <label style={{ fontSize: 11.5, color: "#7dd3fc", fontWeight: 600 }}>
                      Email Content ({editorMode === "simple" ? "Simple Plain-English Mode" : "HTML Mode"})
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setEditorMode("simple")}
                        style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 5, border: "1px solid #38bdf8", background: editorMode === "simple" ? "#38bdf8" : "transparent", color: editorMode === "simple" ? "#08162d" : "#38bdf8", fontWeight: 700, cursor: "pointer" }}
                      >
                        Simple Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode("html")}
                        style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 5, border: "1px solid #38bdf8", background: editorMode === "html" ? "#38bdf8" : "transparent", color: editorMode === "html" ? "#08162d" : "#38bdf8", fontWeight: 700, cursor: "pointer" }}
                      >
                        Advanced HTML
                      </button>
                    </div>
                  </div>

                  {editorMode === "simple" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(8, 22, 45, 0.55)", padding: 12, borderRadius: 8, border: "1px solid rgba(96, 165, 250, 0.25)" }}>
                      {(() => {
                        const applySimple = (next) => {
                          setSimpleBlocks(next);
                          const generatedHtml = `<p>${next.greeting}</p>
<p>${next.intro}</p>
${next.highlight ? `<div style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); padding: 14px; border-radius: 8px; margin: 14px 0;">${next.highlight}</div>` : ""}
${next.ctaLabel ? `<p style="margin: 18px 0;"><a href="${next.ctaLink || "#"}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 7px; font-weight: bold; display: inline-block;">${next.ctaLabel} →</a></p>` : ""}
<p>${next.closing}</p>`;
                          setTemplates((prev) => ({
                            ...prev,
                            [selectedTemplateKey]: { ...prev[selectedTemplateKey], body: generatedHtml },
                          }));
                        };
                        return (
                          <>
                            <input type="text" placeholder="Greeting (e.g. Hello {{name}},)" value={simpleBlocks.greeting} onChange={(e) => applySimple({ ...simpleBlocks, greeting: e.target.value })} style={inputStyle} />
                            <textarea rows={2} placeholder="Main Message..." value={simpleBlocks.intro} onChange={(e) => applySimple({ ...simpleBlocks, intro: e.target.value })} style={inputStyle} />
                            <input type="text" placeholder="Highlight Box Info (optional)" value={simpleBlocks.highlight} onChange={(e) => applySimple({ ...simpleBlocks, highlight: e.target.value })} style={inputStyle} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <input type="text" placeholder="Button Label" value={simpleBlocks.ctaLabel} onChange={(e) => applySimple({ ...simpleBlocks, ctaLabel: e.target.value })} style={inputStyle} />
                              <input type="text" placeholder="Button Link URL" value={simpleBlocks.ctaLink} onChange={(e) => applySimple({ ...simpleBlocks, ctaLink: e.target.value })} style={inputStyle} />
                            </div>
                            <input type="text" placeholder="Closing Note" value={simpleBlocks.closing} onChange={(e) => applySimple({ ...simpleBlocks, closing: e.target.value })} style={inputStyle} />
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                        {(activeTemplate.variables || []).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              setTemplates((prev) => ({
                                ...prev,
                                [selectedTemplateKey]: { ...prev[selectedTemplateKey], body: prev[selectedTemplateKey].body + ` {{${v}}}` },
                              }))
                            }
                            style={{ fontSize: 10, background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", borderRadius: 4, padding: "1px 5px", cursor: "pointer" }}
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={8}
                        value={activeTemplate.body}
                        onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: { ...prev[selectedTemplateKey], body: e.target.value } }))}
                        style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}
                      />
                    </>
                  )}
                </div>

                {/* Save & Test / Schedule */}
                <div style={{ paddingTop: 8, borderTop: "1px solid rgba(96, 165, 250, 0.18)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="Recipient email..." style={inputStyle} />
                    <input type="datetime-local" value={templateScheduleAt} onChange={(e) => setTemplateScheduleAt(e.target.value)} title="Optional: Schedule for later" style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleSendOrScheduleTemplate}
                      disabled={loading}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      <Send size={13} /> {templateScheduleAt ? "Schedule Email" : "Send Test Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveTemplate(selectedTemplateKey)}
                      disabled={loading}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", border: "none", color: "#ffffff", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      <Save size={14} /> Save Format
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Visual Email Preview Pane */}
          <div style={{ background: "#0b1d3e", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "rgba(56, 189, 248, 0.1)", borderBottom: "1px solid rgba(96, 165, 250, 0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#38bdf8" }}>
                <Eye size={15} /> Live Email Preview
              </span>
              <span style={{ fontSize: 11, color: "#bae6fd" }}>
                via {(activeTemplate?.provider || config.active_provider).toUpperCase()}
              </span>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(96, 165, 250, 0.15)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4, background: "#08162d" }}>
              <div><span style={{ color: "#7dd3fc" }}>From:</span> <span style={{ color: "#ffffff" }}>{config.from_name} &lt;{config.from_local}@{activeTemplate?.from_domain || config.selected_domain}&gt;</span></div>
              {activeTemplate?.cc && <div><span style={{ color: "#7dd3fc" }}>CC:</span> <span style={{ color: "#bae6fd" }}>{activeTemplate.cc}</span></div>}
              {activeTemplate?.bcc && <div><span style={{ color: "#7dd3fc" }}>BCC:</span> <span style={{ color: "#bae6fd" }}>{activeTemplate.bcc}</span></div>}
              <div><span style={{ color: "#7dd3fc" }}>Subject:</span> <strong style={{ color: "#ffffff" }}>{previewData.subject || activeTemplate?.subject}</strong></div>
            </div>

            <div
              style={{ maxHeight: 540, overflowY: "auto", background: "#061224" }}
              dangerouslySetInnerHTML={{ __html: previewData.html || "<div style='padding:24px;color:#bae6fd;'>Rendering preview...</div>" }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Branding (Logo, Signature Placement, Domains & Resend/Brevo) */}
      {activeTab === "branding" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Logo & Placement */}
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#38bdf8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Image size={16} /> Email Logo & Placement
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Brand Logo Image URL</label>
                  <input type="url" value={config.logo_url} onChange={(e) => setConfig({ ...config, logo_url: e.target.value })} placeholder="https://..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Logo Placement Position</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { id: "top-left", label: "Top Left" },
                      { id: "top-center", label: "Top Center" },
                      { id: "top-right", label: "Top Right" },
                      { id: "hidden", label: "Hidden" },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setConfig({ ...config, logo_placement: pos.id })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: 7,
                          border: `1px solid ${config.logo_placement === pos.id ? "#38bdf8" : "rgba(96, 165, 250, 0.25)"}`,
                          background: config.logo_placement === pos.id ? "rgba(56, 189, 248, 0.2)" : "#08162d",
                          color: "#ffffff",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Signature & Placement */}
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#38bdf8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <PenTool size={16} /> Email Signature & Placement
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Signature HTML / Footer Sign-off</label>
                  <textarea rows={4} value={config.signature_html} onChange={(e) => setConfig({ ...config, signature_html: e.target.value })} style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Signature Placement Position</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { id: "bottom-left", label: "Bottom Left" },
                      { id: "bottom-center", label: "Bottom Center" },
                      { id: "above-footer", label: "Above Footer" },
                      { id: "hidden", label: "Hidden" },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setConfig({ ...config, signature_placement: pos.id })}
                        style={{
                          padding: "8px 6px",
                          borderRadius: 7,
                          border: `1px solid ${config.signature_placement === pos.id ? "#38bdf8" : "rgba(96, 165, 250, 0.25)"}`,
                          background: config.signature_placement === pos.id ? "rgba(56, 189, 248, 0.2)" : "#08162d",
                          color: "#ffffff",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Domains & Providers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#38bdf8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={16} /> Sending Domain Selection
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Sender Prefix (Before @)</label>
                  <input type="text" value={config.from_local} onChange={(e) => setConfig({ ...config, from_local: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Select Active Domain</label>
                  <select value={config.selected_domain} onChange={(e) => setConfig({ ...config, selected_domain: e.target.value })} style={inputStyle}>
                    {config.available_domains.map((d) => (
                      <option key={d} value={d}>@{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input type="text" value={newDomainInput} onChange={(e) => setNewDomainInput(e.target.value)} placeholder="Add new domain (e.g. mail.yourcompany.com)" style={inputStyle} />
                <button
                  type="button"
                  onClick={() => {
                    if (!newDomainInput.trim()) return;
                    handleSaveGlobalConfig({ add_domain: newDomainInput.trim() });
                    setNewDomainInput("");
                  }}
                  style={{ background: "#0f2752", border: "1px solid #38bdf8", color: "#38bdf8", borderRadius: 8, padding: "0 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  + Add Domain
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#34d399" }}>
                Active Sender Address: <strong>{config.from_local}@{config.selected_domain}</strong>
              </div>
            </div>

            {/* Resend vs Brevo Platform Selection */}
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#38bdf8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Key size={16} /> Email Platform Selection (Resend or Brevo)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                {["resend", "brevo"].map((p) => {
                  const active = config.active_provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setConfig({ ...config, active_provider: p })}
                      style={{
                        background: active ? "rgba(56, 189, 248, 0.16)" : "#08162d",
                        border: `1.5px solid ${active ? "#38bdf8" : "rgba(96, 165, 250, 0.2)"}`,
                        borderRadius: 10,
                        padding: 12,
                        textAlign: "left",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase" }}>{p}</div>
                      <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 2 }}>{active ? "ACTIVE PLATFORM" : "Click to Select"}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4 }}>Resend API Key</label>
                  <input type="password" value={config.resend_api_key} onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#7dd3fc", marginBottom: 4 }}>Brevo API Key</label>
                  <input type="password" value={config.brevo_api_key} onChange={(e) => setConfig({ ...config, brevo_api_key: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveGlobalConfig()}
                disabled={loading}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", border: "none", color: "#ffffff", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
              >
                <Save size={15} /> Save All Branding, Domain & Platform Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Reminder with Link, CC/BCC, Domain, Provider & Schedule */}
      {activeTab === "reminder" && (
        <form onSubmit={handleSendPaymentReminder} style={{ background: "#0b1d3e", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: 12, padding: 26, maxWidth: 760 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0", color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={18} /> Payment Reminder with Link, CC/BCC & Schedule
          </h3>
          <p style={{ fontSize: 13, color: "#bae6fd", margin: "0 0 18px 0" }}>
            Send immediately or schedule a payment reminder email with CC/BCC, domain selection, and PayU/Razorpay checkout link.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Client Email (To)</label>
              <input type="email" required value={reminder.to} onChange={(e) => setReminder({ ...reminder, to: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Client / Contact Name</label>
              <input type="text" required value={reminder.userName} onChange={(e) => setReminder({ ...reminder, userName: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>CC (optional)</label>
              <input type="text" value={reminder.cc} onChange={(e) => setReminder({ ...reminder, cc: e.target.value })} placeholder="accounts@client.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>BCC (optional)</label>
              <input type="text" value={reminder.bcc} onChange={(e) => setReminder({ ...reminder, bcc: e.target.value })} placeholder="billing-archive@auditai.in" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Plan</label>
              <select value={reminder.planName} onChange={(e) => setReminder({ ...reminder, planName: e.target.value })} style={inputStyle}>
                <option value="Starter Pilot">Starter Pilot (₹4,999)</option>
                <option value="Growth Professional">Growth Professional (₹9,999)</option>
                <option value="Enterprise Ultra">Enterprise Ultra (₹24,999)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Amount Due (₹)</label>
              <input type="number" required value={reminder.amountDueINR} onChange={(e) => setReminder({ ...reminder, amountDueINR: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Due Date</label>
              <input type="text" required value={reminder.dueDate} onChange={(e) => setReminder({ ...reminder, dueDate: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Send Via Platform</label>
              <select value={reminder.provider} onChange={(e) => setReminder({ ...reminder, provider: e.target.value })} style={inputStyle}>
                <option value="">Default ({config.active_provider.toUpperCase()})</option>
                <option value="resend">Resend</option>
                <option value="brevo">Brevo</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Send From Domain</label>
              <select value={reminder.fromDomain} onChange={(e) => setReminder({ ...reminder, fromDomain: e.target.value })} style={inputStyle}>
                <option value="">Default ({config.selected_domain})</option>
                {config.available_domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Schedule Date/Time (Optional)</label>
              <input type="datetime-local" value={reminder.scheduledAt} onChange={(e) => setReminder({ ...reminder, scheduledAt: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Direct Payment Link URL</label>
            <input type="url" required value={reminder.paymentLink} onChange={(e) => setReminder({ ...reminder, paymentLink: e.target.value })} style={inputStyle} />
          </div>

          <button type="submit" disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f59e0b", color: "#061224", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Send size={15} /> {reminder.scheduledAt ? "Schedule Payment Reminder" : "Send Payment Reminder Now"}
          </button>
        </form>
      )}

      {/* TAB 4: Maintenance & Updates */}
      {activeTab === "maintenance" && (
        <form onSubmit={handleSendMaintenance} style={{ background: "#0b1d3e", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: 12, padding: 26, maxWidth: 760 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0", color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} /> Maintenance & Platform Update Notification
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Recipients (To / ALL)</label>
                <input type="text" required value={maintenance.recipients} onChange={(e) => setMaintenance({ ...maintenance, recipients: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>CC (optional)</label>
                <input type="text" value={maintenance.cc} onChange={(e) => setMaintenance({ ...maintenance, cc: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>BCC (optional)</label>
                <input type="text" value={maintenance.bcc} onChange={(e) => setMaintenance({ ...maintenance, bcc: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Notification Title</label>
              <input type="text" required value={maintenance.title} onChange={(e) => setMaintenance({ ...maintenance, title: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Window</label>
                <input type="text" required value={maintenance.maintenanceWindow} onChange={(e) => setMaintenance({ ...maintenance, maintenanceWindow: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Expected Impact</label>
                <input type="text" required value={maintenance.impact} onChange={(e) => setMaintenance({ ...maintenance, impact: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Platform</label>
                <select value={maintenance.provider} onChange={(e) => setMaintenance({ ...maintenance, provider: e.target.value })} style={inputStyle}>
                  <option value="">Default ({config.active_provider.toUpperCase()})</option>
                  <option value="resend">Resend</option>
                  <option value="brevo">Brevo</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>From Domain</label>
                <select value={maintenance.fromDomain} onChange={(e) => setMaintenance({ ...maintenance, fromDomain: e.target.value })} style={inputStyle}>
                  <option value="">Default ({config.selected_domain})</option>
                  {config.available_domains.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Schedule Date/Time</label>
                <input type="datetime-local" value={maintenance.scheduledAt} onChange={(e) => setMaintenance({ ...maintenance, scheduledAt: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 5 }}>Announcement Details</label>
              <textarea rows={4} required value={maintenance.details} onChange={(e) => setMaintenance({ ...maintenance, details: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", color: "#ffffff", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Megaphone size={15} /> {maintenance.scheduledAt ? "Schedule Platform Update" : "Broadcast Platform Update Now"}
          </button>
        </form>
      )}

      {/* TAB 5: Critical Alerts & Daily Reports */}
      {activeTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#0b1d3e", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              <Shield size={18} /> Instant Critical Alert Automation
            </div>
            <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.6, marginBottom: 16 }}>
              Whenever a <strong>CRITICAL</strong> or <strong>HIGH</strong> compliance flag is mapped, AuditAI sends a structured email directly to the Administrator below.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Administrator Alert Email</label>
              <input type="email" value={config.admin_email} onChange={(e) => setConfig({ ...config, admin_email: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleSaveGlobalConfig()} disabled={loading} style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.4)", color: "#ffffff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Save Admin Email
              </button>
              <button onClick={handleTriggerCriticalAlertTest} disabled={loading} style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#fca5a5", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Send Sample Critical Alert
              </button>
            </div>
          </div>

          <div style={{ background: "#0b1d3e", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#38bdf8", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              <BarChart3 size={18} /> Automated Day-to-Day Executive Reports
            </div>
            <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.6, marginBottom: 16 }}>
              Automatically emails a daily executive digest (Calls, Avg QA Score, Open Flags, Active Agents, Top Performer) to the Administrator.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#08162d", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(96, 165, 250, 0.2)", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Auto-Send Daily Executive Digest</span>
              <button type="button" onClick={() => setConfig({ ...config, daily_report_enabled: !config.daily_report_enabled })} style={{ background: "transparent", border: "none", cursor: "pointer", color: config.daily_report_enabled ? "#34d399" : "#64748b" }}>
                {config.daily_report_enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleSaveGlobalConfig()} disabled={loading} style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.4)", color: "#ffffff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Save Schedule
              </button>
              <button onClick={handleTriggerDailyReport} disabled={loading} style={{ background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", border: "none", color: "#ffffff", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} /> Send Daily Report Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Audit Logs & Scheduled Queue */}
      {activeTab === "logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Scheduled Queue if any */}
          {stats.scheduled && stats.scheduled.filter((j) => j.status === "SCHEDULED").length > 0 && (
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 12px", color: "#fbbf24", fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                <Calendar size={15} /> Pending Scheduled Emails
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.scheduled
                  .filter((j) => j.status === "SCHEDULED")
                  .map((job) => (
                    <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#08162d", padding: "10px 14px", borderRadius: 8, fontSize: 12.5 }}>
                      <div>
                        <strong style={{ color: "#ffffff" }}>{job.payload?.subject}</strong>
                        <div style={{ color: "#7dd3fc", fontSize: 11.5 }}>
                          To: {Array.isArray(job.payload?.to) ? job.payload.to.join(", ") : job.payload?.to} · Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelScheduled(job.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7dd3fc", fontSize: 12, fontWeight: 600 }}>
              <Filter size={14} /> Audit Filters:
            </div>
            <select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value)} style={{ ...inputStyle, width: 150 }}>
              <option value="ALL">Status: All</option>
              <option value="SENT">Sent Successfully</option>
              <option value="FAILED">Failed</option>
              <option value="QUEUED">Scheduled / Queued</option>
            </select>
            <select value={logProviderFilter} onChange={(e) => setLogProviderFilter(e.target.value)} style={{ ...inputStyle, width: 150 }}>
              <option value="ALL">Platform: All</option>
              <option value="resend">Resend</option>
              <option value="brevo">Brevo</option>
            </select>
            <input type="text" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search recipient or subject..." style={{ ...inputStyle, width: 260 }} />
          </div>

          <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(56, 189, 248, 0.08)", borderBottom: "1px solid rgba(96, 165, 250, 0.2)", fontSize: 11.5, color: "#7dd3fc", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 14px" }}>Recipient / CC / BCC</th>
                  <th style={{ padding: "12px 14px" }}>From Domain</th>
                  <th style={{ padding: "12px 14px" }}>Subject</th>
                  <th style={{ padding: "12px 14px" }}>Trigger</th>
                  <th style={{ padding: "12px 14px" }}>Platform</th>
                  <th style={{ padding: "12px 14px" }}>Status</th>
                  <th style={{ padding: "12px 14px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#bae6fd" }}>No email audit records match your filter.</td></tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <tr key={log.id || i} style={{ borderBottom: "1px solid rgba(96, 165, 250, 0.12)", fontSize: 12.5 }}>
                      <td style={{ padding: "11px 14px", color: "#ffffff" }}>
                        <div style={{ fontWeight: 600 }}>{log.recipient}</div>
                        {log.cc && <div style={{ fontSize: 11, color: "#7dd3fc" }}>CC: {log.cc}</div>}
                        {log.bcc && <div style={{ fontSize: 11, color: "#7dd3fc" }}>BCC: {log.bcc}</div>}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#bae6fd", fontSize: 11.5 }}>{log.from_email || config.from_address}</td>
                      <td style={{ padding: "11px 14px", color: "#bae6fd" }}>{log.subject}</td>
                      <td style={{ padding: "11px 14px", color: "#38bdf8", fontFamily: "monospace", fontSize: 11.5 }}>{log.template_type}</td>
                      <td style={{ padding: "11px 14px", textTransform: "uppercase", fontSize: 11.5, color: "#e0f2fe" }}>{log.provider}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: log.status === "SENT" ? "rgba(16, 185, 129, 0.15)" : log.status === "QUEUED" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: log.status === "SENT" ? "#34d399" : log.status === "QUEUED" ? "#fbbf24" : "#f87171",
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#7dd3fc", fontSize: 11.5 }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
