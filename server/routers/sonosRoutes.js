// routes/sonosRoutes.js

const express = require('express');
const router = express.Router();

// Assume discovery is initialized in server.js and passed here
module.exports = (discovery) => {
  // Fetch topology (list of zones and players)
  router.get('/api/topology', (req, res) => {
    res.json(discovery.zones);
  });

  // Play a specific zone
  router.post('/api/zone/:uuid/play', (req, res) => {
    const player = discovery.getPlayerByUUID(req.params.uuid);
    if (!player) return res.status(404).send('Player not found');

    player.coordinator
      .play()
      .then(() => res.send('Playing'))
      .catch((err) => res.status(500).send(err));
  });

  // Pause a specific zone
  router.post('/api/zone/:uuid/pause', (req, res) => {
    const player = discovery.getPlayerByUUID(req.params.uuid);
    if (!player) return res.status(404).send('Player not found');

    player.coordinator
      .pause()
      .then(() => res.send('Paused'))
      .catch((err) => res.status(500).send(err));
  });

  // Change volume
  router.post('/api/zone/:uuid/volume', (req, res) => {
    const player = discovery.getPlayerByUUID(req.params.uuid);
    const { volume } = req.body;

    if (!player || typeof volume !== 'number') {
      return res.status(400).send('Invalid request');
    }

    player
      .setVolume(volume)
      .then(() => res.send('Volume changed'))
      .catch((err) => res.status(500).send(err));
  });

  return router;
};
