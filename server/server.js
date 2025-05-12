'use strict';

require('events').EventEmitter.defaultMaxListeners = 20;
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const Discovery = require('sonos-discovery');

const sonosRoutes = require('./routers/sonosRoutes');
const spotifyAuthRoutes = require('./routers/spotifyAuthRoutes');

const { updateDeviceState } = require('./services/deviceService');
const setupWebSocket = require('./websocket/websocketHandler');
const { changeGroupPlaybackStatus } = require('./lib/sonosController');
const { getDevices } = require('./services/deviceService');
const { getInTimeFrameToPlay } = require('./utils/timeUtils');
const { runWatchdog } = require('./services/playlistWatchdog');
const { refreshSpotifyToken, isTokenExpired, getToken } = require('./services/spotifyService');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const discovery = new Discovery();

app.use('/spotify', spotifyAuthRoutes);
app.use(bodyParser.json());
app.use('/', sonosRoutes(discovery));

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

    try {
      if (isKeepPlaying || (hasTimePlay && isInTime && playbackState !== 'PLAYING')) {
        await changeGroupPlaybackStatus(device, 'play');
      } else if (hasTimePlay && !isInTime && playbackState === 'PLAYING') {
        await changeGroupPlaybackStatus(device, 'pause');
      }
    } catch (error) {
      console.error(`Failed to change playback for device ${device.name || device.uuid}: it may not have a set track or playlist to keep playing.`);
    }
  }
}, 30000);

// Ensure Spotify token is valid before using
const refreshTokenIfneeded = async () => {
  const token = (await isTokenExpired(getToken())) ? await refreshSpotifyToken() : getToken();
  if (token) {
    runWatchdog(token, '05:45'); // Use the refreshed token for your watchdog task
  } else {
    console.error('Failed to retrieve a valid token');
  }
};

refreshTokenIfneeded(); // Refresh token on server startup

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
