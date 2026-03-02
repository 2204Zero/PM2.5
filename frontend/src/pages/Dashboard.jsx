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
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

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

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setIsNarrow(window.innerWidth < 1024);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    return "•";
  };

  const getTrendColor = (trend, aqi) => {
    if (trend === "rising") return "#EF4444"; // red
    if (trend === "falling") return "#22C55E"; // green
    if (trend === "stable") return "#9CA3AF"; // gray
    return getAQIColor(aqi);
  };

  // 📊 Derived Stats
  const worstZone = useMemo(() => {
    if (!zones.length) return null;
    return zones.reduce(
      (prev, current) => (current.aqi > prev.aqi ? current : prev),
      zones[0]
    );
  }, [zones]);

  const stats = useMemo(() => {
    if (!zones.length) return null;

    const avgAqi =
      zones.reduce((sum, z) => sum + z.aqi, 0) / zones.length;

    const risingCount = zones.filter(
      (z) => z.trend === "rising"
    ).length;

    return {
      avgAqi: avgAqi.toFixed(0),
      worstZone: worstZone.zone_id,
      risingCount,
      totalNodes: nodes.length,
    };
  }, [zones, nodes, worstZone]);

  const worstZones = useMemo(() => {
    return zones
      .slice()
      .sort((a, b) => b.aqi - a.aqi);
  }, [zones]);

  return (
    <div
      style={{
        padding: "40px",
        background: "#F8FAFC",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1 }}>
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
            marginBottom: "32px",
          }}
        >
          <StatCard title="Average AQI" value={stats.avgAqi} />
          <StatCard
            title="Highest AQI Zone"
            value={
              worstZone ? `Zone ${worstZone.zone_id}` : "—"
            }
          />
          <StatCard
            title="Zones Trending Up"
            value={stats.risingCount}
          />
          <StatCard title="Active Nodes" value={stats.totalNodes} />
        </div>
      )}

      {/* MAIN LAYOUT: MAP + WORST ZONES PANEL */}
      <div
        style={{
          display: "flex",
          flexDirection: isNarrow ? "column" : "row",
          gap: "24px",
          alignItems: "flex-start",
          marginBottom: "40px",
        }}
      >
        {/* Map container wrapper */}
        <div style={{ flex: 3 }}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
          >
            <MapView
              zones={zones}
              nodes={nodes}
              viewMode={viewMode}
              city={selectedCity}
            />
          </div>
        </div>

        {/* Right panel wrapper */}
        <div
          style={{
            flex: 1,
            maxWidth: "340px",
          }}
        >
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {worstZones.map((zone) => {
              const color = getAQIColor(zone.aqi);
              const isWorst =
                worstZone && zone.zone_id === worstZone.zone_id;

              return (
                <button
                  key={zone.zone_id}
                  onClick={() => navigate(`/zone/${zone.zone_id}`)}
                  style={{
                    border: "none",
                    background: isWorst ? "#F1F5F9" : "white",
                    borderRadius: "12px",
                    padding: "8px 10px",
                    textAlign: "left",
                    cursor: "pointer",
                    height: "60px",
                    display: "flex",
                    alignItems: "stretch",
                    gap: "10px",
                    boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
                  }}
                >
                  {/* Left colored strip */}
                  <div
                    style={{
                      width: "5px",
                      borderRadius: "999px",
                      background: color,
                      alignSelf: "stretch",
                    }}
                  />

                  {/* Text content */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#0F172A",
                        marginBottom: "2px",
                      }}
                    >
                      Zone {zone.zone_id}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                      }}
                    >
                      Dominant:{" "}
                      {zone.dominant_pollutant?.toUpperCase() || "-"}
                    </div>
                  </div>

                  {/* AQI + trend */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: color,
                        lineHeight: 1.1,
                      }}
                    >
                      {zone.aqi.toFixed(0)}{" "}
                      <span
                        style={{
                          color: getTrendColor(zone.trend, zone.aqi),
                        }}
                      >
                        {getTrendArrow(zone.trend)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* close flex:1 content wrapper */}
      </div>

      {/* FOOTER */}
      <div
        style={{
          background: "#0F172A",
          color: "#CBD5E1",
          padding: "20px",
          textAlign: "center",
          marginTop: "60px",
        }}
      >
        <div>PM2.5 • Real-time Air Quality Monitoring System</div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "12px",
            color: "#94A3B8",
          }}
        >
          Built with FastAPI + React • Simulation Engine v1.0
        </div>
      </div>
    </div>
  );
}


export default Dashboard;