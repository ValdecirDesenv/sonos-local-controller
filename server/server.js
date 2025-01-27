'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser'); // To parse JSON request bodies
const SonosSystem = require('sonos-discovery');
const sonosRoutes = require('./routers/sonosRoutes');
const testJson = require('./testes/mockTest.json');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware to parse JSON
app.use(bodyParser.json());

// Initialize Sonos System
const discovery = new SonosSystem({});

// Use Sonos Routes
app.use('/', sonosRoutes(discovery));

// WebSocket Connection
// wss.on('connection', (ws) => {
//   console.log('WebSocket client connected');

//   // Send initial topology
//   //ws.send(JSON.stringify({ type: 'initial', data: discovery.zones }));
//   ws.send(JSON.stringify({ type: 'initial', data: testJson }));

//   // Update client on topology changes
//   discovery.on('topology-change', (zones) => {
//     ws.send(JSON.stringify({ type: 'topology-change', data: zones }));
//   });

//   ws.on('close', () => console.log('WebSocket client disconnected'));
// });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  //ws.send(JSON.stringify({ type: 'initial', data: testJson }));
  ws.send(JSON.stringify({ type: 'initial', data: discovery.zones }));

  discovery.on('topology-change', (zones) => {
    console.log('Sending topology change:', zones);
    ws.send(JSON.stringify({ type: 'topology-change', data: zones }));
  });

  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
