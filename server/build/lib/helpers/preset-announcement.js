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
function announcePreset(system, uri, preset, duration) {
  var abortTimer;

  // Save all players
  var backupPresets = saveAll(system);
  var simplifiedPreset = {
    uri: uri,
    players: preset.players,
    playMode: preset.playMode,
    pauseOthers: true,
    state: 'STOPPED'
  };
  function hasReachedCorrectTopology(zones) {
    return zones.some(function (group) {
      return group.members.length === preset.players.length && group.coordinator.roomName === preset.players[0].roomName;
    });
  }
  var oneGroupPromise = new Promise(function (resolve) {
    var _onTopologyChanged = function onTopologyChanged(topology) {
      if (hasReachedCorrectTopology(topology)) {
        return resolve();
      }
      // Not one group yet, continue listening
      system.once('topology-change', _onTopologyChanged);
    };
    system.once('topology-change', _onTopologyChanged);
  });
  var restoreTimeout = duration + 2000;
  var coordinator = system.getPlayer(preset.players[0].roomName);
  return coordinator.pause().then(function () {
    return system.applyPreset(simplifiedPreset);
  })["catch"](function () {
    return system.applyPreset(simplifiedPreset);
  }).then(function () {
    if (hasReachedCorrectTopology(system.zones)) return;
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
module.exports = announcePreset;