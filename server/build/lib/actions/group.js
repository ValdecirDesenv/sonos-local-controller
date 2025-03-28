'use strict';

var logger = require('sonos-discovery/lib/helpers/logger');
function addToGroup(player, values) {
  var joiningRoomName = decodeURIComponent(values[0]);
  var joiningPlayer = player.system.getPlayer(joiningRoomName);
  if (!joiningPlayer) {
    logger.warn("Room ".concat(joiningRoomName, " not found - can't group with ").concat(player.roomName));
    return Promise.reject(new Error("Room ".concat(joiningRoomName, " not found - can't group with ").concat(player.roomName)));
  }
  return attachTo(joiningPlayer, player.coordinator);
}
function joinPlayer(player, values) {
  var receivingRoomName = decodeURIComponent(values[0]);
  var receivingPlayer = player.system.getPlayer(receivingRoomName);
  if (!receivingPlayer) {
    logger.warn("Room ".concat(receivingRoomName, " not found - can't make ").concat(player.roomName, " join it"));
    return Promise.reject(new Error("Room ".concat(receivingRoomName, " not found - can't make ").concat(player.roomName, " join it")));
  }
  return attachTo(player, receivingPlayer.coordinator);
}
function rinconUri(player) {
  return "x-rincon:".concat(player.uuid);
}
function attachTo(player, coordinator) {
  return player.setAVTransport(rinconUri(coordinator));
}
function isolate(player) {
  return player.becomeCoordinatorOfStandaloneGroup();
}
module.exports = function (api) {
  api.registerAction('add', addToGroup);
  api.registerAction('isolate', isolate);
  api.registerAction('ungroup', isolate);
  api.registerAction('leave', isolate);
  api.registerAction('join', joinPlayer);
};