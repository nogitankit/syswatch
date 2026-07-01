const express = require('express');
const http = require('http');
const socket = require('ws');
const { spawn } = require('child_process');

const PORT = 6767
const app = express();
const server = http.createServer(app);
const wss = new socket.Server({server});

//spawn the syswatchtelemetry agent
const telemetryProcess = spawn('./syswatchtelemetry');

//setup websocket
wss.on('connection', (ws) => {
  console.log('New client connected to telemetry stream');
  ws.on('close', () => {
    console.log('------ Client disconnected -----');
  })
})
//broadcast the c++ output
telemetryProcess.stdout.on('data', (data) => {
  const jsonString = data.toString().trim();
  //send data to every connected client
  wss.clients.forEach((client) => {
    if(client.readyState === socket.OPEN){
      client.send(jsonString);
    }
  })
  //for testing ----- REMOVE THIS
  //console.log(`[C++] ${jsonString}`);
})

telemetryProcess.stderr.on('data', (data) => {
  console.error(`[C++ ERROR]: ${data}`);
})

server.listen(PORT, () => {
  console.log(`Telemetry Broadcast running on http://localhost:${PORT}`);
})