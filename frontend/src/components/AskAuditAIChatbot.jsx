import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, ArrowUpRight, Bot, Zap, Compass, CheckCircle2 } from "lucide-react";
import { aiApi, emailAdminApi, agentsApi } from "../lib/api";

export default function AskAuditAIChatbot({ currentUser, allowedTabs = [], onNavigate, onActionExecuted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: `Hi ${currentUser?.full_name || "there"}! I'm **Ask AuditAI**. I can answer any question, redirect you directly to any screen in your **${(currentUser?.role || "super_admin").replace(/_/g, " ")}** dashboard, or run admin tasks for you.`,
      suggestions: ["Open Call Scores", "Go to CRM Setup", "Run 24-48h Agent Sweep", "Send Daily Report"],
    },
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function handleSend(textOverride) {
    const query = (textOverride || input).trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { id: `u_${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiApi.askAuditAI({
        message: query,
        role: currentUser?.role || "super_admin",
        allowedTabs,
        context: { userName: currentUser?.full_name, email: currentUser?.email },
      });

      const data = res?.data || res || {};
      let actionOutcome = "";

      // Execute agentic action if authorized and requested
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

      // Direct dashboard navigation
      if (data.navigateTo && onNavigate) {
        onNavigate(data.navigateTo);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: "bot",
          text: data.reply || "Done!",
          navigateTo: data.navigateTo,
          actionOutcome,
          suggestions: data.suggestedFollowUps || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b_err_${Date.now()}`,
          sender: "bot",
          text: "I ran into a quick connection hiccup, but you can still ask me to open any tab like Call Scores, CRM Setup, or Reports.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes auditAiFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes auditAiPulse {
          0% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(2, 132, 199, 0); }
          100% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0); }
        }
      `}</style>

      {/* Floating Animated Character Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ask AuditAI Assistant"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
            color: "#ffffff",
            border: "2px solid #bae6fd",
            borderRadius: 9999,
            padding: "10px 18px 10px 12px",
            cursor: "pointer",
            animation: "auditAiFloat 3.4s ease-in-out infinite, auditAiPulse 2.6s infinite",
            boxShadow: "0 10px 30px rgba(2, 132, 199, 0.45)",
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#ffffff",
            color: "#0284c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}>
            <Bot size={20} />
            <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#16a34a", border: "2px solid #ffffff" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "Space Grotesk", lineHeight: 1.1 }}>Ask AuditAI</div>
            <div style={{ fontSize: 10, color: "#0F172A", fontWeight: 600 }}>AI Copilot & Navigator</div>
          </div>
        </button>
      )}

      {/* Open Assistant Drawer */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 390,
            maxWidth: "calc(100vw - 32px)",
            height: 540,
            maxHeight: "calc(100vh - 48px)",
            zIndex: 9995,
            background: "#ffffff",
            border: "1.5px solid #bae6fd",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(2, 132, 199, 0.22)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "Inter, sans-serif",
            color: "#0f172a",
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
            padding: "14px 16px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#ffffff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 6 }}>
                  Ask AuditAI <Sparkles size={13} />
                </div>
                <div style={{ fontSize: 11, color: "#0F172A" }}>
                  Role: {(currentUser?.role || "super_admin").replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "rgba(255,255,255,0.22)", border: "none", borderRadius: 8, width: 28, height: 28, color: "#0F172A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="auditai-grid-bg" style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 13px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    background: m.sender === "user" ? "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" : "#ffffff",
                    color: m.sender === "user" ? "#ffffff" : "#0f172a",
                    border: m.sender === "user" ? "none" : "1px solid #bae6fd",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
                  }}
                >
                  {m.text}
                  {m.navigateTo && (
                    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      <Compass size={12} /> Redirected to: {m.navigateTo.replace(/_/g, " ")}
                    </div>
                  )}
                  {m.actionOutcome && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, color: "#16a34a", fontSize: 11.5, fontWeight: 600 }}>
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
                          background: "#ffffff",
                          border: "1px solid #bae6fd",
                          color: "#0369a1",
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
                        <Zap size={10} color="#0284c7" /> {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: 12, color: "#0369a1", fontWeight: 600, padding: "4px 8px" }}>
                Ask AuditAI is thinking...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ padding: 10, background: "#ffffff", borderTop: "1px solid #bae6fd", display: "flex", gap: 8 }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything, navigate, or run an action..."
              style={{
                flex: 1,
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 12.5,
                color: "#0f172a",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
                color: "#ffffff",
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
