"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ────────────────────────────────────────── */
/*  Chart Tooltip                             */
/* ────────────────────────────────────────── */

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1 !rounded-lg">
      <p className="text-text-tertiary">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {Number(entry.value).toFixed(1)}
          {entry.name === "CPU" ? "%" : " MB"}
        </p>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Legend Swatch                              */
/* ────────────────────────────────────────── */

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Area Series Config                        */
/* ────────────────────────────────────────── */

export interface AreaSeries {
  name: string;
  dataKey: string;
  stroke: string;
  strokeWidth?: number;
  fill?: string;
  strokeDasharray?: string;
  /** If provided, shows an active dot on hover */
  activeDot?: boolean;
}

interface TelemetryChartProps {
  /** Chart title */
  title: string;
  /** Subtitle under the title */
  subtitle?: string;
  /** The data array (must include a `time` key for XAxis) */
  data: any[];
  /** One or more area series to render */
  series: AreaSeries[];
  /** Legend items */
  legend: { color: string; label: string }[];
  /** Y-axis domain, default [0, 100] */
  yDomain?: [any, any];
  /** Y-axis tick formatter */
  yTickFormatter?: (value: number) => string;
  /** Y-axis width */
  yWidth?: number;
  /** Gradient definitions: array of { id, color } */
  gradients?: { id: string; color: string }[];
  /** Animation delay for stagger */
  animationDelay?: string;
}

export default function TelemetryChart({
  title,
  subtitle,
  data,
  series,
  legend,
  yDomain = [0, 100],
  yTickFormatter = (v) => `${v}%`,
  yWidth = 38,
  gradients = [],
  animationDelay,
}: TelemetryChartProps) {
  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={animationDelay ? { animationDelay } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {subtitle && (
            <p className="text-[10px] text-text-tertiary mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {legend.map((l) => (
            <LegendItem key={l.label} color={l.color} label={l.label} />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 md:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            {gradients.length > 0 && (
              <defs>
                {gradients.map((g) => (
                  <linearGradient
                    key={g.id}
                    id={g.id}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={g.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={g.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
            )}
            <XAxis
              dataKey="time"
              stroke="#55556a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#55556a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tickFormatter={yTickFormatter}
              width={yWidth}
            />
            <Tooltip content={<ChartTooltipContent />} />
            {series.map((s) => (
              <Area
                key={s.dataKey}
                name={s.name}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth ?? 2}
                strokeDasharray={s.strokeDasharray}
                fill={s.fill ?? "none"}
                isAnimationActive={false}
                dot={false}
                activeDot={
                  s.activeDot !== false
                    ? {
                        r: 4,
                        stroke: s.stroke,
                        fill: "#0a0a0f",
                        strokeWidth: 2,
                      }
                    : false
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
