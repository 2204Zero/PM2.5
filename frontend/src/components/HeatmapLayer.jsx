import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

function HeatmapLayer({ zones }) {
  const map = useMap();

  useEffect(() => {
    if (!zones || zones.length === 0) return;

    const heatPoints = zones
      .filter(zone => zone.latitude && zone.longitude)
      .map(zone => [
        zone.latitude,
        zone.longitude,
        Math.min(zone.aqi / 300, 1) // stronger scaling
      ]);

    if (heatPoints.length === 0) return;

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 60,      // increased radius
      blur: 40,        // increased blur
      maxZoom: 15,
      max: 1.0,
      gradient: {
        0.2: "#16a34a",
        0.4: "#84cc16",
        0.6: "#f59e0b",
        0.8: "#ef4444",
        1.0: "#7c2d12"
      }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [zones, map]);

  return null;
}

export default HeatmapLayer;