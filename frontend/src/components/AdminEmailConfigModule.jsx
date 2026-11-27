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
} from "lucide-react";
import { emailAdminApi } from "../lib/api";

export default function AdminEmailConfigModule() {
  const [activeTab, setActiveTab] = useState("config"); // 'config' | 'test' | 'reminder' | 'logs'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Config State
  const [config, setConfig] = useState({
    active_provider: "resend",
    resend_api_key: "",
    brevo_api_key: "",
    from_address: "billing@acmetelephony.in",
    from_name: "AuditAI Qalyzer Billing",
  });

  // Test Email State
  const [testEmail, setTestEmail] = useState({
    to: "admin@enterprise.in",
    subject: "AuditAI Platform Test Notification",
    template: "welcome",
  });

  // Payment Reminder State
  const [reminder, setReminder] = useState({
    to: "finance@partner-client.in",
    userName: "Enterprise Billing Team",
    planName: "Growth Professional",
    amountDueINR: 9999,
    dueDate: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
    paymentLink: "http://localhost:3001/?checkout=growth",
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
          active_provider: raw.provider || raw.active_provider || "resend",
          resend_api_key: raw.resend_api_key || (raw.provider === "resend" ? raw.api_key : ""),
          brevo_api_key: raw.brevo_api_key || (raw.provider === "brevo" ? raw.api_key : ""),
          from_address: raw.from_email || raw.from_address || "billing@acmetelephony.in",
          from_name: raw.from_name || "AuditAI Qalyzer Billing",
        });
      }
      if (logsRes.status === "fulfilled" && logsRes.value) {
        setLogs(logsRes.value.data || logsRes.value || []);
      }
    } catch (err) {
      console.error("Failed to load email config", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setLoading(true);
    setFeedback(null);
    try {
      const apiKey = config.active_provider === "resend" ? config.resend_api_key : config.brevo_api_key;
      await emailAdminApi.updateConfig({
        provider: config.active_provider,
        api_key: apiKey,
        from_email: config.from_address,
        from_name: config.from_name,
      });
      setFeedback({ type: "success", message: "Email configuration and credentials saved successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update email config" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail.to) {
      alert("Please enter a recipient email");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await emailAdminApi.sendTestEmail(testEmail);
      if (res.success) {
        setFeedback({ type: "success", message: `Test email dispatched successfully via ${config.active_provider.toUpperCase()}!` });
        const updatedLogs = await emailAdminApi.getLogs();
        setLogs(updatedLogs.data || updatedLogs || []);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to dispatch email" });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Email dispatch failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReminder() {
    if (!reminder.to) {
      alert("Please enter client email");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await emailAdminApi.sendPaymentReminder(reminder);
      if (res.success) {
        setFeedback({ type: "success", message: `Automated payment reminder dispatched to ${reminder.to}!` });
        const updatedLogs = await emailAdminApi.getLogs();
        setLogs(updatedLogs.data || updatedLogs || []);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to send reminder" });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Reminder dispatch failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b1f3d 0%, #08162d 100%)",
          border: "1px solid #1e3a66",
          borderRadius: 14,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(56,189,248,0.15)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={20} color="#38bdf8" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
              Dual Automated Email Engine (Resend & Brevo)
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Automated notifications for welcome verification, payment invoices, subscription renewal reminders, and one-click manual triggers.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: "rgba(56,189,248,0.12)",
            border: "1px solid #38bdf8",
            color: "#38bdf8",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh Status
        </button>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
            color: feedback.type === "success" ? "#34d399" : "#f87171",
            padding: "12px 18px",
            borderRadius: 8,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {feedback.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #1e3a66", paddingBottom: 12 }}>
        {[
          { id: "config", label: "Provider Credentials & Settings", icon: Sliders },
          { id: "test", label: "Send Test Email", icon: Send },
          { id: "reminder", label: "One-Click Payment Reminder", icon: BellRing },
          { id: "logs", label: `Dispatch Delivery Logs (${logs.length})`, icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: isActive ? "#38bdf8" : "rgba(15,36,68,0.6)",
                color: isActive ? "#08162d" : "#cbd5e1",
                border: `1px solid ${isActive ? "#38bdf8" : "#1e3a66"}`,
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Config */}
      {activeTab === "config" && (
        <div style={{ background: "#0b1f3d", border: "1px solid #1e3a66", borderRadius: 12, padding: 24, maxWidth: 800 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#ffffff", fontWeight: 700 }}>
            Active Mail Service & API Credentials
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 8, fontWeight: 600 }}>
                Active Email Provider
              </label>
              <div style={{ display: "flex", gap: 14 }}>
                {["resend", "brevo"].map((p) => {
                  const isSel = config.active_provider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setConfig({ ...config, active_provider: p })}
                      style={{
                        flex: 1,
                        background: isSel ? "rgba(56,189,248,0.15)" : "#08162d",
                        border: `1px solid ${isSel ? "#38bdf8" : "#1e3a66"}`,
                        borderRadius: 8,
                        padding: "14px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: isSel ? "#38bdf8" : "#ffffff", textTransform: "uppercase" }}>
                        {p} API
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        {p === "resend" ? "Resend.com modern email API" : "Brevo (Sendinblue) transactional API"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  From Email Address
                </label>
                <input
                  type="email"
                  value={config.from_address || ""}
                  onChange={(e) => setConfig({ ...config, from_address: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  From Sender Name
                </label>
                <input
                  type="text"
                  value={config.from_name || ""}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                Resend API Key (re_...)
              </label>
              <input
                type="password"
                value={config.resend_api_key || ""}
                onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
                placeholder="re_123456789abcdef"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#08162d",
                  border: "1px solid #1e3a66",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                Brevo API Key (xkeysib-...)
              </label>
              <input
                type="password"
                value={config.brevo_api_key || ""}
                onChange={(e) => setConfig({ ...config, brevo_api_key: e.target.value })}
                placeholder="xkeysib-123456789abcdef"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#08162d",
                  border: "1px solid #1e3a66",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={loading}
              style={{
                marginTop: 8,
                background: "#38bdf8",
                color: "#08162d",
                border: "none",
                borderRadius: 8,
                padding: "12px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Send Test Email */}
      {activeTab === "test" && (
        <div style={{ background: "#0b1f3d", border: "1px solid #1e3a66", borderRadius: 12, padding: 24, maxWidth: 700 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#ffffff", fontWeight: 700 }}>
            Dispatch Test Email Verification
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#94a3b8" }}>
            Verify that your active provider credentials ({config.active_provider.toUpperCase()}) are delivering correctly to actual inboxes.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmail.to}
                onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                placeholder="recipient@example.com"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#08162d",
                  border: "1px solid #1e3a66",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                Template Type
              </label>
              <select
                value={testEmail.template}
                onChange={(e) => setTestEmail({ ...testEmail, template: e.target.value })}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#08162d",
                  border: "1px solid #1e3a66",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="welcome">Welcome to AuditAI Qalyzer</option>
                <option value="invoice">Payment Receipt & Tax Invoice</option>
                <option value="renewal_reminder">Subscription Renewal Notice</option>
                <option value="invite">Team Member Workspace Invitation</option>
              </select>
            </div>

            <button
              onClick={handleSendTest}
              disabled={loading}
              style={{
                background: "#38bdf8",
                color: "#08162d",
                border: "none",
                borderRadius: 8,
                padding: "12px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Send size={16} />
              Dispatch Test Message Now
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: One-Click Payment Reminder */}
      {activeTab === "reminder" && (
        <div style={{ background: "#0b1f3d", border: "1px solid #1e3a66", borderRadius: 12, padding: 24, maxWidth: 700 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#ffffff", fontWeight: 700 }}>
            One-Click Automated Payment Reminder
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#94a3b8" }}>
            Instantly dispatch a branded ISO-compliant payment reminder with embedded PayU/Razorpay checkout link to expiring clients.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Client Contact Email
                </label>
                <input
                  type="email"
                  value={reminder.to}
                  onChange={(e) => setReminder({ ...reminder, to: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Recipient Name / Organization
                </label>
                <input
                  type="text"
                  value={reminder.userName}
                  onChange={(e) => setReminder({ ...reminder, userName: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Subscription Plan
                </label>
                <input
                  type="text"
                  value={reminder.planName}
                  onChange={(e) => setReminder({ ...reminder, planName: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Renewal Amount (₹ INR)
                </label>
                <input
                  type="number"
                  value={reminder.amountDueINR}
                  onChange={(e) => setReminder({ ...reminder, amountDueINR: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSendReminder}
              disabled={loading}
              style={{
                background: "#f59e0b",
                color: "#08162d",
                border: "none",
                borderRadius: 8,
                padding: "12px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <BellRing size={16} />
              Send Automated Payment Reminder Now
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Delivery Logs */}
      {activeTab === "logs" && (
        <div style={{ background: "#0b1f3d", border: "1px solid #1e3a66", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e3a66" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#ffffff", fontWeight: 700 }}>Email Transmission Logs</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Auditable dispatch records across Resend & Brevo transactional endpoints.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#08162d", color: "#94a3b8", borderBottom: "1px solid #1e3a66" }}>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Recipient</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Provider</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                      No transmission logs yet. Send a test email or trigger a reminder to record logs.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #152b4d" }}>
                      <td style={{ padding: "16px 20px", color: "#ffffff" }}>
                        {l.to}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#cbd5e1" }}>
                        {l.subject}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ textTransform: "uppercase", background: "rgba(56,189,248,0.1)", color: "#38bdf8", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {l.provider}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", color: "#94a3b8" }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            background: l.status === "SENT" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            color: l.status === "SENT" ? "#34d399" : "#f87171",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {l.status}
                        </span>
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
