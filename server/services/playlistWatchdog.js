// const fs = require('fs');
// const path = require('path');
// const { triggerSpotifyStartPlayListDesktop } = require('./spotifyTriggers');

// const playlistFile = path.join(__dirname, '../data/spotifyPlaylists.json');

// // Function to get today's playlist based on the current day
// function getTodayPlaylist() {
//   try {
//     const data = fs.readFileSync(playlistFile);
//     const playlists = JSON.parse(data);

//     const today = new Date().toLocaleString('en-US', { weekday: 'long' });
//     return playlists[today] || null;
//   } catch (err) {
//     console.error('Failed to load spotifyPlaylists.json:', err.message);
//     return null;
//   }
// }

// // Function to get the current time in "HH:MM" format
// function getCurrentTime() {
//   return new Date().toTimeString().slice(0, 5); // "HH:MM"
// }

// // Function to run the Spotify Watchdog and trigger the playlist at a specified time
// async function runWatchdog(userToken, triggerTime = '05:50') {
//   console.log(`Spotify Watchdog running (will trigger daily at ${triggerTime})`);

//   let triggeredToday = false;
//   let lastCheckedDay = new Date().getDay(); // numeric: 0 (Sun) - 6 (Sat)

//   setInterval(async () => {
//     const now = new Date();
//     const currentTime = getCurrentTime();
//     const currentDay = now.getDay();

//     // If the day has changed, reset the triggered state
//     if (currentDay !== lastCheckedDay) {
//       triggeredToday = false;
//       lastCheckedDay = currentDay;
//     }

//     // If it's the right time and the playlist hasn't been triggered yet
//     if (!triggeredToday && currentTime === triggerTime) {
//       const playlist = getTodayPlaylist();

//       if (!playlist) {
//         console.log(`No playlist found for today`);
//         return;
//       }

//       console.log(`Triggering playlist for today: ${playlist.name}`);
//       const result = await triggerSpotifyStartPlayListDesktop(playlist.url, userToken);
//       if (result.success) triggeredToday = true;
//     }
//   }, 300000);
// }

// module.exports = { runWatchdog };
const cron = require('node-cron');
const { triggerSpotifyStartPlayListDesktop } = require('./spotifyTriggers');
const fs = require('fs');
const path = require('path');

const playlistFile = path.join(__dirname, '../data/spotifyPlaylists.json');

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

function runWatchdog(userToken, triggerTime = '05:50') {
  const [hour, minute] = triggerTime.split(':').map(Number);

  // Format cron string: minute hour * * *
  const cronTime = `${minute} ${hour} * * *`;

  console.log(`Spotify Watchdog running via cron (${cronTime})`);

  cron.schedule(cronTime, async () => {
    const playlist = getTodayPlaylist();
    if (!playlist) {
      console.log(`No playlist found for today`);
      return;
    }

    console.log(`Triggering playlist for today: ${playlist.name}`);
    const result = await triggerSpotifyStartPlayListDesktop(playlist.url, userToken);
    if (result.success) {
      console.log('Successfully triggered playlist');
    }
  });
}

module.exports = { runWatchdog };
