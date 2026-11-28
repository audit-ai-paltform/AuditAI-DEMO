import React, { useState, useEffect } from "react";
import {
  Shield, Lock, Mail, User, Building, Phone, ArrowRight, CheckCircle2,
  AlertCircle, Sparkles, X, Eye, EyeOff, UserCheck, ShieldCheck, Key
} from "lucide-react";
import { authApi } from "../lib/api";

export default function EnterpriseAuthGate({ isOpen, onClose, onLoginSuccess, initialRole = "admin" }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [role, setRole] = useState(initialRole || "admin"); // 'admin' | 'client'
  const [email, setEmail] = useState("admin@auditai.io");
  const [password, setPassword] = useState("Admin@12345");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (initialRole) {
      applyPreset(initialRole);
    }
  }, [initialRole, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "login") {
        const session = await authApi.login({ email, password, role });
        const user = session?.user || session || { email, role: role === "admin" ? "super_admin" : "client_viewer", name: email.split("@")[0] };
        setSuccessMsg("Authentication verified. Redirecting to workspace...");
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user);
          if (onClose) onClose();
        }, 350);
      } else {
        const res = await authApi.register({
          email,
          password,
          full_name: fullName || "Enterprise User",
          company: company || "Corporate Client",
          phone,
          role,
        });
        setSuccessMsg(res.message || "Registration completed. You may now log in or await admin approval.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(selectedRole) {
    setError("");
    setRole(selectedRole);
    if (selectedRole === "admin") {
      setEmail("admin@auditai.io");
      setPassword("Admin@12345");
    } else {
      setEmail("client@auditai.io");
      setPassword("Client@12345");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(4, 11, 24, 0.88)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "100%",
          background: "linear-gradient(145deg, #f0f9ff 0%, #ffffff 50%, #0e244d 100%)",
          border: "1px solid #7dd3fc",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(56, 189, 248, 0.15)",
          position: "relative",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#000000",
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              background: "#bae6fd",
              border: "1px solid #bae6fd",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56, 189, 248, 0.2)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#bae6fd";
              e.currentTarget.style.color = "#bae6fd";
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px #7dd3fc",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "Space Grotesk", letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 8 }}>
              AuditAI Qalyzer
              <span style={{ fontSize: 10.5, color: "#0369a1", border: "1px solid #7dd3fc", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", fontWeight: 700 }}>
                Enterprise
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "#334155", marginTop: 2 }}>
              Secure SSO & Role-Based Access Governance
            </div>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "rgba(6, 18, 36, 0.8)",
            border: "1px solid rgba(96, 165, 250, 0.25)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => applyPreset("admin")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: role === "admin" ? "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)" : "transparent",
              color: role === "admin" ? "#ffffff" : "#bae6fd",
              border: "none",
              borderRadius: 8,
              padding: "9px 0",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: role === "admin" ? "0 4px 12px rgba(2, 132, 199, 0.35)" : "none",
            }}
          >
            <Shield size={14} /> Administrator Login
          </button>
          <button
            type="button"
            onClick={() => applyPreset("client")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: role === "client" ? "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)" : "transparent",
              color: role === "client" ? "#ffffff" : "#bae6fd",
              border: "none",
              borderRadius: 8,
              padding: "9px 0",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: role === "client" ? "0 4px 12px rgba(2, 132, 199, 0.35)" : "none",
            }}
          >
            <UserCheck size={14} /> Partner / Client Login
          </button>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#000000" }}>
            {mode === "login" ? `${role === "admin" ? "Super Administrator" : "Partner / Client"} Portal` : "Register Partner Account"}
          </div>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setSuccessMsg("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#0369a1",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {mode === "login" ? "New client? Request access" : "Existing account? Sign in"}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              color: "#fecaca",
              fontSize: 12.5,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: "#dc2626" }} />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              color: "#a7f3d0",
              fontSize: 12.5,
            }}
          >
            <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 5, fontWeight: 600 }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: 12, top: 11, color: "#0369a1" }} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="E.g. Priya Sharma"
                    style={{
                      width: "100%",
                      background: "rgba(6, 18, 36, 0.8)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: 8,
                      padding: "10px 14px 10px 36px",
                      color: "#000000",
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 5, fontWeight: 600 }}>Company / Enterprise Name</label>
                <div style={{ position: "relative" }}>
                  <Building size={15} style={{ position: "absolute", left: 12, top: 11, color: "#0369a1" }} />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="E.g. Acme Financial Technologies"
                    style={{
                      width: "100%",
                      background: "rgba(6, 18, 36, 0.8)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: 8,
                      padding: "10px 14px 10px 36px",
                      color: "#000000",
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 5, fontWeight: 600 }}>Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Phone size={15} style={{ position: "absolute", left: 12, top: 11, color: "#0369a1" }} />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: "100%",
                      background: "rgba(6, 18, 36, 0.8)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: 8,
                      padding: "10px 14px 10px 36px",
                      color: "#000000",
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 5, fontWeight: 600 }}>Authorized Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: 12, top: 11, color: "#0369a1" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: "100%",
                  background: "rgba(6, 18, 36, 0.8)",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  borderRadius: 8,
                  padding: "10px 14px 10px 36px",
                  color: "#000000",
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11.5, color: "#334155", marginBottom: 5, fontWeight: 600 }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 12, top: 11, color: "#0369a1" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  background: "rgba(6, 18, 36, 0.8)",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  borderRadius: 8,
                  padding: "10px 40px 10px 36px",
                  color: "#000000",
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 10,
                  background: "transparent",
                  border: "none",
                  color: "#0369a1",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "#000000",
              border: "none",
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(2, 132, 199, 0.45)",
              opacity: loading ? 0.75 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Authenticating & Loading..." : mode === "login" ? `Sign In as ${role === "admin" ? "Administrator" : "Partner Client"}` : "Submit Access Request"}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
          <div style={{ fontSize: 10.5, color: "#0369a1", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
            Platform Employee Panels (1-Click Demo):
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            {[
              { label: "Main Super Admin", email: "admin@auditai.io", pass: "Admin@12345", roleKey: "super_admin" },
              { label: "Administrator", email: "administrator@auditai.io", pass: "Admin@12345", roleKey: "admin" },
              { label: "Manager Panel", email: "manager@auditai.io", pass: "Manager@12345", roleKey: "manager" },
              { label: "Sales Team Panel", email: "sales@auditai.io", pass: "Sales@12345", roleKey: "sales" },
            ].map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={async () => {
                  setEmail(p.email);
                  setPassword(p.pass);
                  setRole("admin");
                  setLoading(true);
                  setError("");
                  try {
                    const session = await authApi.login({ email: p.email, password: p.pass, role: p.roleKey });
                    const user = session?.user || session || { email: p.email, role: p.roleKey, full_name: p.label };
                    if (onLoginSuccess) onLoginSuccess(user);
                    if (onClose) onClose();
                  } catch (err) {
                    setError(err.message || "Login failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#f5faff", border: "1px solid #cfe4ff",
                  borderRadius: 8, padding: "7px 10px", color: "#000000", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                <ShieldCheck size={13} color="#0284c7" /> {p.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: "#0369a1", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
            Client Organization Panels (1-Click Demo):
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Client Super Admin", email: "client.superadmin@auditai.io", pass: "Client@12345", roleKey: "client_super_admin" },
              { label: "Client Admin", email: "client.admin@auditai.io", pass: "Client@12345", roleKey: "client_admin" },
              { label: "Client Manager", email: "client.manager@auditai.io", pass: "Client@12345", roleKey: "client_manager" },
              { label: "Client Viewer Panel", email: "client@auditai.io", pass: "Client@12345", roleKey: "client" },
            ].map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={async () => {
                  setEmail(p.email);
                  setPassword(p.pass);
                  setRole("client");
                  setLoading(true);
                  setError("");
                  try {
                    const session = await authApi.login({ email: p.email, password: p.pass, role: p.roleKey });
                    const user = session?.user || session || { email: p.email, role: p.roleKey, full_name: p.label };
                    if (onLoginSuccess) onLoginSuccess(user);
                    if (onClose) onClose();
                  } catch (err) {
                    setError(err.message || "Login failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#f5faff", border: "1px solid #cfe4ff",
                  borderRadius: 8, padding: "7px 10px", color: "#000000", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                <UserCheck size={13} color="#0284c7" /> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
