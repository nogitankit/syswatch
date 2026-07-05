"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

interface RadialChartProps {
  /** Current value (e.g. 42.5) */
  value: number
  /** Maximum value – used to calculate the arc angle (default 100) */
  max?: number
  /** Title shown above the chart */
  title: string
  /** Small description below the title */
  description?: string
  /** Footer text (e.g. "3 241 / 7 812 MB") */
  footer?: string
  /** Accent color for the bar */
  color?: string
  /** Unit label rendered below the number (default "%") */
  unit?: string
}

export default function RadialChart({
  value,
  max = 100,
  title,
  description,
  footer,
  color = "#06d6a0",
  unit = "%",
}: RadialChartProps) {
  const clamped = Math.min(Math.max(value, 0), max)
  const pct = (clamped / max) * 100

  // Severity override: amber > 70 %, rose > 90 %
  const dynamicColor =
    pct > 90 ? "#f43f5e" : pct > 70 ? "#f59e0b" : color

  const chartData = [
    { metric: "value", value: clamped, fill: dynamicColor },
  ]

  const chartConfig = {
    value: { label: title, color: dynamicColor },
  } satisfies ChartConfig

  // Map 0-max → 0-360° arc angle
  const endAngle = (clamped / max) * 360

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Title */}
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {title}
        </p>
        {description && (
          <p className="text-[10px] text-text-tertiary">{description}</p>
        )}
      </div>

      {/* Chart */}
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-[180px] h-[180px]"
      >
        <RadialBarChart
          data={chartData}
          startAngle={0}
          endAngle={endAngle}
          innerRadius={60}
          outerRadius={85}
        >
          <PolarGrid
            gridType="circle"
            radialLines={false}
            stroke="none"
            className="first:fill-surface-elevated last:fill-surface-card"
            polarRadius={[78, 68]}
          />
          <RadialBar
            dataKey="value"
            background
            cornerRadius={10}
          />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="text-2xl font-bold"
                        style={{ fill: dynamicColor }}
                      >
                        {clamped.toFixed(1)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="text-[10px] uppercase"
                        style={{ fill: "#55556a" }}
                      >
                        {unit}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>

      {/* Footer */}
      {footer && (
        <p className="text-[10px] text-text-tertiary">{footer}</p>
      )}
    </div>
  )
}