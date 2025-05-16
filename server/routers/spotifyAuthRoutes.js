// routes/spotifyRoutes.js
const express = require('express');
const axios = require('axios');
const { setToken } = require('../services/spotifyService');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const tokenFilePath = path.join(__dirname, '..', 'data', 'spotifyToken.json');

router.get('/login', (req, res) => {
  const scopes = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'playlist-read-private', 'playlist-read-collaborative'];
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: scopes.join(' '),
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      fetched_at: new Date().toISOString(),
    };

    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    setToken(tokenData);
    console.log('Token renewed and saved successfully:');
    //res.send('Authorization successful. You can close this tab.');
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err.message);
    res.status(500).send('Error exchanging code for token.');
  }
});

module.exports = router;
