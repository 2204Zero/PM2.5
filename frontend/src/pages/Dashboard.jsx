import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MapView from "../components/MapView";

function Dashboard() {
  const [zones, setZones] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [viewMode, setViewMode] = useState("zone"); // "zone" | "heatmap"
  const navigate = useNavigate();

  const fetchZones = async () => {
    const res = await axios.get("http://127.0.0.1:8000/zones/live");
    setZones(res.data.zones);
  };

  const fetchNodes = async () => {
    const res = await axios.get("http://127.0.0.1:8000/nodes/live");
    setNodes(res.data.nodes);
  };

  useEffect(() => {
    fetchZones();
    fetchNodes();

    const interval = setInterval(() => {
      fetchZones();
      fetchNodes();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#16a34a";
    if (aqi <= 100) return "#84cc16";
    if (aqi <= 200) return "#f59e0b";
    if (aqi <= 300) return "#ef4444";
    if (aqi <= 400) return "#7c2d12";
    return "#4b0000";
  };

  const getTrendArrow = (trend) => {
    if (trend === "rising") return "↑";
    if (trend === "falling") return "↓";
    return "→";
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI" }}>
      <h1>City AQI Control Panel</h1>

      {/* VIEW TOGGLE */}
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button
          onClick={() => setViewMode("zone")}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            background: viewMode === "zone" ? "#111" : "#e5e7eb",
            color: viewMode === "zone" ? "white" : "black",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Zone View
        </button>

        <button
          onClick={() => setViewMode("heatmap")}
          style={{
            padding: "8px 16px",
            background: viewMode === "heatmap" ? "#111" : "#e5e7eb",
            color: viewMode === "heatmap" ? "white" : "black",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Heatmap (PM2.5)
        </button>
      </div>

      {/* MAP */}
      <MapView zones={zones} nodes={nodes} viewMode={viewMode} />

      {/* ZONE CARDS */}
      <div
        style={{
          marginTop: "40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {zones
          .slice()
          .sort((a, b) => b.aqi - a.aqi)
          .map((zone) => {
            const color = getAQIColor(zone.aqi);

            return (
              <div
                key={zone.zone_id}
                onClick={() => navigate(`/zone/${zone.zone_id}`)}
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  borderTop: `6px solid ${color}`,
                  cursor: "pointer",
                }}
              >
                <h3>Zone {zone.zone_id}</h3>

                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    color: color,
                  }}
                >
                  {zone.aqi.toFixed(0)} {getTrendArrow(zone.trend)}
                </div>

                <p style={{ fontWeight: "600" }}>
                  Dominant: {zone.dominant_pollutant?.toUpperCase()}
                </p>

                <div style={{ fontSize: "14px", marginTop: "10px" }}>
                  <div>PM2.5: {zone.pm25.toFixed(1)}</div>
                  <div>PM10: {zone.pm10.toFixed(1)}</div>
                  <div>NO₂: {zone.no2.toFixed(1)}</div>
                  <div>CO: {zone.co.toFixed(2)}</div>
                  <div>O₃: {zone.o3.toFixed(1)}</div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default Dashboard;