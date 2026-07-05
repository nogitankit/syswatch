"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import RadialChart from "./components/RadialChart";
import StatCard from "./components/StatCard";
import TelemetryChart from "./components/TelemetryChart";
import { MemoryIcon, MemoryFreeIcon, MemoryTotalIcon, CpuIcon } from "./components/Icons";

/* ────────────────────────────────────────── */
/*  Types & Constants                         */
/* ────────────────────────────────────────── */

interface TelemetrySnapshot {
  cpuPercent: number;
  ramTotalMB: number;
  ramUsedMB: number;
  time: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const MAX_HISTORY = 40;
const WS_URL = "ws://localhost:6767";
const RECONNECT_DELAY = 3000;

/* ────────────────────────────────────────── */
/*  Main Dashboard                            */
/* ────────────────────────────────────────── */

export default function TelemetryDashboard() {
  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const uptimeStart = useRef<number>(Date.now());

  const latest = history[history.length - 1];

  /* ── Derived values ── */
  const cpuPct = latest?.cpuPercent ?? 0;
  const ramUsed = latest?.ramUsedMB ?? 0;
  const ramTotal = latest?.ramTotalMB ?? 1;
  const ramPct = (ramUsed / ramTotal) * 100;
  const ramFree = ramTotal - ramUsed;

  /* ── Uptime clock ── */
  const [uptimeStr, setUptimeStr] = useState("00:00:00");

  useEffect(() => {
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - uptimeStart.current) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setUptimeStr(`${h}:${m}:${sec}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── WebSocket connection ── */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      uptimeStart.current = Date.now();
    };

    ws.onmessage = (event) => {
      try {
        const raw = event.data.toString().trim();
        // The C++ binary may buffer multiple JSON objects in a single chunk
        const lines = raw.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const incoming = JSON.parse(line);
          const time = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          setHistory((prev) => {
            const next = [...prev, { ...incoming, time }];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          });
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setStatus("disconnected");

    ws.onclose = () => {
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  /* ── Render ── */
  return (
    <main className="min-h-screen bg-surface-primary text-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Header uptimeStr={uptimeStr} status={status} />

        {/* ── Gauges + Stats Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-6">
          {/* CPU Gauge */}
          <div className="glass-card p-6 flex flex-col items-center justify-center animate-scale-in">
            <RadialChart
              value={cpuPct}
              title="CPU Usage"
              description="All cores"
              color="#06d6a0"
            />
          </div>

          {/* RAM Gauge */}
          <div className="glass-card p-6 flex flex-col items-center justify-center animate-scale-in" style={{ animationDelay: "80ms" }}>
            <RadialChart
              value={ramPct}
              title="RAM Usage"
              description="Memory utilization"
              footer={`${ramUsed.toFixed(0)} / ${ramTotal.toFixed(0)} MB`}
              color="#7c3aed"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 stagger">
            <StatCard label="RAM Used"  value={ramUsed.toFixed(0)}  unit="MB" color="#7c3aed" icon={<MemoryIcon />} />
            <StatCard label="RAM Free"  value={ramFree.toFixed(0)}  unit="MB" color="#06d6a0" icon={<MemoryFreeIcon />} />
            <StatCard label="RAM Total" value={ramTotal.toFixed(0)} unit="MB" color="#f59e0b" icon={<MemoryTotalIcon />} />
            <StatCard label="CPU"       value={cpuPct.toFixed(1)}   unit="%"  color="#06d6a0" icon={<CpuIcon />} />
          </div>
        </div>

        {/* ── CPU Chart ── */}
        <TelemetryChart
          title="CPU History"
          subtitle={`Last ${MAX_HISTORY} samples`}
          data={history}
          series={[
            {
              name: "CPU",
              dataKey: "cpuPercent",
              stroke: "#06d6a0",
              fill: "url(#cpuGrad)",
            },
          ]}
          legend={[{ color: "#06d6a0", label: "CPU %" }]}
          gradients={[{ id: "cpuGrad", color: "#06d6a0" }]}
          yDomain={[0, 100]}
          yTickFormatter={(v) => `${v}%`}
          animationDelay="200ms"
        />

        {/* ── RAM Chart ── */}
        <TelemetryChart
          title="RAM History"
          subtitle="Memory usage over time"
          data={history}
          series={[
            {
              name: "Total",
              dataKey: "ramTotalMB",
              stroke: "#7c3aed50",
              strokeWidth: 1,
              strokeDasharray: "4 3",
              activeDot: false,
            },
            {
              name: "Used",
              dataKey: "ramUsedMB",
              stroke: "#7c3aed",
              fill: "url(#ramGrad)",
            },
          ]}
          legend={[
            { color: "#7c3aed", label: "Used" },
            { color: "#7c3aed40", label: "Total" },
          ]}
          gradients={[{ id: "ramGrad", color: "#7c3aed" }]}
          yDomain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
          yTickFormatter={(v) =>
            v >= 1024 ? `${(v / 1024).toFixed(1)}G` : `${v.toFixed(0)}M`
          }
          yWidth={42}
          animationDelay="300ms"
        />

        <Footer />
      </div>
    </main>
  );
}