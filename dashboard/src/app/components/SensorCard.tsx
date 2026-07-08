 'use client';

interface SensorCardProps {
  label: string;
  value: string | number;
  unit?: string;
  min?: number;
  max?: number;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export default function SensorCard({ label, value, unit = '', min, max, icon, color = '#06d6a0', subtitle }: SensorCardProps) {
  return (
    <div className="sensor-card">
      <div className="sensor-card-header">
        {icon && <div className="sensor-card-icon" style={{ color }}>{icon}</div>}
        <div className="sensor-card-label">{label}</div>
      </div>
      <div className="sensor-card-value" style={{ color }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span className="sensor-card-unit">{unit}</span>}
      </div>
      {subtitle && <div className="sensor-card-subtitle">{subtitle}</div>}
      {(min !== undefined && max !== undefined) && (
        <div className="sensor-card-range">
          <span>Min: {min.toFixed(1)}</span>
          <span>Max: {max.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
