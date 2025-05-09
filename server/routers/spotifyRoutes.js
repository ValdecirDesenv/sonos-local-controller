// routes/spotifyRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { fetchSpotifyToken } = require('../services/spotifyAuth');

router.get('/spotifyWeekList/:id', async (req, res) => {
  const token = await getSpotifyToken(); // uses client_credentials flow
  const { id } = req.params;
  const spotifyUrl = `https://api.spotify.com/v1/playlists/${id}`;

  const response = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: ' SPR-Failed to fetch playlist' });
  }

  const data = await response.json();
  res.json(data);
});

module.exports = router;
