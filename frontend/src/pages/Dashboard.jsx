import React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";
import MapView from "../components/MapView";
import StatCard from "../pages/StatCard";
import AnimatedNumber from "../components/AnimatedNumber";
import AlertPanel from "../components/AlertPanel";
import SystemStatusBar from "../components/SystemStatusBar";
import IncidentPanel from "../components/IncidentPanel";

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
          <h2>Something went wrong in the Control Center.</h2>
          <button onClick={() => window.location.reload()}>Reload Dashboard</button>
        </div>
      );
    }
    return this.props.children;
  }
}
// ---------------------------------

function Dashboard() {
  const [zones, setZones] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [viewMode, setViewMode] = useState("zone");
  const [refreshInterval, setRefreshInterval] = useState(15000);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  // --- Alert System State ---
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [severeZoneCount, setSevereZoneCount] = useState(0);
  const [liveStats, setLiveStats] = useState(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [isIncidentPanelOpen, setIsIncidentPanelOpen] = useState(false);
  const prevSevereCount = useRef(0);
  const audioRef = useRef(null);
  // ---------------------------

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

  const fetchAlertData = async () => {
    try {
      // Get unacknowledged count (Alert Badge only)
      const countRes = await axios.get("/alerts/unacknowledged/count");
      setUnacknowledgedCount(countRes.data.total_alerts);
      
      // Get LIVE STATS (Banner and Stat Cards)
      const statsRes = await axios.get("/zones/live-stats");
      setLiveStats(statsRes.data);
      setSevereZoneCount(statsRes.data.severe_zone_count);
      
      // Get active incidents
      const incidentRes = await axios.get("/incidents/active");
      setActiveIncidents(incidentRes.data.incidents);
      
      // Get system status
      const statusRes = await axios.get("/system/status");
      setSystemStatus(statusRes.data);
    } catch (err) {
      console.error("Failed to fetch alert, incident, and status data:", err);
    }
  };

  const handleZoneClickSound = (aqi) => {
    if (isSoundEnabled && aqi >= 400) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
    }
  };

  // Sound logic - ONLY if count increases
  useEffect(() => {
    if (isSoundEnabled && severeZoneCount > prevSevereCount.current) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
    }
    prevSevereCount.current = severeZoneCount;
  }, [severeZoneCount, isSoundEnabled]);

  const changeCity = async (city) => {
    await axios.post(`/city/set/${city}`);
    setSelectedCity(city);
    await fetchZones();
    await fetchNodes();
  };

  useEffect(() => {
    fetchCities();
    fetchAlertData();
  }, []);

  // Alert polling (every 10s)
  useEffect(() => {
    const interval = setInterval(fetchAlertData, 10000);
    return () => clearInterval(interval);
  }, [isSoundEnabled]);

  useEffect(() => {
    console.log("Interval set to:", refreshInterval);

    // fetch latest data immediately when interval changes
    fetchZones();
    fetchNodes();

    const interval = setInterval(() => {
      fetchZones();
      fetchNodes();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    (async () => {
      await axios.post(`/simulation/interval/${refreshInterval / 1000}`);
      console.log(
        "Backend simulation interval set to:",
        refreshInterval / 1000
      );
    })();
  }, [refreshInterval]);

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
    if (aqi <= 50) return "#22C55E"; // Good - Green
    if (aqi <= 100) return "#FACC15"; // Satisfactory - Yellow
    if (aqi <= 200) return "#F97316"; // Moderate - Orange
    if (aqi <= 300) return "#F97316"; // Poor - Orange (User requested orange)
    if (aqi <= 400) return "#EF4444"; // Very Poor - Red (User requested red)
    return "#7F1D1D"; // Severe - Dark Red (User requested dark red)
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
        position: "relative",
        overflowX: "hidden"
      }}
    >
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto" 
      />

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .main-grid {
            display: grid;
            grid-template-columns: 3fr 340px;
            gap: 24px;
            align-items: flex-start;
            margin-bottom: 40px;
          }

          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }

          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            gap: 20px;
          }

          .header-controls {
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
          }

          .map-wrapper {
            background: white;
            border-radius: 16px;
            padding: 16px;
            border: 1px solid #E2E8F0;
            height: 520px;
          }

          @media (max-width: 1024px) {
            .main-grid {
              grid-template-columns: 1fr;
            }
            .header-container {
              flex-direction: column;
              align-items: flex-start;
            }
            .map-wrapper {
              height: 380px;
            }
            .side-panel {
              max-width: none !important;
              width: 100%;
            }
          }

          @media (max-width: 640px) {
            .kpi-grid {
              grid-template-columns: 1fr;
            }
            .header-controls {
              width: 100%;
            }
            .header-controls > * {
              flex: 1;
              min-width: 120px;
            }
          }
        `}
      </style>

      {/* SEVERE WARNING BANNER */}
      {severeZoneCount > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#7F1D1D",
            color: "white",
            padding: "10px 20px",
            textAlign: "center",
            zIndex: 1000,
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.5s ease-out"
          }}
        >
          <span style={{ fontSize: "20px" }}>⚠</span>
          <span>
            SEVERE AQI DETECTED IN {severeZoneCount} ZONE{severeZoneCount > 1 ? "S" : ""}
          </span>
        </div>
      )}

      <div style={{ flex: 1, marginTop: severeZoneCount > 0 ? "40px" : "0" }}>
        {/* HEADER */}
        <div className="header-container">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600" }}>
              PM2.5 Admin Pannel
            </h1>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                background: "#F1F5F9",
                color: "#64748B",
                borderRadius: "999px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                border: "1px solid #E2E8F0"
              }}
            >
              Simulation Mode
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#64748B" }}>
            Real-time air quality monitoring Control Room
          </p>
        </div>

        <div className="header-controls">
          {/* Alert Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            style={{
              background: isSoundEnabled ? "#F1F5F9" : "white",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: isSoundEnabled ? "#0F172A" : "#94A3B8",
              fontSize: "13px",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
          >
            <span>{isSoundEnabled ? "🔊" : "🔇"}</span>
            <span>{isSoundEnabled ? "Alert Sound ON" : "Enable Alert Sound"}</span>
          </button>

          {/* Incident Badge */}
          {activeIncidents.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsIncidentPanelOpen(true)}
                style={{
                  background: "#7F1D1D",
                  border: "1px solid #7F1D1D",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 0 12px rgba(127, 29, 29, 0.4)"
                }}
              >
                <span>🚨</span>
                Incidents
                <span
                  style={{
                    background: "white",
                    color: "#7F1D1D",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px #7F1D1D"
                  }}
                >
                  {activeIncidents.length}
                </span>
              </button>
            </div>
          )}

          {/* Alert Badge */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsAlertPanelOpen(true)}
              style={{
                background: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: "600",
                color: "#0F172A",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              Alerts
              {unacknowledgedCount > 0 && (
                <span
                  style={{
                    background: "#EF4444",
                    color: "white",
                    borderRadius: "50%",
                    minWidth: "20px",
                    height: "20px",
                    padding: "0 6px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    boxShadow: "0 0 0 2px white",
                    fontWeight: "700"
                  }}
                >
                  {unacknowledgedCount > 99 ? "99+" : unacknowledgedCount}
                </span>
              )}
            </button>
          </div>

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
        <div className="kpi-grid">
          <StatCard
            title="Average AQI"
            value={<AnimatedNumber value={Number(liveStats?.average_aqi || stats.avgAqi)} />}
          />
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

      {/* SIMULATION SPEED CONTROL */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "#64748B",
          }}
        >
          Simulation Refresh Speed
        </span>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: "white",
            fontSize: "13px",
            color: "#0F172A",
          }}
        >
          <option value={5000}>Every 5 seconds</option>
          <option value={15000}>Every 15 seconds</option>
          <option value={30000}>Every 30 seconds</option>
          <option value={60000}>Every 60 seconds</option>
        </select>
      </div>

      {/* MAIN LAYOUT: MAP + WORST ZONES PANEL */}
      <div className="main-grid">
        {/* Map container wrapper */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="map-wrapper">
            <MapView
              zones={zones}
              nodes={nodes}
              viewMode={viewMode}
              city={selectedCity}
              onZoneClick={handleZoneClickSound}
            />
          </div>
        </div>

        {/* Right panel wrapper */}
        <div className="side-panel" style={{ flex: 1 }}>
          <div
            style={{
              maxHeight: "520px",
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
                    height: zone.projected_severe ? "80px" : "60px",
                    display: "flex",
                    alignItems: "stretch",
                    gap: "10px",
                    boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
                    position: "relative",
                    transition: "height 0.3s ease",
                    borderLeft: zone.projected_severe ? "4px solid #F59E0B" : "none"
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
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      Zone {zone.zone_id}
                      {zone.projected_severe && (
                        <span style={{
                          fontSize: "9px",
                          background: "#FEF3C7",
                          color: "#92400E",
                          padding: "1px 4px",
                          borderRadius: "4px",
                          fontWeight: "700",
                          textTransform: "uppercase"
                        }}>
                          ⚠ Escalation Risk
                        </span>
                      )}
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
                    {zone.projected_severe && (
                      <div style={{
                        fontSize: "11px",
                        color: "#B45309",
                        fontWeight: "600",
                        marginTop: "4px"
                      }}>
                        Projected Severe in ~{zone.projection_minutes} min
                      </div>
                    )}
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
                      <AnimatedNumber value={zone.aqi} />{" "}
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

      {/* ALERT PANEL */}
      <AlertPanel 
        isOpen={isAlertPanelOpen} 
        onClose={() => setIsAlertPanelOpen(false)} 
        onAlertAcknowledged={fetchAlertData}
      />

      {/* INCIDENT PANEL */}
      <IncidentPanel 
        incidents={activeIncidents}
        onClose={() => setIsIncidentPanelOpen(false)}
        isOpen={isIncidentPanelOpen}
      />
      
      {/* SYSTEM STATUS BAR */}
      <SystemStatusBar status={systemStatus} />
    </div>
  );
}

Dashboard.ErrorBoundary = ErrorBoundary;

export default Dashboard;