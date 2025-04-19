'use strict';

require('events').EventEmitter.defaultMaxListeners = 20;
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const Discovery = require('sonos-discovery');

const sonosRoutes = require('./routers/sonosRoutes');
const { updateDeviceState } = require('./services/deviceService');
const setupWebSocket = require('./websocket/websocketHandler');
const { changeGroupPlaybackStatus } = require('./lib/sonosController');
const { getDevices } = require('./services/deviceService');
const { getInTimeFrameToPlay } = require('./utils/timeUtils');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const discovery = new Discovery();

app.use(bodyParser.json());
app.use('/', sonosRoutes(discovery));

// Set up WebSocket
setupWebSocket(wss, discovery);

// Listen to discovery events
discovery.on('transport-state', () => updateDeviceState(discovery));
discovery.on('device-state-change', () => updateDeviceState(discovery));
discovery.on('topology-change', () => updateDeviceState(discovery));

// Scheduled playback logic
setInterval(async () => {
  for (const device of Object.values(getDevices())) {
    const { uuid, playbackState, isKeepPlaying, hasTimePlay } = device;
    const isInTime = getInTimeFrameToPlay(device);

    if (device.connectionStatus === 'offline' || discovery.players.length === 0) continue;
    if (isKeepPlaying || (hasTimePlay && isInTime && playbackState !== 'PLAYING')) {
      await changeGroupPlaybackStatus(device, 'play');
    } else if (hasTimePlay && !isInTime && playbackState === 'PLAYING') {
      await changeGroupPlaybackStatus(device, 'pause');
    }
  }
}, 30000);

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
