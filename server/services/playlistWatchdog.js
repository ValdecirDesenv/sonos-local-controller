const { ensureValidSpotifyToken } = require('./spotifyService');
const cron = require('node-cron');
const { triggerSpotifyStartPlayListDesktop } = require('./spotifyTriggers');
const fs = require('fs');
const path = require('path');

const playlistFile = path.join(__dirname, '../data/spotifyPlaylists.json');

// Function to get today's playlist based on the current day
function getTodayPlaylist() {
  try {
    const data = fs.readFileSync(playlistFile);
    const playlists = JSON.parse(data);

    const today = new Date().toLocaleString('en-US', { weekday: 'long' });
    return playlists[today] || null;
  } catch (err) {
    console.error('Failed to load spotifyPlaylists.json:', err.message);
    return null;
  }
}

// Function to run the Spotify Watchdog and trigger the playlist at a specified time
function runWatchdog(triggerTime = '05:50') {
  const [hour, minute] = triggerTime.split(':').map(Number);
  const cronTime = `${minute} ${hour} * * *`;

  console.log(`Spotify Watchdog scheduled to run daily at ${triggerTime} (${cronTime})`);

  cron.schedule(cronTime, async () => {
    try {
      const playlist = getTodayPlaylist();
      if (!playlist) {
        console.log(`[${new Date().toISOString()}] No playlist found for today`);
        return;
      }

      const token = await ensureValidSpotifyToken();
      if (!token) {
        console.error(`[${new Date().toISOString()}] Failed to obtain a valid Spotify token`);
        return;
      }

      console.log(`[${new Date().toISOString()}] Triggering playlist for today: ${playlist.name}`);
      const result = await triggerSpotifyStartPlayListDesktop(playlist.url, token.access_token);

      if (result.success) {
        console.log(`[${new Date().toISOString()}] Successfully triggered playlist`);
      } else {
        console.error(`[${new Date().toISOString()}] Failed to trigger playlist:`, result.message);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during playlist triggering:`, error.message);
    }
  });
}

module.exports = { runWatchdog };
