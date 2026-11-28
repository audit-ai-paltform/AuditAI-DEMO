import React, { useState, useEffect } from "react";
import {
  Mail, Clock, CheckCircle2, AlertCircle, RefreshCw, Filter,
  Building2, Phone, Calendar, User, MessageSquare, Check, ArrowRight
} from "lucide-react";
import { adminPortalApi } from "../lib/api";

export default function EnquiriesManagementModule() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'NEW' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED'
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  async function loadEnquiries() {
    setLoading(true);
    try {
      const res = await adminPortalApi.getEnquiries(statusFilter);
      if (res.data) setEnquiries(res.data);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(enquiryId, nextStatus) {
    setUpdatingId(enquiryId);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await adminPortalApi.updateEnquiry(enquiryId, { status: nextStatus });
      setSuccessMsg(`Enquiry marked as ${nextStatus}.`);
      loadEnquiries();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update enquiry status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveNotes(enquiryId) {
    setUpdatingId(enquiryId);
    try {
      await adminPortalApi.updateEnquiry(enquiryId, { notes: notesText });
      setSuccessMsg("Internal notes saved successfully.");
      setEditingNotesId(null);
      loadEnquiries();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save notes");
    } finally {
      setUpdatingId(null);
    }
  }

  const filterTabs = [
    { id: "ALL", label: "All Enquiries" },
    { id: "NEW", label: "New Enquiry" },
    { id: "SCHEDULED", label: "Scheduled Enquiry" },
    { id: "IN_PROGRESS", label: "In Progress Enquiry" },
    { id: "RESOLVED", label: "Resolved" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", display: "flex", alignItems: "center", gap: 10 }}>
            <Mail size={22} /> Inbound Consultation Enquiries
          </h2>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
            Manage client demo requests, trial consultations, and sales leads submitted through the public home page.
          </div>
        </div>

        <button
          onClick={loadEnquiries}
          style={{
            background: "#bae6fd",
            color: "#0f172a",
            border: "1px solid rgba(96, 165, 250, 0.25)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Enquiries
        </button>
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

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", background: "rgba(13, 36, 78, 0.6)", border: "1px solid rgba(96, 165, 250, 0.18)", borderRadius: 10, padding: 8 }}>
        {filterTabs.map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                background: active ? "#38bdf8" : "transparent",
                color: active ? "#f0f9ff" : "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Enquiries Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {enquiries.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: 50, textAlign: "center", background: "rgba(7, 89, 133, 0.3)", borderRadius: 12, border: "1px solid #bae6fd" }}>
            <Mail size={32} color="#bae6fd" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>No enquiries in "{statusFilter}" filter</div>
            <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>Inbound submissions from the Home Page will automatically appear here.</div>
          </div>
        ) : (
          enquiries.map((enq) => {
            const isEditingNotes = editingNotesId === enq.id;

            return (
              <div
                key={enq.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(96, 165, 250, 0.22)",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Header row: Name + Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Space Grotesk" }}>{enq.name}</div>
                    <div style={{ fontSize: 12, color: "#334155", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Building2 size={12} /> {enq.company_name} ({enq.team_size})
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      background:
                        enq.status === "NEW"
                          ? "#ffffff"
                          : enq.status === "SCHEDULED"
                          ? "#7dd3fc"
                          : enq.status === "IN_PROGRESS"
                          ? "rgba(245, 158, 11, 0.35)"
                          : "rgba(34, 197, 94, 0.35)",
                      color: enq.status === "NEW" ? "#0284c7" : "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {enq.status}
                  </span>
                </div>

                {/* Contact details */}
                <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: 8, padding: 10, fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <Mail size={12} color="#bae6fd" /> {enq.email}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                    <Phone size={12} color="#bae6fd" /> {enq.phone}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155", fontSize: 11.5 }}>
                    <Calendar size={12} color="#bae6fd" /> Preferred Schedule: {enq.preferred_schedule}
                  </div>
                </div>

                {/* Requirements message */}
                <div style={{ fontSize: 12.5, color: "#0f172a", lineHeight: 1.5, background: "#bae6fd", padding: 10, borderRadius: 6, borderLeft: "3px solid #ffffff" }}>
                  <div style={{ fontSize: 10.5, color: "#334155", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Service Interest: {enq.service_interest}</div>
                  "{enq.message}"
                </div>

                {/* Internal Notes */}
                <div style={{ fontSize: 12 }}>
                  {isEditingNotes ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <textarea
                        rows={2}
                        value={notesText}
                        onChange={e => setNotesText(e.target.value)}
                        placeholder="Add internal lead qualification notes..."
                        style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "6px 8px", color: "#0f172a", fontSize: 12, fontFamily: "inherit" }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button onClick={() => setEditingNotesId(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#0f172a", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => handleSaveNotes(enq.id)} style={{ background: "#ffffff", color: "#0369a1", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save Note</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#334155", fontStyle: enq.notes ? "normal" : "italic" }}>
                        Note: {enq.notes || "No internal notes added."}
                      </span>
                      <button
                        onClick={() => {
                          setEditingNotesId(enq.id);
                          setNotesText(enq.notes || "");
                        }}
                        style={{ background: "none", border: "none", color: "#0f172a", textDecoration: "underline", fontSize: 11, cursor: "pointer" }}
                      >
                        Edit Note
                      </button>
                    </div>
                  )}
                </div>

                {/* Status action buttons */}
                <div style={{ borderTop: "1px solid #bae6fd", paddingTop: 10, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {enq.status !== "SCHEDULED" && (
                    <button
                      onClick={() => handleUpdateStatus(enq.id, "SCHEDULED")}
                      disabled={updatingId === enq.id}
                      style={{ background: "#7dd3fc", border: "1px solid rgba(255,255,255,0.3)", color: "#0f172a", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Schedule Demo
                    </button>
                  )}
                  {enq.status !== "IN_PROGRESS" && (
                    <button
                      onClick={() => handleUpdateStatus(enq.id, "IN_PROGRESS")}
                      disabled={updatingId === enq.id}
                      style={{ background: "rgba(245, 158, 11, 0.25)", border: "1px solid rgba(255,255,255,0.3)", color: "#0f172a", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Mark In Progress
                    </button>
                  )}
                  {enq.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleUpdateStatus(enq.id, "RESOLVED")}
                      disabled={updatingId === enq.id}
                      style={{ background: "rgba(34, 197, 94, 0.25)", border: "1px solid #86efac", color: "#0f172a", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Resolve / Closed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
