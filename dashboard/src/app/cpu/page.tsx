"use client";

import { useTelemetryContext } from "../DashboardShell";
import PerCoreBars from "../components/PerCoreBars";
import SensorCard from "../components/SensorCard";
import TelemetryChart from "../components/TelemetryChart";

export default function CpuPage() {
  const { latest, history } = useTelemetryContext();
  const cpu = latest?.cpu;

  const chartData = history.map((snap) => ({
    time: new Date(snap.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    load: snap.cpu?.maxLoad ?? 0,
    temp: snap.cpu?.temperature?.[0]?.value ?? 0,
  }));

  const info = cpu?.info?.[0];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">CPU</h1>
          <p className="page-subtitle">{cpu?.name ?? 'Unknown CPU'}</p>
        </div>
      </div>

      {/* ── Info Cards ── */}
      <div className="stats-grid">
        <SensorCard label="Overall Load" value={cpu?.maxLoad ?? 0} unit="%" color="#06d6a0" />
        <SensorCard label="Temperature" value={cpu?.temperature?.[0]?.value ?? 0} unit="°C" color="#ef4444"
          min={cpu?.temperature?.[0]?.min} max={cpu?.temperature?.[0]?.max} />
        <SensorCard label="Physical Cores" value={info?.coreCount ?? 0} color="#38bdf8" />
        <SensorCard label="Threads" value={info?.threadCount ?? 0} color="#7c3aed" />
        <SensorCard label="Max Speed" value={info?.currentSpeed ?? 0} unit=" GHz" color="#f59e0b" />
        <SensorCard label="Manufacturer" value={info?.manufacturerName ?? 'N/A'} color="#94a3b8" />
      </div>

      {/* ── Per-Core Load ── */}
      <div className="glass-card p-6">
        <h2 className="section-title">Per-Core Load</h2>
        <PerCoreBars cores={cpu?.load ?? []} color="#06d6a0" />
      </div>

      {/* ── Per-Core Clock (if available) ── */}
      {(cpu?.clock ?? []).some(c => c.value > 0) && (
        <div className="glass-card p-6">
          <h2 className="section-title">Per-Core Clock Speed</h2>
          <PerCoreBars cores={cpu?.clock ?? []} color="#38bdf8" unit=" MHz" maxValue={Math.max(...(cpu?.clock ?? []).map(c => c.max), 1)} />
        </div>
      )}

      {/* ── CPU Load History ── */}
      <TelemetryChart
        title="CPU Load History"
        subtitle="Overall utilization"
        data={chartData}
        series={[{ name: "Load", dataKey: "load", stroke: "#06d6a0", fill: "url(#cpuLoadGrad)" }]}
        legend={[{ color: "#06d6a0", label: "Load %" }]}
        gradients={[{ id: "cpuLoadGrad", color: "#06d6a0" }]}
        yDomain={[0, 100]}
        yTickFormatter={(v) => `${v}%`}
        animationDelay="0ms"
      />

      {/* ── CPU Temperature History ── */}
      {chartData.some(d => d.temp > 0) && (
        <TelemetryChart
          title="Temperature History"
          subtitle="Package temperature"
          data={chartData}
          series={[{ name: "Temp", dataKey: "temp", stroke: "#ef4444", fill: "url(#tempGrad)" }]}
          legend={[{ color: "#ef4444", label: "°C" }]}
          gradients={[{ id: "tempGrad", color: "#ef4444" }]}
          yDomain={[0, 'auto']}
          yTickFormatter={(v) => `${v}°`}
          animationDelay="100ms"
        />
      )}
    </div>
  );
}
