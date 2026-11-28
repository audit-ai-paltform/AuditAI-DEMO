import React, { useState, useEffect } from "react";
import {
  Search, Shield, Building2, Mail, Phone, Clock, CreditCard,
  Users, CheckCircle2, AlertCircle, RefreshCw, Send, Lock, Unlock,
  Calendar, Key, History, UserCheck, ShieldCheck
} from "lucide-react";
import { adminPortalApi } from "../lib/api";

export default function UniversalSearchModule() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    executeSearch("");
  }, []);

  async function executeSearch(q) {
    setLoading(true);
    try {
      const res = await adminPortalApi.universalSearch(q);
      const items = res.data || [];
      setResults(items);
      if (items.length > 0 && !selectedUser) {
        setSelectedUser(items[0]);
      } else if (items.length > 0 && selectedUser) {
        const updated = items.find(u => u.id === selectedUser.id) || items[0];
        setSelectedUser(updated);
      }
    } catch (err) {
      setErrorMsg(err.message || "Universal search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    executeSearch(query);
  }

  async function handleSendReminder(userId) {
    setSendingReminder(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await adminPortalApi.sendPaymentReminder(userId);
      setSuccessMsg(res.message || "Payment reminder dispatched successfully.");
      executeSearch(query);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to dispatch reminder");
    } finally {
      setSendingReminder(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#000000", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={22} /> Universal Audit & Telemetry Search
        </h2>
        <div style={{ fontSize: 13, color: "#000000", marginTop: 2 }}>
          Deep-search the entire platform across <strong>Name, Email, Company Name, and Phone Number</strong> to inspect login/logout audits, subscriptions, team seats, and access credentials.
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ background: "rgba(34, 197, 94, 0.25)", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: "rgba(244, 63, 94, 0.25)", border: "1px solid #fda4af", borderRadius: 8, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 10, padding: "10px 16px" }}>
          <Search size={18} color="#bae6fd" />
          <input
            type="text"
            placeholder="Type any Name (e.g. Priya), Email (e.g. acme), Company (e.g. Zenith), or Phone (+91 98765)..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              executeSearch(e.target.value);
            }}
            style={{ width: "100%", background: "transparent", border: "none", color: "#000000", fontSize: 14, outline: "none" }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); executeSearch(""); }} style={{ background: "none", border: "none", color: "#000000", cursor: "pointer", fontSize: 13 }}>
              Clear
            </button>
          )}
        </div>

        <button
          type="submit"
          style={{
            background: "#ffffff",
            color: "#0369a1",
            border: "none",
            borderRadius: 10,
            padding: "0 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {loading ? <RefreshCw size={15} className="spin" /> : <Search size={15} />} Search
        </button>
      </form>

      {/* Two Column Layout: Results List + Comprehensive Dossier View */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
        {/* Left Column: Matched Entities */}
        <div style={{ background: "rgba(13, 36, 78, 0.7)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 16, height: "calc(100vh - 270px)", overflowY: "auto" }}>
          <div style={{ fontSize: 12, color: "#000000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Search Results ({results.length})
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "#000000", fontSize: 13 }}>
              No accounts found matching "{query}". Try a different name, company, email, or phone.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    style={{
                      background: isSelected ? "#bae6fd" : "rgba(0, 0, 0, 0.15)",
                      border: isSelected ? "2px solid #ffffff" : "1px solid #bae6fd",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{user.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#bae6fd", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                        {user.user_type}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "#000000", marginTop: 3 }}>{user.company_name}</div>
                    <div style={{ fontSize: 11, color: "#000000", marginTop: 2 }}>{user.email} • {user.phone}</div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 11 }}>
                      <span style={{ color: user.status === "ACTIVE" ? "#86efac" : "#fda4af", fontWeight: 600 }}>
                        ● {user.status}
                      </span>
                      <span style={{ color: "#000000", fontWeight: 600 }}>{user.subscription_tier}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Telemetry Dossier */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 24, height: "calc(100vh - 270px)", overflowY: "auto" }}>
          {selectedUser ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Header Info Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.2)", paddingBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk" }}>{selectedUser.name}</div>
                  <div style={{ fontSize: 13, color: "#000000", marginTop: 2, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span><Building2 size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedUser.company_name}</span>
                    <span>•</span>
                    <span><Mail size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedUser.email}</span>
                    <span>•</span>
                    <span><Phone size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedUser.phone}</span>
                  </div>
                </div>

                {selectedUser.user_type === "client" && (
                  <button
                    onClick={() => handleSendReminder(selectedUser.id)}
                    disabled={sendingReminder}
                    style={{
                      background: "#ffffff",
                      color: "#0369a1",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: sendingReminder ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Send size={13} /> Send Automated Payment Reminder
                  </button>
                )}
              </div>

              {/* 4 Telemetry Grid Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {/* 1. Access Credentials */}
                <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#000000", textTransform: "uppercase", fontWeight: 700 }}>Access Credentials</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{selectedUser.role}</div>
                  <div style={{ fontSize: 12, color: selectedUser.status === "ACTIVE" ? "#86efac" : "#fda4af", fontWeight: 700, marginTop: 4 }}>
                    STATUS: {selectedUser.status}
                  </div>
                  <div style={{ fontSize: 11, color: "#000000", marginTop: 4 }}>Total Sessions: {selectedUser.login_count}</div>
                </div>

                {/* 2. Subscription Data */}
                <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#000000", textTransform: "uppercase", fontWeight: 700 }}>Subscription Telemetry</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{selectedUser.subscription_tier}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {selectedUser.amount_due > 0 ? (
                      <span style={{ color: "#fda4af", fontWeight: 700 }}>Renewal Due: ₹{selectedUser.amount_due.toLocaleString()}</span>
                    ) : (
                      <span style={{ color: "#059669", fontWeight: 600 }}>Account Paid & Current</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#000000", marginTop: 4 }}>Due Date: {selectedUser.due_date}</div>
                </div>

                {/* 3. Login Timestamps */}
                <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#000000", textTransform: "uppercase", fontWeight: 700 }}>Recent Auth Session</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <span style={{ color: "#000000" }}>Last Login: </span>
                    <span style={{ fontWeight: 600 }}>{selectedUser.last_login_at === "Never" ? "Never" : new Date(selectedUser.last_login_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: "#000000" }}>Last Logout: </span>
                    <span style={{ fontWeight: 600 }}>{selectedUser.last_logout_at === "Never" ? "Never" : new Date(selectedUser.last_logout_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* 4. Team Allocation */}
                <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#000000", textTransform: "uppercase", fontWeight: 700 }}>Organization Team</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Space Grotesk", marginTop: 4 }}>
                    {selectedUser.organization_team?.length || 0} Seats Active
                  </div>
                  <div style={{ fontSize: 11, color: "#000000", marginTop: 4 }}>Assigned to {selectedUser.company_name}</div>
                </div>
              </div>

              {/* Login & Logout History Audit Trail */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <History size={15} /> Login & Logout Audit History Telemetry
                </div>

                {selectedUser.login_history?.length === 0 ? (
                  <div style={{ padding: 16, background: "#f0f9ff", borderRadius: 8, fontSize: 12, color: "#000000" }}>
                    No recorded sessions yet for this user.
                  </div>
                ) : (
                  <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 8, overflow: "hidden", border: "1px solid #bae6fd" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#e0f2fe", color: "#000000", fontSize: 11 }}>
                          <th style={{ padding: "8px 12px" }}>Timestamp</th>
                          <th style={{ padding: "8px 12px" }}>Event Type</th>
                          <th style={{ padding: "8px 12px" }}>IP Address</th>
                          <th style={{ padding: "8px 12px" }}>Client User Agent</th>
                          <th style={{ padding: "8px 12px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.login_history?.map((sess, sIdx) => (
                          <tr key={sIdx} style={{ borderBottom: "1px solid #bae6fd" }}>
                            <td style={{ padding: "8px 12px" }}>{new Date(sess.timestamp).toLocaleString()}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700, color: sess.type === "LOGIN" ? "#059669" : "#0284C7" }}>{sess.type}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{sess.ip}</td>
                            <td style={{ padding: "8px 12px" }}>{sess.userAgent}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ background: "rgba(34,197,94,0.2)", color: "#059669", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                {sess.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Organization Team Seats Details */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={15} /> Organization Team Members ({selectedUser.organization_team?.length || 0})
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  {selectedUser.organization_team?.map((member) => (
                    <div key={member.id} style={{ background: "rgba(0, 0, 0, 0.25)", border: "1px solid #bae6fd", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{member.name}</div>
                      <div style={{ fontSize: 11.5, color: "#000000" }}>{member.email}</div>
                      <div style={{ fontSize: 11, color: "#000000", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                        <span>Role: {member.role}</span>
                        <span style={{ color: "#059669" }}>{member.lastActive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#000000" }}>
              Select a user or company from the left column to view the full audit and access dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
