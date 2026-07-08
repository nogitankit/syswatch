'use client';

import type { Sensor } from '@/types/telemetry';

interface PerCoreBarsProps {
  cores: Sensor[];
  color?: string;
  label?: string;
  unit?: string;
  maxValue?: number;
}

export default function PerCoreBars({ cores, color = '#06d6a0', label = 'Load', unit = '%', maxValue = 100 }: PerCoreBarsProps) {
  return (
    <div className="per-core-bars">
      {cores.map((core, i) => {
        const pct = maxValue > 0 ? Math.min((core.value / maxValue) * 100, 100) : 0;
        return (
          <div key={i} className="core-bar-row">
            <span className="core-bar-label">{core.name || `Core ${i}`}</span>
            <div className="core-bar-track">
              <div
                className="core-bar-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}40`,
                }}
              />
            </div>
            <span className="core-bar-value" style={{ color }}>
              {core.value.toFixed(1)}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
