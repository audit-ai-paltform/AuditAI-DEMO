import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, X, ArrowUpRight, Bot, Zap, Compass,
  CheckCircle2, Users, FileSpreadsheet, Shield, Activity, LayoutGrid
} from "lucide-react";
import {
  aiApi, emailAdminApi, agentsApi, adminPortalApi,
  userActivityApi, reportsApi, dashboardApi, callsApi,
  homeCmsApi, billingApi
} from "../lib/api";

const SCREEN_CATALOG = [
  { id: "admin_access", label: "Users & Access", keywords: ["user", "users", "employee", "employees", "administration", "admin", "role", "roles", "access", "staff"] },
  { id: "admin_activity", label: "User Activity", keywords: ["activity", "online", "session", "sessions", "login", "heartbeat"] },
  { id: "reports", label: "Audit Reports", keywords: ["report", "reports", "audit report", "daily", "weekly", "monthly", "executive"] },
  { id: "scores", label: "Call Scores", keywords: ["score", "scores", "call", "calls", "transcript", "transcripts", "revalidation", "re-audit", "reaudit"] },
  { id: "dashboard", label: "Audit Dashboard", keywords: ["dashboard", "overview", "alert", "alerts", "critical", "flag", "flags", "kpi"] },
  { id: "agents", label: "Agent Mapping", keywords: ["agent", "agents", "mapping", "inactive", "sweep", "disable"] },
  { id: "sop_parameters", label: "SOP & Parameters", keywords: ["sop", "parameter", "parameters", "rubric", "rules", "upload"] },
  { id: "qctools", label: "7 QC Tools", keywords: ["qc", "pareto", "fishbone", "control chart", "histogram"] },
  { id: "csvupload", label: "CSV Upload", keywords: ["csv", "import", "bulk"] },
  { id: "audittrail", label: "Audit Trail", keywords: ["trail", "history", "log", "logs"] },
  { id: "sales_forecasting", label: "Sales Forecasting", keywords: ["forecast", "forecasting", "revenue", "pipeline", "deal"] },
  { id: "data_fishing", label: "Data Fishing", keywords: ["fishing", "query", "analytics"] },
  { id: "knowledge_hub", label: "Knowledge Hub", keywords: ["knowledge", "product", "products", "docs"] },
  { id: "crm_setup", label: "CRM Setup", keywords: ["crm", "knowlarity", "webhook", "webhooks", "telephony"] },
  { id: "settings", label: "Audit Configuration", keywords: ["setting", "settings", "config", "configuration"] },
  { id: "cloudflare_db", label: "Cloudflare D1 & R2", keywords: ["cloudflare", "d1", "r2", "database", "storage"] },
  { id: "admin_subscriptions", label: "Billing & Gateways", keywords: ["billing", "subscription", "subscriptions", "payu", "razorpay", "payment", "invoice", "invoices"] },
  { id: "admin_enquiries", label: "Inbound Enquiries", keywords: ["enquiry", "enquiries", "lead", "leads", "demo"] },
  { id: "admin_email", label: "Email Studio", keywords: ["email", "emails", "template", "templates", "smtp", "resend", "brevo"] },
  { id: "home_cms", label: "Home Page CMS", keywords: ["cms", "home", "homepage", "landing", "clients with us"] },
  { id: "admin_team", label: "Team Profiles", keywords: ["team", "leadership", "founder"] },
  { id: "admin_search", label: "Universal Search", keywords: ["search", "find", "lookup"] },
];

export default function AskAuditAIChatbot({ currentUser, allowedTabs = [], onNavigate, onActionExecuted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showAllScreens, setShowAllScreens] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: `Hi ${currentUser?.full_name || "there"}! I'm **Ask AuditAI** (Active). Click any keyword below or ask me about **users/employees, audit reports, call scores, agents, enquiries, billing**, or any screen—I'll fetch live details right here and take you straight there.`,
      suggestions: ["Users & Employees", "Audit Reports", "Call Scores", "Agent Mapping", "Inbound Enquiries", "Billing & Gateways"],
    },
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const visibleScreens = SCREEN_CATALOG.filter(
    (s) => allowedTabs.length === 0 || allowedTabs.includes(s.id) || s.id === "dashboard"
  );

  function matchScreenFromQuery(q) {
    const low = q.toLowerCase();
    for (const s of SCREEN_CATALOG) {
      if (low.includes(s.label.toLowerCase()) || s.keywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(low))) {
        return s;
      }
    }
    return null;
  }

  async function fetchLiveContextCards(q, matchedScreen) {
    const low = q.toLowerCase();
    const cards = [];
    let summaryText = "";

    try {
      // 1. Users / Employees / Administration / Access
      if (
        /\b(user|users|employee|employees|administration|admin|admins|role|roles|staff|member|members)\b/i.test(low) ||
        matchedScreen?.id === "admin_access" ||
        matchedScreen?.id === "admin_activity"
      ) {
        const [uRes, aRes] = await Promise.allSettled([
          adminPortalApi.getUsers(),
          userActivityApi.list(),
        ]);
        const usersList = uRes.status === "fulfilled" ? (uRes.value?.data || uRes.value?.users || uRes.value || []) : [];
        const actList = aRes.status === "fulfilled" ? (aRes.value?.data || aRes.value?.sessions || aRes.value || []) : [];
        const arr = Array.isArray(usersList) ? usersList : [];
        const activeCount = arr.filter((u) => (u.status || "").toUpperCase() === "ACTIVE").length;
        const onlineCount = Array.isArray(actList) ? actList.filter((s) => s.status === "ONLINE").length : 0;

        summaryText = `Found **${arr.length} Users & Employees** (${activeCount} active accounts, ${onlineCount} online right now).`;
        arr.slice(0, 5).forEach((u) => {
          cards.push({
            title: u.name || u.full_name || u.email,
            subtitle: `${u.email || ""} · Role: ${(u.role || "user").toUpperCase()}`,
            badge: u.status || "ACTIVE",
            badgeTone: (u.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "green" : "red",
            targetTab: "admin_access",
          });
        });
      }
      // 2. Audit Reports (Daily / Weekly / Monthly)
      else if (/\b(report|reports|daily|weekly|monthly|executive)\b/i.test(low) || matchedScreen?.id === "reports") {
        const [rRes, dRes] = await Promise.allSettled([
          reportsApi.list(),
          dashboardApi.getSummary(),
        ]);
        const reps = rRes.status === "fulfilled" ? (rRes.value?.data || rRes.value?.reports || rRes.value || []) : [];
        const dash = dRes.status === "fulfilled" ? (dRes.value?.data || dRes.value || {}) : {};
        const repArr = Array.isArray(reps) ? reps : [];

        summaryText = `**Audit Reports Summary**: ${repArr.length} generated reports available. Workspace avg score: **${dash.avgScore ?? dash.average_score ?? 86}%** across **${dash.totalCalls ?? dash.total_calls ?? 0}** audited interactions.`;
        repArr.slice(0, 4).forEach((r) => {
          cards.push({
            title: r.title || r.report_type || r.period || "Audit Report",
            subtitle: `${r.period || r.frequency || "Scheduled"} · ${r.created_at ? new Date(r.created_at).toLocaleDateString() : "Ready"}`,
            badge: r.status || "READY",
            badgeTone: "green",
            targetTab: "reports",
          });
        });
        if (cards.length === 0) {
          cards.push({
            title: "Daily, Weekly & Monthly Reports",
            subtitle: "Generate and download PDF/CSV executive audit summaries",
            badge: "READY",
            badgeTone: "green",
            targetTab: "reports",
          });
        }
      }
      // 3. Call Scores / Calls / Alerts / Flags
      else if (
        /\b(call|calls|score|scores|transcript|alert|alerts|critical|flag|flags|audit|audits)\b/i.test(low) ||
        matchedScreen?.id === "scores" ||
        matchedScreen?.id === "dashboard"
      ) {
        const [cRes, dRes] = await Promise.allSettled([
          callsApi.list({ limit: 5 }),
          dashboardApi.getSummary(),
        ]);
        const callList = cRes.status === "fulfilled" ? (cRes.value?.data || cRes.value?.calls || cRes.value || []) : [];
        const dash = dRes.status === "fulfilled" ? (dRes.value?.data || dRes.value || {}) : {};
        const cArr = Array.isArray(callList) ? callList : [];

        summaryText = `**Audit & Call Scores**: ${dash.totalCalls ?? cArr.length} calls tracked · Avg Score **${dash.avgScore ?? 85}%** · Critical Flags: **${dash.criticalFlags ?? 0}**.`;
        cArr.slice(0, 4).forEach((c) => {
          const sc = typeof c.score === "number" ? c.score : 85;
          cards.push({
            title: `${c.agent_name || c.agent || "Agent"} — ${c.customer_name || c.phone || c.id || "Call"}`,
            subtitle: `Channel: ${c.channel || "Voice"} · Status: ${c.status || "COMPLETED"}`,
            badge: `${sc}%`,
            badgeTone: sc >= 75 ? "green" : sc >= 50 ? "amber" : "red",
            targetTab: "scores",
          });
        });
      }
      // 4. Agents / Mapping / 24-48h Sweep
      else if (/\b(agent|agents|mapping|inactive|sweep)\b/i.test(low) || matchedScreen?.id === "agents") {
        const agRes = await agentsApi.list();
        const agList = agRes?.data || agRes?.agents || agRes || [];
        const agArr = Array.isArray(agList) ? agList : [];
        const activeAg = agArr.filter((a) => (a.status || "ACTIVE").toUpperCase() === "ACTIVE").length;

        summaryText = `**Agent Mapping**: ${agArr.length} total agents (${activeAg} active, ${agArr.length - activeAg} disabled/inactive).`;
        agArr.slice(0, 5).forEach((a) => {
          const st = (a.status || "ACTIVE").toUpperCase();
          cards.push({
            title: a.name || a.agent_name || a.email || "Agent",
            subtitle: `Process: ${a.process_name || a.process || "Inbound QA"} · Ext: ${a.extension || a.knowlarity_id || "—"}`,
            badge: st,
            badgeTone: st === "ACTIVE" ? "green" : "red",
            targetTab: "agents",
          });
        });
      }
      // 5. Enquiries / Leads
      else if (/\b(enquiry|enquiries|lead|leads|client|clients)\b/i.test(low) || matchedScreen?.id === "admin_enquiries") {
        const eRes = await homeCmsApi.listEnquiries();
        const eList = eRes?.data || eRes?.enquiries || eRes || [];
        const eArr = Array.isArray(eList) ? eList : [];
        summaryText = `**Inbound Enquiries**: ${eArr.length} customer/enterprise enquiries recorded.`;
        eArr.slice(0, 4).forEach((enq) => {
          cards.push({
            title: `${enq.name || enq.full_name || "Prospect"} (${enq.company || "Enterprise"})`,
            subtitle: `${enq.email || ""} · Plan: ${enq.selected_plan || "Custom"}`,
            badge: enq.status || "NEW",
            badgeTone: enq.status === "APPROVED" ? "green" : "amber",
            targetTab: "admin_enquiries",
          });
        });
      }
      // 6. Billing / Subscriptions / Gateways
      else if (/\b(billing|subscription|subscriptions|payu|razorpay|payment|invoice)\b/i.test(low) || matchedScreen?.id === "admin_subscriptions" || matchedScreen?.id === "payu_billing") {
        const sRes = await billingApi.getSubscriptions();
        const subs = sRes?.data || sRes?.subscriptions || sRes || [];
        const sArr = Array.isArray(subs) ? subs : [];
        summaryText = `**Billing & Gateways**: ${sArr.length} active subscription records across PayU & Razorpay.`;
        sArr.slice(0, 4).forEach((s) => {
          cards.push({
            title: `${s.company_name || s.tenant_id || "Enterprise"} — ${s.plan_name || "Enterprise Tier"}`,
            subtitle: `Gateway: ${s.gateway || "PayU"} · Amount: ₹${s.amount || "49,999"}`,
            badge: s.status || "ACTIVE",
            badgeTone: "green",
            targetTab: "admin_subscriptions",
          });
        });
      }
    } catch {
      // Fallback gracefully if an endpoint is unreachable
    }

    return { cards, summaryText };
  }

  async function handleSend(textOverride, options = {}) {
    const query = (textOverride || input).trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { id: `u_${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const matchedScreen = options.targetScreen || matchScreenFromQuery(query);
      const [{ cards, summaryText }, aiRes] = await Promise.all([
        fetchLiveContextCards(query, matchedScreen),
        aiApi.askAuditAI({
          message: query,
          role: currentUser?.role || "super_admin",
          allowedTabs,
          context: { userName: currentUser?.full_name, email: currentUser?.email },
        }).catch(() => null),
      ]);

      const data = aiRes?.data || aiRes || {};
      let actionOutcome = "";

      if (data.action === "send_daily_report") {
        try {
          await emailAdminApi.sendDailyReportNow({});
          actionOutcome = "Daily Executive Report email has been dispatched.";
        } catch {}
      } else if (data.action === "disable_inactive_agents") {
        try {
          const sweep = await agentsApi.runInactivitySweep({});
          actionOutcome = `24–48h Sweep complete: checked ${sweep?.checkedCount || 0} agents, auto-disabled ${sweep?.disabledCount || 0} inactive agents.`;
          if (onActionExecuted) onActionExecuted("refresh_agents");
        } catch {}
      }

      const targetTab = options.autoNavigate
        ? (options.targetScreen?.id || data.navigateTo || matchedScreen?.id)
        : (data.navigateTo || (/\b(open|go to|show|navigate|switch to)\b/i.test(query) ? matchedScreen?.id : null));

      if (targetTab && onNavigate) {
        onNavigate(targetTab);
      }

      const finalReply =
        summaryText ||
        data.reply ||
        (matchedScreen
          ? `Here are the details for **${matchedScreen.label}**. Click the button below to open this screen directly.`
          : "I'm ready to help! Click any keyword or ask about Users, Audit Reports, Call Scores, Agents, Enquiries, or Billing.");

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: "bot",
          text: finalReply,
          cards,
          actionTab: matchedScreen?.id || data.navigateTo || null,
          actionTabLabel: matchedScreen?.label || (data.navigateTo ? data.navigateTo.replace(/_/g, " ") : null),
          navigateTo: targetTab,
          actionOutcome,
          suggestions: data.suggestedFollowUps?.length
            ? data.suggestedFollowUps
            : ["Users & Employees", "Audit Reports", "Call Scores", "Agent Mapping"],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b_err_${Date.now()}`,
          sender: "bot",
          text: "I ran into a quick connection hiccup, but you can click any screen chip below to open it directly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes auditAiPulse {
          0% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.45); }
          70% { box-shadow: 0 0 0 12px rgba(2, 132, 199, 0); }
          100% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0); }
        }
        @keyframes feddyFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-7px) rotate(-2deg) scale(1.04); }
        }
        @keyframes statusBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.25); }
        }
      `}</style>

      {/* Floating Animated & Alpha-Transparent Character Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ask AuditAI Assistant (Active)"
          aria-label="Open Ask AuditAI Assistant"
          style={{
            position: "fixed",
            bottom: 22,
            right: 24,
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              color: "#0F172A",
              border: "1px solid #BAE6FD",
              borderRadius: 9999,
              padding: "7px 14px",
              boxShadow: "0 8px 24px rgba(2, 132, 199, 0.16)",
              textAlign: "left",
              animation: "auditAiPulse 2.8s infinite",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#0F172A", lineHeight: 1.15 }}>
                Ask AuditAI
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#ECFDF5", color: "#059669", fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", animation: "statusBlink 1.8s infinite" }} />
                ACTIVE
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#0284C7", fontWeight: 700, marginTop: 2 }}>
              AI Copilot & Navigator
            </div>
          </div>

          <div
            style={{
              width: 68,
              height: 80,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              animation: "feddyFloat 3.2s ease-in-out infinite",
              filter: "drop-shadow(0 8px 16px rgba(2, 132, 199, 0.30))",
            }}
          >
            {!avatarError ? (
              <img
                src="/feddy-avatar.png"
                alt="Ask AuditAI Avatar"
                onError={() => setAvatarError(true)}
                style={{
                  width: 66,
                  height: 78,
                  objectFit: "contain",
                  background: "transparent",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={26} />
              </div>
            )}
            <span style={{ position: "absolute", bottom: 6, right: 6, width: 12, height: 12, borderRadius: "50%", background: "#059669", border: "2px solid #FFFFFF", animation: "statusBlink 1.8s infinite" }} />
          </div>
        </button>
      )}

      {/* Open Assistant Drawer */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 420,
            maxWidth: "calc(100vw - 28px)",
            height: 590,
            maxHeight: "calc(100vh - 40px)",
            zIndex: 9995,
            background: "#FFFFFF",
            border: "1.5px solid #BAE6FD",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: "#0F172A",
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
            padding: "12px 16px",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 48, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", animation: "feddyFloat 3.2s ease-in-out infinite" }}>
                {!avatarError ? (
                  <img
                    src="/feddy-avatar.png"
                    alt="Ask AuditAI Avatar"
                    onError={() => setAvatarError(true)}
                    style={{ width: 40, height: 46, objectFit: "contain", background: "transparent", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.22))" }}
                  />
                ) : (
                  <Bot size={22} color="#FFFFFF" />
                )}
                <span style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#34D399", border: "2px solid #0284C7" }} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, color: "#0F172A" }}>
                  Ask AuditAI <Sparkles size={13} />
                  <span style={{ fontSize: 9.5, fontWeight: 800, background: "rgba(16, 185, 129, 0.25)", border: "1px solid rgba(110, 231, 183, 0.6)", color: "#ECFDF5", padding: "1px 7px", borderRadius: 999 }}>
                    ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#0F172A" }}>
                  Role: {(currentUser?.role || "super_admin").replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setShowAllScreens((v) => !v)}
                title="Browse All Pages & Features"
                style={{ background: "rgba(255,255,255,0.20)", border: "none", borderRadius: 8, padding: "5px 9px", color: "#0F172A", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}
              >
                <LayoutGrid size={13} /> Screens
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: "rgba(255,255,255,0.20)", border: "none", borderRadius: 8, width: 28, height: 28, color: "#0F172A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Screen & Feature Navigator Drawer */}
          {showAllScreens && (
            <div style={{ padding: "10px 12px", background: "#F8FAFC", borderBottom: "1px solid #BAE6FD", maxHeight: 160, overflowY: "auto" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "#0284C7", textTransform: "uppercase", marginBottom: 6 }}>
                Click any screen or keyword to view details & navigate:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {visibleScreens.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setShowAllScreens(false);
                      handleSend(sc.label, { targetScreen: sc, autoNavigate: true });
                    }}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #BAE6FD",
                      color: "#0F172A",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Compass size={11} color="#0284C7" /> {sc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "90%",
                    padding: "10px 13px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    background: m.sender === "user" ? "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)" : "#FFFFFF",
                    color: m.sender === "user" ? "#FFFFFF" : "#0F172A",
                    border: m.sender === "user" ? "none" : "1px solid #BAE6FD",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div>{m.text}</div>

                  {/* Live Data Entity Cards inside Chatbot */}
                  {m.cards && m.cards.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {m.cards.map((card, cIdx) => {
                        const toneColor = card.badgeTone === "green" ? "#059669" : card.badgeTone === "red" ? "#DC2626" : "#D97706";
                        const toneBg = card.badgeTone === "green" ? "#ECFDF5" : card.badgeTone === "red" ? "#FEF2F2" : "#FFFBEB";
                        return (
                          <div
                            key={cIdx}
                            onClick={() => card.targetTab && onNavigate && onNavigate(card.targetTab)}
                            style={{
                              background: "#F8FAFC",
                              border: "1px solid #DBEAFE",
                              borderRadius: 8,
                              padding: "7px 10px",
                              cursor: card.targetTab ? "pointer" : "default",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {card.title}
                              </div>
                              <div style={{ fontSize: 10.5, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {card.subtitle}
                              </div>
                            </div>
                            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: toneColor, background: toneBg, padding: "2px 7px", borderRadius: 999 }}>
                              {card.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Clickable Screen Navigation Pill */}
                  {(m.actionTab || m.navigateTo) && (
                    <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(m.navigateTo || m.actionTab)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#E0F2FE",
                          color: "#0284C7",
                          border: "1px solid #BAE6FD",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Compass size={12} />
                        {m.navigateTo ? `Opened: ${m.actionTabLabel || m.navigateTo}` : `Open ${m.actionTabLabel || m.actionTab}`}
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  )}

                  {m.actionOutcome && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, color: "#059669", fontSize: 11.5, fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> {m.actionOutcome}
                    </div>
                  )}
                </div>

                {m.suggestions && m.suggestions.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #BAE6FD",
                          color: "#0284C7",
                          borderRadius: 14,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Zap size={10} color="#0284C7" /> {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: 12, color: "#0284C7", fontWeight: 600, padding: "4px 8px" }}>
                Ask AuditAI is thinking & fetching live data...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ padding: 10, background: "#FFFFFF", borderTop: "1px solid #BAE6FD", display: "flex", gap: 8 }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type any keyword (users, reports, calls, billing)..."
              style={{
                flex: 1,
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 12.5,
                color: "#0F172A",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                padding: "0 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
