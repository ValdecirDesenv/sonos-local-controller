'use strict';

var pkg = require('../../package.json');
function debug(player) {
  var system = player.system;
  var debugInfo = {
    version: pkg.version,
    system: {
      localEndpoint: system.localEndpoint,
      availableServices: system.availableServices
    },
    players: system.players.map(function (x) {
      return {
        roomName: x.roomName,
        uuid: x.uuid,
        coordinator: x.coordinator.uuid,
        avTransportUri: x.avTransportUri,
        avTransportUriMetadata: x.avTransportUriMetadata,
        enqueuedTransportUri: x.enqueuedTransportUri,
        enqueuedTransportUriMetadata: x.enqueuedTransportUriMetadata,
        baseUrl: x.baseUrl,
        state: x._state
      };
    })
  };
  return Promise.resolve(debugInfo);
}
module.exports = function (api) {
  api.registerAction('debug', debug);
};