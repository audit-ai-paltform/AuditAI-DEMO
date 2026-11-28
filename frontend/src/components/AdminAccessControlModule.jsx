import React, { useState, useEffect } from "react";
import {
  Shield, UserCheck, UserX, UserPlus, Search, CheckCircle2,
  AlertCircle, RefreshCw, Mail, Phone, Building2, CreditCard,
  Clock, Send, BellRing, Users, Lock, Unlock, Sliders, LayoutGrid, Save
} from "lucide-react";
import { adminPortalApi } from "../lib/api";

const ALL_PLATFORM_FEATURES = [
  { id: "dashboard", label: "Audit Dashboard (with Critical Alerts)" },
  { id: "sop_parameters", label: "SOP & Parameters (Operations)" },
  { id: "scores", label: "Call Scores, Transcripts, Re-audit & Revalidation" },
  { id: "agents", label: "Agent Mapping & 24–48h Auto-Disable" },
  { id: "qctools", label: "7 QC Tools" },
  { id: "csvupload", label: "CSV Upload" },
  { id: "reports", label: "Reports (Daily, Weekly, Monthly)" },
  { id: "audittrail", label: "Audit Trail" },
  { id: "sales_forecasting", label: "AI Sales Forecasting" },
  { id: "data_fishing", label: "Ask Qalyzer Data Fishing" },
  { id: "knowledge_hub", label: "Products & Effective SOPs" },
  { id: "crm_setup", label: "CRM Setup (Knowlarity & Webhooks)" },
  { id: "settings", label: "Audit Configuration" },
  { id: "cloudflare_db", label: "Cloudflare D1 & R2" },
  { id: "payu_billing", label: "PayU & Razorpay Billing" },
  { id: "admin_access", label: "Role Dashboards & Access Control" },
  { id: "home_cms", label: "Edit & Update Home Page CMS" },
  { id: "admin_email", label: "Email Automation Studio" },
  { id: "admin_team", label: "Team Behind Profiles" },
  { id: "admin_subscriptions", label: "Billing & Dual Gateways" },
  { id: "admin_enquiries", label: "Inbound Enquiries" },
  { id: "admin_search", label: "Universal Search" },
];

const ROLE_OPTIONS = [
  { id: "admin", label: "Employee: Administrator", group: "Platform Employees" },
  { id: "manager", label: "Employee: Manager", group: "Platform Employees" },
  { id: "sales", label: "Employee: Sales Team", group: "Platform Employees" },
  { id: "client_super_admin", label: "Client Org: Client Super Admin", group: "Client Organizations" },
  { id: "client_admin", label: "Client Org: Client Admin", group: "Client Organizations" },
  { id: "client_manager", label: "Client Org: Manager", group: "Client Organizations" },
  { id: "client", label: "Client Org: Client Viewer/Analyst", group: "Client Organizations" },
];

export default function AdminAccessControlModule({ currentUser, onRoleFeaturesUpdated }) {
  const [subTab, setSubTab] = useState("users"); // 'users' | 'matrix'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Role Feature Matrix State
  const [roleFeatures, setRoleFeatures] = useState({});
  const [selectedMatrixRole, setSelectedMatrixRole] = useState("admin");
  const [savingMatrix, setSavingMatrix] = useState(false);

  // New User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    user_type: "employee",
    role: "manager",
    subscription_tier: "Growth Professional",
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoleMatrix();
  }, [filterType]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminPortalApi.getAccessUsers(filterType === "ALL" ? "" : filterType);
      const list = res?.data || res;
      if (Array.isArray(list)) setUsers(list);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load access users");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoleMatrix() {
    try {
      const res = await adminPortalApi.getRoleFeatures();
      const data = res?.data || res;
      if (data && typeof data === "object") setRoleFeatures(data);
    } catch {}
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
    setActionLoadingId(user.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await adminPortalApi.updateUserAccess(user.id, { status: nextStatus });
      setSuccessMsg(`Access for ${user.name} updated to ${nextStatus}.`);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update access");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAllocateClientPanel(user) {
    setActionLoadingId(user.id);
    setSuccessMsg("");
    try {
      const res = await adminPortalApi.allocateClientPanel(user.id, "client_super_admin");
      setSuccessMsg(res?.message || `Allocated Client Admin Panel to ${user.name}.`);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || "Allocation failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setAddingUser(true);
    setErrorMsg("");
    try {
      await adminPortalApi.addAccessUser(newUser);
      setSuccessMsg(`Provisioned ${newUser.name} with role "${newUser.role}".`);
      setShowAddModal(false);
      setNewUser({ name: "", email: "", phone: "", company_name: "", user_type: "employee", role: "manager", subscription_tier: "Growth Professional" });
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  }

  function toggleFeatureInMatrix(featureId) {
    setRoleFeatures((prev) => {
      const current = Array.isArray(prev[selectedMatrixRole]) ? prev[selectedMatrixRole] : [];
      const next = current.includes(featureId) ? current.filter((f) => f !== featureId) : [...current, featureId];
      return { ...prev, [selectedMatrixRole]: next };
    });
  }

  async function handleSaveMatrix() {
    setSavingMatrix(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const features = roleFeatures[selectedMatrixRole] || [];
      const updated = await adminPortalApi.updateRoleFeatures(selectedMatrixRole, features);
      const map = updated?.data || updated;
      if (map) {
        setRoleFeatures(map);
        if (onRoleFeaturesUpdated) onRoleFeaturesUpdated(map);
      }
      setSuccessMsg(`Dashboard feature visibility saved for role "${selectedMatrixRole}".`);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save role feature matrix");
    } finally {
      setSavingMatrix(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.company_name || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const isClientAdmin = (currentUser?.role || "").startsWith("client");
  const editableRoles = isClientAdmin
    ? ROLE_OPTIONS.filter((r) => r.group === "Client Organizations" && r.id !== "client_super_admin")
    : ROLE_OPTIONS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "Inter, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", margin: 0, display: "flex", alignItems: "center", gap: 10, color: "#0f172a" }}>
            <Shield size={22} color="#0284c7" /> Role Dashboards & Access Governance
          </h2>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
            Manage Employee roles (Super Admin, Administrator, Manager, Sales Team), Client Organization panels, and per-role dashboard feature visibility.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setSubTab("users")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: subTab === "users" ? "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" : "#ffffff",
              color: subTab === "users" ? "#ffffff" : "#0f172a",
              border: `1px solid ${subTab === "users" ? "#0284c7" : "#bae6fd"}`,
              borderRadius: 999, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Users size={14} /> Employees & Clients ({users.length})
          </button>
          <button
            onClick={() => setSubTab("matrix")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: subTab === "matrix" ? "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" : "#ffffff",
              color: subTab === "matrix" ? "#ffffff" : "#0f172a",
              border: `1px solid ${subTab === "matrix" ? "#0284c7" : "#bae6fd"}`,
              borderRadius: 999, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <LayoutGrid size={14} /> Role Feature Visibility Matrix
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(22, 163, 74, 0.12)", border: "1px solid #16a34a", borderRadius: 10, padding: "10px 14px", color: "#15803d", fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(220, 38, 38, 0.12)", border: "1px solid #dc2626", borderRadius: 10, padding: "10px 14px", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* SUBTAB 1: Users & Client Panel Allocation */}
      {subTab === "users" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, company, role..."
                style={{ background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, width: 250, color: "#0f172a" }}
              />
              {["ALL", "employee", "client"].map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  style={{
                    background: filterType === ft ? "#e0f2fe" : "#ffffff",
                    border: `1px solid ${filterType === ft ? "#0284c7" : "#bae6fd"}`,
                    color: filterType === ft ? "#0369a1" : "#334155",
                    borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {ft === "ALL" ? "All Accounts" : ft === "employee" ? "Employees" : "Client Organizations"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)", color: "#ffffff", border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(2, 132, 199, 0.22)" }}
            >
              <UserPlus size={14} /> Grant New Role / Access
            </button>
          </div>

          {showAddModal && (
            <form onSubmit={handleCreateUser} style={{ background: "#ffffff", border: "1.5px solid #0284c7", borderRadius: 12, padding: 20, boxShadow: "0 8px 24px rgba(2, 132, 199, 0.1)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" }}>Provision New Employee or Client Organization User</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
                <input required placeholder="Full Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: "#0f172a" }} />
                <input required type="email" placeholder="Work Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: "#0f172a" }} />
                <input placeholder="Company / Organization" value={newUser.company_name} onChange={(e) => setNewUser({ ...newUser, company_name: e.target.value })} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: "#0f172a" }} />
                <select
                  value={newUser.user_type}
                  onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value, role: e.target.value === "client" ? "client_super_admin" : "manager" })}
                  style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: "#0f172a" }}
                >
                  <option value="employee">Platform Employee</option>
                  <option value="client">Client Organization</option>
                </select>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: "#0f172a" }}
                >
                  {newUser.user_type === "employee" ? (
                    <>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Administrator</option>
                      <option value="manager">Manager</option>
                      <option value="sales">Sales Team</option>
                    </>
                  ) : (
                    <>
                      <option value="client_super_admin">Client Super Admin</option>
                      <option value="client_admin">Client Admin</option>
                      <option value="client_manager">Client Manager</option>
                      <option value="client">Client Viewer</option>
                    </>
                  )}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={addingUser} style={{ background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)", color: "#ffffff", border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  {addingUser ? "Provisioning..." : "Create & Send Access Email"}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: 999, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 12, overflowX: "auto", boxShadow: "0 4px 16px rgba(2, 132, 199, 0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#e0f2fe", borderBottom: "1.5px solid #bae6fd", fontSize: 11, color: "#0c4a6e", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 14px" }}>User & Organization</th>
                  <th style={{ padding: "12px 14px" }}>Type & Dashboard Role</th>
                  <th style={{ padding: "12px 14px" }}>Status (Red/Grey/Green)</th>
                  <th style={{ padding: "12px 14px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#475569" }}>Loading access records...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#475569" }}>No users found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isActive = u.status === "ACTIVE";
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #e2e8f0", fontSize: 13 }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: "#475569" }}>{u.email} · {u.company_name}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            background: isActive ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)",
                            color: isActive ? "#16a34a" : "#dc2626",
                            padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            disabled={actionLoadingId === u.id}
                            onClick={() => handleToggleStatus(u)}
                            style={{
                              background: isActive ? "rgba(220, 38, 38, 0.10)" : "rgba(22, 163, 74, 0.10)",
                              color: isActive ? "#dc2626" : "#16a34a",
                              border: `1px solid ${isActive ? "#dc2626" : "#16a34a"}`,
                              borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                            }}
                          >
                            {isActive ? "Revoke Access" : "Grant Access"}
                          </button>
                          {u.user_type === "client" && (
                            <button
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleAllocateClientPanel(u)}
                              style={{
                                background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)", color: "#ffffff", border: "none",
                                borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Allocate Client Admin Panel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SUBTAB 2: Role-Based Feature Visibility Matrix */}
      {subTab === "matrix" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginBottom: 4 }}>
              Select Role Dashboard to Configure
            </div>
            {editableRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedMatrixRole(r.id)}
                style={{
                  textAlign: "left",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: selectedMatrixRole === r.id ? "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" : "#ffffff",
                  color: selectedMatrixRole === r.id ? "#ffffff" : "#0f172a",
                  border: `1px solid ${selectedMatrixRole === r.id ? "#0284c7" : "#bae6fd"}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: 11, opacity: 0.9, color: selectedMatrixRole === r.id ? "#e0f2fe" : "#475569", marginTop: 2 }}>
                  {(roleFeatures[r.id] || []).length} features enabled
                </div>
              </button>
            ))}
          </div>

          <div style={{ gridColumn: "span 2", background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 12, padding: 22, boxShadow: "0 4px 16px rgba(2, 132, 199, 0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Features Visible to: <span style={{ color: "#0284c7" }}>{selectedMatrixRole}</span>
                </h3>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                  Toggle which modules & tabs appear in this role's sidebar and Ask AuditAI navigator.
                </div>
              </div>
              <button
                onClick={handleSaveMatrix}
                disabled={savingMatrix}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)", color: "#ffffff", border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                <Save size={14} /> {savingMatrix ? "Saving..." : "Save Role Visibility"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {ALL_PLATFORM_FEATURES.map((feat) => {
                const enabled = (roleFeatures[selectedMatrixRole] || []).includes(feat.id);
                return (
                  <label
                    key={feat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${enabled ? "#0284c7" : "#e2e8f0"}`,
                      background: enabled ? "#f0f9ff" : "#f8fafc",
                      color: "#0f172a",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: enabled ? 700 : 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleFeatureInMatrix(feat.id)}
                      style={{ accentColor: "#0284c7", width: 15, height: 15 }}
                    />
                    {feat.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
