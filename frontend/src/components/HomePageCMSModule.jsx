import React, { useState, useEffect } from "react";
import {
  Edit3, Save, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2,
  Sparkles, FileText, Users, DollarSign, HelpCircle, Phone, ShieldCheck, Mail,
  Zap, ExternalLink, Award, Layers
} from "lucide-react";
import { homeCmsApi } from "../lib/api";

export default function HomePageCMSModule() {
  const [cms, setCms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    loadCMS();
  }, []);

  async function loadCMS() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await homeCmsApi.getAdmin();
      const payload = res?.data || res;
      if (payload && (payload.hero || payload.about || payload.features)) {
        setCms(payload);
      } else {
        setErrorMsg("Unable to parse Home Page CMS configuration from server.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to load Home Page CMS configuration");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCMS(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await homeCmsApi.updateAdmin(cms);
      setSuccessMsg("Public Home Page configuration saved and published successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update Home Page CMS");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ffffff" }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 12, color: "#38bdf8" }} />
        <div>Loading Home Page CMS Editor...</div>
      </div>
    );
  }

  if (!cms) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ffffff", background: "#0b1d3e", borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.35)" }}>
        <AlertCircle size={28} color="#f87171" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{errorMsg || "Could not load Home Page CMS Editor"}</div>
        <button
          onClick={loadCMS}
          style={{ background: "#0284c7", color: "#ffffff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Retry Loading CMS
        </button>
      </div>
    );
  }

  const sections = [
    { id: "hero", label: "Hero & Certifications", Icon: Sparkles },
    { id: "about", label: "About & ISO Governance", Icon: FileText },
    { id: "features", label: "Platform Features", Icon: Zap },
    { id: "pricing", label: "Pricing & Plans", Icon: DollarSign },
    { id: "enquiry", label: "Enquiry Form Settings", Icon: Mail },
    { id: "team", label: "Leadership Team", Icon: Users },
    { id: "clients_with_us", label: "Clients With Us", Icon: Award },
    { id: "faqs", label: "Executive FAQs", Icon: HelpCircle },
    { id: "contact", label: "Corporate Contact", Icon: Phone },
    { id: "legal", label: "ISO & Legal Policies", Icon: ShieldCheck },
    { id: "footer", label: "Footer Branding", Icon: CheckCircle2 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#ffffff", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <Edit3 size={22} color="#38bdf8" /> Edit & Update Public Home Page
          </h2>
          <div style={{ fontSize: 13, color: "#bae6fd", marginTop: 2 }}>
            Manage and customize everything displayed on the public landing page in real time with immediate database persistence.
          </div>
        </div>

        <button
          onClick={handleSaveCMS}
          disabled={saving}
          style={{
            background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(56, 189, 248, 0.35)",
          }}
        >
          {saving ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
          {saving ? "Publishing Changes..." : "Publish All Changes"}
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ background: "rgba(34, 197, 94, 0.2)", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color="#86efac" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: "rgba(244, 63, 94, 0.2)", border: "1px solid #fda4af", borderRadius: 8, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} color="#fda4af" /> {errorMsg}
        </div>
      )}

      {/* Section Switcher Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
        {sections.map((s) => {
          const Icon = s.Icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: active ? "#38bdf8" : "rgba(13, 36, 78, 0.7)",
                color: active ? "#08162d" : "#ffffff",
                border: active ? "none" : "1px solid rgba(96, 165, 250, 0.25)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: active ? "0 2px 10px rgba(56, 189, 248, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} color={active ? "#08162d" : "#ffffff"} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* -------------------- 1. Hero Section Editor -------------------- */}
      {activeSection === "hero" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>Hero Banner & Certification Tag Settings</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Hero Badge / ISO Certification Tag</label>
              <input
                type="text"
                value={cms.hero.badge}
                onChange={e => setCms({ ...cms, hero: { ...cms.hero, badge: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Main Headline</label>
              <input
                type="text"
                value={cms.hero.headline}
                onChange={e => setCms({ ...cms, hero: { ...cms.hero, headline: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 14, fontWeight: 600 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Subheadline / Supporting Value Proposition</label>
              <textarea
                rows={3}
                value={cms.hero.subheadline}
                onChange={e => setCms({ ...cms, hero: { ...cms.hero, subheadline: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Primary CTA Button Label</label>
              <input
                type="text"
                value={cms.hero.ctaPrimaryText}
                onChange={e => setCms({ ...cms, hero: { ...cms.hero, ctaPrimaryText: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Secondary CTA Button Label</label>
              <input
                type="text"
                value={cms.hero.ctaSecondaryText}
                onChange={e => setCms({ ...cms, hero: { ...cms.hero, ctaSecondaryText: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#7dd3fc" }}>Hero Stat KPI Cards (Telemetry Counters)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {cms.hero.stats?.map((stat, sIdx) => (
                <div key={sIdx} style={{ background: "rgba(8, 22, 45, 0.85)", border: "1px solid rgba(96, 165, 250, 0.2)", borderRadius: 8, padding: 12 }}>
                  <label style={{ fontSize: 11, color: "#bae6fd" }}>Stat Counter Value</label>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={e => {
                      const newStats = [...cms.hero.stats];
                      newStats[sIdx].value = e.target.value;
                      setCms({ ...cms, hero: { ...cms.hero, stats: newStats } });
                    }}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 4, padding: "6px 8px", color: "#ffffff", fontSize: 13, fontWeight: 700, marginBottom: 6 }}
                  />
                  <label style={{ fontSize: 11, color: "#bae6fd" }}>Label</label>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={e => {
                      const newStats = [...cms.hero.stats];
                      newStats[sIdx].label = e.target.value;
                      setCms({ ...cms, hero: { ...cms.hero, stats: newStats } });
                    }}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 4, padding: "6px 8px", color: "#ffffff", fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 2. About & ISO Standards Editor -------------------- */}
      {activeSection === "about" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>About AuditAI & ISO 9001/27001 Standards</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Section Headline</label>
              <input
                type="text"
                value={cms.about.title}
                onChange={e => setCms({ ...cms, about: { ...cms.about, title: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13.5, fontWeight: 600 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Corporate Description</label>
              <textarea
                rows={3}
                value={cms.about.description}
                onChange={e => setCms({ ...cms, about: { ...cms.about, description: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Corporate Mission</label>
              <input
                type="text"
                value={cms.about.mission}
                onChange={e => setCms({ ...cms, about: { ...cms.about, mission: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Experience Metric</label>
              <input
                type="text"
                value={cms.about.yearsInBusiness}
                onChange={e => setCms({ ...cms, about: { ...cms.about, yearsInBusiness: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Compliance Standards</label>
              <input
                type="text"
                value={cms.about.complianceStandard}
                onChange={e => setCms({ ...cms, about: { ...cms.about, complianceStandard: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 3. Features Editor -------------------- */}
      {activeSection === "features" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>Platform Capabilities & Modules</div>
            <button
              type="button"
              onClick={() => {
                const newFeat = {
                  id: `feat_${Date.now()}`,
                  title: "New AI Module",
                  description: "Automated analysis module description.",
                  category: "Analytics",
                  badge: "Stage 2"
                };
                setCms({ ...cms, features: [...(cms.features || []), newFeat] });
              }}
              style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add Feature
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {cms.features?.map((feat, fIdx) => (
              <div key={feat.id || fIdx} style={{ background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 10, padding: 18, position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newFeats = cms.features.filter((_, i) => i !== fIdx);
                    setCms({ ...cms, features: newFeats });
                  }}
                  style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
                  title="Remove Feature"
                >
                  <Trash2 size={15} />
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingRight: 24 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Category</label>
                    <input
                      type="text"
                      value={feat.category}
                      onChange={e => {
                        const newFeats = [...cms.features];
                        newFeats[fIdx].category = e.target.value;
                        setCms({ ...cms, features: newFeats });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Title</label>
                    <input
                      type="text"
                      value={feat.title}
                      onChange={e => {
                        const newFeats = [...cms.features];
                        newFeats[fIdx].title = e.target.value;
                        setCms({ ...cms, features: newFeats });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 13, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Badge Text</label>
                    <input
                      type="text"
                      value={feat.badge || ""}
                      onChange={e => {
                        const newFeats = [...cms.features];
                        newFeats[fIdx].badge = e.target.value;
                        setCms({ ...cms, features: newFeats });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Description</label>
                    <textarea
                      rows={3}
                      value={feat.description}
                      onChange={e => {
                        const newFeats = [...cms.features];
                        newFeats[fIdx].description = e.target.value;
                        setCms({ ...cms, features: newFeats });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- 4. Pricing Plans Editor -------------------- */}
      {activeSection === "pricing" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>Subscription Pricing Tiers (PayU Compatible)</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {cms.pricing?.map((plan, pIdx) => (
              <div key={plan.id || pIdx} style={{ background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#ffffff", display: "flex", justifyContent: "space-between" }}>
                  <span>Plan {pIdx + 1}: {plan.name}</span>
                  {plan.popular && <span style={{ fontSize: 10, background: "#38bdf8", color: "#08162d", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>POPULAR</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Plan Name</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={e => {
                        const newPricing = [...cms.pricing];
                        newPricing[pIdx].name = e.target.value;
                        setCms({ ...cms, pricing: newPricing });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Price (INR / Month)</label>
                    <input
                      type="number"
                      value={plan.price}
                      onChange={e => {
                        const newPricing = [...cms.pricing];
                        newPricing[pIdx].price = Number(e.target.value);
                        setCms({ ...cms, pricing: newPricing });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Monthly Call Minutes</label>
                    <input
                      type="number"
                      value={plan.callMinutes}
                      onChange={e => {
                        const newPricing = [...cms.pricing];
                        newPricing[pIdx].callMinutes = Number(e.target.value);
                        setCms({ ...cms, pricing: newPricing });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Agent Seats</label>
                    <input
                      type="text"
                      value={plan.agentSeats}
                      onChange={e => {
                        const newPricing = [...cms.pricing];
                        newPricing[pIdx].agentSeats = e.target.value;
                        setCms({ ...cms, pricing: newPricing });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12.5 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- 5. Enquiry Form Settings -------------------- */}
      {activeSection === "enquiry" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>Inbound Consultation Enquiry & Lead Routing</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Notification Email Recipient</label>
              <input
                type="email"
                value={cms.enquirySettings?.notifyEmail || ""}
                onChange={e => setCms({ ...cms, enquirySettings: { ...cms.enquirySettings, notifyEmail: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Auto-Reply Email Subject</label>
              <input
                type="text"
                value={cms.enquirySettings?.autoReplySubject || ""}
                onChange={e => setCms({ ...cms, enquirySettings: { ...cms.enquirySettings, autoReplySubject: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Auto-Reply Email Body Message</label>
              <textarea
                rows={4}
                value={cms.enquirySettings?.autoReplyMessage || ""}
                onChange={e => setCms({ ...cms, enquirySettings: { ...cms.enquirySettings, autoReplyMessage: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 6. Team Members Editor -------------------- */}
      {activeSection === "team" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>Team & Leadership Roster</div>
            <button
              type="button"
              onClick={() => {
                const newMember = {
                  id: `tm_${Date.now()}`,
                  name: "New Executive",
                  role: "Head of Operations",
                  bio: "Experienced QA and Speech Analytics Leader.",
                  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
                  linkedin: "https://linkedin.com",
                };
                setCms({ ...cms, team: [...cms.team, newMember] });
              }}
              style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add Member
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {cms.team?.map((member, mIdx) => (
              <div key={member.id || mIdx} style={{ background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 10, padding: 16, position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newTeam = cms.team.filter((_, i) => i !== mIdx);
                    setCms({ ...cms, team: newTeam });
                  }}
                  style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
                  title="Remove Member"
                >
                  <Trash2 size={15} />
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingRight: 24 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Name</label>
                    <input
                      type="text"
                      value={member.name}
                      onChange={e => {
                        const newTeam = [...cms.team];
                        newTeam[mIdx].name = e.target.value;
                        setCms({ ...cms, team: newTeam });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 8px", color: "#ffffff", fontSize: 12.5, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Executive Title</label>
                    <input
                      type="text"
                      value={member.role}
                      onChange={e => {
                        const newTeam = [...cms.team];
                        newTeam[mIdx].role = e.target.value;
                        setCms({ ...cms, team: newTeam });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 8px", color: "#ffffff", fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Avatar URL</label>
                    <input
                      type="text"
                      value={member.avatar}
                      onChange={e => {
                        const newTeam = [...cms.team];
                        newTeam[mIdx].avatar = e.target.value;
                        setCms({ ...cms, team: newTeam });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 8px", color: "#ffffff", fontSize: 11.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Bio / Credentials</label>
                    <textarea
                      rows={2}
                      value={member.bio}
                      onChange={e => {
                        const newTeam = [...cms.team];
                        newTeam[mIdx].bio = e.target.value;
                        setCms({ ...cms, team: newTeam });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 8px", color: "#ffffff", fontSize: 12, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- 7. FAQs Editor -------------------- */}
      {activeSection === "faqs" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>Executive FAQs Knowledgebase</div>
            <button
              type="button"
              onClick={() => {
                const newFaq = {
                  id: `faq_${Date.now()}`,
                  question: "New FAQ Question?",
                  answer: "Detailed explanation and answer to this question."
                };
                setCms({ ...cms, faqs: [...cms.faqs, newFaq] });
              }}
              style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add FAQ
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cms.faqs?.map((faq, fIdx) => (
              <div key={faq.id || fIdx} style={{ background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 8, padding: 16, position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newFaqs = cms.faqs.filter((_, i) => i !== fIdx);
                    setCms({ ...cms, faqs: newFaqs });
                  }}
                  style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
                  title="Remove FAQ"
                >
                  <Trash2 size={15} />
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingRight: 24 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Question</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={e => {
                        const newFaqs = [...cms.faqs];
                        newFaqs[fIdx].question = e.target.value;
                        setCms({ ...cms, faqs: newFaqs });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 13, fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "#bae6fd" }}>Answer</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={e => {
                        const newFaqs = [...cms.faqs];
                        newFaqs[fIdx].answer = e.target.value;
                        setCms({ ...cms, faqs: newFaqs });
                      }}
                      style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "6px 10px", color: "#ffffff", fontSize: 12, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- 8. Contact Info Editor -------------------- */}
      {activeSection === "contact" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>Corporate Contact Information & Emergency SLA Lines</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Company Legal Name</label>
              <input
                type="text"
                value={cms.contactInfo.companyName}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, companyName: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>General Support Email</label>
              <input
                type="email"
                value={cms.contactInfo.email}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, email: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Enterprise Sales Email</label>
              <input
                type="email"
                value={cms.contactInfo.salesEmail}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, salesEmail: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Main Phone</label>
              <input
                type="text"
                value={cms.contactInfo.phone}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, phone: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>24/7 SLA Emergency Hotline</label>
              <input
                type="text"
                value={cms.contactInfo.emergencyHotline}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, emergencyHotline: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Operating Hours</label>
              <input
                type="text"
                value={cms.contactInfo.supportHours}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, supportHours: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Corporate Address</label>
              <input
                type="text"
                value={cms.contactInfo.address}
                onChange={e => setCms({ ...cms, contactInfo: { ...cms.contactInfo, address: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 9. Legal Policies Editor -------------------- */}
      {activeSection === "legal" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>ISO 27001 Security, SLA & Legal Compliance Policies</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>1. Privacy Policy Document (ISO 27001 ISMS)</label>
              <textarea
                rows={5}
                value={cms.legal.privacyPolicy}
                onChange={e => setCms({ ...cms, legal: { ...cms.legal, privacyPolicy: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "10px", color: "#ffffff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>2. Terms and Conditions of Service</label>
              <textarea
                rows={5}
                value={cms.legal.termsConditions}
                onChange={e => setCms({ ...cms, legal: { ...cms.legal, termsConditions: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "10px", color: "#ffffff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>3. Platform Usage Rights & Enterprise SLA</label>
              <textarea
                rows={5}
                value={cms.legal.platformUsageRights}
                onChange={e => setCms({ ...cms, legal: { ...cms.legal, platformUsageRights: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "10px", color: "#ffffff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>4. Subscription Cancellation & Refund Policy</label>
              <textarea
                rows={5}
                value={cms.legal.refundPolicy}
                onChange={e => setCms({ ...cms, legal: { ...cms.legal, refundPolicy: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "10px", color: "#ffffff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 10. Footer & Compliance Notices -------------------- */}
      {activeSection === "footer" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16 }}>Footer Branding & Compliance Disclaimers</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Footer Tagline</label>
              <input
                type="text"
                value={cms.footer.tagline}
                onChange={e => setCms({ ...cms, footer: { ...cms.footer, tagline: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Copyright Notice</label>
              <input
                type="text"
                value={cms.footer.copyright}
                onChange={e => setCms({ ...cms, footer: { ...cms.footer, copyright: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#bae6fd", marginBottom: 4 }}>Compliance Standards Disclaimer</label>
              <input
                type="text"
                value={cms.footer.disclaimer}
                onChange={e => setCms({ ...cms, footer: { ...cms.footer, disclaimer: e.target.value } })}
                style={{ width: "100%", background: "rgba(8, 22, 45, 0.88)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 12px", color: "#ffffff", fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === "clients_with_us" && (
        <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>Clients With Us (Home Screen Showcase)</div>
              <div style={{ fontSize: 12, color: "#bae6fd" }}>Manage enterprise client organizations showcased on the public Home Page.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const list = Array.isArray(cms.clientsWithUs) ? cms.clientsWithUs : [];
                setCms({
                  ...cms,
                  clientsWithUs: [...list, { id: `cwu_${Date.now()}`, name: "New Enterprise Client", industry: "Fintech / BPO", seats: "100+ Agents", badge: "ISO Verified", active: true }],
                });
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0284c7", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              <Plus size={14} /> Add Client
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {(cms.clientsWithUs || []).map((cl, idx) => (
              <div key={cl.id || idx} style={{ background: "rgba(8, 22, 45, 0.85)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>Client #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setCms({ ...cms, clientsWithUs: (cms.clientsWithUs || []).filter((_, i) => i !== idx) })}
                    style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Client Organization Name"
                  value={cl.name}
                  onChange={e => {
                    const next = [...(cms.clientsWithUs || [])];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setCms({ ...cms, clientsWithUs: next });
                  }}
                  style={{ width: "100%", background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "7px 10px", color: "#ffffff", fontSize: 12.5, boxSizing: "border-box" }}
                />
                <input
                  type="text"
                  placeholder="Industry"
                  value={cl.industry}
                  onChange={e => {
                    const next = [...(cms.clientsWithUs || [])];
                    next[idx] = { ...next[idx], industry: e.target.value };
                    setCms({ ...cms, clientsWithUs: next });
                  }}
                  style={{ width: "100%", background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "7px 10px", color: "#ffffff", fontSize: 12.5, boxSizing: "border-box" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Seats (e.g. 250+ Agents)"
                    value={cl.seats}
                    onChange={e => {
                      const next = [...(cms.clientsWithUs || [])];
                      next[idx] = { ...next[idx], seats: e.target.value };
                      setCms({ ...cms, clientsWithUs: next });
                    }}
                    style={{ width: "100%", background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "7px 10px", color: "#ffffff", fontSize: 12, boxSizing: "border-box" }}
                  />
                  <input
                    type="text"
                    placeholder="Badge"
                    value={cl.badge}
                    onChange={e => {
                      const next = [...(cms.clientsWithUs || [])];
                      next[idx] = { ...next[idx], badge: e.target.value };
                      setCms({ ...cms, clientsWithUs: next });
                    }}
                    style={{ width: "100%", background: "#0b1d3e", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "7px 10px", color: "#ffffff", fontSize: 12, boxSizing: "border-box" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
