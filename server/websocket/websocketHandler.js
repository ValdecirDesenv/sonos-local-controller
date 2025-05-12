const url = require('url');
const fs = require('fs');
const path = require('path');
const { getFilteredData, getDevices, saveHistoricalDevices, setDevice } = require('../services/deviceService');
const { getPlaylistMeta, ensureValidSpotifyToken } = require('../services/spotifyService');
const { triggerSpotifyStartPlayListDesktop } = require('../services/spotifyTriggers');
const { getToken } = require('../services/spotifyService');
const dataFilePath = path.join(__dirname, '../data/spotifyPlaylists.json');

let token = getToken();
let spotifyCache = {};

try {
  const data = fs.readFileSync(dataFilePath, 'utf8');
  spotifyCache = JSON.parse(data);
  console.log('Spotify playlists loaded successfully.');
} catch (err) {
  console.error('Error loading Spotify playlists:', err.message);
}

async function fetchWithRetry(uri, retries = 1, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const playlistMeta = await getPlaylistMeta(uri);
      if (playlistMeta) return playlistMeta;
    } catch (err) {
      console.error(`Attempt ${attempt} failed: ${err.message}`);
    }
    await new Promise((res) => setTimeout(res, delay));
  }
  throw new Error('Failed to fetch playlist metadata after multiple attempts.');
}

function setupWebSocket(wss, discovery) {
  wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    ws.id = Date.now();
    ws.clientType = query.client || 'unknown';

    broadcastUpdate(wss, discovery);

    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message);
        const { type, uuid, hasTimePlay, timeStart, timeStop, isKeepPlaying, data } = parsed;

        if (type === 'spotifyPlaylist') {
          await sendSpotifyPlaylists(ws);
        } else if (type === 'saveSpotifyPlaylist' && data) {
          const { day, url: uri } = data;
          try {
            const playlistMeta = await fetchWithRetry(uri, 4, 2000);
            spotifyCache[day] = playlistMeta;
            fs.writeFileSync(dataFilePath, JSON.stringify(spotifyCache, null, 2), 'utf8');

            const update = {
              type: 'spotifyPlaylists',
              data: spotifyCache,
            };
            wss.clients.forEach((client) => {
              if (client.readyState === client.OPEN && client.clientType === 'spotifyPlaylist') {
                client.send(JSON.stringify(update));
              }
            });
            console.log(`Saved and broadcasted playlist for ${day}`);
          } catch (err) {
            console.error(`Failed to save playlist for ${day}:`, err.message);
          }
        } else if (type === 'spotifyStartPlaylist' && data) {
          const { day } = data;
          const playlistUrl = spotifyCache[day]?.url || spotifyCache[day]?.uri;

          if (!playlistUrl) {
            ws.send(JSON.stringify({ type: 'error', message: `No playlist found for ${day}` }));
            return;
          }
          token = getToken();
          const isValid = await ensureValidSpotifyToken(ws, token);
          if (!isValid) return;
          try {
            const result = await triggerSpotifyStartPlayListDesktop(playlistUrl, token.access_token);

            if (result.success) {
              if (spotifyCache[day].name === 'unknown' || spotifyCache[day].image.startsWith('https://open.spotifycdn.com')) {
                spotifyCache[day].name = result.track.name;
                spotifyCache[day].image = result.track.image;
                fs.writeFileSync(dataFilePath, JSON.stringify(spotifyCache, null, 2), 'utf8');
              }
              console.log(`Started playlist for ${day}`);
              //ws.send(JSON.stringify({ type: 'success', message: result.message }));
            } else {
              console.error(`Failed to start playlist for ${day}: ${result.message}`);
              //ws.send(JSON.stringify({ type: 'spotifyToken', token: token.access_token }));

              //ws.send(JSON.stringify({ type: 'error', message: result.message }));
            }
          } catch (err) {
            console.error(`Unexpected error while starting playlist for ${day}:`, err.message);
            //ws.send(JSON.stringify({ type: 'error', message: 'An unexpected error occurred while starting the playlist.' }));
          }
        } else if (type === 'spotifyLogin') {
          // TODO: STILL NEED TO CHECK HOW THIS WILL WORKS HERE
          //const isValid = await ensureValidSpotifyToken(ws);
          token = getToken();
          const isValid = false;
          if (isValid) {
            ws.send(JSON.stringify({ type: 'spotifyToken', token: token.access_token }));
          } else {
            ws.send(JSON.stringify({ type: 'spotifyAuthUrl', url: 'http://127.0.0.1:3000/spotify/login' }));
          }
        }

        // Sonos settings
        if (uuid) {
          const device = getDevices()[uuid];
          if (device) {
            if (type === 'timeFrameUpdate') {
              setDevice(uuid, { hasTimePlay, timeStart, timeStop });
            } else if (type === 'keepPlayerUpdate') {
              setDevice(uuid, { isKeepPlaying });
            }
            saveHistoricalDevices();
            broadcastUpdate(wss, discovery);
          }
        }
      } catch (err) {
        console.error('WS Message Error:', err.message);
      }
    });

    ws.on('close', () => {
      saveHistoricalDevices();
      console.log(`Client disconnected: ${ws.id}`);
    });
  });
}

async function sendSpotifyPlaylists(ws) {
  ws.send(JSON.stringify({ type: 'spotifyPlaylists', data: spotifyCache }));
}

function broadcastUpdate(wss, discovery) {
  const offLineData = !Array.isArray(discovery.zones) || discovery.zones.length === 0;

  const payload = {
    type: 'update',
    offLineData,
    data: getFilteredData({
      zones: Object.values(getDevices()),
      offLineData,
    }),
    devices: Object.values(getDevices()).map(({ uuid, name }) => ({
      uuid,
      roomName: name,
    })),
  };

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN && client.clientType === 'sonosWhachdog') {
      client.send(JSON.stringify(payload));
    }
  });
}

module.exports = setupWebSocket;
