'use strict';

var logger = require('sonos-discovery/lib/helpers/logger');
var isRadioOrLineIn = require('../helpers/is-radio-or-line-in');
var backupPresets = {};
function singlePlayerAnnouncement(player, uri, volume, duration) {
  // Create backup preset to restore this player
  var state = player.state;
  var system = player.system;
  var groupToRejoin;
  var backupPreset = {
    players: [{
      roomName: player.roomName,
      volume: state.volume
    }]
  };
  if (player.coordinator.uuid == player.uuid) {
    // This one is coordinator, you will need to rejoin
    // remember which group you were part of.
    var group = system.zones.find(function (zone) {
      return zone.coordinator.uuid === player.coordinator.uuid;
    });
    if (group.members.length > 1) {
      logger.debug('Think its coordinator, will find uri later');
      groupToRejoin = group.id;
      backupPreset.group = group.id;
    } else {
      // was stand-alone, so keep state
      backupPreset.state = state.playbackState;
      backupPreset.uri = player.avTransportUri;
      backupPreset.metadata = player.avTransportUriMetadata;
      backupPreset.playMode = {
        repeat: state.playMode.repeat
      };
      if (!isRadioOrLineIn(backupPreset.uri)) {
        backupPreset.trackNo = state.trackNo;
        backupPreset.elapsedTime = state.elapsedTime;
      }
    }
  } else {
    // Was grouped, so we use the group uri here directly.
    backupPreset.uri = "x-rincon:".concat(player.coordinator.uuid);
  }
  logger.debug('backup state was', backupPreset);

  // Use the preset action to play the tts file
  var ttsPreset = {
    players: [{
      roomName: player.roomName,
      volume: volume
    }],
    playMode: {
      repeat: false
    },
    uri: uri
  };
  var abortTimer;
  if (!backupPresets[player.roomName]) {
    backupPresets[player.roomName] = [];
  }
  backupPresets[player.roomName].unshift(backupPreset);
  logger.debug('backup presets array', backupPresets[player.roomName]);
  var prepareBackupPreset = function prepareBackupPreset() {
    if (backupPresets[player.roomName].length > 1) {
      backupPresets[player.roomName].shift();
      logger.debug('more than 1 backup presets during prepare', backupPresets[player.roomName]);
      return Promise.resolve();
    }
    if (backupPresets[player.roomName].length < 1) {
      return Promise.resolve();
    }
    var relevantBackupPreset = backupPresets[player.roomName][0];
    logger.debug('exactly 1 preset left', relevantBackupPreset);
    if (relevantBackupPreset.group) {
      var zone = system.zones.find(function (zone) {
        return zone.id === relevantBackupPreset.group;
      });
      if (zone) {
        relevantBackupPreset.uri = "x-rincon:".concat(zone.uuid);
      }
    }
    logger.debug('applying preset', relevantBackupPreset);
    return system.applyPreset(relevantBackupPreset).then(function () {
      backupPresets[player.roomName].shift();
      logger.debug('after backup preset applied', backupPresets[player.roomName]);
    });
  };
  var timer;
  var restoreTimeout = duration + 2000;
  return system.applyPreset(ttsPreset).then(function () {
    return new Promise(function (resolve) {
      var _transportChange = function transportChange(state) {
        logger.debug("Player changed to state ".concat(state.playbackState));
        if (state.playbackState === 'STOPPED') {
          return resolve();
        }
        player.once('transport-state', _transportChange);
      };
      setTimeout(function () {
        player.once('transport-state', _transportChange);
      }, duration / 2);
      logger.debug("Setting restore timer for ".concat(restoreTimeout, " ms"));
      timer = Date.now();
      abortTimer = setTimeout(resolve, restoreTimeout);
    });
  }).then(function () {
    var elapsed = Date.now() - timer;
    logger.debug("".concat(elapsed, " elapsed with ").concat(restoreTimeout - elapsed, " to spare"));
    clearTimeout(abortTimer);
  }).then(prepareBackupPreset)["catch"](function (err) {
    logger.error(err);
    return prepareBackupPreset().then(function () {
      throw err;
    });
  });
}
module.exports = singlePlayerAnnouncement;