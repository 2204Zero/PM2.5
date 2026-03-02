import React from "react";

const SystemStatusBar = ({ status }) => {
  if (!status) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div
      style={{
        background: "#F1F5F9",
        borderTop: "1px solid #E2E8F0",
        padding: "8px 40px",
        display: "flex",
        alignItems: "center",
        gap: "24px",
        fontSize: "12px",
        color: "#64748B",
        fontWeight: "500",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: status.simulation_running ? "#10B981" : "#EF4444",
            boxShadow: status.simulation_running ? "0 0 8px #10B981" : "none",
          }}
        />
        <span style={{ color: "#0F172A", fontWeight: "600" }}>
          SYSTEM: {status.simulation_running ? "OPERATIONAL" : "OFFLINE"}
        </span>
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <span>
          Refresh: <strong style={{ color: "#334155" }}>{status.refresh_interval}s</strong>
        </span>
        <span>
          Nodes: <strong style={{ color: "#334155" }}>{status.total_nodes}</strong>
        </span>
        <span>
          Zones: <strong style={{ color: "#334155" }}>{status.total_zones}</strong>
        </span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: "16px" }}>
        <span>
          Last Node Sync: <strong style={{ color: "#334155" }}>{formatDate(status.last_node_write_time)}</strong>
        </span>
        <span>
          Last Zone Sync: <strong style={{ color: "#334155" }}>{formatDate(status.last_zone_write_time)}</strong>
        </span>
      </div>
    </div>
  );
};

export default SystemStatusBar;
