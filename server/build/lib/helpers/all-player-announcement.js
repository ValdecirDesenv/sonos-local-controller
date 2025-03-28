'use strict';

var logger = require('sonos-discovery/lib/helpers/logger');
var isRadioOrLineIn = require('../helpers/is-radio-or-line-in');
function saveAll(system) {
  var backupPresets = system.zones.map(function (zone) {
    var coordinator = zone.coordinator;
    var state = coordinator.state;
    var preset = {
      players: [{
        roomName: coordinator.roomName,
        volume: state.volume
      }],
      state: state.playbackState,
      uri: coordinator.avTransportUri,
      metadata: coordinator.avTransportUriMetadata,
      playMode: {
        repeat: state.playMode.repeat
      }
    };
    if (!isRadioOrLineIn(preset.uri)) {
      preset.trackNo = state.trackNo;
      preset.elapsedTime = state.elapsedTime;
    }
    zone.members.forEach(function (player) {
      if (coordinator.uuid != player.uuid) preset.players.push({
        roomName: player.roomName,
        volume: player.state.volume
      });
    });
    return preset;
  });
  logger.trace('backup presets', backupPresets);
  return backupPresets.sort(function (a, b) {
    return a.players.length < b.players.length;
  });
}
function announceAll(system, uri, volume, duration) {
  var abortTimer;

  // Save all players
  var backupPresets = saveAll(system);

  // find biggest group and all players
  var allPlayers = [];
  var biggestZone = {};
  system.zones.forEach(function (zone) {
    if (!biggestZone.members || zone.members.length > biggestZone.members.length) {
      biggestZone = zone;
    }
  });
  var coordinator = biggestZone.coordinator;
  allPlayers.push({
    roomName: coordinator.roomName,
    volume: volume
  });
  system.players.forEach(function (player) {
    if (player.uuid == coordinator.uuid) return;
    allPlayers.push({
      roomName: player.roomName,
      volume: volume
    });
  });
  var preset = {
    uri: uri,
    players: allPlayers,
    playMode: {
      repeat: false
    },
    pauseOthers: true,
    state: 'STOPPED'
  };
  var oneGroupPromise = new Promise(function (resolve) {
    var _onTopologyChanged = function onTopologyChanged(topology) {
      if (topology.length === 1) {
        return resolve();
      }
      // Not one group yet, continue listening
      system.once('topology-change', _onTopologyChanged);
    };
    system.once('topology-change', _onTopologyChanged);
  });
  var restoreTimeout = duration + 2000;
  return system.applyPreset(preset).then(function () {
    if (system.zones.length === 1) return;
    return oneGroupPromise;
  }).then(function () {
    coordinator.play();
    return new Promise(function (resolve) {
      var _transportChange = function transportChange(state) {
        logger.debug("Player changed to state ".concat(state.playbackState));
        if (state.playbackState === 'STOPPED') {
          return resolve();
        }
        coordinator.once('transport-state', _transportChange);
      };
      setTimeout(function () {
        coordinator.once('transport-state', _transportChange);
      }, duration / 2);
      logger.debug("Setting restore timer for ".concat(restoreTimeout, " ms"));
      abortTimer = setTimeout(resolve, restoreTimeout);
    });
  }).then(function () {
    clearTimeout(abortTimer);
  }).then(function () {
    return backupPresets.reduce(function (promise, preset) {
      logger.trace('Restoring preset', preset);
      return promise.then(function () {
        return system.applyPreset(preset);
      });
    }, Promise.resolve());
  })["catch"](function (err) {
    logger.error(err.stack);
    throw err;
  });
}
module.exports = announceAll;