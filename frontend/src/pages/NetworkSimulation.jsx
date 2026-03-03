import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NetworkSimulation = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const resizeRef = useRef(() => {});
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const ease = (t) => t * (2 - t);
    const getAQIColor = (v) => {
      if (v <= 50) return "#16a34a";
      if (v <= 100) return "#84cc16";
      if (v <= 200) return "#f59e0b";
      if (v <= 300) return "#ef4444";
      if (v <= 400) return "#7c2d12";
      return "#4b0000";
    };

    const makeScene = (width, height) => {
      const hubs = [];
      const nodes = [];
      const packets = [];
      const hubPackets = [];
      const rows = 2;
      const cols = 3;
      const sx = width / (cols + 1);
      const sy = height / 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          hubs.push({
            x: sx * (c + 1),
            y: sy * (r + 1),
            r: Math.max(16, Math.min(26, Math.min(width, height) * 0.03)),
            flash: 0,
            received: 0,
            lastColor: "#cbd5e1",
          });
        }
      }
      const ring = Math.max(60, Math.min(120, Math.min(width, height) * 0.12));
      hubs.forEach((hub, hi) => {
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const x = hub.x + Math.cos(angle) * ring;
          const y = hub.y + Math.sin(angle) * ring;
          const pm25 = Math.floor(Math.random() * 350);
          const airParticles = [];
          for (let p = 0; p < 6; p++) {
            airParticles.push({
              x: x + (Math.random() - 0.5) * (ring * 0.5),
              y: y + (Math.random() - 0.5) * (ring * 0.5),
              speed: 1.2 + Math.random() * 0.6,
            });
          }
          nodes.push({
            x,
            y,
            r: Math.max(6, Math.min(10, Math.min(width, height) * 0.015)),
            hubIndex: hi,
            state: "idle",
            timer: 0,
            pm25,
            airParticles,
          });
        }
      });
      const server = {
        x: width / 2,
        y: height - Math.max(60, height * 0.12),
        w: Math.max(50, Math.min(80, width * 0.06)),
        h: Math.max(30, Math.min(50, height * 0.06)),
        flash: 0,
      };
      const roads = [];
      for (let i = 0; i < 6; i++) {
        roads.push({
          y1: Math.random() * height,
          c1: Math.random() * height,
          c2: Math.random() * height,
          y2: Math.random() * height,
        });
      }
      return { width, height, hubs, nodes, packets, hubPackets, server, roads, grid: 60 };
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current = makeScene(width, height);
    };

    resizeRef.current = resize;
    resize();
    window.addEventListener("resize", resize);

    const drawBackground = (s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s.height);
      g.addColorStop(0, "#0b1120");
      g.addColorStop(1, "#0f172a");
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s.width, s.height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < s.width; x += s.grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s.height);
        ctx.stroke();
      }
      for (let y = 0; y < s.height; y += s.grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s.width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      s.roads.forEach((r) => {
        ctx.beginPath();
        ctx.moveTo(0, r.y1);
        ctx.bezierCurveTo(s.width * 0.3, r.c1, s.width * 0.7, r.c2, s.width, r.y2);
        ctx.stroke();
      });
    };

    const drawConnections = (s) => {
      ctx.strokeStyle = "rgba(200,200,200,0.3)";
      ctx.lineWidth = 1;
      s.nodes.forEach((n) => {
        const h = s.hubs[n.hubIndex];
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();
      });
      s.hubs.forEach((h) => {
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(s.server.x, s.server.y);
        ctx.stroke();
      });
    };

    const drawAir = (s) => {
      ctx.fillStyle = "rgba(200,200,255,0.4)";
      s.nodes.forEach((n) => {
        n.airParticles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    };

    const drawHubs = (s) => {
      s.hubs.forEach((h) => {
        // Hexagon chassis
        const sides = 6;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const ang = ((Math.PI * 2) / sides) * i - Math.PI / 6;
          const px = h.x + Math.cos(ang) * h.r;
          const py = h.y + Math.sin(ang) * h.r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (h.flash > 0) {
          ctx.shadowColor = "rgba(203,213,225,0.9)";
          ctx.shadowBlur = 12;
          ctx.fillStyle = "rgba(203,213,225,1)";
          h.flash -= 1;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(148,163,184,0.9)";
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        // Inner circle
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        // Bottom ports (3 dots)
        const portY = h.y + h.r * 0.7;
        const portSpacing = h.r * 0.4;
        const portR = Math.max(2, h.r * 0.12);
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(h.x + i * portSpacing, portY, portR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(203,213,225,0.95)";
          ctx.fill();
        }
      });
    };

    const drawNodes = (s) => {
      s.nodes.forEach((n) => {
        const outerColor = n.state === "processing" ? "#ffffff" : getAQIColor(n.pm25);
        // Base stand
        const standW = n.r * 1.4;
        const standH = n.r * 0.4;
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.fillRect(n.x - standW / 2, n.y + n.r + 2, standW, standH);
        // Outer circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = outerColor;
        ctx.fill();
        // Inner dark circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        // Signal arcs above node
        ctx.strokeStyle = outerColor;
        ctx.lineWidth = 2;
        const baseY = n.y - n.r - 2;
        for (let i = 1; i <= 3; i++) {
          const rad = n.r * (0.6 + i * 0.35);
          ctx.beginPath();
          ctx.arc(n.x, baseY, rad, Math.PI * 0.85, Math.PI * 0.15, true);
          ctx.globalAlpha = Math.max(0.2, 1 - i * 0.25);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
    };

    const quadPoint = (p0, p1, c, t) => {
      const it = 1 - t;
      const x = it * it * p0.x + 2 * it * t * c.x + t * t * p1.x;
      const y = it * it * p0.y + 2 * it * t * c.y + t * t * p1.y;
      return { x, y };
    };

    const drawPackets = (s) => {
      // Node -> Hub (bezier)
      s.packets.forEach((pk) => {
        const tt = ease(pk.t);
        const p = quadPoint(
          { x: pk.x0, y: pk.y0 },
          { x: pk.x1, y: pk.y1 },
          { x: pk.cx, y: pk.cy },
          tt
        );
        const sz = 6;
        ctx.save();
        ctx.shadowColor = pk.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = pk.color;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.restore();
      });
      // Hub -> Server (straight)
      s.hubPackets.forEach((pk) => {
        const tt = ease(pk.t);
        const x = pk.x0 + (pk.x1 - pk.x0) * tt;
        const y = pk.y0 + (pk.y1 - pk.y0) * tt;
        const sz = 6;
        ctx.save();
        ctx.shadowColor = pk.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = pk.color;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        ctx.restore();
      });
    };

    const drawServer = (s) => {
      const x = s.server.x - s.server.w / 2;
      const y = s.server.y - s.server.h / 2;
      const w = s.server.w;
      const h = s.server.h;
      if (s.server.flash > 0) {
        ctx.fillStyle = "#ffffff";
        s.server.flash -= 1;
      } else {
        ctx.fillStyle = "#e5e7eb";
      }
      // Chassis
      ctx.fillRect(x, y, w, h);
      // Rack lines
      ctx.strokeStyle = "rgba(15,23,42,0.4)";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        const ly = y + (i * h) / 4;
        ctx.beginPath();
        ctx.moveTo(x + 8, ly);
        ctx.lineTo(x + w - 20, ly);
        ctx.stroke();
      }
      // Green LED
      ctx.beginPath();
      ctx.arc(x + w - 10, y + h / 2, Math.max(2, h * 0.08), 0, Math.PI * 2);
      ctx.fillStyle = "#16a34a";
      ctx.fill();
    };

    const updateAir = (s) => {
      s.nodes.forEach((n) => {
        if (n.state === "idle") n.state = "sampling";
        if (n.state === "sampling") {
          let allClose = true;
          n.airParticles.forEach((p) => {
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d > 2) {
              p.x += (dx / d) * p.speed;
              p.y += (dy / d) * p.speed;
              allClose = false;
            }
          });
          if (allClose) {
            n.state = "processing";
            n.timer = 60;
          }
        } else if (n.state === "processing") {
          n.timer -= 1;
          if (n.timer <= 0) {
            const h = s.hubs[n.hubIndex];
            const mx = (n.x + h.x) / 2;
            const my = (n.y + h.y) / 2 - Math.max(20, s.height * 0.05);
            s.packets.push({
              x0: n.x,
              y0: n.y,
              x1: h.x,
              y1: h.y,
              cx: mx,
              cy: my,
              t: 0,
              speed: 0.01,
              color: getAQIColor(n.pm25),
              hubIndex: n.hubIndex,
            });
            n.state = "idle";
            n.airParticles.forEach((p) => {
              p.x = n.x + (Math.random() - 0.5) * Math.max(30, s.width * 0.03);
              p.y = n.y + (Math.random() - 0.5) * Math.max(30, s.height * 0.03);
            });
          }
        }
      });
    };

    const updatePackets = (s) => {
      for (let i = s.packets.length - 1; i >= 0; i--) {
        const pk = s.packets[i];
        pk.t += pk.speed ?? 0.01;
        if (pk.t >= 1) {
          const h = s.hubs[pk.hubIndex];
          h.flash = 20;
          h.received += 1;
          h.lastColor = pk.color;
          s.packets.splice(i, 1);
          if (h.received % 4 === 0) {
            s.hubPackets.push({
              x0: h.x,
              y0: h.y,
              x1: s.server.x,
              y1: s.server.y,
              t: 0,
              speed: 0.005,
              color: h.lastColor,
            });
          }
        }
      }
      for (let i = s.hubPackets.length - 1; i >= 0; i--) {
        const pk = s.hubPackets[i];
        pk.t += pk.speed ?? 0.005;
        if (pk.t >= 1) {
          s.server.flash = 20;
          s.hubPackets.splice(i, 1);
        }
      }
    };

    const frame = () => {
      const s = stateRef.current;
      if (!s) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      drawBackground(s);
      updateAir(s);
      updatePackets(s);
      drawConnections(s);
      drawAir(s);
      drawHubs(s);
      drawNodes(s);
      drawPackets(s);
      drawServer(s);
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resizeRef.current);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={12}
        style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url={"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
      </MapContainer>
      <canvas ref={canvasRef} style={{ position: "absolute", zIndex: 1 }} />
    </div>
  );
};

export default NetworkSimulation;
