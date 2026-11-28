import React, { useState, useEffect } from "react";
import { Search, Sparkles, MessageSquare, AlertCircle, Bug, UserX, ArrowRight, Quote, Filter, CheckCircle2, RefreshCw } from "lucide-react";
import { dataFishingApi } from "../lib/api";

export default function DataFishingModule() {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("All");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");

  const [clustersData, setClustersData] = useState(null);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [selectedClusterType, setSelectedClusterType] = useState("all");

  useEffect(() => {
    loadClusters();
  }, []);

  async function loadClusters() {
    setLoadingClusters(true);
    try {
      const res = await dataFishingApi.getClusters();
      if (res?.data) {
        setClustersData(res.data);
      }
    } catch (err) {
      console.warn("Could not load clusters:", err);
    } finally {
      setLoadingClusters(false);
    }
  }

  async function handleAskQalyzer(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    setSearchResult(null);

    try {
      const res = await dataFishingApi.ask(query, channel);
      if (res?.data) {
        setSearchResult(res.data);
      } else {
        setError("No response received from conversational search.");
      }
    } catch (err) {
      setError(err.message || "Failed to search historical interactions");
    } finally {
      setSearching(false);
    }
  }

  const sampleQuestions = [
    "What are the top reasons customers cite for cancelling their subscription?",
    "How often do customers complain about multi-party call transfer lag?",
    "Which competitor is most frequently mentioned during sales calls?",
    "What pricing objections do agents struggle to resolve in under 2 minutes?",
  ];

  const clusters = clustersData?.clusters || [];
  const filteredClusters = selectedClusterType === "all"
    ? clusters
    : clusters.filter((c) => c.cluster_type === selectedClusterType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif", color: "#000000" }}>
      {/* Header Banner */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase" }}>
                Semantic Search & Trend Discovery
              </span>
              <span style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, fontSize: 10, padding: "2px 6px", color: "#000000", fontFamily: "JetBrains Mono" }}>
                Data Fishing
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, marginBottom: 4 }}>
              "Ask Qalyzer" Conversational Search & Trend Mining
            </h1>
            <p style={{ fontSize: 13, color: "#334155", margin: 0, maxWidth: 780 }}>
              Query thousands of historical customer calls, chats, and emails using natural language. 
              Automatically cluster recurring objections, product bugs, and churn reasons into ranked enterprise insights.
            </p>
          </div>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleAskQalyzer} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 8, padding: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", paddingLeft: 8, color: "#0369a1" }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Qalyzer anything across calls, chats, and emails (e.g., 'Why are customers hesitant about annual plans?')..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#000000",
                fontSize: 13.5,
                padding: "8px 4px",
              }}
            />
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              style={{
                background: "#e0f2fe",
                border: "1px solid rgba(96, 165, 250, 0.28)",
                borderRadius: 6,
                color: "#000000",
                fontSize: 12,
                padding: "0 10px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Channels</option>
              <option value="Call">Calls Telephony</option>
              <option value="Chat">Live Chats</option>
              <option value="Email">Support Emails</option>
            </select>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              style={{
                background: "#ffffff",
                color: "#f0f9ff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={14} className={searching ? "animate-spin" : ""} />
              {searching ? "Searching..." : "Ask Qalyzer"}
            </button>
          </div>

          {/* Quick Question Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#0369a1" }}>Quick prompts:</span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setQuery(q); }}
                style={{
                  background: "#f0f9ff",
                  border: "1px solid rgba(96, 165, 250, 0.28)",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 11,
                  color: "#334155",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 8, padding: 12, color: "#000000", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Ask Qalyzer Synthesized Response */}
      {searchResult && (
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "Space Grotesk" }}>
              Qalyzer Conversational Synthesis
            </span>
            <span style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, fontSize: 10.5, padding: "2px 6px", color: "#334155", fontFamily: "JetBrains Mono" }}>
              pgvector grounded
            </span>
          </div>

          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#000000", background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            {searchResult.answer}
          </div>

          {/* Key Findings */}
          {searchResult.key_findings && searchResult.key_findings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", marginBottom: 8 }}>
                Key Findings from Conversations
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {searchResult.key_findings.map((finding, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#000000" }}>
                    <CheckCircle2 size={15} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Citations & Verbatim Quotes */}
          {searchResult.citations && searchResult.citations.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Quote size={14} /> Grounded Transcript Citations
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
                {searchResult.citations.map((cite, idx) => (
                  <div key={idx} style={{ background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#000000", fontWeight: 700 }}>
                        {cite.speaker || "Customer"} ({cite.timestamp || "01:24"})
                      </span>
                      <span style={{ fontSize: 10.5, color: "#0369a1", fontFamily: "JetBrains Mono" }}>
                        Call #{cite.interaction_id || "c8f12a"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontStyle: "italic", color: "#000000", borderLeft: "2px solid #ffffff", paddingLeft: 8, marginBottom: 6 }}>
                      "{cite.verbatim_quote}"
                    </div>
                    <div style={{ fontSize: 11, color: "#334155" }}>
                      {cite.relevance}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-Clustered Trend Discovery */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 8 }}>
              Ranked Conversation Trend Clusters
            </div>
            <div style={{ fontSize: 12, color: "#0369a1", marginTop: 2 }}>
              Automatically grouped recurring customer objections, product bugs, and churn reasons.
            </div>
          </div>

          {/* Cluster Type Filters */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: "All Insights" },
              { id: "recurring_objection", label: "Objections" },
              { id: "product_bug", label: "Product Bugs" },
              { id: "cancellation_reason", label: "Churn Risks" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedClusterType(tab.id)}
                style={{
                  background: selectedClusterType === tab.id ? "#ffffff" : "#f0f9ff",
                  color: selectedClusterType === tab.id ? "#f0f9ff" : "#ffffff",
                  border: "1px solid rgba(96, 165, 250, 0.28)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cluster Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredClusters.map((cluster) => {
            const quotes = Array.isArray(cluster.sample_quotes)
              ? cluster.sample_quotes
              : typeof cluster.sample_quotes === "string"
              ? JSON.parse(cluster.sample_quotes || "[]")
              : [];

            return (
              <div
                key={cluster.id}
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #1f1f23",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "#e0f2fe",
                        border: "1px solid rgba(96, 165, 250, 0.28)",
                        color: "#000000",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {cluster.cluster_type.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                      {cluster.topic_title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#334155", fontFamily: "JetBrains Mono" }}>
                      Severity: <strong>{cluster.severity}</strong>
                    </span>
                    <span
                      style={{
                        background: "#ffffff",
                        color: "#f0f9ff",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontFamily: "JetBrains Mono",
                      }}
                    >
                      {cluster.frequency_count} Occurrences
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: "#334155", margin: "0 0 10px 0" }}>
                  {cluster.description}
                </p>

                {/* Sample Quotes */}
                {quotes.length > 0 && (
                  <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 10.5, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      Sample Verbatim Customer Quotes:
                    </div>
                    {quotes.map((q, qIdx) => (
                      <div key={qIdx} style={{ fontSize: 11.5, color: "#000000", fontStyle: "italic", marginBottom: 4 }}>
                        • "{q}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
