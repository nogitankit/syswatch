"use client";

import { useTelemetryContext } from "../DashboardShell";
import RadialChart from "../components/RadialChart";
import SensorCard from "../components/SensorCard";
import TelemetryChart from "../components/TelemetryChart";

export default function RamPage() {
  const { latest, history } = useTelemetryContext();
  const ram = latest?.ram;

  const memUsed = ram?.load?.[0]?.value ?? 0;
  const memAvail = ram?.load?.[1]?.value ?? 0;
  const memPct = ram?.load?.[2]?.value ?? 0;
  const swapUsed = ram?.load?.[3]?.value ?? 0;
  const swapAvail = ram?.load?.[4]?.value ?? 0;
  const swapPct = ram?.load?.[5]?.value ?? 0;
  const memTotal = memUsed + memAvail;
  const swapTotal = swapUsed + swapAvail;

  const chartData = history.map((snap) => ({
    time: new Date(snap.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    memPct: snap.ram?.load?.[2]?.value ?? 0,
    swapPct: snap.ram?.load?.[5]?.value ?? 0,
    memUsed: snap.ram?.load?.[0]?.value ?? 0,
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Memory</h1>
          <p className="page-subtitle">Physical & Virtual Memory</p>
        </div>
      </div>

      {/* ── Gauges ── */}
      <div className="gauges-grid">
        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <RadialChart
            value={memPct}
            title="Physical"
            description="RAM"
            footer={`${memUsed.toFixed(2)} / ${memTotal.toFixed(2)} GB`}
            color="#7c3aed"
          />
        </div>
        {swapTotal > 0 && (
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <RadialChart
              value={swapPct}
              title="Swap"
              description="Virtual Memory"
              footer={`${swapUsed.toFixed(2)} / ${swapTotal.toFixed(2)} GB`}
              color="#f59e0b"
            />
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <SensorCard label="Memory Used" value={memUsed} unit=" GB" color="#7c3aed"
          min={ram?.load?.[0]?.min} max={ram?.load?.[0]?.max} />
        <SensorCard label="Memory Available" value={memAvail} unit=" GB" color="#06d6a0" />
        <SensorCard label="Memory Total" value={memTotal} unit=" GB" color="#38bdf8" />
        {swapTotal > 0 && (
          <>
            <SensorCard label="Swap Used" value={swapUsed} unit=" GB" color="#f59e0b"
              min={ram?.load?.[3]?.min} max={ram?.load?.[3]?.max} />
            <SensorCard label="Swap Free" value={swapAvail} unit=" GB" color="#06d6a0" />
            <SensorCard label="Swap Total" value={swapTotal} unit=" GB" color="#38bdf8" />
          </>
        )}
      </div>

      {/* ── Memory Usage History ── */}
      <TelemetryChart
        title="Memory Usage History"
        subtitle="Physical memory %"
        data={chartData}
        series={[
          { name: "RAM", dataKey: "memPct", stroke: "#7c3aed", fill: "url(#ramHistGrad)" },
        ]}
        legend={[{ color: "#7c3aed", label: "RAM %" }]}
        gradients={[{ id: "ramHistGrad", color: "#7c3aed" }]}
        yDomain={[0, 100]}
        yTickFormatter={(v) => `${v}%`}
        animationDelay="0ms"
      />

      {/* ── Swap History ── */}
      {swapTotal > 0 && (
        <TelemetryChart
          title="Swap Usage History"
          subtitle="Virtual memory %"
          data={chartData}
          series={[
            { name: "Swap", dataKey: "swapPct", stroke: "#f59e0b", fill: "url(#swapHistGrad)" },
          ]}
          legend={[{ color: "#f59e0b", label: "Swap %" }]}
          gradients={[{ id: "swapHistGrad", color: "#f59e0b" }]}
          yDomain={[0, 100]}
          yTickFormatter={(v) => `${v}%`}
          animationDelay="100ms"
        />
      )}
    </div>
  );
}
