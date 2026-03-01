import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";
import HeatmapLayer from "./HeatmapLayer";

// Helper component to recenter map dynamically
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

function MapView({ zones, nodes, viewMode, city }) {
  const [mode, setMode] = useState("heatmap");
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // default fallback

  // Fetch city center from backend
  useEffect(() => {
    const fetchCityCenter = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/city/current"
        );
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

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#16a34a";
    if (aqi <= 100) return "#84cc16";
    if (aqi <= 200) return "#f59e0b";
    if (aqi <= 300) return "#ef4444";
    if (aqi <= 400) return "#7c2d12";
    return "#4b0000";
  };

  return (
    <div>
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={() => setMode("heatmap")}
          style={{ marginRight: "10px" }}
        >
          Heatmap
        </button>
        <button onClick={() => setMode("zones")}>
          Zone View
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{
          height: "500px",
          width: "100%",
          borderRadius: "12px"
        }}
      >
        <RecenterMap center={mapCenter} />

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === "heatmap" && <HeatmapLayer zones={zones} />}

        {mode === "zones" &&
          zones
            .filter(zone => zone.latitude && zone.longitude)
            .map((zone) => (
              <CircleMarker
                key={zone.zone_id}
                center={[zone.latitude, zone.longitude]}
                radius={14}
                fillColor={getAQIColor(zone.aqi)}
                color="#000"
                weight={1}
                fillOpacity={0.85}
              >
                <Popup>
                  <strong>Zone {zone.zone_id}</strong><br />
                  AQI: {zone.aqi}<br />
                  Dominant: {zone.dominant_pollutant?.toUpperCase()}
                </Popup>
              </CircleMarker>
            ))}
      </MapContainer>
    </div>
  );
}

export default MapView;