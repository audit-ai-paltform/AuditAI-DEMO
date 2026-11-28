import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Shield,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Calendar,
  FileText,
  Key,
  Lock,
  Save,
  RefreshCw,
  ExternalLink,
  Zap,
  ArrowRight,
  Sliders,
  DollarSign,
  Clock,
} from "lucide-react";
import { billingApi } from "../lib/api";

export default function AdminSubscriptionsModule() {
  const [activeSection, setActiveSection] = useState("gateways"); // 'gateways' | 'subscriptions' | 'payments' | 'invoices'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Gateway Config State
  const [gatewayConfigs, setGatewayConfigs] = useState({
    payu: {
      key_id: "mYj1P3",
      key_secret: "",
      is_test_mode: true,
      active: true,
      webhook_secret: "",
    },
    razorpay: {
      key_id: "rzp_test_AuditAI2026",
      key_secret: "",
      is_test_mode: true,
      active: true,
      webhook_secret: "",
    },
  });

  // Data lists
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [gwRes, subsRes, paysRes, invRes] = await Promise.allSettled([
        billingApi.getGatewayConfigs(),
        billingApi.getAllSubscriptions(),
        billingApi.getAllPayments(),
        billingApi.getInvoices(),
      ]);

      if (gwRes.status === "fulfilled" && gwRes.value) {
        setGatewayConfigs(gwRes.value.data || gwRes.value);
      }
      if (subsRes.status === "fulfilled" && subsRes.value) {
        setSubscriptions(subsRes.value.data || subsRes.value || []);
      }
      if (paysRes.status === "fulfilled" && paysRes.value) {
        setPayments(paysRes.value.data || paysRes.value || []);
      }
      if (invRes.status === "fulfilled" && invRes.value) {
        setInvoices(invRes.value.data || invRes.value || []);
      }
    } catch (err) {
      console.error("Failed to load billing admin data", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGateway(gateway) {
    setLoading(true);
    setFeedback(null);
    try {
      const config = gatewayConfigs[gateway];
      await billingApi.updateGatewayConfig(gateway, config);
      setFeedback({ type: "success", message: `${gateway.toUpperCase()} configuration updated and saved live!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update gateway configuration" });
    } finally {
      setLoading(false);
    }
  }

  async function handleExtendSubscription(tenantId) {
    if (!confirm(`Extend subscription for tenant ${tenantId} by 30 days?`)) return;
    setLoading(true);
    try {
      await billingApi.extendSubscription(tenantId, 30);
      setFeedback({ type: "success", message: `Subscription extended by 30 calendar days.` });
      const updated = await billingApi.getAllSubscriptions();
      setSubscriptions(updated.data || updated || []);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to extend subscription" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefundPayment(paymentId) {
    const reason = prompt("Enter reason for payment refund:", "Customer requested service cancellation");
    if (!reason) return;
    setLoading(true);
    try {
      const res = await billingApi.refundPayment(paymentId, { reason });
      if (res.success) {
        setFeedback({ type: "success", message: `Payment ${paymentId} refunded successfully.` });
        const updated = await billingApi.getAllPayments();
        setPayments(updated.data || updated || []);
      } else {
        setFeedback({ type: "error", message: res.error || "Refund failed" });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Refund processing failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #f0f9ff 100%)",
          border: "1px solid #FFFFFF",
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
              <CreditCard size={20} color="#38bdf8" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#000000" }}>
              Dual Payment Gateways & Subscription Engine
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>
            Production control center for PayU Hosted Checkout & Razorpay API, real-time subscription lifecycle, payment ledger, and GST tax invoices.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          style={{
            background: "rgba(56,189,248,0.12)",
            border: "1px solid #38bdf8",
            color: "#0369a1",
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
          Sync Billing Data
        </button>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
            color: feedback.type === "success" ? "#16a34a" : "#dc2626",
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

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #FFFFFF", paddingBottom: 12 }}>
        {[
          { id: "gateways", label: "Dual Gateways Config", icon: Sliders },
          { id: "subscriptions", label: `Active Subscriptions (${subscriptions.length})`, icon: Calendar },
          { id: "payments", label: `Payment Ledger (${payments.length})`, icon: DollarSign },
          { id: "invoices", label: `GST Invoices (${invoices.length})`, icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              style={{
                background: isActive ? "#0284C7" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#334155",
                border: `1px solid ${isActive ? "#0284C7" : "#BAE6FD"}`,
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

      {/* SECTION 1: Dual Gateways Configuration */}
      {activeSection === "gateways" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: 24 }}>
          {/* PayU Panel */}
          <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(56,189,248,0.1)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: "#000000", fontWeight: 700 }}>PayU Hosted Checkout</h3>
                  <span style={{ fontSize: 12, color: "#334155" }}>SHA-512 Reverse Hash Signature Verified</span>
                </div>
              </div>
              <span
                style={{
                  background: gatewayConfigs.payu?.active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)",
                  color: gatewayConfigs.payu?.active ? "#16a34a" : "#94a3b8",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {gatewayConfigs.payu?.active ? "ENABLED" : "DISABLED"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6, fontWeight: 600 }}>
                  Merchant Key (key)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={gatewayConfigs.payu?.key_id || ""}
                    onChange={(e) =>
                      setGatewayConfigs({
                        ...gatewayConfigs,
                        payu: { ...gatewayConfigs.payu, key_id: e.target.value },
                      })
                    }
                    placeholder="Enter PayU Merchant Key"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#f0f9ff",
                      border: "1px solid #FFFFFF",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#000000",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6, fontWeight: 600 }}>
                  Merchant Salt / Secret
                </label>
                <input
                  type="password"
                  value={gatewayConfigs.payu?.key_secret || ""}
                  onChange={(e) =>
                    setGatewayConfigs({
                      ...gatewayConfigs,
                      payu: { ...gatewayConfigs.payu, key_secret: e.target.value },
                    })
                  }
                  placeholder="Enter PayU Salt"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f0f9ff",
                    border: "1px solid #FFFFFF",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#000000",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #FFFFFF" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#000000" }}>Environment Mode</div>
                  <div style={{ fontSize: 12, color: "#334155" }}>
                    {gatewayConfigs.payu?.is_test_mode ? "Test Sandbox (test.payu.in)" : "Production Live (secure.payu.in)"}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setGatewayConfigs({
                      ...gatewayConfigs,
                      payu: { ...gatewayConfigs.payu, is_test_mode: !gatewayConfigs.payu.is_test_mode },
                    })
                  }
                  style={{
                    background: gatewayConfigs.payu?.is_test_mode ? "#f59e0b" : "#10b981",
                    color: "#0F172A",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {gatewayConfigs.payu?.is_test_mode ? "TEST MODE" : "LIVE PRODUCTION"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => handleSaveGateway("payu")}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: "#38bdf8",
                    color: "#0F172A",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px",
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
                  Save PayU Configuration
                </button>
              </div>
            </div>
          </div>

          {/* Razorpay Panel */}
          <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(56,189,248,0.1)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: "#000000", fontWeight: 700 }}>Razorpay Native Modal</h3>
                  <span style={{ fontSize: 12, color: "#334155" }}>HMAC SHA-256 Client & Server Verified</span>
                </div>
              </div>
              <span
                style={{
                  background: gatewayConfigs.razorpay?.active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)",
                  color: gatewayConfigs.razorpay?.active ? "#16a34a" : "#94a3b8",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {gatewayConfigs.razorpay?.active ? "ENABLED" : "DISABLED"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6, fontWeight: 600 }}>
                  Razorpay Key ID (rzp_test_... or rzp_live_...)
                </label>
                <input
                  type="text"
                  value={gatewayConfigs.razorpay?.key_id || ""}
                  onChange={(e) =>
                    setGatewayConfigs({
                      ...gatewayConfigs,
                      razorpay: { ...gatewayConfigs.razorpay, key_id: e.target.value },
                    })
                  }
                  placeholder="Enter Razorpay Key ID"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f0f9ff",
                    border: "1px solid #FFFFFF",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#000000",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6, fontWeight: 600 }}>
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  value={gatewayConfigs.razorpay?.key_secret || ""}
                  onChange={(e) =>
                    setGatewayConfigs({
                      ...gatewayConfigs,
                      razorpay: { ...gatewayConfigs.razorpay, key_secret: e.target.value },
                    })
                  }
                  placeholder="Enter Razorpay Key Secret"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f0f9ff",
                    border: "1px solid #FFFFFF",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#000000",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #FFFFFF" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#000000" }}>Environment Mode</div>
                  <div style={{ fontSize: 12, color: "#334155" }}>
                    {gatewayConfigs.razorpay?.is_test_mode ? "Test Sandbox (rzp_test_...)" : "Production Live (rzp_live_...)"}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setGatewayConfigs({
                      ...gatewayConfigs,
                      razorpay: { ...gatewayConfigs.razorpay, is_test_mode: !gatewayConfigs.razorpay.is_test_mode },
                    })
                  }
                  style={{
                    background: gatewayConfigs.razorpay?.is_test_mode ? "#f59e0b" : "#10b981",
                    color: "#0F172A",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {gatewayConfigs.razorpay?.is_test_mode ? "TEST MODE" : "LIVE PRODUCTION"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => handleSaveGateway("razorpay")}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: "#38bdf8",
                    color: "#0F172A",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px",
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
                  Save Razorpay Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Active Subscriptions */}
      {activeSection === "subscriptions" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "#000000", fontWeight: 700 }}>Tenant Subscriptions</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155" }}>
                Multi-tenant billing lifecycle management, automated grace periods, and renewal extensions.
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0f9ff", color: "#334155", borderBottom: "1px solid #FFFFFF" }}>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Tenant ID</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Plan</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Gateway</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Period Valid Until</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#334155" }}>
                      No subscription records found.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const isValid = new Date(sub.current_period_end).getTime() > Date.now();
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #FFFFFF" }}>
                        <td style={{ padding: "16px 20px", color: "#000000", fontFamily: "monospace" }}>
                          {sub.tenant_id}
                        </td>
                        <td style={{ padding: "16px 20px", color: "#0369a1", fontWeight: 600 }}>
                          {sub.plan_name || sub.plan_code || "Growth Professional"}
                        </td>
                        <td style={{ padding: "16px 20px", color: "#334155" }}>
                          <span style={{ textTransform: "uppercase", background: "rgba(56,189,248,0.1)", color: "#0369a1", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            {sub.gateway || "PAYU"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", color: isValid ? "#cbd5e1" : "#dc2626" }}>
                          {new Date(sub.current_period_end).toLocaleDateString()} ({isValid ? "Active" : "Expired"})
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <span
                            style={{
                              background: sub.status === "ACTIVE" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                              color: sub.status === "ACTIVE" ? "#16a34a" : "#dc2626",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <button
                            onClick={() => handleExtendSubscription(sub.tenant_id)}
                            style={{
                              background: "rgba(56,189,248,0.15)",
                              border: "1px solid #38bdf8",
                              color: "#0369a1",
                              borderRadius: 6,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            + Extend 30 Days
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: Payment Ledger */}
      {activeSection === "payments" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #FFFFFF" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#000000", fontWeight: 700 }}>Payment Transactions Ledger</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155" }}>
              Immutable audit ledger of verified payments across PayU and Razorpay with one-click administrative refund processing.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0f9ff", color: "#334155", borderBottom: "1px solid #FFFFFF" }}>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Payment ID / Ref</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Gateway</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Verified At</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#334155" }}>
                      No payment transactions recorded yet. Complete a checkout to populate this ledger.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #FFFFFF" }}>
                      <td style={{ padding: "16px 20px", color: "#000000", fontFamily: "monospace" }}>
                        <div>{p.id}</div>
                        <div style={{ fontSize: 11, color: "#334155" }}>{p.gateway_payment_id || p.order_id}</div>
                      </td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        <span style={{ textTransform: "uppercase", background: "rgba(56,189,248,0.1)", color: "#0369a1", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {p.gateway}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", color: "#16a34a", fontWeight: 700 }}>
                        ₹{(p.amount_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        {p.verified_at ? new Date(p.verified_at).toLocaleString() : "Pending"}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            background: p.status === "SUCCESS" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            color: p.status === "SUCCESS" ? "#16a34a" : "#dc2626",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        {p.status === "SUCCESS" && (
                          <button
                            onClick={() => handleRefundPayment(p.id)}
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              border: "1px solid #ef4444",
                              color: "#dc2626",
                              borderRadius: 6,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Refund Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: Invoices */}
      {activeSection === "invoices" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #FFFFFF" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#000000", fontWeight: 700 }}>GST Tax Invoices</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155" }}>
              Gapless GST-compliant tax invoices (SAC code 998313) automatically generated upon successful payment.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0f9ff", color: "#334155", borderBottom: "1px solid #FFFFFF" }}>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Invoice #</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Issued Date</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Subtotal (Excl. Tax)</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>GST (18%)</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Total Amount</th>
                  <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#334155" }}>
                      No tax invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #FFFFFF" }}>
                      <td style={{ padding: "16px 20px", color: "#0369a1", fontWeight: 700, fontFamily: "monospace" }}>
                        {inv.number}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        {new Date(inv.issued_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        ₹{(inv.subtotal_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        ₹{(inv.gst_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#000000", fontWeight: 700 }}>
                        ₹{(inv.total_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            background: "rgba(16,185,129,0.2)",
                            color: "#16a34a",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {inv.status}
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
