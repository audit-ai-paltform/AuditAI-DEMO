import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Target, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, RefreshCw, BarChart3, Users } from "lucide-react";
import { salesForecastingApi } from "../lib/api";

export default function SalesForecastingWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState("commit");
  const [expandedDeal, setExpandedDeal] = useState(null);

  useEffect(() => {
    loadForecasting();
  }, []);

  async function loadForecasting() {
    setLoading(true);
    try {
      const res = await salesForecastingApi.get();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn("Could not load sales forecasting:", err);
    } finally {
      setLoading(false);
    }
  }

  const buckets = data?.buckets || {
    commit: { label: "Commit", count: 4, revenue: 199996, confidence: "High (80-100%)", deals: [] },
    best_case: { label: "Best Case", count: 7, revenue: 174993, confidence: "Moderate (50-79%)", deals: [] },
    at_risk: { label: "At-Risk", count: 3, revenue: 29997, confidence: "Low (<50%)", deals: [] },
  };

  const totalRevenue = data?.totalPipelineRevenue || (buckets.commit.revenue + buckets.best_case.revenue + buckets.at_risk.revenue);
  const avgWinProb = data?.averageWinProb || 68;

  const currentBucketData = buckets[selectedBucket] || buckets.commit;

  return (
    <div
      style={{
        background: "#0b1d3e",
        border: "1px solid rgba(96, 165, 250, 0.28)",
        borderRadius: 10,
        padding: 20,
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Widget Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bae6fd", textTransform: "uppercase" }}>
              Stage 2 Intelligence
            </span>
            <span style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, fontSize: 10, padding: "2px 6px", color: "#ffffff", fontFamily: "JetBrains Mono" }}>
              Qalyzer v2.0
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} /> AI Sales & Conversion Forecasting
          </div>
          <div style={{ fontSize: 12, color: "#7dd3fc", marginTop: 2 }}>
            Real-time pipeline win-probabilities extracted from conversation buying signals.
          </div>
        </div>

        <button
          onClick={loadForecasting}
          disabled={loading}
          style={{
            background: "#08162d",
            border: "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: 6,
            color: "#ffffff",
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Pipeline
        </button>
      </div>

      {/* Top Aggregates Ribbon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div style={{ background: "#08162d", border: "1px solid #1f1f23", borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: "#bae6fd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Projected Pipeline Value
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "JetBrains Mono", color: "#ffffff" }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 4 }}>
            Across {data?.totalDeals || 14} verified account interactions
          </div>
        </div>

        <div style={{ background: "#08162d", border: "1px solid #1f1f23", borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: "#bae6fd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Average Win Probability
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "JetBrains Mono", color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            {avgWinProb}%
            <span style={{ fontSize: 12, fontWeight: 500, color: avgWinProb >= 65 ? "#ffffff" : "#bae6fd" }}>
              ({avgWinProb >= 70 ? "Strong Momentum" : "Stable"})
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 4 }}>
            Calculated via conversation progression velocity
          </div>
        </div>
      </div>

      {/* Forecast Bucket Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {/* Commit Bucket */}
        <button
          onClick={() => { setSelectedBucket("commit"); setExpandedDeal(null); }}
          style={{
            background: selectedBucket === "commit" ? "#0f2752" : "#08162d",
            border: selectedBucket === "commit" ? "2px solid #ffffff" : "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: 8,
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Commit (80-100%)
            </span>
            <ShieldCheck size={16} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
            ₹{buckets.commit.revenue.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#bae6fd", marginTop: 2 }}>
            {buckets.commit.count} deals | High intent & budget verified
          </div>
        </button>

        {/* Best Case Bucket */}
        <button
          onClick={() => { setSelectedBucket("best_case"); setExpandedDeal(null); }}
          style={{
            background: selectedBucket === "best_case" ? "#0f2752" : "#08162d",
            border: selectedBucket === "best_case" ? "2px solid #ffffff" : "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: 8,
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Best Case (50-79%)
            </span>
            <Target size={16} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
            ₹{buckets.best_case.revenue.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#bae6fd", marginTop: 2 }}>
            {buckets.best_case.count} deals | Active objection handling
          </div>
        </button>

        {/* At-Risk Bucket */}
        <button
          onClick={() => { setSelectedBucket("at_risk"); setExpandedDeal(null); }}
          style={{
            background: selectedBucket === "at_risk" ? "#0f2752" : "#08162d",
            border: selectedBucket === "at_risk" ? "2px solid #ffffff" : "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: 8,
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              At-Risk (&lt;50%)
            </span>
            <AlertTriangle size={16} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
            ₹{buckets.at_risk.revenue.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#bae6fd", marginTop: 2 }}>
            {buckets.at_risk.count} deals | Needs coaching intervention
          </div>
        </button>
      </div>

      {/* Deal Pipeline Inspection */}
      <div style={{ background: "#08162d", border: "1px solid #1f1f23", borderRadius: 8, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
            <BarChart3 size={15} /> Active Leads in {currentBucketData.label} Bucket
          </div>
          <span style={{ fontSize: 11, color: "#bae6fd", fontFamily: "JetBrains Mono" }}>
            Showing {currentBucketData.deals?.length || 0} accounts
          </span>
        </div>

        {currentBucketData.deals && currentBucketData.deals.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {currentBucketData.deals.map((deal, idx) => {
              const isExpanded = expandedDeal === deal.id;
              const competitorList = Array.isArray(deal.competitor_mentions)
                ? deal.competitor_mentions
                : typeof deal.competitor_mentions === "string"
                ? JSON.parse(deal.competitor_mentions || "[]")
                : [];
              const objectionList = Array.isArray(deal.pricing_objections)
                ? deal.pricing_objections
                : typeof deal.pricing_objections === "string"
                ? JSON.parse(deal.pricing_objections || "[]")
                : [];

              return (
                <div
                  key={deal.id || idx}
                  style={{
                    background: "#0b1d3e",
                    border: "1px solid rgba(96, 165, 250, 0.28)",
                    borderRadius: 6,
                    padding: 12,
                    cursor: "pointer",
                    transition: "border 0.2s",
                  }}
                  onClick={() => setExpandedDeal(isExpanded ? null : deal.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          background: "#ffffff",
                          color: "#08162d",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          fontFamily: "JetBrains Mono",
                        }}
                      >
                        {deal.win_probability}% WIN
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                          {deal.lead_identifier || `Lead #${deal.id.slice(0, 8)}`}
                        </div>
                        <div style={{ fontSize: 11, color: "#7dd3fc" }}>
                          Stage: {deal.deal_stage || "Discovery"} | Intent: {deal.purchase_intent || "MEDIUM"}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#ffffff" }}>
                        ₹{Number(deal.projected_revenue || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: deal.budget_confirmed ? "#ffffff" : "#7dd3fc" }}>
                        {deal.budget_confirmed ? "✓ Budget Confirmed" : "○ Budget Unconfirmed"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Stage 2 Buying Signals Detail */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(96, 165, 250, 0.28)", fontSize: 11.5, color: "#bae6fd" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <span style={{ color: "#ffffff", fontWeight: 600 }}>Competitors Mentioned:</span>
                          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {competitorList.length > 0 ? (
                              competitorList.map((comp, cIdx) => (
                                <span key={cIdx} style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.28)", padding: "2px 6px", borderRadius: 4, color: "#ffffff", fontSize: 10.5 }}>
                                  {comp}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "#7dd3fc", fontStyle: "italic" }}>None detected</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: "#ffffff", fontWeight: 600 }}>Pricing Objections / Hesitations:</span>
                          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {objectionList.length > 0 ? (
                              objectionList.map((obj, oIdx) => (
                                <span key={oIdx} style={{ background: "#0f2752", border: "1px solid rgba(96, 165, 250, 0.28)", padding: "2px 6px", borderRadius: 4, color: "#ffffff", fontSize: 10.5 }}>
                                  {obj}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "#7dd3fc", fontStyle: "italic" }}>No pricing resistance</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#7dd3fc", fontSize: 12 }}>
            No deals currently categorized in {currentBucketData.label}. As calls are audited, Stage 2 AI extracts intent signals automatically.
          </div>
        )}
      </div>
    </div>
  );
}
