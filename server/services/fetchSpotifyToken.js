// services/spotifyAuth.js
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let accessToken = null;
let expiresAt = 0;

async function fetchSpotifyToken() {
  if (accessToken && Date.now() < expiresAt) {
    return accessToken;
  }

  const credentials = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    accessToken = response.data.access_token;
    expiresAt = Date.now() + response.data.expires_in * 1000; // usually 3600s
    return accessToken;
  } catch (err) {
    console.error('Failed to fetch Spotify token:', err.message);
    throw new Error('Spotify auth failed');
  }
}

module.exports = { fetchSpotifyToken };
