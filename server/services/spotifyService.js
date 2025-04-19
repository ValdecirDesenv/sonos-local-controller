const axios = require('axios');
require('dotenv').config();

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
let accessToken = null;

async function getSpotifyAccessToken() {
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error('Error fetching Spotify access token:', error);
    throw error;
  }
}

async function getUserPlaylists(userId) {
  if (!accessToken) await getSpotifyAccessToken();

  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/users/${userId}/playlists`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching playlists:', error.response.data);
    throw error;
  }
}

module.exports = { getUserPlaylists };
