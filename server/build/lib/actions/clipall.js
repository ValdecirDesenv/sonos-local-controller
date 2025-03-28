'use strict';

var path = require('path');
var settings = require('../../settings');
var allPlayerAnnouncement = require('../helpers/all-player-announcement');
var fileDuration = require('../helpers/file-duration');
var port;
var LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');
function playClipOnAll(player, values) {
  var clipFileName = values[0];
  var announceVolume = settings.announceVolume || 40;
  if (/^\d+$/i.test(values[1])) {
    // first parameter is volume
    announceVolume = values[1];
  }
  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName)).then(function (duration) {
    return allPlayerAnnouncement(player.system, "http://".concat(player.system.localEndpoint, ":").concat(port, "/clips/").concat(clipFileName), announceVolume, duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('clipall', playClipOnAll);
};