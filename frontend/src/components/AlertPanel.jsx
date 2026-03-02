import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";

const AlertPanel = ({ isOpen, onClose, onAlertAcknowledged }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/alerts");
      setAlerts(res.data.alerts);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  const acknowledgeAlert = async (id) => {
    try {
      await axios.post(`/alerts/${id}/acknowledge`);
      // Update local state to show as acknowledged immediately
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      if (onAlertAcknowledged) onAlertAcknowledged();
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const getSeverityStyle = (level) => {
    switch (level) {
      case "Poor": return { color: "#F97316", fontWeight: "bold" };
      case "Very Poor": return { color: "#EF4444", fontWeight: "bold" };
      case "Severe": return { color: "#7F1D1D", fontWeight: "bold", fontSize: "14px" };
      default: return { color: "#64748B" };
    }
  };

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            transition: "opacity 0.2s"
          }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div 
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: "384px",
          background: "white",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
          zIndex: 1001,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.2s ease-in-out",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, sans-serif"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ 
            padding: "20px", 
            borderBottom: "1px solid #E2E8F0", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            background: "#F8FAFC"
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: "18px", 
              fontWeight: "700", 
              color: "#0F172A",
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}>
              Control Room Alerts
            </h2>
            <button 
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#64748B",
                cursor: "pointer",
                padding: "0 8px"
              }}
            >
              &times;
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {loading && alerts.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748B", marginTop: "40px" }}>Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748B", marginTop: "40px" }}>No alerts found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    style={{
                      padding: "16px",
                      border: "1px solid",
                      borderColor: !alert.acknowledged ? "#FECACA" : "#E2E8F0",
                      borderRadius: "12px",
                      background: !alert.acknowledged ? "#FEF2F2" : "#F8FAFC",
                      opacity: !alert.acknowledged ? 1 : 0.8,
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ 
                        fontSize: "11px", 
                        textTransform: "uppercase", 
                        letterSpacing: "0.5px",
                        ...getSeverityStyle(alert.level)
                      }}>
                        {alert.level}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                        {formatTimestamp(alert.created_at)}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "600", 
                      color: "#1E293B", 
                      marginBottom: "4px" 
                    }}>
                      Zone {alert.zone_id} — AQI {alert.aqi}
                    </div>
                    <p style={{ 
                      fontSize: "13px", 
                      color: "#475569", 
                      margin: "0 0 12px 0",
                      lineHeight: "1.4"
                    }}>
                      {alert.message}
                    </p>
                    
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          background: "white",
                          border: "1px solid #FECACA",
                          color: "#EF4444",
                          fontSize: "12px",
                          fontWeight: "700",
                          borderRadius: "6px",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#EF4444";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.color = "#EF4444";
                        }}
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.acknowledged && (
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#10B981", 
                        fontWeight: "700", 
                        display: "flex", 
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        ACKNOWLEDGED
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertPanel;
