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
  User,
  Sliders,
  BellRing,
  FileEdit,
  Megaphone,
  BarChart3,
  Link2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from "lucide-react";
import { emailAdminApi } from "../lib/api";

export default function AdminEmailConfigModule() {
  const [activeTab, setActiveTab] = useState("templates"); // 'templates' | 'reminder' | 'maintenance' | 'reports' | 'config' | 'logs'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Provider & Global Config State
  const [config, setConfig] = useState({
    active_provider: "resend",
    resend_api_key: "",
    brevo_api_key: "",
    from_address: "notifications@auditai.in",
    from_name: "AuditAI Qalyzer Platform",
    admin_email: "admin@auditai.io",
    daily_report_enabled: true,
    daily_report_hour_utc: 12,
  });

  // Editable Automation Templates Map
  const [templates, setTemplates] = useState({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("enquiry_submitted");
  const [testRecipient, setTestRecipient] = useState("admin@auditai.io");

  // Payment Reminder with Link State
  const [reminder, setReminder] = useState({
    to: "finance@partner-client.in",
    userName: "Enterprise Billing Team",
    planName: "Growth Professional",
    amountDueINR: 9999,
    daysRemaining: 3,
    dueDate: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
    paymentLink: "http://localhost:3001/?checkout=Growth%20Professional",
  });

  // Maintenance / Platform Update Broadcast State
  const [maintenance, setMaintenance] = useState({
    recipients: "ALL",
    title: "Qalyzer v2.1 Speech Diarization & ISO Engine Upgrade",
    maintenanceWindow: "Sunday, 02:00 AM - 02:30 AM IST",
    impact: "Zero call ingestion downtime (Edge Failover Active)",
    details: "We are rolling out enhanced Hinglish speech diarization, faster D1 edge queries, and new ISO 27001 audit trail exports.",
  });

  // Logs State
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cfgRes, logsRes] = await Promise.allSettled([
        emailAdminApi.getConfig(),
        emailAdminApi.getLogs(),
      ]);

      if (cfgRes.status === "fulfilled" && cfgRes.value) {
        const raw = cfgRes.value.data || cfgRes.value;
        setConfig({
          active_provider: raw.provider || "resend",
          resend_api_key: raw.resend_api_key || (raw.provider === "resend" ? raw.api_key : ""),
          brevo_api_key: raw.brevo_api_key || (raw.provider === "brevo" ? raw.api_key : ""),
          from_address: raw.from_email || "notifications@auditai.in",
          from_name: raw.from_name || "AuditAI Qalyzer Platform",
          admin_email: raw.admin_email || "admin@auditai.io",
          daily_report_enabled: raw.daily_report_enabled !== false,
          daily_report_hour_utc: raw.daily_report_hour_utc ?? 12,
        });
        if (raw.templates) {
          setTemplates(raw.templates);
        }
      }
      if (logsRes.status === "fulfilled" && logsRes.value) {
        setLogs(logsRes.value.data || logsRes.value || []);
      }
    } catch (err) {
      console.error("Failed to load email automation config", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleSaveGlobalConfig() {
    setLoading(true);
    try {
      const apiKey = config.active_provider === "resend" ? config.resend_api_key : config.brevo_api_key;
      await emailAdminApi.updateConfig({
        provider: config.active_provider,
        api_key: apiKey,
        resend_api_key: config.resend_api_key,
        brevo_api_key: config.brevo_api_key,
        from_email: config.from_address,
        from_name: config.from_name,
        admin_email: config.admin_email,
        daily_report_enabled: config.daily_report_enabled,
        daily_report_hour_utc: Number(config.daily_report_hour_utc),
      });
      showToast("success", "Provider credentials, Admin Alert email & daily schedule saved!");
    } catch (err) {
      showToast("error", err.message || "Failed to save email config");
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
        },
      });
      showToast("success", `Saved editable format for "${tpl.label}"!`);
    } catch (err) {
      showToast("error", err.message || "Failed to update template");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTemplate(key) {
    const tpl = templates[key];
    if (!tpl) return;
    const nextEnabled = !tpl.enabled;
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: nextEnabled },
    }));
    try {
      await emailAdminApi.updateConfig({
        templateUpdate: { key, enabled: nextEnabled },
      });
      showToast("success", `${tpl.label} ${nextEnabled ? "enabled" : "paused"}.`);
    } catch {}
  }

  async function handleSendTestTemplate(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await emailAdminApi.sendTestEmail({
        to: testRecipient || config.admin_email,
        template: selectedTemplateKey,
      });
      showToast("success", res.message || "Test email sent using your live template format!");
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to send test email");
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
        userName: reminder.userName,
        planName: reminder.planName,
        amountINR: Number(reminder.amountDueINR),
        daysRemaining: Number(reminder.daysRemaining),
        expiryDate: reminder.dueDate,
        paymentLink: reminder.paymentLink,
      });
      showToast("success", res.message || `Payment reminder with link sent to ${reminder.to}!`);
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
      const res = await emailAdminApi.sendMaintenanceUpdate(maintenance);
      showToast("success", res.message || "Maintenance / platform update broadcasted successfully!");
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to broadcast platform update");
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerDailyReport() {
    setLoading(true);
    try {
      const res = await emailAdminApi.sendDailyReportNow({ to: config.admin_email });
      showToast("success", res.message || `Daily executive QA report sent to ${config.admin_email}!`);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to send daily report");
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerCriticalAlertTest() {
    setLoading(true);
    try {
      const res = await emailAdminApi.sendTestEmail({
        to: config.admin_email,
        template: "critical_alert",
      });
      showToast("success", res.message || `Critical alert preview dispatched to ${config.admin_email}!`);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to trigger alert preview");
    } finally {
      setLoading(false);
    }
  }

  const activeTemplate = templates[selectedTemplateKey];
  const templateKeys = Object.keys(templates);

  const inputStyle = {
    width: "100%",
    background: "#08162d",
    border: "1px solid rgba(96, 165, 250, 0.3)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#ffffff",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
            <Mail size={13} /> Automated Email Studio & Trigger Engine
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0", fontFamily: "Space Grotesk", color: "#ffffff" }}>
            Email Automation & Editable Formats
          </h1>
          <p style={{ fontSize: 13.5, color: "#bae6fd", margin: 0 }}>
            Customize templates & manage automated triggers for Enquiries, Payments, Reminders, Client Approvals, Maintenance, Critical Flags, and Daily Reports.
          </p>
        </div>

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
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Sync Logs & Settings
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
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
          { id: "templates", label: "Automation & Editable Formats", icon: FileEdit },
          { id: "reminder", label: "Payment Reminder + Link", icon: Link2 },
          { id: "maintenance", label: "Maintenance / Updates", icon: Megaphone },
          { id: "reports", label: "Critical Alerts & Daily Reports", icon: BarChart3 },
          { id: "config", label: "Provider Keys (Resend / Brevo)", icon: Key },
          { id: "logs", label: `Delivery Logs (${logs.length})`, icon: Clock },
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
                padding: "9px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Editable Email Templates & Automation Triggers */}
      {activeTab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
          {/* Trigger Selector List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{tpl.label}</div>
                    <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 2 }}>{tpl.recipientType}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTemplate(key);
                    }}
                    title={tpl.enabled ? "Disable Trigger" : "Enable Trigger"}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: tpl.enabled ? "#34d399" : "#64748b", padding: 2 }}
                  >
                    {tpl.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Template Editor Panel */}
          {activeTemplate ? (
            <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", textTransform: "uppercase" }}>
                    Trigger: {activeTemplate.key}
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: "8px 0 4px" }}>{activeTemplate.label}</h3>
                  <p style={{ fontSize: 12.5, color: "#bae6fd", margin: 0 }}>{activeTemplate.description}</p>
                </div>

                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: activeTemplate.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.2)",
                  color: activeTemplate.enabled ? "#34d399" : "#94a3b8",
                }}>
                  {activeTemplate.enabled ? "AUTO-SEND ACTIVE" : "PAUSED"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6, fontWeight: 600 }}>
                    Editable Subject Line
                  </label>
                  <input
                    type="text"
                    value={activeTemplate.subject}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateKey]: { ...prev[selectedTemplateKey], subject: e.target.value },
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#7dd3fc", fontWeight: 600 }}>
                      Editable Email HTML / Body Format
                    </label>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {(activeTemplate.variables || []).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setTemplates((prev) => ({
                              ...prev,
                              [selectedTemplateKey]: {
                                ...prev[selectedTemplateKey],
                                body: prev[selectedTemplateKey].body + ` {{${v}}}`,
                              },
                            }))
                          }
                          style={{
                            fontSize: 10.5,
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                            borderRadius: 4,
                            padding: "2px 7px",
                            cursor: "pointer",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={10}
                    value={activeTemplate.body}
                    onChange={(e) =>
                      setTemplates((prev) => ({
                        ...prev,
                        [selectedTemplateKey]: { ...prev[selectedTemplateKey], body: e.target.value },
                      }))
                    }
                    style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingTop: 10, borderTop: "1px solid rgba(96, 165, 250, 0.18)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="Test recipient email..."
                      style={{ ...inputStyle, width: 220, padding: "8px 10px" }}
                    />
                    <button
                      type="button"
                      onClick={handleSendTestTemplate}
                      disabled={loading}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38bdf8",
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <Send size={13} /> Send Preview Test
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveTemplate(selectedTemplateKey)}
                    disabled={loading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Save size={15} /> Save Editable Template
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#bae6fd", padding: 30 }}>Loading templates...</div>
          )}
        </div>
      )}

      {/* TAB 2: Payment Reminder with Payment Link */}
      {activeTab === "reminder" && (
        <form onSubmit={handleSendPaymentReminder} style={{ background: "#0b1d3e", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: 12, padding: 26, maxWidth: 680 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0", color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={18} /> Dispatch Payment Reminder with Direct Checkout Link
          </h3>
          <p style={{ fontSize: 13, color: "#bae6fd", margin: "0 0 20px 0" }}>
            Sends a branded invoice reminder containing an interactive payment link for PayU or Razorpay checkout.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Client Email</label>
              <input type="email" required value={reminder.to} onChange={(e) => setReminder({ ...reminder, to: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Client / Contact Name</label>
              <input type="text" required value={reminder.userName} onChange={(e) => setReminder({ ...reminder, userName: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Subscription Plan</label>
              <select value={reminder.planName} onChange={(e) => setReminder({ ...reminder, planName: e.target.value })} style={inputStyle}>
                <option value="Starter Pilot">Starter Pilot (₹4,999)</option>
                <option value="Growth Professional">Growth Professional (₹9,999)</option>
                <option value="Enterprise Ultra">Enterprise Ultra (₹24,999)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Amount Due (₹ INR)</label>
              <input type="number" required value={reminder.amountDueINR} onChange={(e) => setReminder({ ...reminder, amountDueINR: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Due Date</label>
              <input type="text" required value={reminder.dueDate} onChange={(e) => setReminder({ ...reminder, dueDate: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Direct Payment Link URL</label>
            <input type="url" required value={reminder.paymentLink} onChange={(e) => setReminder({ ...reminder, paymentLink: e.target.value })} style={inputStyle} />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#f59e0b",
              color: "#061224",
              border: "none",
              borderRadius: 8,
              padding: "11px 22px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Send size={15} /> {loading ? "Sending..." : "Send Payment Reminder Email"}
          </button>
        </form>
      )}

      {/* TAB 3: Maintenance / Platform Update Broadcast */}
      {activeTab === "maintenance" && (
        <form onSubmit={handleSendMaintenance} style={{ background: "#0b1d3e", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: 12, padding: 26, maxWidth: 680 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0", color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} /> Maintenance & Platform Update Notification
          </h3>
          <p style={{ fontSize: 13, color: "#bae6fd", margin: "0 0 20px 0" }}>
            Broadcast scheduled maintenance windows, security patches, or feature announcements to all active clients or specific emails.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Recipients ("ALL" for all active clients, or comma-separated emails)</label>
              <input type="text" required value={maintenance.recipients} onChange={(e) => setMaintenance({ ...maintenance, recipients: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Notification Title</label>
              <input type="text" required value={maintenance.title} onChange={(e) => setMaintenance({ ...maintenance, title: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Maintenance / Rollout Window</label>
                <input type="text" required value={maintenance.maintenanceWindow} onChange={(e) => setMaintenance({ ...maintenance, maintenanceWindow: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Expected Impact</label>
                <input type="text" required value={maintenance.impact} onChange={(e) => setMaintenance({ ...maintenance, impact: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Detailed Announcement Message</label>
              <textarea rows={4} required value={maintenance.details} onChange={(e) => setMaintenance({ ...maintenance, details: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "11px 22px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Megaphone size={15} /> {loading ? "Broadcasting..." : "Send Platform Update Notification"}
          </button>
        </form>
      )}

      {/* TAB 4: Critical Alerts & Day-to-Day Executive Reports */}
      {activeTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Critical Alerts Box */}
          <div style={{ background: "#0b1d3e", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              <Shield size={18} /> Instant Critical Alert Automation
            </div>
            <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.6, marginBottom: 16 }}>
              Whenever the Flag Intelligence Engine maps a <strong>CRITICAL</strong> or <strong>HIGH</strong> compliance alert, AuditAI instantly emails a structured breakdown (Call ID, Agent, Evidence, Action) to the Administrator email below.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Administrator Alert Email</label>
              <input type="email" value={config.admin_email} onChange={(e) => setConfig({ ...config, admin_email: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSaveGlobalConfig}
                disabled={loading}
                style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.4)", color: "#ffffff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Save Admin Email
              </button>
              <button
                onClick={handleTriggerCriticalAlertTest}
                disabled={loading}
                style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#fca5a5", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Send Sample Critical Alert
              </button>
            </div>
          </div>

          {/* Daily Reports Scheduler Box */}
          <div style={{ background: "#0b1d3e", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#38bdf8", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              <BarChart3 size={18} /> Automated Day-to-Day Reports
            </div>
            <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.6, marginBottom: 16 }}>
              Automatically aggregates total calls audited, average QA score, critical flags count, active agents, and top performer into a daily digest emailed to the Administrator.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#08162d", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(96, 165, 250, 0.2)", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Auto-Send Daily Executive Digest</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, daily_report_enabled: !config.daily_report_enabled })}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: config.daily_report_enabled ? "#34d399" : "#64748b" }}
              >
                {config.daily_report_enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSaveGlobalConfig}
                disabled={loading}
                style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.4)", color: "#ffffff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Save Schedule
              </button>
              <button
                onClick={handleTriggerDailyReport}
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", border: "none", color: "#ffffff", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Sparkles size={14} /> Send Daily Report Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Provider Keys */}
      {activeTab === "config" && (
        <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, padding: 26, maxWidth: 680 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 18px 0", color: "#38bdf8" }}>
            Active Email Delivery Provider (Resend & Brevo)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
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
                    padding: 14,
                    textAlign: "left",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase" }}>{p}</div>
                  <div style={{ fontSize: 11.5, color: "#7dd3fc", marginTop: 4 }}>
                    {p === "resend" ? "Modern Developer Email API" : "Transactional SMTP & Campaigns"}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Resend API Key</label>
              <input type="password" value={config.resend_api_key} onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>Brevo API Key</label>
              <input type="password" value={config.brevo_api_key} onChange={(e) => setConfig({ ...config, brevo_api_key: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>From Email</label>
                <input type="email" value={config.from_address} onChange={(e) => setConfig({ ...config, from_address: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#7dd3fc", marginBottom: 6 }}>From Name</label>
                <input type="text" value={config.from_name} onChange={(e) => setConfig({ ...config, from_name: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <button
                onClick={handleSaveGlobalConfig}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "11px 22px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Save size={15} /> Save Provider Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Delivery Logs */}
      {activeTab === "logs" && (
        <div style={{ background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(56, 189, 248, 0.08)", borderBottom: "1px solid rgba(96, 165, 250, 0.2)", fontSize: 11.5, color: "#7dd3fc", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Recipient</th>
                <th style={{ padding: "12px 16px" }}>Subject</th>
                <th style={{ padding: "12px 16px" }}>Trigger</th>
                <th style={{ padding: "12px 16px" }}>Provider</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#bae6fd" }}>No email logs dispatched yet.</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: "1px solid rgba(96, 165, 250, 0.12)", fontSize: 13 }}>
                    <td style={{ padding: "12px 16px", color: "#ffffff", fontWeight: 600 }}>{log.recipient}</td>
                    <td style={{ padding: "12px 16px", color: "#bae6fd" }}>{log.subject}</td>
                    <td style={{ padding: "12px 16px", color: "#38bdf8", fontFamily: "monospace", fontSize: 12 }}>{log.template_type}</td>
                    <td style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: 11.5, color: "#e0f2fe" }}>{log.provider}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: log.status === "SENT" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: log.status === "SENT" ? "#34d399" : "#f87171",
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#7dd3fc", fontSize: 12 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
