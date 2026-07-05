interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function StatCard({ label, value, unit, color, icon }: StatCardProps) {
  return (
    <div className="glass-card p-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ background: color + "1a", color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <p className="text-lg font-bold tabular-nums leading-tight text-text-primary">
            {value}
            <span className="text-xs text-text-tertiary ml-1 font-normal">
              {unit}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
