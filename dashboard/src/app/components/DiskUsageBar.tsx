'use client';

interface DiskUsageBarProps {
  name: string;
  totalGB: number;
  freeGB: number;
  temperature?: number;
  health?: string;
  readSpeed?: number;
  writeSpeed?: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB/s`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${bytes.toFixed(0)} B/s`;
}

export default function DiskUsageBar({ name, totalGB, freeGB, temperature, health, readSpeed, writeSpeed }: DiskUsageBarProps) {
  const usedGB = totalGB - freeGB;
  const pct = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#06d6a0';

  return (
    <div className="disk-usage-card glass-card">
      <div className="disk-header">
        <div className="disk-name">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <span>{name}</span>
        </div>
        <span className="disk-pct" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>

      <div className="disk-bar-track">
        <div className="disk-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>

      <div className="disk-stats-row">
        <span>{usedGB.toFixed(1)} / {totalGB.toFixed(1)} GB used</span>
        <span>{freeGB.toFixed(1)} GB free</span>
      </div>

      {(readSpeed !== undefined || writeSpeed !== undefined || temperature !== undefined) && (
        <div className="disk-extra-stats">
          {readSpeed !== undefined && (
            <span className="disk-stat">
              <span className="disk-stat-label">R:</span> {formatBytes(readSpeed)}
            </span>
          )}
          {writeSpeed !== undefined && (
            <span className="disk-stat">
              <span className="disk-stat-label">W:</span> {formatBytes(writeSpeed)}
            </span>
          )}
          {(temperature !== undefined && temperature > 0) && (
            <span className="disk-stat">
              <span className="disk-stat-label">Temp:</span> {temperature.toFixed(0)}°C
            </span>
          )}
        </div>
      )}
    </div>
  );
}
