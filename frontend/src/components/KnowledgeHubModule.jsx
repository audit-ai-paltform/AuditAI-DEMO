import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Plus, FileText, CheckCircle2, TrendingUp, Download, ShieldCheck, RefreshCw, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { knowledgeHubApi } from "../lib/api";

export default function KnowledgeHubModule() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("product");
  const [version, setVersion] = useState("2.5");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-03-01");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await knowledgeHubApi.list();
      if (res?.data?.documents) {
        setDocuments(res.data.documents);
      }
    } catch (err) {
      console.warn("Could not load knowledge hub documents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await knowledgeHubApi.create({
        title,
        category,
        version,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        content,
      });
      setMessage("Product/Process documentation uploaded! Versioned rules extracted and active.");
      setShowUploadModal(false);
      setTitle("");
      setContent("");
      loadDocuments();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to create knowledge document");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenImpactReport(date = "2026-02-15") {
    setShowImpactModal(true);
    setLoadingImpact(true);
    try {
      const res = await knowledgeHubApi.getBusinessImpact(date);
      if (res?.data) {
        setImpactData(res.data);
      }
    } catch (err) {
      console.warn("Could not load business impact report:", err);
    } finally {
      setLoadingImpact(false);
    }
  }

  function handlePrintExecutivePdf() {
    window.print();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif", color: "#000000" }}>
      {/* Top Banner */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase" }}>
                Knowledge Hub & Rule Engine
              </span>
              <span style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, fontSize: 10, padding: "2px 6px", color: "#000000", fontFamily: "JetBrains Mono" }}>
                {"Settings > Products & Processes"}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, marginBottom: 4 }}>
              Dynamic Products, Processes & Versioned Rule Engine
            </h1>
            <p style={{ fontSize: 13, color: "#334155", margin: 0, maxWidth: 780 }}>
              Upload updated documentation and SOPs with effective dates. Historical interactions are audited strictly against the rules active on the exact interaction date.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleOpenImpactReport("2026-02-15")}
              style={{
                background: "#f0f9ff",
                border: "1px solid rgba(96, 165, 250, 0.28)",
                borderRadius: 6,
                color: "#000000",
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <TrendingUp size={14} /> View Business Impact Report
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
                border: "none",
                borderRadius: 6,
                color: "#FFFFFF",
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> Upload Process / SOP
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {message && (
        <div style={{ background: "#e0f2fe", border: "1px solid #ffffff", borderRadius: 8, padding: 12, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Document Library Table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} /> Active Documentation & Effective Date Catalog
          </div>
          <span style={{ fontSize: 11, color: "#0369a1", fontFamily: "JetBrains Mono" }}>
            {documents.length} Versioned Guidelines Active
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {documents.map((doc) => {
            const rules = Array.isArray(doc.rules_extracted)
              ? doc.rules_extracted
              : typeof doc.rules_extracted === "string"
              ? JSON.parse(doc.rules_extracted || "[]")
              : [];

            return (
              <div
                key={doc.id}
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #FFFFFF",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: "#ffffff",
                          color: "#0F172A",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          fontFamily: "JetBrains Mono",
                        }}
                      >
                        v{doc.version}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                        {doc.title}
                      </span>
                      <span
                        style={{
                          background: "#e0f2fe",
                          border: "1px solid rgba(96, 165, 250, 0.28)",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          color: "#334155",
                          textTransform: "uppercase",
                        }}
                      >
                        {doc.category}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "#0369a1", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={13} /> Effective From: <strong>{doc.effective_from}</strong> {doc.effective_to ? `to ${doc.effective_to}` : "(Indefinitely Active)"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenImpactReport(doc.effective_from)}
                    style={{
                      background: "#e0f2fe",
                      border: "1px solid rgba(96, 165, 250, 0.28)",
                      borderRadius: 6,
                      color: "#000000",
                      fontSize: 11.5,
                      padding: "6px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Measure Impact <ArrowUpRight size={13} />
                  </button>
                </div>

                <p style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5, margin: "8px 0" }}>
                  {doc.content}
                </p>

                {/* Extracted Rules Badges */}
                {rules.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #FFFFFF" }}>
                    <div style={{ fontSize: 10.5, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                      Active Audit Rules Enforced on Interactions in this Date Range:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {rules.map((r, rIdx) => (
                        <span
                          key={rIdx}
                          style={{
                            background: "#ffffff",
                            border: "1px solid rgba(96, 165, 250, 0.28)",
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 11,
                            color: "#000000",
                          }}
                        >
                          • {r.rule} <span style={{ color: "#0369a1" }}>({r.suggestedWeight}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload SOP / Process Modal */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ width: 560, background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>
                Upload Updated Process / SOP Document
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Document Title</label>
                <input
                  required
                  placeholder="e.g. Q3 Inbound Support & Objection Handling Playbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12 }}
                  >
                    <option value="product">Product Line Update</option>
                    <option value="process">Process & Workflow</option>
                    <option value="compliance">Regulatory Compliance</option>
                    <option value="pricing">Pricing Rate Card</option>
                    <option value="script">Script Guidelines</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Version Tag</label>
                  <input
                    required
                    placeholder="2.5"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Effective From Date</label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Effective To Date (Optional)</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>SOP / Knowledge Guidelines Text</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Paste complete standard operating procedure or product details here. Qalyzer will automatically parse compliance rules and apply them to calls created within the effective date range."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "10px", color: "#000000", fontSize: 12, boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowUploadModal(false)} style={{ background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", color: "#000000", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)", border: "none", color: "#FFFFFF", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? "Extracting Rules..." : "Publish & Enforce Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Executive Business Impact Report Modal */}
      {showImpactModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ width: 780, maxHeight: "90vh", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 24, overflowY: "auto", color: "#000000" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase" }}>
                    Executive Audit Analytics
                  </span>
                  <span style={{ background: "#ffffff", color: "#0F172A", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 6px", fontFamily: "JetBrains Mono" }}>
                    Before & After Report
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4 }}>
                  Business Impact Analysis: {impactData?.update_title || "SOP Update"}
                </div>
                <div style={{ fontSize: 12, color: "#0369a1", marginTop: 2 }}>
                  Benchmarked against effective date threshold: <strong>{impactData?.effective_date || "2026-02-15"}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handlePrintExecutivePdf}
                  style={{
                    background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
                    color: "#FFFFFF",
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
                  <Download size={13} /> Export Executive PDF
                </button>
                <button onClick={() => setShowImpactModal(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {impactData && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Comparative Metric Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {Object.entries(impactData.comparison || {}).map(([key, item]) => (
                    <div key={key} style={{ background: "#f0f9ff", border: "1px solid #FFFFFF", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        {item.metric}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#0369a1" }}>Before: </span>
                          <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", color: "#334155" }}>{item.before}</span>
                        </div>
                        <div style={{ fontSize: 18, color: "#0369a1" }}>→</div>
                        <div>
                          <span style={{ fontSize: 13, color: "#000000" }}>After: </span>
                          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "JetBrains Mono", color: "#000000" }}>{item.after}</span>
                        </div>
                        <span
                          style={{
                            background: "#e0f2fe",
                            border: "1px solid rgba(96, 165, 250, 0.28)",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono",
                            color: "#000000",
                          }}
                        >
                          {item.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Executive Summary Takeaway */}
                <div style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#000000", marginBottom: 4 }}>
                    Executive Takeaway & Operational Gains
                  </div>
                  <p style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6, margin: 0 }}>
                    {impactData.executive_takeaway}
                  </p>
                  <div style={{ marginTop: 8, fontSize: 11, color: "#0369a1", fontFamily: "JetBrains Mono" }}>
                    Agent SOP Adoption Rate: <strong>{impactData.agent_adoption_rate}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
