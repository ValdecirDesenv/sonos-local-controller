const express = require('express');
const router = express.Router();
const { refreshSpotifyToken, getPlaylistMeta, readSavedSpotifyToken } = require('../services/spotifyService');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');

const redirectUri = process.env.SPOTIFY_REDIRECT_URI; // Make sure you have this in your .env file
const scope = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'user-read-playback-state', 'user-modify-playback-state'].join(' ');

router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const tokenData = {
      access_token,
      refresh_token,
      expires_in,
      fetched_at: new Date().toISOString(),
    };

    const savePath = path.join(__dirname, '..', 'data', 'spotifyToken.json');
    fs.writeFileSync(savePath, JSON.stringify(tokenData, null, 2));

    console.log('Spotify tokens saved to:', savePath);

    return res.redirect('http://127.0.0.1:5173/spotifyWeekList');
  } catch (err) {
    console.error('Error getting Spotify token:', err.message);
    return res.status(500).send('Failed to get tokens');
  }
});

// ADD THIS: Route to initiate Spotify login
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    show_dialog: 'true', // important: force user to re-consent
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Step 2: Refresh token (manually triggered)
router.get('/refresh-token', async (req, res) => {
  try {
    const newAccessToken = await refreshSpotifyToken();
    return res.json({ access_token: newAccessToken });
  } catch (err) {
    console.error('Error refreshing Spotify token:', err.message);
    return res.status(500).send('Failed to refresh access token');
  }
});

router.get('/playlist/:id', async (req, res) => {
  const playlistId = req.params.id;

  try {
    const playlistMeta = await getPlaylistMeta(playlistId);

    if (playlistMeta) {
      return res.json(playlistMeta);
    } else {
      return res.status(404).send('Playlist not found or error fetching data');
    }
  } catch (err) {
    console.error('Error fetching playlist metadata:', err.message);
    return res.status(500).send('Failed to fetch playlist');
  }
});

module.exports = router;
