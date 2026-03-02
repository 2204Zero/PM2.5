import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../axiosConfig";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";

function formatTimeLabel(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCsv(history) {
  const header = ["timestamp", "aqi", "pm25", "pm10", "no2", "co", "o3"];
  const rows = history.map((h) => [
    h.timestamp,
    h.aqi,
    h.pm25,
    h.pm10,
    h.no2,
    h.co,
    h.o3,
  ]);
  const lines = [header.join(","), ...rows.map((r) => r.join(","))];
  return lines.join("\n");
}

function ZoneDetail() {
  const { zoneId } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/zone/${zoneId}/history`);
        if (!isMounted) return;
        setHistory(res.data.history || []);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to load zone history.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [zoneId]);

  const chartData = useMemo(() => {
    if (!history.length) return [];

    // ensure sorted by timestamp asc
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    return sorted.map((entry, index) => {
      const start = Math.max(0, index - 4);
      const windowSlice = sorted.slice(start, index + 1);
      const ma =
        windowSlice.reduce((sum, e) => sum + (e.aqi || 0), 0) /
        windowSlice.length;

      return {
        ...entry,
        timeLabel: formatTimeLabel(entry.timestamp),
        ma5: Number.isFinite(ma) ? ma : null,
      };
    });
  }, [history]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const lastN = history.slice(-50);
    const aqis = lastN.map((h) => h.aqi || 0);
    const current = aqis[aqis.length - 1];
    const highest = Math.max(...aqis);
    const lowest = Math.min(...aqis);
    const average =
      aqis.reduce((sum, v) => sum + v, 0) / (aqis.length || 1);

    return {
      current: current.toFixed(0),
      highest: highest.toFixed(0),
      lowest: lowest.toFixed(0),
      average: average.toFixed(0),
    };
  }, [history]);

  const handleDownloadCsv = () => {
    if (!history.length) return;
    const csv = buildCsv(history);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `zone_${zoneId}_history.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        padding: "40px",
        background: "#F8FAFC",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 600,
                color: "#0F172A",
              }}
            >
              Zone {zoneId} Analytics
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: "14px",
              }}
            >
              Historical AQI and pollutant trends
            </p>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={!history.length}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: history.length ? "#0F172A" : "#E2E8F0",
              color: history.length ? "white" : "#94A3B8",
              fontSize: "13px",
              cursor: history.length ? "pointer" : "not-allowed",
              boxShadow: "0 1px 3px rgba(15,23,42,0.12)",
            }}
          >
            Download CSV
          </button>
        </div>

        {/* Loading / Empty / Error states */}
        {loading && (
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "white",
              border: "1px solid #E2E8F0",
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Loading history...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#B91C1C",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && !history.length && (
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "white",
              border: "1px solid #E2E8F0",
              color: "#94A3B8",
              fontSize: "14px",
            }}
          >
            No history available yet for this zone.
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <>
            {/* Stats strip */}
            {stats && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {[
                  { label: "Current AQI", value: stats.current },
                  { label: "Highest (last 50)", value: stats.highest },
                  { label: "Lowest (last 50)", value: stats.lowest },
                  { label: "Average (last 50)", value: stats.average },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#FFFFFF",
                      padding: "16px",
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow:
                        "0 8px 20px rgba(15,23,42,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#64748B",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 600,
                        color: "#0F172A",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Chart card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
                padding: "16px 20px 20px",
                minHeight: "360px",
                opacity: loading ? 0 : 1,
                transition: "opacity 150ms ease-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#0F172A",
                  }}
                >
                  AQI over time
                </h2>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                >
                  Includes 5-point moving average
                </span>
              </div>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />

                    {/* AQI bands */}
                    <ReferenceArea
                      y1={0}
                      y2={50}
                      fill="#22C55E"
                      fillOpacity={0.08}
                      stroke={null}
                    />
                    <ReferenceArea
                      y1={50}
                      y2={100}
                      fill="#FACC15"
                      fillOpacity={0.08}
                      stroke={null}
                    />
                    <ReferenceArea
                      y1={100}
                      y2={200}
                      fill="#FB923C"
                      fillOpacity={0.08}
                      stroke={null}
                    />
                    <ReferenceArea
                      y1={200}
                      y2={300}
                      fill="#F87171"
                      fillOpacity={0.08}
                      stroke={null}
                    />
                    <ReferenceArea
                      y1={300}
                      y2={500}
                      fill="#7F1D1D"
                      fillOpacity={0.08}
                      stroke={null}
                    />

                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickMargin={8}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        borderRadius: "10px",
                        border: "1px solid #E2E8F0",
                        padding: "8px 10px",
                        boxShadow:
                          "0 8px 20px rgba(15,23,42,0.1)",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#64748B" }}
                    />

                    <Line
                      type="monotone"
                      dataKey="aqi"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ma5"
                      stroke="#F97316"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ZoneDetail;