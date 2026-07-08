'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { HardwareInfo, TelemetryMessage, ConnectionStatus } from '@/types/telemetry';

const WS_URL = 'ws://localhost:6767';
const MAX_HISTORY = 60;
const RECONNECT_DELAY = 3000;

export interface TelemetryState {
  latest: HardwareInfo | null;
  history: HardwareInfo[];
  status: ConnectionStatus;
  uptimeStr: string;
}

export function useTelemetry(): TelemetryState {
  const [latest, setLatest] = useState<HardwareInfo | null>(null);
  const [history, setHistory] = useState<HardwareInfo[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [uptimeStr, setUptimeStr] = useState('00:00:00');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const uptimeStart = useRef<number>(Date.now());

  // ── Uptime clock ──
  useEffect(() => {
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - uptimeStart.current) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setUptimeStr(`${h}:${m}:${sec}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── WebSocket connection ──
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      uptimeStart.current = Date.now();
    };

    ws.onmessage = (event) => {
      try {
        const msg: TelemetryMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'initialData':
            setLatest(msg.data);
            break;

          case 'secondsData':
            setHistory((prev) => {
              const next = [...prev, msg.data];
              return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
            });
            break;

          case 'data':
            setLatest(msg.data);
            setHistory((prev) => {
              const next = [...prev, msg.data];
              return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
            });
            break;
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setStatus('disconnected');

    ws.onclose = () => {
      setStatus('disconnected');
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { latest, history, status, uptimeStr };
}
