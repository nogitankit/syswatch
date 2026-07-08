"use client";

import { useTelemetryContext } from "../DashboardShell";

export default function SystemPage() {
  const { latest } = useTelemetryContext();
  const sys = latest?.system;
  const cpu = latest?.cpu;
  const bat = sys?.battery;

  const sections = [
    {
      title: "Operating System",
      icon: "🖥️",
      items: [
        { label: "OS", value: sys?.os?.name ?? "N/A" },
        { label: "Hostname", value: sys?.os?.hostname ?? "N/A" },
      ],
    },
    {
      title: "Processor",
      icon: "⚡",
      items: [
        { label: "Name", value: cpu?.name ?? "N/A" },
        { label: "Manufacturer", value: cpu?.info?.[0]?.manufacturerName ?? "N/A" },
        { label: "Physical Cores", value: String(cpu?.info?.[0]?.coreCount ?? "N/A") },
        { label: "Threads", value: String(cpu?.info?.[0]?.threadCount ?? "N/A") },
        { label: "Max Speed", value: `${cpu?.info?.[0]?.currentSpeed ?? 0} GHz` },
      ],
    },
    {
      title: "Motherboard",
      icon: "🔧",
      items: [
        { label: "Name", value: sys?.motherboard?.name ?? "N/A" },
      ],
    },
    {
      title: "BIOS",
      icon: "📀",
      items: [
        { label: "Vendor", value: sys?.bios?.vendor ?? "N/A" },
        { label: "Version", value: sys?.bios?.version ?? "N/A" },
        { label: "Date", value: sys?.bios?.date ?? "N/A" },
      ],
    },
  ];

  // Add battery section if present
  if (bat?.present) {
    sections.push({
      title: "Battery",
      icon: "🔋",
      items: [
        { label: "Charge Level", value: `${bat.level?.[0]?.value?.toFixed(1) ?? 0}%` },
        { label: "Health", value: `${bat.level?.[1]?.value?.toFixed(1) ?? 0}%` },
        { label: "Cycle Count", value: bat.cycleCount ?? "N/A" },
        { label: "Design Capacity", value: `${bat.capacity?.[0]?.value?.toFixed(0) ?? 0} mWh` },
        { label: "Full Charge", value: `${bat.capacity?.[1]?.value?.toFixed(0) ?? 0} mWh` },
        { label: "Remaining", value: `${bat.capacity?.[2]?.value?.toFixed(0) ?? 0} mWh` },
      ],
    });
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Information</h1>
          <p className="page-subtitle">{sys?.os?.hostname ?? 'localhost'}</p>
        </div>
      </div>

      <div className="system-info-grid">
        {sections.map((section, i) => (
          <div key={i} className="glass-card system-info-card">
            <div className="system-info-header">
              <span className="system-info-icon">{section.icon}</span>
              <h2 className="system-info-title">{section.title}</h2>
            </div>
            <div className="system-info-items">
              {section.items.map((item, j) => (
                <div key={j} className="system-info-row">
                  <span className="system-info-label">{item.label}</span>
                  <span className="system-info-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
