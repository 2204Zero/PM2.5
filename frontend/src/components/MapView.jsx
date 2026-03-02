import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "../axiosConfig";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  Rectangle
} from "react-leaflet";
import HeatmapLayer from "./HeatmapLayer";

// --- Static Helpers ---
const getAQIColor = (aqi) => {
  if (aqi <= 50) return "#22C55E";
  if (aqi <= 100) return "#FACC15";
  if (aqi <= 200) return "#F97316";
  if (aqi <= 300) return "#F97316"; // Poor
  if (aqi <= 400) return "#EF4444"; // Very Poor
  return "#7F1D1D"; // Severe
};

const getTrendArrow = (trend) => {
  if (trend === "rising") return "↑";
  if (trend === "falling") return "↓";
  return "•";
};

const containerStyle = {
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  position: "relative"
};

const mapStyle = {
  height: "500px",
  width: "100%",
  filter: "brightness(0.75) contrast(1.1)"
};

const popupContentStyle = { 
  minWidth: "140px",
  fontFamily: "Inter, sans-serif"
};

const popupHeaderStyle = { 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center",
  marginBottom: "8px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: "4px"
};

const popupInfoStyle = { 
  fontSize: "13px", 
  color: "#94A3B8", 
  display: "flex", 
  flexDirection: "column", 
  gap: "4px" 
};

const severeLabelStyle = { 
  marginTop: "10px", 
  padding: "4px", 
  background: "rgba(239, 68, 68, 0.2)", 
  color: "#EF4444", 
  fontSize: "11px", 
  textAlign: "center",
  fontWeight: "700",
  borderRadius: "4px",
  border: "1px solid rgba(239, 68, 68, 0.3)"
};

// --- Recenter helper ---
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

// --- Invalidate size on resize ---
function InvalidateSizeOnResize() {
  const map = useMap();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timeoutId = null;
    const handleResize = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => map.invalidateSize(), 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [map]);
  return null;
}

// --- Zoom tracker helper ---
function ZoomTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const onZoom = () => onZoomChange(map.getZoom());
    map.on("zoomend", onZoom);
    return () => map.off("zoomend", onZoom);
  }, [map, onZoomChange]);
  return null;
}

function MapView({ zones, viewMode, city, onZoneClick }) {
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [currentZoom, setCurrentZoom] = useState(12);

  const handleZoomChange = useCallback((zoom) => {
    setCurrentZoom(zoom);
  }, []);

  useEffect(() => {
    const fetchCityCenter = async () => {
      try {
        const res = await axios.get("/city/current");
        setMapCenter([
          res.data.city_center_lat,
          res.data.city_center_lon
        ]);
      } catch (error) {
        console.error("Failed to fetch city center:", error);
      }
    };
    fetchCityCenter();
  }, [city]);

  const isHeatmap = viewMode === "heatmap";

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes radio-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .pulse-marker {
            animation: radio-pulse 1.5s infinite ease-out;
            pointer-events: none;
            transform-origin: center;
          }
          .zone-grid { pointer-events: none; }
          .custom-popup .leaflet-popup-content-wrapper {
            background: #0F172A;
            color: #F8FAFC;
            border-radius: 12px;
            padding: 4px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          }
          .custom-popup .leaflet-popup-tip { background: #0F172A; }
          .custom-popup .leaflet-popup-content { margin: 12px; }
        `}
      </style>
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={mapStyle}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <RecenterMap center={mapCenter} />
        <InvalidateSizeOnResize />
        <ZoomTracker onZoomChange={handleZoomChange} />

        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

        {/* --- HEATMAP MODE SPECIFIC LAYERS --- */}
        {isHeatmap && (
          <>
            <HeatmapLayer zones={zones} />
            {zones.map((zone) => {
              if (!zone.latitude || !zone.longitude) return null;
              const bounds = [
                [zone.latitude - 0.005, zone.longitude - 0.005],
                [zone.latitude + 0.005, zone.longitude + 0.005]
              ];
              return (
                <Rectangle
                  key={`grid-${zone.zone_id}`}
                  bounds={bounds}
                  pathOptions={{ color: "#FFFFFF", weight: 0.5, fillOpacity: 0, className: "zone-grid" }}
                />
              );
            })}
          </>
        )}

        {/* --- COMMON SEVERE PULSE (In Heatmap Mode Only) --- */}
        {isHeatmap && currentZoom >= 11 && zones
          .filter(z => z.aqi >= 400 && z.latitude && z.longitude)
          .map(zone => (
            <CircleMarker
              key={`pulse-${zone.zone_id}`}
              center={[zone.latitude, zone.longitude]}
              radius={16}
              fillColor="#7F1D1D"
              color="transparent"
              weight={0}
              fillOpacity={0.6}
              className="pulse-marker"
            />
          ))
        }

        {/* --- ZONE MODE SPECIFIC LAYERS --- */}
        {!isHeatmap && zones
          .filter(z => z.latitude && z.longitude)
          .map(zone => (
            <CircleMarker
              key={`zone-${zone.zone_id}`}
              center={[zone.latitude, zone.longitude]}
              radius={16}
              fillColor={getAQIColor(zone.aqi)}
              color="#FFFFFF"
              weight={2}
              fillOpacity={0.9}
              className="custom-popup"
              eventHandlers={{
                click: () => onZoneClick && onZoneClick(zone.aqi)
              }}
            >
              <Popup>
                <div style={popupContentStyle}>
                  <div style={popupHeaderStyle}>
                    <strong style={{ fontSize: "16px" }}>Zone {zone.zone_id}</strong>
                    <span style={{ 
                      fontSize: "12px", padding: "2px 6px", borderRadius: "4px",
                      background: getAQIColor(zone.aqi), color: "#FFFFFF"
                    }}>
                      AQI {zone.aqi}
                    </span>
                  </div>
                  <div style={popupInfoStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Dominant:</span>
                      <span style={{ color: "#F8FAFC", fontWeight: "600" }}>{zone.dominant_pollutant?.toUpperCase()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Trend:</span>
                      <span style={{ 
                        color: zone.trend === "rising" ? "#EF4444" : zone.trend === "falling" ? "#10B981" : "#94A3B8",
                        fontWeight: "600", display: "flex", alignItems: "center", gap: "2px"
                      }}>
                        {zone.trend?.toUpperCase()} {getTrendArrow(zone.trend)}
                      </span>
                    </div>
                  </div>
                  {zone.aqi >= 400 && <div style={severeLabelStyle}>⚠ CRITICAL SEVERITY</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))
        }

        {/* --- INVISIBLE CLICKABLE OVERLAY FOR HEATMAP --- */}
        {isHeatmap && zones
          .filter(z => z.latitude && z.longitude)
          .map(zone => (
            <CircleMarker
              key={`heatmap-click-${zone.zone_id}`}
              center={[zone.latitude, zone.longitude]}
              radius={25}
              fillColor="transparent"
              color="transparent"
              weight={0}
              fillOpacity={0}
              eventHandlers={{
                click: () => onZoneClick && onZoneClick(zone.aqi)
              }}
              className="custom-popup"
            >
              <Popup>
                <div style={popupContentStyle}>
                  <div style={popupHeaderStyle}>
                    <strong style={{ fontSize: "16px" }}>Zone {zone.zone_id}</strong>
                    <span style={{ 
                      fontSize: "12px", padding: "2px 6px", borderRadius: "4px",
                      background: getAQIColor(zone.aqi), color: "#FFFFFF"
                    }}>
                      AQI {zone.aqi}
                    </span>
                  </div>
                  <div style={popupInfoStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Dominant:</span>
                      <span style={{ color: "#F8FAFC", fontWeight: "600" }}>{zone.dominant_pollutant?.toUpperCase()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Trend:</span>
                      <span style={{ 
                        color: zone.trend === "rising" ? "#EF4444" : zone.trend === "falling" ? "#10B981" : "#94A3B8",
                        fontWeight: "600", display: "flex", alignItems: "center", gap: "2px"
                      }}>
                        {zone.trend?.toUpperCase()} {getTrendArrow(zone.trend)}
                      </span>
                    </div>
                  </div>
                  {zone.aqi >= 400 && <div style={severeLabelStyle}>⚠ CRITICAL SEVERITY</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))
        }
      </MapContainer>
    </div>
  );
}

export default MapView;