import React, { useState, useEffect } from "react";
import {
  Activity,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Shield,
  Monitor,
  Lock,
  Unlock,
  Radio,
} from "lucide-react";
import { userActivityApi, adminPortalApi } from "../lib/api";

export default function AdminUserActivityModule() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 15000); // 15s live polling
    return () => clearInterval(interval);
  }, []);

  async function loadActivities() {
    try {
      const res = await userActivityApi.getActivityList();
      setActivities(res.data || res || []);
    } catch (err) {
      console.error("Failed to load user activity", err);
    }
  }

  async function handleToggleAccess(user) {
    const newStatus = user.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
    const confirmMsg =
      newStatus === "REVOKED"
        ? `Are you sure you want to revoke platform access for ${user.user_name || user.email}? Their active session will be terminated immediately.`
        : `Grant platform access to ${user.user_name || user.email}?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setFeedback(null);
    try {
      await adminPortalApi.updateUserAccess(user.user_id, {
        status: newStatus,
        login_enabled: newStatus === "ACTIVE",
      });
      setFeedback({
        type: "success",
        message: `Access successfully ${newStatus === "ACTIVE" ? "granted" : "revoked"} for ${user.user_name || user.email}.`,
      });
      await loadActivities();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update user access" });
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function isSessionOnline(lastPing) {
    if (!lastPing) return false;
    const diffMs = Date.now() - new Date(lastPing).getTime();
    return diffMs < 120000; // within 2 minutes
  }

  const filtered = activities.filter((act) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (act.user_name || "").toLowerCase().includes(q) ||
      (act.email || "").toLowerCase().includes(q) ||
      (act.user_id || "").toLowerCase().includes(q);
    const matchesRole = roleFilter === "ALL" || (act.role || "").toUpperCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const onlineCount = activities.filter((a) => isSessionOnline(a.last_ping)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b1f3d 0%, #f0f9ff 100%)",
          border: "1px solid #1e3a66",
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
              <Activity size={20} color="#38bdf8" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
              User Authentication & Active Session Analytics
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>
            Real-time Supabase authentication tracking, heartbeat ping sessions, total active time accumulation, and instant access grant/revoke.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff", padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a66" }}>
            <Radio size={15} color={onlineCount > 0 ? "#10b981" : "#94a3b8"} className={onlineCount > 0 ? "animate-pulse" : ""} />
            <span style={{ fontSize: 13, fontWeight: 700, color: onlineCount > 0 ? "#16a34a" : "#94a3b8" }}>
              {onlineCount} Online Now
            </span>
          </div>

          <button
            onClick={loadActivities}
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
            Refresh
          </button>
        </div>
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

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 12 }} />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#0b1f3d",
              border: "1px solid #1e3a66",
              borderRadius: 8,
              padding: "10px 14px 10px 38px",
              color: "#0f172a",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            background: "#0b1f3d",
            border: "1px solid #1e3a66",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#0f172a",
            fontSize: 14,
            outline: "none",
          }}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Administrators</option>
          <option value="OWNER">Tenant Owners</option>
          <option value="MANAGER">Quality Managers</option>
          <option value="ANALYST">Auditors & Analysts</option>
          <option value="VIEWER">Viewers</option>
        </select>
      </div>

      {/* Sessions Table */}
      <div style={{ background: "#0b1f3d", border: "1px solid #1e3a66", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0f9ff", color: "#334155", borderBottom: "1px solid #1e3a66" }}>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>User / Identity</th>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>Last Login</th>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>Total Active Time</th>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: "14px 20px", fontWeight: 600, textAlign: "right" }}>Access Control</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#334155" }}>
                    No matching user activity records found.
                  </td>
                </tr>
              ) : (
                filtered.map((act) => {
                  const online = isSessionOnline(act.last_ping);
                  const isRevoked = act.status === "REVOKED";
                  return (
                    <tr key={act.id || act.user_id} style={{ borderBottom: "1px solid #152b4d" }}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: online ? "#10b981" : "#64748b",
                              boxShadow: online ? "0 0 8px #10b981" : "none",
                            }}
                            title={online ? "Active Session Right Now" : "Offline"}
                          />
                          <div>
                            <div style={{ color: "#0f172a", fontWeight: 600 }}>{act.user_name || "Enterprise User"}</div>
                            <div style={{ fontSize: 12, color: "#334155" }}>{act.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ textTransform: "uppercase", background: "rgba(56,189,248,0.1)", color: "#0369a1", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {act.role || "ANALYST"}
                        </span>
                      </td>

                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            background: !isRevoked ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            color: !isRevoked ? "#16a34a" : "#dc2626",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {act.status || "ACTIVE"}
                        </span>
                      </td>

                      <td style={{ padding: "16px 20px", color: "#334155" }}>
                        {act.last_login ? new Date(act.last_login).toLocaleString() : "Never"}
                      </td>

                      <td style={{ padding: "16px 20px", color: "#0369a1", fontWeight: 600 }}>
                        {formatDuration(act.total_active_seconds)}
                      </td>

                      <td style={{ padding: "16px 20px", color: "#334155", fontFamily: "monospace" }}>
                        {act.ip_address || "127.0.0.1"}
                      </td>

                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <button
                          onClick={() => handleToggleAccess(act)}
                          disabled={loading}
                          style={{
                            background: isRevoked ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                            border: `1px solid ${isRevoked ? "#10b981" : "#ef4444"}`,
                            color: isRevoked ? "#16a34a" : "#dc2626",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {isRevoked ? <Unlock size={13} /> : <Lock size={13} />}
                          {isRevoked ? "Grant Access" : "Revoke Access"}
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
    </div>
  );
}
