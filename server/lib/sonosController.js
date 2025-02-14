const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Default API URL

/**
 * Change the volume of a Sonos group
 * @param {string} uuid - The UUID of the Sonos group
 * @param {number} volume - The new volume level (0-100)
 * @returns {Promise<void>}
 */
async function changeGroupVolume(player, volume) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/zone/${player.uuid}/volume`,
      {
        volume,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Player Group: ${player.roomName} Volume changed to ${volume} `);
    return `{Volume changed to ${volume} for group ${player.uuid}}`; //response.data;
  } catch (error) {
    console.error(`Error setting volume:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

async function changeGroupPlaybackStatus(player) {
  const keeplaying = 'PLAYING';
  try {
    const response = await axios.post(
      `${BASE_URL}/api/zone/${player.uuid}/play`,
      {
        keeplaying,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Player Group: ${player.roomName} Playback status changed to ${keeplaying}`);
    return `{Playback status changed to ${keeplaying} for group ${player.uuid}}`;
  } catch (error) {
    console.error(`Error setting playback status:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { changeGroupVolume, changeGroupPlaybackStatus };
