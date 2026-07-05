import { ActivityIcon, ClockIcon } from "./Icons";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface HeaderProps {
  uptimeStr: string;
  status: ConnectionStatus;
}

const statusConfig = {
  connected: { color: "#06d6a0", text: "LIVE" },
  connecting: { color: "#f59e0b", text: "CONNECTING" },
  disconnected: { color: "#f43f5e", text: "OFFLINE" },
};

export default function Header({ uptimeStr, status }: HeaderProps) {
  const st = statusConfig[status];

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        {/* <div className="w-10 h-10 rounded-xl bg-accent-cyan-dim flex items-center justify-center">
          <ActivityIcon size={20} className="text-accent-cyan" />
        </div> */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            SysWatch
          </h1>
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest">
            System Telemetry Monitor
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Uptime */}
        <div className="text-xs text-text-tertiary flex items-center gap-2">
          <ClockIcon size={14} />
          <span className="tabular-nums">{uptimeStr}</span>
        </div>

        {/* Status badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: st.color + "15",
            color: st.color,
            border: `1px solid ${st.color}30`,
          }}
        >
          <span className="status-dot" style={{ background: st.color }} />
          {st.text}
        </div>
      </div>
    </header>
  );
}
