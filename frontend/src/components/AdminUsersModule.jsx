import React, { useState, useEffect } from "react";
import {
  Shield, User, UserCheck, UserX, Lock, Unlock, Key, Plus, RefreshCw,
  Search, CheckCircle2, AlertCircle, Trash2, Edit3, ShieldAlert, Clock,
  FileText, Check, X
} from "lucide-react";
import { authApi } from "../lib/api";

export default function AdminUsersModule({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [newLoginEnabled, setNewLoginEnabled] = useState(true);

  // Security Policies
  const [controls, setControls] = useState({
    require_admin_approval: false,
    max_login_attempts: 5,
    lockout_minutes: 15,
    session_timeout_hours: 24,
    allow_client_self_registration: true,
  });
  const [controlsSaving, setControlsSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadUsersAndControls();
  }, []);

  async function loadUsersAndControls() {
    setLoading(true);
    setError("");
    try {
      const [usersData, controlsData, logsData] = await Promise.all([
        authApi.adminListUsers().catch(() => []),
        authApi.adminGetControls().catch(() => null),
        authApi.adminGetAuditLogs().catch(() => []),
      ]);

      if (Array.isArray(usersData)) setUsers(usersData);
      if (controlsData) setControls(controlsData);
      if (Array.isArray(logsData)) setAuditLogs(logsData);
    } catch (err) {
      setError(err.message || "Failed to load admin user data");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLogin(user) {
    const nextState = !user.login_enabled;
    try {
      await authApi.adminToggleLogin(user.id, {
        login_enabled: nextState,
        status: nextState ? (user.status === "SUSPENDED" ? "ACTIVE" : user.status) : user.status,
      });
      setSuccessMsg(`Login ${nextState ? "ENABLED" : "REVOKED"} for ${user.email}`);
      setUsers(users.map(u => (u.id === user.id ? { ...u, login_enabled: nextState } : u)));
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to update login control");
    }
  }

  async function handleStatusChange(user, newStatus) {
    try {
      await authApi.adminToggleLogin(user.id, {
        status: newStatus,
        login_enabled: newStatus === "ACTIVE" ? true : newStatus === "SUSPENDED" ? false : user.login_enabled,
      });
      setSuccessMsg(`Status for ${user.email} updated to ${newStatus}`);
      setUsers(users.map(u => (u.id === user.id ? {
        ...u,
        status: newStatus,
        login_enabled: newStatus === "ACTIVE" ? true : newStatus === "SUSPENDED" ? false : u.login_enabled,
      } : u)));
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to change user status");
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      await authApi.adminCreateUser({
        email: newEmail,
        password: newPass,
        full_name: newName,
        company: newCompany,
        role: newRole,
        login_enabled: newLoginEnabled,
        status: newLoginEnabled ? "ACTIVE" : "SUSPENDED",
      });
      setSuccessMsg(`User ${newEmail} created successfully.`);
      setShowCreateModal(false);
      setNewEmail("");
      setNewPass("");
      setNewName("");
      setNewCompany("");
      loadUsersAndControls();
    } catch (err) {
      setError(err.message || "Failed to create user");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!targetUser) return;
    try {
      await authApi.adminResetPassword(targetUser.id, newPassword);
      setSuccessMsg(`Password reset successfully for ${targetUser.email}`);
      setShowResetModal(false);
      setNewPassword("");
      setTargetUser(null);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Are you sure you want to permanently delete user ${user.email}?`)) return;
    try {
      await authApi.adminDeleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      setSuccessMsg(`User ${user.email} removed.`);
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  }

  async function handleSaveControls() {
    setControlsSaving(true);
    try {
      await authApi.adminUpdateControls(controls);
      setSuccessMsg("Security and login control policies saved.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message || "Failed to save login policies");
    } finally {
      setControlsSaving(false);
    }
  }

  const filteredUsers = users.filter(u =>
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => u.status === "ACTIVE" && u.login_enabled).length;
  const disabledCount = users.filter(u => !u.login_enabled || u.status === "SUSPENDED").length;
  const pendingCount = users.filter(u => u.status === "PENDING_APPROVAL").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} style={{ color: "#0f172a" }} />
            User Management & Login Controls
          </div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
            Full administrative authority over client access, credential management, and real-time login gating.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={loadUsersAndControls}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f0f9ff",
              border: "1px solid rgba(96, 165, 250, 0.28)",
              borderRadius: 7,
              padding: "8px 14px",
              color: "#0f172a",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
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
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: "#e0f2fe", border: "1px solid #ffffff", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} style={{ color: "#0f172a" }} /> {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: "#e0f2fe", border: "1px solid #52525b", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} style={{ color: "#0f172a" }} /> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Accounts</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4 }}>{users.length}</div>
          <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>Admin & Client accounts</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5 }}>Login Permitted</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, color: "#0f172a" }}>{activeCount}</div>
          <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>Active and verified sessions</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5 }}>Access Revoked</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, color: "#d4d4d8" }}>{disabledCount}</div>
          <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>Disabled by Administrator</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5 }}>Pending Approval</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, color: "#334155" }}>{pendingCount}</div>
          <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>Awaiting admin activation</div>
        </div>
      </div>

      {/* Login Policy & Governance Bar */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "Space Grotesk", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={15} /> System-Wide Login Security Controls
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 12 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12 }}>
              <span>Require Admin Approval for Signups</span>
              <input
                type="checkbox"
                checked={controls.require_admin_approval}
                onChange={(e) => setControls({ ...controls, require_admin_approval: e.target.checked })}
                style={{ cursor: "pointer", accentcolor: "#0f172a" }}
              />
            </label>
            <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>
              New clients cannot log in until approved
            </div>
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 12 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12 }}>
              <span>Allow Client Self-Registration</span>
              <input
                type="checkbox"
                checked={controls.allow_client_self_registration}
                onChange={(e) => setControls({ ...controls, allow_client_self_registration: e.target.checked })}
                style={{ cursor: "pointer", accentcolor: "#0f172a" }}
              />
            </label>
            <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>
              Clients can submit access requests
            </div>
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12 }}>Max Failed Attempts</span>
              <input
                type="number"
                min="1"
                max="20"
                value={controls.max_login_attempts}
                onChange={(e) => setControls({ ...controls, max_login_attempts: parseInt(e.target.value) || 5 })}
                style={{ width: 60, background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, color: "#0f172a", padding: "3px 6px", fontSize: 12 }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>
              Lockout triggered after failed tries
            </div>
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #1f1f23", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12 }}>Lockout Duration (Mins)</span>
              <input
                type="number"
                min="1"
                max="120"
                value={controls.lockout_minutes}
                onChange={(e) => setControls({ ...controls, lockout_minutes: parseInt(e.target.value) || 15 })}
                style={{ width: 60, background: "#e0f2fe", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 4, color: "#0f172a", padding: "3px 6px", fontSize: 12 }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>
              Automatic unlock time window
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSaveControls}
            disabled={controlsSaving}
            style={{
              background: "#ffffff",
              color: "#f0f9ff",
              border: "none",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {controlsSaving ? "Saving..." : "Update Security Policies"}
          </button>
        </div>
      </div>

      {/* User Directory Table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "Space Grotesk" }}>
            Registered Users & Login Privileges
          </div>
          <div style={{ position: "relative", width: 260 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "#0369a1" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user or email..."
              style={{
                width: "100%",
                background: "#f0f9ff",
                border: "1px solid rgba(96, 165, 250, 0.28)",
                borderRadius: 6,
                padding: "6px 10px 6px 30px",
                color: "#0f172a",
                fontSize: 12,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(96, 165, 250, 0.28)", color: "#334155", textAlign: "left" }}>
                <th style={{ padding: "10px 12px" }}>User</th>
                <th style={{ padding: "10px 12px" }}>Role</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Login Control</th>
                <th style={{ padding: "10px 12px" }}>Last Login</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isAdmin = u.role === "admin";
                const isLoginEnabled = u.login_enabled !== false;
                const isSuspended = u.status === "SUSPENDED";
                const isPending = u.status === "PENDING_APPROVAL";

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #e0f2fe" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{u.full_name || "Enterprise User"}</div>
                      <div style={{ fontSize: 11.5, color: "#334155", fontFamily: "JetBrains Mono" }}>{u.email}</div>
                      {u.company && <div style={{ fontSize: 11, color: "#0369a1" }}>{u.company}</div>}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          background: isAdmin ? "#ffffff" : "#e0f2fe",
                          color: isAdmin ? "#f0f9ff" : "#bae6fd",
                          border: `1px solid ${isAdmin ? "#ffffff" : "rgba(96, 165, 250, 0.28)"}`,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 9px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: isSuspended ? "#e0f2fe" : isPending ? "#e0f2fe" : "#e0f2fe",
                          color: isSuspended ? "#7dd3fc" : isPending ? "#e4e4e7" : "#ffffff",
                          border: `1px solid ${isSuspended ? "rgba(96, 165, 250, 0.35)" : isPending ? "#52525b" : "#ffffff"}`,
                        }}
                      >
                        {isSuspended ? "SUSPENDED" : isPending ? "PENDING APPROVAL" : "ACTIVE"}
                      </span>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => handleToggleLogin(u)}
                        title={isLoginEnabled ? "Click to revoke login" : "Click to permit login"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: isLoginEnabled ? "#e0f2fe" : "#ffffff",
                          color: isLoginEnabled ? "#ffffff" : "#f0f9ff",
                          border: `1px solid ${isLoginEnabled ? "#ffffff" : "#f0f9ff"}`,
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isLoginEnabled ? <Unlock size={12} /> : <Lock size={12} />}
                        {isLoginEnabled ? "PERMITTED" : "REVOKED"}
                      </button>
                    </td>

                    <td style={{ padding: "12px", color: "#334155", fontSize: 11.5 }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never logged in"}
                    </td>

                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        {isPending && (
                          <button
                            onClick={() => handleStatusChange(u, "ACTIVE")}
                            title="Approve client"
                            style={{
                              background: "#ffffff",
                              color: "#f0f9ff",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setTargetUser(u);
                            setShowResetModal(true);
                          }}
                          title="Reset Password"
                          style={{
                            background: "#e0f2fe",
                            border: "1px solid rgba(96, 165, 250, 0.28)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "#0f172a",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <Key size={12} /> Reset Pass
                        </button>

                        <button
                          onClick={() => handleStatusChange(u, isSuspended ? "ACTIVE" : "SUSPENDED")}
                          title={isSuspended ? "Activate user" : "Suspend user"}
                          style={{
                            background: "#e0f2fe",
                            border: "1px solid rgba(96, 165, 250, 0.28)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: isSuspended ? "#ffffff" : "#bae6fd",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          {isSuspended ? "Activate" : "Suspend"}
                        </button>

                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete user"
                            style={{
                              background: "#e0f2fe",
                              border: "1px solid rgba(96, 165, 250, 0.28)",
                              borderRadius: 4,
                              padding: "4px 6px",
                              color: "#0369a1",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Audit Logs Drawer/Table */}
      {auditLogs.length > 0 && (
        <div style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "Space Grotesk", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} /> Admin Security Audit Trail
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {auditLogs.slice(0, 5).map((log, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0f9ff", border: "1px solid #1c1c1f", borderRadius: 6, padding: "8px 12px", fontSize: 11.5 }}>
                <span style={{ color: "#0f172a", fontFamily: "JetBrains Mono" }}>{log.action}</span>
                <span style={{ color: "#0369a1" }}>{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: 440, background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk" }}>Add User Account</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Full Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Email</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@company.com" style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Initial Password</label>
                <input type="password" required value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Company</label>
                <input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Client Org" style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12 }}>
                    <option value="client">Client User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 4 }}>Login Control</label>
                  <select value={newLoginEnabled ? "true" : "false"} onChange={e => setNewLoginEnabled(e.target.value === "true")} style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12 }}>
                    <option value="true">Permitted</option>
                    <option value="false">Revoked</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", color: "#0f172a", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ background: "#ffffff", border: "none", color: "#f0f9ff", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && targetUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 24, 0.88)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: 400, background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>Reset Password</div>
              <button onClick={() => setShowResetModal(false)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 14 }}>
              Set new administrative password for <strong style={{ color: "#0f172a" }}>{targetUser.email}</strong>.
            </div>
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 6, padding: "8px 10px", color: "#0f172a", fontSize: 12.5, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowResetModal(false)} style={{ background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.28)", color: "#0f172a", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ background: "#ffffff", border: "none", color: "#f0f9ff", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save New Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
