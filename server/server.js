'use strict';

require('events').EventEmitter.defaultMaxListeners = 20;
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const Discovery = require('sonos-discovery');
const os = require('os');

// Winston logger setup
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: path.join(os.homedir(), 'serverSonos.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '200m',
  maxFiles: '5', // keep last 5 log files
  zippedArchive: true,
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [transport],
});

const sonosRoutes = require('./routers/sonosRoutes');
const spotifyAuthRoutes = require('./routers/spotifyAuthRoutes');

const { updateDeviceState } = require('./services/deviceService');
const setupWebSocket = require('./websocket/websocketHandler');
const { changeGroupPlaybackStatus } = require('./lib/sonosController');
const { getDevices } = require('./services/deviceService');
const { getInTimeFrameToPlay } = require('./utils/timeUtils');
const { runWatchdog } = require('./services/playlistWatchdog');
const { refreshSpotifyToken, isTokenExpired, getToken,ensureValidSpotifyToken } = require('./services/spotifyService');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const discovery = new Discovery();

let token = getToken();

app.use('/spotify', spotifyAuthRoutes);
app.use(bodyParser.json());
app.use('/', sonosRoutes(discovery));

setupWebSocket(wss, discovery);

// Listen to discovery events
discovery.on('transport-state', () => updateDeviceState(discovery));
discovery.on('device-state-change', () => updateDeviceState(discovery));
discovery.on('topology-change', () => updateDeviceState(discovery));

// Helper for resilient Sonos API calls
async function resilientChangeGroupPlaybackStatus(device, action, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await changeGroupPlaybackStatus(device, action);
      return true;
    } catch (error) {
      logger.error(`[${new Date().toISOString()}] Attempt ${attempt} failed for device ${device.name || device.uuid}: ${error.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delay));
      } else {
        logger.error(`[${new Date().toISOString()}] All ${retries} attempts failed for device ${device.name || device.uuid}.`);
        return false;
      }
    }
  }
}

// Scheduled playback logic
setInterval(async () => {
  const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  if (currentDay === 0 || currentDay === 6) {
    logger.info('Skipping playback logic as today is Saturday or Sunday.');
    return;
  }

  for (const device of Object.values(getDevices())) {
    const { uuid, playbackState, isKeepPlaying, hasTimePlay } = device;
    const isInTime = getInTimeFrameToPlay(device);

    if (device.connectionStatus === 'offline' || discovery.players.length === 0) continue;

    try {
      const eventTime = new Date().toISOString();
      if (isKeepPlaying || (hasTimePlay && isInTime && playbackState !== 'PLAYING')) {
        const success = await resilientChangeGroupPlaybackStatus(device, 'play');
        if (success) {
          logger.info(`[${eventTime}] Playback started for device ${device.name || device.uuid}`);
        }
      } else if (hasTimePlay && !isInTime && playbackState === 'PLAYING') {
        const success = await resilientChangeGroupPlaybackStatus(device, 'pause');
        if (success) {
          logger.info(`[${eventTime}] Playback paused for device ${device.name || device.uuid}`);
        }
      }
    } catch (error) {
      logger.error(`[${new Date().toISOString()}] Unexpected error for device ${device.name || device.uuid}: ${error.message}`);
    }
  }
}, 30000);

// Ensure Spotify token is valid before using
const refreshTokenIfneeded = async () => {
    runWatchdog('5:30'); // Use the refreshed token for your watchdog task
};

refreshTokenIfneeded(); // Refresh token on server startup

const PORT = 3000;
server.listen(PORT, () => logger.info(`Server running on http://127.0.0.1:${PORT}`));
console.log(`Server running on http://127.0.0.1:${PORT}`);

