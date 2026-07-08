'use client';

import { createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import { useTelemetry, type TelemetryState } from '@/hooks/useTelemetry';

const TelemetryContext = createContext<TelemetryState>({
  latest: null,
  history: [],
  status: 'connecting',
  uptimeStr: '00:00:00',
});

export function useTelemetryContext() {
  return useContext(TelemetryContext);
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const telemetry = useTelemetry();

  return (
    <TelemetryContext.Provider value={telemetry}>
      <div className="dashboard-layout">
        <Sidebar status={telemetry.status} />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </TelemetryContext.Provider>
  );
}
