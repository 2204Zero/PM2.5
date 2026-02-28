import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

function ZoneDetail() {
  const { zoneId } = useParams();
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    const res = await axios.get(
      `http://127.0.0.1:8000/zone/${zoneId}/history`
    );
    setHistory(res.data.history);
  };

  useEffect(() => {
    fetchHistory();
  }, [zoneId]);

  const buildChart = (label, key, color) => {
    if (!history.length) return null;

    return {
      labels: history.map((_, i) => i + 1),
      datasets: [
        {
          label,
          data: history.map((entry) =>
            key === "aqi"
              ? entry.aqi
              : entry.avg_pollutants[key]
          ),
          borderColor: color,
          tension: 0.3,
        },
      ],
    };
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI" }}>
      <h1>Zone {zoneId} Detailed Analytics</h1>

      {history.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: "30px",
          }}
        >
          <div>
            <h3>AQI</h3>
            <Line data={buildChart("AQI", "aqi", "#2563eb")} />
          </div>

          <div>
            <h3>PM2.5</h3>
            <Line data={buildChart("PM2.5", "pm25", "#ef4444")} />
          </div>

          <div>
            <h3>PM10</h3>
            <Line data={buildChart("PM10", "pm10", "#f59e0b")} />
          </div>

          <div>
            <h3>NO₂</h3>
            <Line data={buildChart("NO₂", "no2", "#7c3aed")} />
          </div>

          <div>
            <h3>CO</h3>
            <Line data={buildChart("CO", "co", "#059669")} />
          </div>

          <div>
            <h3>O₃</h3>
            <Line data={buildChart("O₃", "o3", "#0ea5e9")} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoneDetail;