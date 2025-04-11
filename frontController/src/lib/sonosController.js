const axios = require("axios");

const BASE_URL = "http://localhost:3000"; // Default API URL

/**
 * Change the volume of a Sonos group
 * @param {string} uuid - The UUID of the Sonos group
 * @param {number} volume - The new volume level (0-100)
 * @returns {Promise<void>}
 */
async function changeGroupVolume(uuid, volume) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/zone/${uuid}/volume`,
      {
        volume,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(`Volume changed to ${volume} for group ${uuid}`);
    return response.data;
  } catch (error) {
    console.error(
      `Error setting volume:`,
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

module.exports = { changeGroupVolume };
