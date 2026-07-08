const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const PORT = 6767;
const HISTORY_SIZE = 60;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ── In-memory ring buffer for last 60 snapshots ──
const history = [];

//spawn the syswatchtelemetry agent
const telemetryProcess = spawn('./syswatchtelemetry');

telemetryProcess.stderr.on('data', (data) => {
  console.error(`[C++ INFO]: ${data.toString().trim()}`);
});

// ── Track latest snapshot ──
let latestSnapshot = null;

// ── Parse and store C++ output ──
let stdoutBuffer = '';

telemetryProcess.stdout.on('data', (data) => {
  stdoutBuffer += data.toString();
  const lines = stdoutBuffer.split('\n');
  // Keep the last incomplete line in the buffer
  stdoutBuffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);
      latestSnapshot = parsed;

      // Push to history ring buffer
      history.push(parsed);
      if (history.length > HISTORY_SIZE) {
        history.shift();
      }

      // Broadcast to all connected WebSocket clients
      const message = JSON.stringify({ type: 'data', data: parsed });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (err) {
      // Ignore malformed JSON
    }
  }
});

telemetryProcess.on('close', (code) => {
  console.error(`[C++] Telemetry process exited with code ${code}`);
  process.exit(1);
});

// ── WebSocket connection handler ──
wss.on('connection', (ws) => {
  console.log('New client connected to telemetry stream');

  // Send initial data (latest snapshot)
  if (latestSnapshot) {
    ws.send(JSON.stringify({ type: 'initialData', data: latestSnapshot }));
  }

  // Send history (seconds data)
  for (const snapshot of history) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'secondsData', data: snapshot }));
    }
  }

  ws.on('close', () => {
    console.log('------ Client disconnected -----');
  });
});

// ── REST API ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', clients: wss.clients.size, historySize: history.length });
});

app.get('/api/info', (req, res) => {
  if (latestSnapshot) {
    res.json(latestSnapshot);
  } else {
    res.status(503).json({ error: 'No data available yet' });
  }
});

app.get('/api/history', (req, res) => {
  res.json(history);
});

// ── Start server ──
server.listen(PORT, () => {
  console.log(`SysWatch Telemetry Server running on http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  REST API:  http://localhost:${PORT}/api/info`);
});