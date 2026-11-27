import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Image,
  Linkedin,
  Twitter,
  Github,
  Eye,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { teamAdminApi } from "../lib/api";

export default function AdminTeamEditorModule() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    setLoading(true);
    try {
      const res = await teamAdminApi.getAdminTeam();
      setMembers(res.data || res || []);
    } catch (err) {
      console.error("Failed to load team data", err);
    } finally {
      setLoading(false);
    }
  }

  function handleStartNew() {
    setIsCreating(true);
    setEditingMember({
      name: "",
      role: "",
      bio: "",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      linkedin_url: "https://linkedin.com/in/",
      twitter_url: "https://twitter.com/",
      github_url: "https://github.com/",
      display_order: members.length + 1,
      active: true,
    });
  }

  function handleStartEdit(member) {
    setIsCreating(false);
    setEditingMember({ ...member });
  }

  async function handleSave() {
    if (!editingMember.name || !editingMember.role) {
      alert("Please provide at least a Name and Role for the team member.");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      if (isCreating) {
        await teamAdminApi.createMember(editingMember);
        setFeedback({ type: "success", message: `Team member ${editingMember.name} added successfully!` });
      } else {
        await teamAdminApi.updateMember(editingMember.id, editingMember);
        setFeedback({ type: "success", message: `Team member ${editingMember.name} updated successfully!` });
      }
      setEditingMember(null);
      setIsCreating(false);
      await loadTeam();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to save team member" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to remove ${name} from the leadership team?`)) return;
    setLoading(true);
    try {
      await teamAdminApi.deleteMember(id);
      setFeedback({ type: "success", message: `Team member ${name} removed.` });
      await loadTeam();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to delete team member" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b1f3d 0%, #08162d 100%)",
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
              <Users size={20} color="#38bdf8" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
              "Team Behind" Leadership & Executive Directory
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Manage the founders, AI scientists, and executive architects featured on the public homepage. Real-time synced to Supabase database.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={loadTeam}
            disabled={loading}
            style={{
              background: "rgba(56,189,248,0.12)",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
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
            Sync Team
          </button>

          <button
            onClick={handleStartNew}
            style={{
              background: "#38bdf8",
              border: "none",
              color: "#08162d",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            Add Team Member
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
            color: feedback.type === "success" ? "#34d399" : "#f87171",
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

      {/* Editor Modal / Card when editing */}
      {editingMember && (
        <div
          style={{
            background: "#0b1f3d",
            border: "1px solid #38bdf8",
            borderRadius: 14,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#ffffff", fontWeight: 700 }}>
              {isCreating ? "Add New Leadership Member" : `Edit Member: ${editingMember.name}`}
            </h3>
            <button
              onClick={() => setEditingMember(null)}
              style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    placeholder="e.g. Dr. Aryan Varma"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#08162d",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#ffffff",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                    Role / Position Title *
                  </label>
                  <input
                    type="text"
                    value={editingMember.role}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                    placeholder="e.g. Chief Executive Officer & Co-Founder"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#08162d",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#ffffff",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Bio & Background Description
                </label>
                <textarea
                  rows={3}
                  value={editingMember.bio || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                  placeholder="Summarize key expertise, previous institutions, and role in AuditAI..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Profile Image URL (Avatar)
                </label>
                <input
                  type="url"
                  value={editingMember.avatar_url || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, avatar_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#08162d",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 4, fontWeight: 600 }}>
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={editingMember.linkedin_url || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, linkedin_url: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#08162d",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#ffffff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 4, fontWeight: 600 }}>
                    Twitter / X URL
                  </label>
                  <input
                    type="url"
                    value={editingMember.twitter_url || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, twitter_url: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#08162d",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#ffffff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 4, fontWeight: 600 }}>
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={editingMember.github_url || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, github_url: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#08162d",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#ffffff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    id="member_active"
                    checked={editingMember.active !== false}
                    onChange={(e) => setEditingMember({ ...editingMember, active: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <label htmlFor="member_active" style={{ fontSize: 14, color: "#ffffff", fontWeight: 600, cursor: "pointer" }}>
                    Publish publicly on Homepage
                  </label>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setEditingMember(null)}
                    style={{
                      background: "transparent",
                      border: "1px solid #1e3a66",
                      color: "#cbd5e1",
                      borderRadius: 8,
                      padding: "9px 18px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                      background: "#38bdf8",
                      border: "none",
                      color: "#08162d",
                      borderRadius: 8,
                      padding: "9px 24px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Save size={16} />
                    Save & Sync Publicly
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Card */}
            <div style={{ background: "#08162d", border: "1px solid #1e3a66", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Homepage Card Live Preview
              </div>
              <img
                src={editingMember.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                alt={editingMember.name || "Preview"}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #38bdf8",
                  boxShadow: "0 8px 24px rgba(56,189,248,0.25)",
                  marginBottom: 14,
                }}
              />
              <h4 style={{ margin: "0 0 4px 0", fontSize: 17, color: "#ffffff", fontWeight: 700 }}>
                {editingMember.name || "Executive Name"}
              </h4>
              <div style={{ color: "#38bdf8", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                {editingMember.role || "Executive Role"}
              </div>
              <p style={{ margin: "0 0 16px 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.5, maxWidth: 260 }}>
                {editingMember.bio || "Member bio and background will appear here on the public website."}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "#38bdf8" }}><Linkedin size={18} /></span>
                <span style={{ color: "#38bdf8" }}><Twitter size={18} /></span>
                <span style={{ color: "#38bdf8" }}><Github size={18} /></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              background: "#0b1f3d",
              border: "1px solid #1e3a66",
              borderRadius: 12,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <img
                  src={m.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                  alt={m.name}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #38bdf8" }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, color: "#ffffff", fontWeight: 700 }}>{m.name}</h4>
                  <div style={{ color: "#38bdf8", fontSize: 13, fontWeight: 600 }}>{m.role}</div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      background: m.active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)",
                      color: m.active ? "#34d399" : "#94a3b8",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {m.active ? "VISIBLE ON HOMEPAGE" : "HIDDEN"}
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                {m.bio}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #152b4d", paddingTop: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {m.linkedin_url && (
                  <a href={m.linkedin_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                    <Linkedin size={16} />
                  </a>
                )}
                {m.twitter_url && (
                  <a href={m.twitter_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                    <Twitter size={16} />
                  </a>
                )}
                {m.github_url && (
                  <a href={m.github_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                    <Github size={16} />
                  </a>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleStartEdit(m)}
                  style={{
                    background: "rgba(56,189,248,0.12)",
                    border: "1px solid #38bdf8",
                    color: "#38bdf8",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Edit2 size={13} />
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid #ef4444",
                    color: "#f87171",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
