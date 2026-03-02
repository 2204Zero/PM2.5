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

// Recenter helper
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12, { animate: true });
  }, [center, map]);
  return null;
}

function MapView({ zones, viewMode, city }) {
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);

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

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#22C55E";
    if (aqi <= 100) return "#FACC15";
    if (aqi <= 200) return "#F97316";
    if (aqi <= 300) return "#EF4444";
    return "#7F1D1D";
  };

  return (
    <div
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
      }}
    >
      <MapContainer
  center={mapCenter}
  zoom={12}
  style={{
    height: "500px",
    width: "100%",
    filter: "brightness(0.75) contrast(1.1)"
  }}
>
        <RecenterMap center={mapCenter} />

        {/* Modern clean tiles */}
     <TileLayer
  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
/>
<TileLayer
  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
/>

        {/* Heatmap Mode */}
        {viewMode === "heatmap" && (
          <HeatmapLayer zones={zones} />
        )}

        {/* Zone Marker Mode */}
        {viewMode === "zone" &&
          zones
            .filter((zone) => zone.latitude && zone.longitude)
            .map((zone) => (
              <CircleMarker
                key={zone.zone_id}
                center={[zone.latitude, zone.longitude]}
                radius={16}
                fillColor={getAQIColor(zone.aqi)}
                color="#FFFFFF"
                weight={2}
                fillOpacity={0.9}
              >
                <Popup>
                  <div style={{ fontSize: "14px" }}>
                    <strong>Zone {zone.zone_id}</strong>
                    <br />
                    AQI: {zone.aqi}
                    <br />
                    Dominant:{" "}
                    {zone.dominant_pollutant?.toUpperCase()}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
      </MapContainer>
    </div>
  );
}

export default MapView;