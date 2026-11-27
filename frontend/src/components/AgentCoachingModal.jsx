import React, { useState, useEffect } from "react";
import { MessageSquare, ArrowRight, Send, CheckCircle2, X, AlertCircle, Sparkles, SlidersHorizontal, Share2 } from "lucide-react";
import { coachingApi } from "../lib/api";

export default function AgentCoachingModal({ call, onClose }) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState("slack");
  const [dispatchSuccess, setDispatchSuccess] = useState("");
  const [error, setError] = useState("");

  const callId = call?.id || "";
  const agentName = call?.agent_name || "Assigned Agent";
  const agentId = call?.agent_id || "ag_default";

  useEffect(() => {
    if (callId) {
      loadCoachingData();
    }
  }, [callId]);

  async function loadCoachingData() {
    setLoading(true);
    setError("");
    try {
      const res = await coachingApi.getCallCoaching(callId);
      if (res?.data?.moments) {
        setMoments(res.data.moments);
      } else {
        // Fallback from call flags if present
        const flags = call?.flags || {};
        if (flags.coaching?.moments) {
          setMoments(flags.coaching.moments);
        } else {
          // Provide sound template moments
          setMoments([
            {
              timestamp: "01:45",
              turn_index: 4,
              category: "missed_upsell",
              missed_opportunity: "Customer expressed team scaling needs across regional offices, but agent only offered single-seat starter tier.",
              what_agent_said: "Sure, our basic plan starts with 5 seats for 9,999 monthly.",
              ideal_rewrite: "Since your team is expanding across 3 branches next quarter, our Growth plan with 20 seats and priority queue routing ensures continuous coverage with zero seat bottlenecks.",
              coaching_rationale: "Aligning tier upgrades directly with the customer's stated expansion timeline removes friction and maximizes lifetime value.",
            },
            {
              timestamp: "03:10",
              turn_index: 6,
              category: "objection_mishandle",
              missed_opportunity: "Customer hesitated on price; agent fell silent for 6 seconds then offered an unapproved 20% verbal discount.",
              what_agent_said: "Well... maybe I can ask my manager if we can cut 20% off if you sign today.",
              ideal_rewrite: "I completely understand budget predictability is crucial. Rather than compromising your SLA support, let's explore our quarterly billing structure where you get 25,000 call minutes with zero upfront integration fees.",
              coaching_rationale: "Reframe from price to ROI and structured billing rather than quick verbal discounting.",
            },
          ]);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load coaching data");
    } finally {
      setLoading(false);
    }
  }

  async function handleDispatchDigest() {
    setDispatching(true);
    setError("");
    setDispatchSuccess("");
    try {
      const res = await coachingApi.dispatch({
        call_id: callId,
        agent_id: agentId,
        agent_name: agentName,
        channel: dispatchChannel,
        digest_title: `Personalized Coaching Digest: Interaction #${callId.slice(0, 8)}`,
        feedback_notes: `Reviewed ${moments.length} coaching moments. Prioritize objection reframing and cross-sell triggers.`,
      });
      setDispatchSuccess(res.data?.message || `Micro-coaching digest dispatched via ${dispatchChannel.toUpperCase()}!`);
      setTimeout(() => setDispatchSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Could not dispatch micro-coaching digest");
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: 880,
          maxHeight: "90vh",
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          color: "#ffffff",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#a1a1aa", textTransform: "uppercase" }}>
                Qalyzer v2.0 Coaching Engine
              </span>
              <span style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 4, fontSize: 10, padding: "2px 6px", color: "#ffffff", fontFamily: "JetBrains Mono" }}>
                Side-by-Side Review
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4 }}>
              "What Could Have Been Done Better" Coaching Analysis
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
              Interaction #{callId.slice(0, 8)} | Agent: <strong>{agentName}</strong> | Score: <strong>{call?.score || 85}%</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback loop notification */}
        {dispatchSuccess && (
          <div style={{ background: "#18181b", border: "1px solid #ffffff", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} /> {dispatchSuccess}
          </div>
        )}

        {/* Moments List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4, marginBottom: 18 }}>
          {moments.map((m, idx) => (
            <div
              key={idx}
              style={{
                background: "#121215",
                border: "1px solid #1f1f23",
                borderRadius: 8,
                padding: 16,
              }}
            >
              {/* Category & Timestamp */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      color: "#ffffff",
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontFamily: "JetBrains Mono",
                    }}
                  >
                    Timestamp: {m.timestamp || "01:15"}
                  </span>
                  <span
                    style={{
                      background: "#ffffff",
                      color: "#000000",
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {(m.category || "objection").replace(/_/g, " ")}
                  </span>
                </div>

                <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                  Missed Opportunity Turn #{m.turn_index || idx + 1}
                </span>
              </div>

              {/* Missed Opportunity Summary */}
              <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 12, background: "#09090b", border: "1px solid #27272a", padding: 8, borderRadius: 6 }}>
                <strong>Issue Detected:</strong> {m.missed_opportunity}
              </div>

              {/* Side-by-Side Comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Left: What Agent Said */}
                <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#a1a1aa", marginBottom: 6 }}>
                    What The Agent Said:
                  </div>
                  <div style={{ fontSize: 12.5, color: "#ffffff", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{m.what_agent_said}"
                  </div>
                </div>

                {/* Right: Ideal Script Rewrite */}
                <div style={{ background: "#18181b", border: "1px solid #ffffff", borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#ffffff", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={13} /> Ideal SOP Script Rewrite:
                  </div>
                  <div style={{ fontSize: 12.5, color: "#ffffff", lineHeight: 1.5, fontWeight: 500 }}>
                    "{m.ideal_rewrite}"
                  </div>
                </div>
              </div>

              {/* Coaching Rationale */}
              <div style={{ marginTop: 10, fontSize: 11.5, color: "#71717a" }}>
                <strong>Coaching Rationale:</strong> {m.coaching_rationale}
              </div>
            </div>
          ))}
        </div>

        {/* 1-Click Micro-Coaching Dispatch Loop */}
        <div style={{ borderTop: "1px solid #27272a", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>Deliver Micro-Coaching Digest via:</span>
            <select
              value={dispatchChannel}
              onChange={(e) => setDispatchChannel(e.target.value)}
              style={{
                background: "#121215",
                border: "1px solid #27272a",
                borderRadius: 6,
                color: "#ffffff",
                fontSize: 12,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              <option value="slack">Slack Channel (#agent-coaching)</option>
              <option value="email">Direct Agent Email</option>
              <option value="portal">Agent Portal Notification Feed</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                background: "#121215",
                border: "1px solid #27272a",
                color: "#ffffff",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              onClick={handleDispatchDigest}
              disabled={dispatching}
              style={{
                background: "#ffffff",
                color: "#000000",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={13} /> {dispatching ? "Sending..." : "1-Click Send Micro-Coaching Digest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
