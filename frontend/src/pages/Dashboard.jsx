import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";
import MapView from "../components/MapView";
import StatCard from "../pages/StatCard";

function Dashboard() {
  const [zones, setZones] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [viewMode, setViewMode] = useState("zone");

  const navigate = useNavigate();

  const fetchZones = async () => {
    const res = await axios.get("/zones/live");
    setZones(res.data.zones);
  };

  const fetchNodes = async () => {
    const res = await axios.get("/nodes/live");
    setNodes(res.data.nodes);
  };

  const fetchCities = async () => {
    const res = await axios.get("/city/list");
    setCities(res.data.cities);

    if (!selectedCity && res.data.cities.length > 0) {
      setSelectedCity(res.data.cities[0]);
    }
  };

  const changeCity = async (city) => {
    await axios.post(`/city/set/${city}`);
    setSelectedCity(city);
    await fetchZones();
    await fetchNodes();
  };

  useEffect(() => {
    fetchCities();
    fetchZones();
    fetchNodes();

    const interval = setInterval(() => {
      fetchZones();
      fetchNodes();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#22C55E";
    if (aqi <= 100) return "#FACC15";
    if (aqi <= 200) return "#F97316";
    if (aqi <= 300) return "#EF4444";
    return "#7F1D1D";
  };

  const getTrendArrow = (trend) => {
    if (trend === "rising") return "↑";
    if (trend === "falling") return "↓";
    return "→";
  };

  // 📊 Derived Stats
  const stats = useMemo(() => {
    if (!zones.length) return null;

    const avgAqi =
      zones.reduce((sum, z) => sum + z.aqi, 0) / zones.length;

    const worstZone = zones.reduce((prev, current) =>
      prev.aqi > current.aqi ? prev : current
    );

    const risingCount = zones.filter(
      (z) => z.trend === "rising"
    ).length;

    return {
      avgAqi: avgAqi.toFixed(0),
      worstZone: worstZone.zone_id,
      risingCount,
      totalNodes: nodes.length,
    };
  }, [zones, nodes]);

  return (
    <div
      style={{
        padding: "40px",
        background: "#F8FAFC",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600" }}>
           PM2.5 Admin Pannel
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748B" }}>
            Real-time air quality monitoring
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <select
            value={selectedCity || ""}
            onChange={(e) => changeCity(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "white",
            }}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city.toUpperCase()}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "flex",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setViewMode("zone")}
              style={{
                padding: "8px 14px",
                border: "none",
                background: viewMode === "zone" ? "#0F172A" : "white",
                color: viewMode === "zone" ? "white" : "#0F172A",
                cursor: "pointer",
              }}
            >
              Zone
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              style={{
                padding: "8px 14px",
                border: "none",
                background: viewMode === "heatmap" ? "#0F172A" : "white",
                color: viewMode === "heatmap" ? "white" : "#0F172A",
                cursor: "pointer",
              }}
            >
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <StatCard title="Average AQI" value={stats.avgAqi} />
          <StatCard title="Worst Zone" value={`Zone ${stats.worstZone}`} />
          <StatCard title="Rising Zones" value={stats.risingCount} />
          <StatCard title="Active Nodes" value={stats.totalNodes} />
        </div>
      )}

      {/* MAP */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid #E2E8F0",
          marginBottom: "40px",
        }}
      >
        <MapView
          zones={zones}
          nodes={nodes}
          viewMode={viewMode}
          city={selectedCity}
        />
      </div>

      {/* ZONE CARDS */}
      <div
        style={{
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
                  borderRadius: "14px",
                  border: "1px solid #E2E8F0",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Zone {zone.zone_id}</h3>

                <div
                  style={{
                    fontSize: "34px",
                    fontWeight: "600",
                    color: color,
                  }}
                >
                  {zone.aqi.toFixed(0)} {getTrendArrow(zone.trend)}
                </div>

                <p style={{ color: "#64748B" }}>
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