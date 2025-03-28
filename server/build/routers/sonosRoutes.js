"use strict";

// routes/sonosRoutes.js

var express = require('express');
var router = express.Router();

// Assume discovery is initialized in server.js and passed here
module.exports = function (discovery) {
  // Fetch topology (list of zones and players)
  router.get('/api/topology', function (req, res) {
    res.json(discovery.zones);
  });

  // Play a specific zone
  router.post('/api/zone/:uuid/play', function (req, res) {
    var player = discovery.getPlayerByUUID(req.params.uuid);
    if (!player) return res.status(404).send('Player not found');
    player.coordinator.play().then(function () {
      return res.send('Playing');
    })["catch"](function (err) {
      return res.status(500).send(err);
    });
  });

  // Pause a specific zone
  router.post('/api/zone/:uuid/pause', function (req, res) {
    var player = discovery.getPlayerByUUID(req.params.uuid);
    if (!player) return res.status(404).send('Player not found');
    player.coordinator.pause().then(function () {
      return res.send('Paused');
    })["catch"](function (err) {
      return res.status(500).send(err);
    });
  });

  // Change volume
  router.post('/api/zone/:uuid/volume', function (req, res) {
    var player = discovery.getPlayerByUUID(req.params.uuid);
    var volume = req.body.volume;
    if (!player || typeof volume !== 'number') {
      return res.status(400).send('Invalid request');
    }
    player.setVolume(volume).then(function () {
      return res.send('Volume changed');
    })["catch"](function (err) {
      return res.status(500).send(err);
    });
  });
  return router;
};