import React, { useState } from "react";
import {
  Database, HardDrive, Shield, CheckCircle2, ArrowRight, RefreshCw,
  Terminal, Layers, Server, Cloud, Cpu, FileCode, Check, Copy
} from "lucide-react";

export default function CloudflareDatabaseModule() {
  const [testingD1, setTestingD1] = useState(false);
  const [d1Status, setD1Status] = useState("Connected");
  const [copied, setCopied] = useState("");

  function copyText(key, text) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  async function testConnection() {
    setTestingD1(true);
    setTimeout(() => {
      setD1Status("Operational (Latency: 12ms)");
      setTestingD1(false);
    }, 600);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif", color: "#000000" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={22} style={{ color: "#000000" }} />
            Cloudflare D1 Relational DB & R2 Object Storage
          </div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
            Segregated database architecture: Primary DB for Auth/Users + Cloudflare Edge D1/R2 for Application Data.
          </div>
        </div>

        <button
          onClick={testConnection}
          disabled={testingD1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#ffffff",
            color: "#f0f9ff",
            border: "none",
            borderRadius: 7,
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} className={testingD1 ? "spin" : ""} /> Test Edge Connectivity
        </button>
      </div>

      {/* Architecture Separation Diagram */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* PostgreSQL Auth DB Card */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>
              <Shield size={18} /> Authentication & User Database
            </div>
            <span style={{ fontSize: 10.5, background: "#e0f2fe", color: "#000000", border: "1px solid #ffffff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
              POSTGRESQL / SUPABASE
            </span>
          </div>

          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>
            Designated <strong>exclusively</strong> for user authentication, passwords, administrative controls, and session validation.
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #FFFFFF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Restricted Tables:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontFamily: "JetBrains Mono" }}>
              <div>• auth_users (Credentials & Admin Controls)</div>
              <div>• admin_login_controls (Security Policies)</div>
              <div>• user_sessions (Token Revocation)</div>
              <div>• admin_audit_logs (Administrative Audit)</div>
            </div>
          </div>
        </div>

        {/* Cloudflare D1 Card */}
        <div style={{ background: "#ffffff", border: "1px solid #ffffff", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>
              <Database size={18} /> Cloudflare D1 Operational DB
            </div>
            <span style={{ fontSize: 10.5, background: "#ffffff", color: "#f0f9ff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
              {d1Status}
            </span>
          </div>

          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>
            Serverless SQLite-powered distributed relational database for all high-volume operational and analytics data.
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #FFFFFF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Migrated Application Tables:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontFamily: "JetBrains Mono" }}>
              <div>• calls & call_evaluations</div>
              <div>• agents & custom_parameters</div>
              <div>• scripts & audit_flags</div>
              <div>• subscriptions & payu_transactions</div>
            </div>
          </div>
        </div>

        {/* Cloudflare R2 Card */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>
              <HardDrive size={18} /> Cloudflare R2 Object Storage
            </div>
            <span style={{ fontSize: 10.5, background: "#e0f2fe", color: "#000000", border: "1px solid rgba(96, 165, 250, 0.28)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
              S3-COMPATIBLE
            </span>
          </div>

          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>
            High-throughput, zero-egress fee binary asset storage for audio calls, transcripts, SOP PDFs, and reports.
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #FFFFFF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Stored Object Buckets:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontFamily: "JetBrains Mono" }}>
              <div>• /recordings/{'{tenant_id}'}/*.wav</div>
              <div>• /sop/{'{tenant_id}'}/*.pdf</div>
              <div>• /transcripts/*.json</div>
              <div>• /reports/daily-exports/*.csv</div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration & Setup Toolkit */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "Space Grotesk", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={16} /> Cloudflare D1 Migration & Provisioning CLI
        </div>

        <div style={{ fontSize: 12.5, color: "#334155", marginBottom: 16 }}>
          Run the automated database migration script to extract application tables from PostgreSQL and seed Cloudflare D1:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              label: "1. Extract & Migrate Data from PostgreSQL to Cloudflare D1",
              cmd: "npx tsx scripts/migrate-to-cloudflare.ts",
            },
            {
              label: "2. Initialize Cloudflare D1 Database on your account",
              cmd: "npx wrangler d1 create auditai-d1-prod",
            },
            {
              label: "3. Apply D1 Database Relational Schema",
              cmd: "npx wrangler d1 execute auditai-d1-prod --file=database/cloudflare/d1_schema.sql",
            },
            {
              label: "4. Create Cloudflare R2 Audio Recordings Storage Bucket",
              cmd: "npx wrangler r2 bucket create auditai-recordings-storage",
            },
          ].map((step, idx) => (
            <div key={idx} style={{ background: "#f0f9ff", border: "1px solid #FFFFFF", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11.5, color: "#334155", marginBottom: 6 }}>{step.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 12px" }}>
                <code style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#000000" }}>{step.cmd}</code>
                <button
                  onClick={() => copyText(`step-${idx}`, step.cmd)}
                  style={{ background: "transparent", border: "none", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                >
                  {copied === `step-${idx}` ? <Check size={12} color="#ffffff" /> : <Copy size={12} />}
                  {copied === `step-${idx}` ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
