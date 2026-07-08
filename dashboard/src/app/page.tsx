"use client";

import { useTelemetryContext } from "./DashboardShell";
import RadialChart from "./components/RadialChart";
import SensorCard from "./components/SensorCard";
import TelemetryChart from "./components/TelemetryChart";

export default function OverviewPage() {
  const { latest, history, status, uptimeStr } = useTelemetryContext();

  const cpu = latest?.cpu;
  const ram = latest?.ram;
  const sys = latest?.system;
  const disks = sys?.storage?.disks ?? [];
  const nets = sys?.network?.interfaces ?? [];

  const cpuLoad = cpu?.maxLoad ?? 0;
  const memUsedGB = ram?.load?.[0]?.value ?? 0;
  const memTotalGB = (ram?.load?.[0]?.value ?? 0) + (ram?.load?.[1]?.value ?? 1);
  const memPct = ram?.load?.[2]?.value ?? 0;
  const swapPct = ram?.load?.[5]?.value ?? 0;
  const cpuTemp = cpu?.temperature?.[0]?.value ?? 0;

  // Chart data: build from history
  const chartData = history.map((snap, i) => ({
    time: new Date(snap.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    cpuPercent: snap.cpu?.maxLoad ?? 0,
    ramPercent: snap.ram?.load?.[2]?.value ?? 0,
    cpuTemp: snap.cpu?.temperature?.[0]?.value ?? 0,
    netDown: (snap.system?.network?.interfaces?.[0]?.throughputDownload ?? 0) / 1048576,
    netUp: (snap.system?.network?.interfaces?.[0]?.throughputUpload ?? 0) / 1048576,
  }));

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">
            {sys?.os?.hostname ?? 'localhost'} • {sys?.os?.name ?? 'Linux'} • Uptime: {uptimeStr}
          </p>
        </div>
        <div className={`status-pill ${status}`}>
          <span className="status-dot" />
          {status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
        </div>
      </div>

      {/* ── Gauges Row ── */}
      <div className="gauges-grid">
        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <RadialChart
            value={cpuLoad}
            title="CPU"
            description={cpu?.name ?? 'CPU'}
            color="#06d6a0"
          />
        </div>

        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <RadialChart
            value={memPct}
            title="Memory"
            description="Physical RAM"
            footer={`${memUsedGB.toFixed(1)} / ${memTotalGB.toFixed(1)} GB`}
            color="#7c3aed"
          />
        </div>

        {swapPct > 0 && (
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <RadialChart
              value={swapPct}
              title="Swap"
              description="Virtual Memory"
              color="#f59e0b"
            />
          </div>
        )}
      </div>

      {/* ── Stat Cards Grid ── */}
      <div className="stats-grid">
        <SensorCard label="CPU Load" value={cpuLoad} unit="%" color="#06d6a0"
          min={cpu?.load?.[0]?.min} max={cpu?.load?.[0]?.max}
          icon={<CpuSmallIcon />} />
        <SensorCard label="CPU Temp" value={cpuTemp} unit="°C" color="#ef4444"
          min={cpu?.temperature?.[0]?.min} max={cpu?.temperature?.[0]?.max}
          icon={<ThermIcon />} />
        <SensorCard label="RAM Used" value={memUsedGB} unit=" GB" color="#7c3aed"
          icon={<RamSmallIcon />} />
        <SensorCard label="Cores" value={cpu?.info?.[0]?.coreCount ?? 0} unit=""
          subtitle={`${cpu?.info?.[0]?.threadCount ?? 0} threads`}
          color="#38bdf8" icon={<CoreIcon />} />
        {nets.length > 0 && (
          <>
            <SensorCard label="Net ↓" value={(nets[0].throughputDownload / 1048576).toFixed(2)} unit=" MB/s" color="#06d6a0" icon={<DownIcon />} />
            <SensorCard label="Net ↑" value={(nets[0].throughputUpload / 1048576).toFixed(2)} unit=" MB/s" color="#f59e0b" icon={<UpIcon />} />
          </>
        )}
        {disks.length > 0 && (
          <SensorCard label="Disk" value={((disks[0].totalSpace - disks[0].freeSpace)).toFixed(1)} unit=" GB used"
            subtitle={`${disks[0].freeSpace.toFixed(1)} GB free of ${disks[0].totalSpace.toFixed(1)} GB`}
            color="#7c3aed" icon={<DiskSmallIcon />} />
        )}
      </div>

      {/* ── CPU History Chart ── */}
      <TelemetryChart
        title="CPU History"
        subtitle="Load over time"
        data={chartData}
        series={[
          { name: "CPU", dataKey: "cpuPercent", stroke: "#06d6a0", fill: "url(#cpuGrad)" },
        ]}
        legend={[{ color: "#06d6a0", label: "CPU %" }]}
        gradients={[{ id: "cpuGrad", color: "#06d6a0" }]}
        yDomain={[0, 100]}
        yTickFormatter={(v) => `${v}%`}
        animationDelay="0ms"
      />

      {/* ── RAM History Chart ── */}
      <TelemetryChart
        title="Memory History"
        subtitle="Usage over time"
        data={chartData}
        series={[
          { name: "RAM", dataKey: "ramPercent", stroke: "#7c3aed", fill: "url(#ramGrad)" },
        ]}
        legend={[{ color: "#7c3aed", label: "RAM %" }]}
        gradients={[{ id: "ramGrad", color: "#7c3aed" }]}
        yDomain={[0, 100]}
        yTickFormatter={(v) => `${v}%`}
        animationDelay="100ms"
      />

      {/* ── Network Throughput Chart ── */}
      {nets.length > 0 && (
        <TelemetryChart
          title="Network Throughput"
          subtitle={nets[0]?.name ?? 'Interface'}
          data={chartData}
          series={[
            { name: "Download", dataKey: "netDown", stroke: "#06d6a0", fill: "url(#netDownGrad)" },
            { name: "Upload", dataKey: "netUp", stroke: "#f59e0b", fill: "url(#netUpGrad)" },
          ]}
          legend={[
            { color: "#06d6a0", label: "Download MB/s" },
            { color: "#f59e0b", label: "Upload MB/s" },
          ]}
          gradients={[
            { id: "netDownGrad", color: "#06d6a0" },
            { id: "netUpGrad", color: "#f59e0b" },
          ]}
          yDomain={[0, 'auto']}
          yTickFormatter={(v) => `${Number(v).toFixed(1)}`}
          animationDelay="200ms"
        />
      )}
    </div>
  );
}

// ─── Small inline icons ──────────────────────────────────────────
function CpuSmallIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>; }
function ThermIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>; }
function RamSmallIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6V4"/><path d="M10 6V4"/><path d="M14 6V4"/><path d="M18 6V4"/></svg>; }
function CoreIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>; }
function DownIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>; }
function UpIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>; }
function DiskSmallIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/></svg>; }