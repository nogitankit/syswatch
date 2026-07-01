"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TelemetryDashboard() {
  const [dataStats, setDataStats] = useState<any[]>([]);
  const [currentCpu, setCurrentCpu] = useState<number>(0);

  useEffect(() => {
    // Connect to the Node.js Broadcaster
    const ws = new WebSocket('ws://localhost:6767');
    ws.onmessage = (event) => {
      const incomingData = JSON.parse(event.data);
      console.log(incomingData)
      // Update the big number, fallback to 0 if undefined
      const cpuUsage = incomingData.cpu_usage_percent || 0;
      setCurrentCpu(Number(cpuUsage.toFixed(1)));

      setDataStats((prevData) => {
        // Create a timestamp for the X-axis
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
        const newData = [...prevData, { ...incomingData, time: timestamp }];
        
        // Keep the array at 20 items so the browser doesn't memory leak and crash
        if (newData.length > 20) {
          newData.shift(); 
        }
        return newData;
      });
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    
    // Cleanup on unmount
    return () => ws.close();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-green-500 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">System Telemetry</h1>
        
        <div className="border border-green-900 bg-black p-6 mb-8 w-fit shadow-[0_0_15px_rgba(0,255,0,0.1)]">
          <h2 className="text-xl">
            Live CPU Usage: <span className="text-red-500 font-bold text-3xl ml-2">{currentCpu}%</span>
          </h2>
        </div>

        <div className="h-[400px] w-full border border-neutral-800 p-4 bg-neutral-900 rounded-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#22c55e" fontSize={12} />
              <YAxis stroke="#22c55e" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #22c55e' }}
                itemStyle={{ color: '#ef4444' }}
              />
              <Line 
                type="monotone" 
                dataKey="cpu_usage_percent" 
                stroke="#ef4444" 
                strokeWidth={3} 
                isAnimationActive={false} 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}