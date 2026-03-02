import React from "react";

const IncidentPanel = ({ incidents, onClose, isOpen }) => {
  if (!isOpen || !incidents || incidents.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "350px",
        background: "white",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #E2E8F0",
        animation: "slideIn 0.3s ease-out"
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#F8FAFC"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
          Active Incidents ({incidents.length})
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#64748B"
          }}
        >
          ×
        </button>
      </div>

      {/* Incident List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {incidents.map((incident) => (
          <div
            key={incident.id}
            style={{
              marginBottom: "20px",
              padding: "16px",
              borderRadius: "12px",
              border: `1px solid ${incident.severity_level === "Severe" ? "#FEE2E2" : "#FFEDD5"}`,
              background: incident.severity_level === "Severe" ? "#FEF2F2" : "#FFF7ED"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  background: incident.severity_level === "Severe" ? "#EF4444" : "#F97316",
                  color: "white"
                }}
              >
                {incident.severity_level}
              </span>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: "500" }}>
                Zone {incident.zone_id}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                Predictive Warning:
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: incident.predictive_warning.includes("Rising") ? "#EF4444" : "#0F172A"
                }}
              >
                {incident.predictive_warning} {incident.predictive_warning.includes("Rising") ? "📈" : "📉"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", fontWeight: "600" }}>
                OPERATIONAL ADVISORIES:
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#334155" }}>
                {incident.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: "6px" }}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "20px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8", textAlign: "center" }}>
          Incidents are automatically triggered after 10 minutes of sustained critical AQI levels.
        </p>
      </div>
    </div>
  );
};

export default IncidentPanel;
