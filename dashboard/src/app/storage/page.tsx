"use client";

import { useTelemetryContext } from "../DashboardShell";
import DiskUsageBar from "../components/DiskUsageBar";
import TelemetryChart from "../components/TelemetryChart";

export default function StoragePage() {
  const { latest, history } = useTelemetryContext();
  const disks = latest?.system?.storage?.disks ?? [];

  const chartData = history.map((snap) => {
    const d: Record<string, unknown> = {
      time: new Date(snap.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    (snap.system?.storage?.disks ?? []).forEach((disk, i) => {
      d[`read_${i}`] = (disk.throughputRead ?? 0) / 1048576;
      d[`write_${i}`] = (disk.throughputWrite ?? 0) / 1048576;
    });
    return d;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Storage</h1>
          <p className="page-subtitle">{disks.length} disk{disks.length !== 1 ? 's' : ''} detected</p>
        </div>
      </div>

      {/* ── Disk Usage Bars ── */}
      <div className="disk-grid">
        {disks.map((disk, i) => (
          <DiskUsageBar
            key={i}
            name={disk.name}
            totalGB={disk.totalSpace}
            freeGB={disk.freeSpace}
            temperature={disk.temperature?.value}
            health={disk.health}
            readSpeed={disk.throughputRead}
            writeSpeed={disk.throughputWrite}
          />
        ))}
        {disks.length === 0 && (
          <div className="glass-card p-6 text-center" style={{ color: '#94a3b8' }}>
            No disks detected
          </div>
        )}
      </div>

      {/* ── Throughput Charts (per disk) ── */}
      {disks.map((disk, i) => (
        <TelemetryChart
          key={i}
          title={`${disk.name} Throughput`}
          subtitle="Read / Write speed"
          data={chartData}
          series={[
            { name: "Read", dataKey: `read_${i}`, stroke: "#06d6a0", fill: `url(#readGrad_${i})` },
            { name: "Write", dataKey: `write_${i}`, stroke: "#7c3aed", fill: `url(#writeGrad_${i})` },
          ]}
          legend={[
            { color: "#06d6a0", label: "Read MB/s" },
            { color: "#7c3aed", label: "Write MB/s" },
          ]}
          gradients={[
            { id: `readGrad_${i}`, color: "#06d6a0" },
            { id: `writeGrad_${i}`, color: "#7c3aed" },
          ]}
          yDomain={[0, 'auto']}
          yTickFormatter={(v) => `${Number(v).toFixed(1)}`}
          animationDelay="0ms"
        />
      ))}
    </div>
  );
}
