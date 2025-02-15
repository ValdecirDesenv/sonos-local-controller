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

/**
 * Changes the playback status of a Sonos player group.
 *
 * @param {Object} player - The Sonos player object.
 * @param {string} player.uuid - The unique identifier of the player.
 * @param {string} player.roomName - The name of the room where the player is located.
 * @param {string} status - The desired playback status. Valid statuses are: 'stop', 'play', 'pause'.
 * @throws {Error} Throws an error if the status is invalid or if there is an issue with the request.
 * @returns {Promise<string>} A promise that resolves to a message indicating the playback status change.
 */
async function changeGroupPlaybackStatus(player, status) {
  const validStatuses = {
    stop: 'STOP',
    play: 'PLAYING',
    pause: 'PAUSE',
  };

  const lowerCaseStatus = status.toLowerCase();
  if (!validStatuses.hasOwnProperty(lowerCaseStatus)) {
    throw new Error(`Invalid status: ${status}. Valid statuses are: ${Object.keys(validStatuses).join(', ')}`);
  }

  const action = validStatuses[lowerCaseStatus];

  try {
    const response = await axios.post(
      `${BASE_URL}/api/zone/${player.uuid}/${status.toLowerCase()}`,
      {
        action,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Player Group: ${player.roomName} Playback status changed to ${action}`);
    return `{Playback status changed to ${action} for group ${player.uuid}}`;
  } catch (error) {
    console.error(`Error setting playback status:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { changeGroupVolume, changeGroupPlaybackStatus };
