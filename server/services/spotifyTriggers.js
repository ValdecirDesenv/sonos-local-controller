const axios = require('axios');

function extractPlaylistId(input) {
  if (input.startsWith('https://')) {
    return input.split('/').pop().split('?')[0];
  }
  return input;
}

async function triggerSpotifyStartPlayListDesktop(playlistInput, userToken) {
  try {
    const playlistId = extractPlaylistId(playlistInput);

    // Get available devices
    const res = await axios.get('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    // Find the desktop device
    let desktopDevice = res.data.devices.find((d) => d.type === 'Computer' && d.is_active);

    // Fallback: first available desktop device
    if (!desktopDevice) {
      desktopDevice = res.data.devices.find((d) => d.type === 'Computer');
    }

    if (!desktopDevice) {
      console.error('No desktop device found. Make sure Spotify is running on your desktop and connected.');
      return;
    }

    // Start playback on desktop
    await axios.put(
      `https://api.spotify.com/v1/me/player/play?device_id=${desktopDevice.id}`,
      {
        context_uri: `spotify:playlist:${playlistId}`,
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    console.log(`Playback started on device: ${desktopDevice.name}`);
    return { success: true, message: `Playback started on device: ${desktopDevice.name}` };
  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error('Failed to start playback:', errorMessage);
    return { success: false, message: errorMessage };
  }
}

module.exports = { triggerSpotifyStartPlayListDesktop };
