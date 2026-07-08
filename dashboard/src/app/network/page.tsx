"use client";

import { useTelemetryContext } from "../DashboardShell";
import SensorCard from "../components/SensorCard";
import TelemetryChart from "../components/TelemetryChart";

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB/s`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${bytes.toFixed(0)} B/s`;
}

export default function NetworkPage() {
  const { latest, history } = useTelemetryContext();
  const interfaces = latest?.system?.network?.interfaces ?? [];

  const chartData = history.map((snap) => {
    const d: Record<string, unknown> = {
      time: new Date(snap.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    (snap.system?.network?.interfaces ?? []).forEach((iface, i) => {
      d[`down_${i}`] = (iface.throughputDownload ?? 0) / 1048576;
      d[`up_${i}`] = (iface.throughputUpload ?? 0) / 1048576;
    });
    return d;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Network</h1>
          <p className="page-subtitle">{interfaces.length} interface{interfaces.length !== 1 ? 's' : ''} active</p>
        </div>
      </div>

      {/* ── Interface Cards ── */}
      {interfaces.map((iface, i) => (
        <div key={i} className="glass-card p-6 mb-4">
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>
            <span style={{ color: '#06d6a0' }}>⬤</span> {iface.name}
          </h2>

          <div className="stats-grid">
            <SensorCard label="IP Address" value={iface.ipAddress} color="#38bdf8" />
            <SensorCard label="MAC Address" value={iface.macAddress} color="#94a3b8" />
            <SensorCard label="Download Speed" value={formatBytes(iface.throughputDownload)} color="#06d6a0" />
            <SensorCard label="Upload Speed" value={formatBytes(iface.throughputUpload)} color="#f59e0b" />
            <SensorCard label="Total Downloaded" value={iface.downloadData.toFixed(2)} unit=" GB" color="#06d6a0" />
            <SensorCard label="Total Uploaded" value={iface.uploadData.toFixed(2)} unit=" GB" color="#f59e0b" />
          </div>
        </div>
      ))}

      {interfaces.length === 0 && (
        <div className="glass-card p-6 text-center" style={{ color: '#94a3b8' }}>
          No active network interfaces detected
        </div>
      )}

      {/* ── Throughput Charts (per interface) ── */}
      {interfaces.map((iface, i) => (
        <TelemetryChart
          key={i}
          title={`${iface.name} Throughput`}
          subtitle="Download / Upload speed"
          data={chartData}
          series={[
            { name: "Download", dataKey: `down_${i}`, stroke: "#06d6a0", fill: `url(#downGrad_${i})` },
            { name: "Upload", dataKey: `up_${i}`, stroke: "#f59e0b", fill: `url(#upGrad_${i})` },
          ]}
          legend={[
            { color: "#06d6a0", label: "↓ MB/s" },
            { color: "#f59e0b", label: "↑ MB/s" },
          ]}
          gradients={[
            { id: `downGrad_${i}`, color: "#06d6a0" },
            { id: `upGrad_${i}`, color: "#f59e0b" },
          ]}
          yDomain={[0, 'auto']}
          yTickFormatter={(v) => `${Number(v).toFixed(2)}`}
          animationDelay="0ms"
        />
      ))}
    </div>
  );
}
