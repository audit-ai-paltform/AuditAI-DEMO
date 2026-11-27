import React, { useState, useEffect } from "react";
import {
  Shield, UserCheck, UserX, UserPlus, Search, CheckCircle2,
  AlertCircle, RefreshCw, Mail, Phone, Building2, CreditCard,
  Clock, Send, BellRing, Users, ChevronDown, ChevronUp, Lock, Unlock
} from "lucide-react";
import { adminPortalApi } from "../lib/api";

export default function AdminAccessControlModule({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'client' | 'employee' | 'admin'
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    user_type: "client",
    role: "Client Administrator",
    subscription_tier: "Growth Professional",
  });
  const [addingUser, setAddingUser] = useState(false);

  // Expanded Team View
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filterType]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminPortalApi.getAccessUsers(filterType === "ALL" ? "" : filterType);
      if (res.data) setUsers(res.data);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load platform access users");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
    setActionLoadingId(user.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await adminPortalApi.updateUserAccess(user.id, { status: nextStatus });
      setSuccessMsg(`Access for ${user.name} has been ${nextStatus === "ACTIVE" ? "GRANTED (Active)" : "REVOKED"}.`);
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update access status");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleSendReminder(user) {
    setActionLoadingId(user.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await adminPortalApi.sendPaymentReminder(user.id);
      setSuccessMsg(res.message || `Payment reminder dispatched to ${user.email}.`);
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to send payment reminder");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setAddingUser(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await adminPortalApi.addAccessUser(newUser);
      setSuccessMsg(`New ${newUser.user_type} "${newUser.name}" added successfully.`);
      setShowAddModal(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        user_type: "client",
        role: "Client Administrator",
        subscription_tier: "Growth Professional",
      });
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.company_name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#ffffff", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} /> Client & Employee Access Control
          </h2>
          <div style={{ fontSize: 13, color: "#bae6fd", marginTop: 2 }}>
            Provision, monitor, grant, and revoke platform access for client organizations and internal employees.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "#ffffff",
              color: "#38bdf8",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <UserPlus size={15} /> Add Client / Employee
          </button>

          <button
            onClick={loadUsers}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "1px solid rgba(96, 165, 250, 0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
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

      {/* Filters & Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, background: "rgba(13, 36, 78, 0.6)", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", "client", "employee", "admin"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? "#ffffff" : "rgba(255, 255, 255, 0.12)",
                color: filterType === type ? "#0284c7" : "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {type === "ALL" ? "All Users" : `${type}s`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0, 0, 0, 0.25)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 6, padding: "6px 12px", minWidth: 260 }}>
          <Search size={14} color="#bae6fd" />
          <input
            type="text"
            placeholder="Search by name, email, company, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 12.5, width: "100%", outline: "none" }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{ background: "rgba(11, 29, 62, 0.85)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(3, 105, 161, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.2)", color: "#bae6fd", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <th style={{ padding: "12px 16px" }}>User & Organization</th>
              <th style={{ padding: "12px 16px" }}>Type & Role</th>
              <th style={{ padding: "12px 16px" }}>Access Status</th>
              <th style={{ padding: "12px 16px" }}>Subscription & Due</th>
              <th style={{ padding: "12px 16px" }}>Last Login</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#e0f2fe" }}>
                  No platform users found matching your query.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isExpanded = expandedTeamId === user.id;
                const isActive = user.status === "ACTIVE";
                const isDue = user.subscription_status === "PAYMENT_DUE";

                return (
                  <React.Fragment key={user.id}>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.12)", background: isExpanded ? "rgba(255,255,255,0.06)" : "transparent" }}>
                      {/* Name & Contact */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#ffffff" }}>{user.name}</div>
                        <div style={{ fontSize: 11.5, color: "#bae6fd", marginTop: 2, display: "flex", alignItems: "center", gap: 10 }}>
                          <span>{user.email}</span>
                          <span>•</span>
                          <span>{user.phone}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#e0f2fe", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <Building2 size={11} /> {user.company_name}
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                          {user.user_type}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginTop: 4 }}>{user.role}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isActive ? "rgba(34, 197, 94, 0.25)" : "rgba(244, 63, 94, 0.25)",
                            color: isActive ? "#86efac" : "#fda4af",
                            border: `1px solid ${isActive ? "#86efac" : "#fda4af"}`,
                          }}
                        >
                          {isActive ? <Unlock size={12} /> : <Lock size={12} />}
                          {user.status}
                        </span>
                      </td>

                      {/* Subscription & Amount Due */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{user.subscription_tier}</div>
                        {user.user_type === "client" ? (
                          <div style={{ fontSize: 11.5, marginTop: 2 }}>
                            {isDue ? (
                              <span style={{ color: "#fda4af", fontWeight: 700 }}>Due: ₹{user.amount_due.toLocaleString()}</span>
                            ) : (
                              <span style={{ color: "#86efac" }}>Paid (Active)</span>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#bae6fd" }}>Staff Seat</div>
                        )}
                        {user.last_payment_reminder_sent && (
                          <div style={{ fontSize: 10, color: "#e0f2fe", marginTop: 2 }}>
                            Reminder sent: {new Date(user.last_payment_reminder_sent).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td style={{ padding: "14px 16px", color: "#e0f2fe", fontSize: 12 }}>
                        {user.last_login_at === "Never" ? "Never logged in" : new Date(user.last_login_at).toLocaleString()}
                        <div style={{ fontSize: 10.5, color: "#bae6fd" }}>{user.login_count} total sessions</div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                          {/* Toggle Access Button */}
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={actionLoadingId === user.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: isActive ? "rgba(244, 63, 94, 0.25)" : "rgba(34, 197, 94, 0.25)",
                              color: "#ffffff",
                              border: `1px solid ${isActive ? "#fda4af" : "#86efac"}`,
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            title={isActive ? "Revoke user platform access immediately" : "Grant active access to user"}
                          >
                            {isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                            {isActive ? "Revoke Access" : "Grant Access"}
                          </button>

                          {/* One-Click Automated Payment Reminder */}
                          {user.user_type === "client" && (
                            <button
                              onClick={() => handleSendReminder(user)}
                              disabled={actionLoadingId === user.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                background: "#ffffff",
                                color: "#38bdf8",
                                border: "none",
                                borderRadius: 6,
                                padding: "5px 10px",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="Send automated email & webhook payment reminder for active or due renewal"
                            >
                              <Send size={12} /> Send Reminder
                            </button>
                          )}

                          {/* Expand Organization Team */}
                          <button
                            onClick={() => setExpandedTeamId(isExpanded ? null : user.id)}
                            style={{
                              background: "rgba(255, 255, 255, 0.15)",
                              border: "1px solid rgba(96, 165, 250, 0.25)",
                              color: "#ffffff",
                              borderRadius: 6,
                              padding: "5px 8px",
                              cursor: "pointer",
                            }}
                            title="View Associated Team & Seats"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Organization Team Drawer */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(2, 132, 199, 0.35)", borderBottom: "1px solid rgba(255, 255, 255, 0.2)" }}>
                        <td colSpan={6} style={{ padding: "14px 20px" }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <Users size={14} /> Organization Team Members & Seat Allocations for {user.company_name} ({user.organization_team?.length || 0} Members)
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                            {user.organization_team?.map((member) => (
                              <div key={member.id} style={{ background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 6, padding: "8px 12px" }}>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{member.name}</div>
                                <div style={{ fontSize: 11, color: "#bae6fd" }}>{member.email}</div>
                                <div style={{ fontSize: 10.5, color: "#e0f2fe", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                                  <span>Role: {member.role}</span>
                                  <span>{member.lastActive}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* -------------------- Add User Modal -------------------- */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ width: 480, maxWidth: "100%", background: "#08162d", border: "2px solid #ffffff", borderRadius: 14, padding: 24, color: "#ffffff" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <UserPlus size={18} /> Provision New Client or Employee
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sumanth Rao"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  style={{ width: "100%", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. sumanth@organization.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ width: "100%", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98220 33445"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  style={{ width: "100%", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Retail / AuditAI Internal"
                  value={newUser.company_name}
                  onChange={e => setNewUser({ ...newUser, company_name: e.target.value })}
                  style={{ width: "100%", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Account Type</label>
                  <select
                    value={newUser.user_type}
                    onChange={e => setNewUser({ ...newUser, user_type: e.target.value })}
                    style={{ width: "100%", background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                  >
                    <option value="client">Client / Partner</option>
                    <option value="employee">Staff Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#bae6fd", marginBottom: 4 }}>Functional Role</label>
                  <input
                    type="text"
                    placeholder="e.g. QA Manager"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ width: "100%", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "8px 10px", color: "#ffffff", fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "#ffffff", borderRadius: 6, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  style={{ background: "#ffffff", color: "#38bdf8", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12.5, fontWeight: 700, cursor: addingUser ? "not-allowed" : "pointer" }}
                >
                  {addingUser ? "Provisioning..." : "Provision Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
