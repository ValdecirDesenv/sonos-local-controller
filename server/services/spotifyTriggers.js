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

    // Step 1: Get available devices
    const res = await axios.get('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    let desktopDevice = res.data.devices.find((d) => d.type === 'Computer' && d.is_active);

    if (!desktopDevice) {
      desktopDevice = res.data.devices.find((d) => d.type === 'Computer');
    }

    if (!desktopDevice) {
      console.error('No desktop device found. Make sure Spotify is running on your desktop and connected.');
      return { success: false, message: 'No desktop device found.' };
    }

    // Step 2: Start playback on the desktop device
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

    // Step 3: Wait a moment for playback to initialize
    await new Promise((r) => setTimeout(r, 1000));

    // Step 4: Get currently playing metadata
    const playback = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const track = playback.data.item;
    const context = playback.data.context;

    return {
      success: true,
      message: `Playback started on device: ${desktopDevice.name}`,
      track: {
        name: track.name,
        artists: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        image: track.album.images?.[0]?.url,
      },
      context: {
        type: context?.type,
        uri: context?.uri,
        external_url: context?.external_urls?.spotify,
      },
    };
  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error('Failed to start playback or fetch metadata:', errorMessage);
    return { success: false, message: errorMessage };
  }
}

module.exports = { triggerSpotifyStartPlayListDesktop };
