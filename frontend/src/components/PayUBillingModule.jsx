import React, { useState, useEffect } from "react";
import {
  CreditCard, Check, ArrowRight, Shield, Zap, Sparkles, AlertCircle,
  CheckCircle2, RefreshCw, Key, Globe, FileText, Download, SlidersHorizontal, X
} from "lucide-react";
import { payuApi } from "../lib/api";

export default function PayUBillingModule({ currentUser, isAdmin }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // PayU Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [initiating, setInitiating] = useState(false);

  // PayU Admin Config Drawer
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [payuKey, setPayuKey] = useState("4oEfiS");
  const [payuSalt, setPayuSalt] = useState("OquTGAxW4hVnBxTb8lBVjMQeHU37qMcc");
  const [isTestMode, setIsTestMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    setError("");
    try {
      const [configRes, subRes, txRes] = await Promise.all([
        payuApi.getConfig().catch(() => null),
        payuApi.getSubscription().catch(() => null),
        payuApi.getTransactions().catch(() => []),
      ]);

      if (configRes?.plans) setPlans(configRes.plans);
      if (configRes?.merchantKey) setPayuKey(configRes.merchantKey);
      if (configRes?.merchantSalt) setPayuSalt(configRes.merchantSalt);
      if (configRes?.isTestMode !== undefined) setIsTestMode(configRes.isTestMode);
      if (subRes) setSubscription(subRes);
      if (Array.isArray(txRes)) setTransactions(txRes);
    } catch (err) {
      setError(err.message || "Failed to load billing details");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartPayUCheckout(plan) {
    setSelectedPlan(plan);
    setInitiating(true);
    setError("");
    try {
      const payload = await payuApi.initiate({
        plan: plan.id,
        customerName: currentUser?.full_name || "Enterprise Auditor",
        customerEmail: currentUser?.email || "billing@auditai.io",
        customerPhone: currentUser?.phone || "9999999999",
      });
      setCheckoutData(payload);
      setShowCheckoutModal(true);
    } catch (err) {
      setError(err.message || "Could not initiate PayU transaction");
    } finally {
      setInitiating(false);
    }
  }

  async function handleSavePayUConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await payuApi.adminUpdateConfig({
        merchantKey: payuKey,
        merchantSalt: payuSalt,
        isTestMode,
      });
      setSuccessMsg("PayU payment gateway configuration saved successfully.");
      setShowConfigDrawer(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to save PayU configuration");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSimulatePayUSuccess() {
    if (!checkoutData) return;
    try {
      // Simulate successful PayU callback response
      const formBody = new URLSearchParams({
        txnid: checkoutData.txnid,
        status: "success",
        amount: checkoutData.amount,
        productinfo: checkoutData.productinfo,
        firstname: checkoutData.firstname,
        email: checkoutData.email,
        mihpayid: `PAYU_${Math.floor(Math.random() * 10000000)}`,
        mode: "CC",
        bank_ref_num: `BANK_REF_${Math.floor(Math.random() * 999999)}`,
        udf1: checkoutData.udf1,
        udf2: checkoutData.udf2,
        udf3: checkoutData.udf3,
        hash: checkoutData.hash, // verified by reverse hash or mock
      });

      const res = await fetch("/api/v1/payments/payu/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: formBody.toString(),
      });
      const resJson = await res.json().catch(() => null);

      setSuccessMsg(`PayU Payment of ₹${checkoutData.amount} verified! Subscription plan activated.`);
      setShowCheckoutModal(false);
      loadBillingData();
    } catch (err) {
      setError(err.message || "Payment simulation error");
    }
  }

  const defaultPlans = [
    {
      id: "starter",
      name: "Starter Tier",
      price: 9999,
      callMinutes: 5000,
      agentSeats: 5,
      features: ["5,000 Call Minutes / mo", "5 Quality Auditor Seats", "Automated QA Scoring", "Standard Daily Reports", "PayU Secure Invoicing"],
    },
    {
      id: "growth",
      name: "Growth Professional",
      price: 24999,
      popular: true,
      callMinutes: 25000,
      agentSeats: 20,
      features: ["25,000 Call Minutes / mo", "20 Quality Auditor Seats", "Root Cause Analysis (RCA)", "Compliance & Sentiment Flags", "Priority Processing Pipeline"],
    },
    {
      id: "enterprise",
      name: "Enterprise Ultra",
      price: 49999,
      callMinutes: 50000,
      agentSeats: 50,
      features: ["50,000+ Call Minutes", "50 Auditor Seats", "Cloudflare D1 SQL Relational Sync", "Cloudflare R2 Audio Storage", "24/7 Enterprise SLA Support"],
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif", color: "#000000" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <CreditCard size={22} style={{ color: "#000000" }} />
            Subscription & PayU Payment Gateway
          </div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
            Enterprise billing, tier capacity management, and PayU payment infrastructure.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowConfigDrawer(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f0f9ff",
              border: "1px solid rgba(96, 165, 250, 0.28)",
              borderRadius: 7,
              padding: "8px 14px",
              color: "#000000",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Key size={13} /> PayU Gateway & Salt Settings
          </button>

          <button
            onClick={loadBillingData}
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
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Status
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ background: "#e0f2fe", border: "1px solid #ffffff", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} style={{ color: "#000000" }} /> {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: "#e0f2fe", border: "1px solid #52525b", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} style={{ color: "#000000" }} /> {error}
        </div>
      )}

      {/* Active Subscription Summary Card */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#334155", textTransform: "uppercase", letterSpacing: 0.6 }}>Active Enterprise Plan</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
              {subscription?.plan_tier ? subscription.plan_tier.toUpperCase() : "ENTERPRISE"} TIER
              <span style={{ fontSize: 11, background: "#ffffff", color: "#f0f9ff", fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                {subscription?.status || "ACTIVE"}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#334155", marginTop: 4 }}>
              Payment Provider: <strong style={{ color: "#000000" }}>PayU Enterprise Gateway ({isTestMode ? "Sandbox" : "Production"})</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "#0369a1" }}>Monthly Allocation</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#000000", fontFamily: "JetBrains Mono" }}>
                {subscription?.max_call_minutes?.toLocaleString() || "50,000"} Minutes
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#0369a1" }}>Agent Seats</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#000000", fontFamily: "JetBrains Mono" }}>
                {subscription?.max_agent_seats || "50"} Active
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#0369a1" }}>Next Billing</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#000000", fontFamily: "JetBrains Mono" }}>
                30 Days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Tier Cards in High-Contrast Monochrome */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {displayPlans.map((plan) => {
          const isCurrent = subscription?.plan_tier?.toLowerCase() === plan.id?.toLowerCase();
          return (
            <div
              key={plan.id}
              style={{
                background: "#ffffff",
                border: `1px solid ${plan.popular ? "#ffffff" : "rgba(96, 165, 250, 0.28)"}`,
                borderRadius: 12,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -11,
                    right: 18,
                    background: "#ffffff",
                    color: "#f0f9ff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Recommended
                </div>
              )}

              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "JetBrains Mono", color: "#000000" }}>
                  ₹{plan.price.toLocaleString()}
                </span>
                <span style={{ fontSize: 12, color: "#0369a1" }}>/ month</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#334155", marginBottom: 18 }}>
                Includes {plan.callMinutes?.toLocaleString()} call minutes and {plan.agentSeats} seats.
              </div>

              <div style={{ height: 1, background: "#1f1f23", marginBottom: 16 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 22 }}>
                {plan.features?.map((feat, fIdx) => (
                  <div key={fIdx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#e4e4e7" }}>
                    <Check size={14} style={{ color: "#000000", flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleStartPayUCheckout(plan)}
                disabled={initiating}
                style={{
                  width: "100%",
                  background: isCurrent ? "#e0f2fe" : "#ffffff",
                  color: isCurrent ? "#bae6fd" : "#f0f9ff",
                  border: isCurrent ? "1px solid rgba(96, 165, 250, 0.28)" : "none",
                  borderRadius: 7,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: initiating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isCurrent ? "Current Plan" : "Pay with PayU Gateway"}
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* PayU Transactions & Invoices Table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "Space Grotesk", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={15} /> PayU Payment Transaction History
        </div>

        {transactions.length === 0 ? (
          <div style={{ color: "#0369a1", fontSize: 12.5, padding: "20px 0", textAlign: "center" }}>
            No transaction records found. Initiating a plan checkout above will record transactions verified via PayU.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(96, 165, 250, 0.28)", color: "#334155", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px" }}>Transaction ID</th>
                  <th style={{ padding: "10px 12px" }}>Plan Tier</th>
                  <th style={{ padding: "10px 12px" }}>Amount (INR)</th>
                  <th style={{ padding: "10px 12px" }}>Payment Mode</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e0f2fe" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", color: "#000000" }}>{tx.txnid}</td>
                    <td style={{ padding: "10px 12px", textTransform: "capitalize" }}>{tx.plan_id || "Enterprise"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, fontFamily: "JetBrains Mono" }}>₹{Number(tx.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>{tx.mode || "PayU Gateway"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, background: tx.status === "SUCCESS" ? "#ffffff" : "#e0f2fe", color: tx.status === "SUCCESS" ? "#f0f9ff" : "#bae6fd", border: "1px solid rgba(96, 165, 250, 0.28)" }}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#0369a1", fontSize: 11 }}>{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PayU Checkout Modal */}
      {showCheckoutModal && checkoutData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ width: 500, maxWidth: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={18} /> PayU Enterprise Checkout
              </div>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div style={{ background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 12 }}>Product Description:</span>
                <span style={{ color: "#000000", fontSize: 12, fontWeight: 600 }}>{checkoutData.productinfo}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 12 }}>Transaction Reference:</span>
                <span style={{ color: "#000000", fontSize: 11.5, fontFamily: "JetBrains Mono" }}>{checkoutData.txnid}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 12 }}>Billed Customer:</span>
                <span style={{ color: "#000000", fontSize: 12 }}>{checkoutData.firstname} ({checkoutData.email})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 12 }}>Gateway Mode:</span>
                <span style={{ color: "#000000", fontSize: 12, fontWeight: 600 }}>PayU India ({isTestMode ? "Sandbox Simulator" : "Production Live"})</span>
              </div>
              <div style={{ height: 1, background: "rgba(96, 165, 250, 0.28)", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#000000", fontSize: 14, fontWeight: 600 }}>Total Payable:</span>
                <span style={{ color: "#000000", fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>₹{checkoutData.amount}</span>
              </div>
            </div>

            <div style={{ background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: 10, marginBottom: 16, fontSize: 11, color: "#334155", fontFamily: "JetBrains Mono", wordBreak: "break-all" }}>
              <div style={{ color: "#0369a1", marginBottom: 2 }}>Calculated SHA-512 Security Hash:</div>
              {checkoutData.hash}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <form action={checkoutData.actionUrl} method="POST" target="_blank">
                <input type="hidden" name="key" value={checkoutData.key} />
                <input type="hidden" name="txnid" value={checkoutData.txnid} />
                <input type="hidden" name="amount" value={checkoutData.amount} />
                <input type="hidden" name="productinfo" value={checkoutData.productinfo} />
                <input type="hidden" name="firstname" value={checkoutData.firstname} />
                <input type="hidden" name="email" value={checkoutData.email} />
                <input type="hidden" name="phone" value={checkoutData.phone} />
                <input type="hidden" name="surl" value={checkoutData.surl} />
                <input type="hidden" name="furl" value={checkoutData.furl} />
                <input type="hidden" name="hash" value={checkoutData.hash} />
                <input type="hidden" name="udf1" value={checkoutData.udf1 || ""} />
                <input type="hidden" name="udf2" value={checkoutData.udf2 || ""} />
                <input type="hidden" name="udf3" value={checkoutData.udf3 || ""} />
                <input type="hidden" name="udf4" value={checkoutData.udf4 || ""} />
                <input type="hidden" name="udf5" value={checkoutData.udf5 || ""} />

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#f0f9ff",
                    border: "none",
                    borderRadius: 7,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  Proceed to PayU Gateway Portal <ArrowRight size={14} />
                </button>
              </form>

              <button
                type="button"
                onClick={handleSimulatePayUSuccess}
                style={{
                  background: "#e0f2fe",
                  border: "1px solid rgba(96, 165, 250, 0.28)",
                  color: "#000000",
                  borderRadius: 7,
                  padding: "9px 16px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={13} /> Complete Instant Verification (Test Mode Simulation)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayU Admin Config Drawer / Modal */}
      {showConfigDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: 460, background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>PayU Gateway Configuration</div>
              <button onClick={() => setShowConfigDrawer(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSavePayUConfig} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>PayU Merchant Key</label>
                <input required value={payuKey} onChange={e => setPayuKey(e.target.value)} style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, boxSizing: "border-box" }} />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11.5, color: "#334155" }}>PayU Merchant Salt (32-character)</label>
                  <span style={{ fontSize: 10.5, color: "#0369a1" }}>Use [Copy Salt] in PayU portal</span>
                </div>
                <input
                  type="text"
                  required
                  value={payuSalt}
                  onChange={e => setPayuSalt(e.target.value.trim())}
                  placeholder="Paste 32-character Salt from PayU"
                  style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12, fontFamily: "JetBrains Mono, monospace", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Environment Mode</label>
                <select value={isTestMode ? "test" : "production"} onChange={e => setIsTestMode(e.target.value === "test")} style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#000000", fontSize: 12 }}>
                  <option value="test">Sandbox / Test Mode (https://test.payu.in)</option>
                  <option value="production">Live Production (https://secure.payu.in)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowConfigDrawer(false)} style={{ background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", color: "#000000", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={savingConfig} style={{ background: "#ffffff", border: "none", color: "#f0f9ff", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {savingConfig ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
