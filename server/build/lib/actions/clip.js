'use strict';

var path = require('path');
var fileDuration = require('../helpers/file-duration');
var settings = require('../../settings');
var singlePlayerAnnouncement = require('../helpers/single-player-announcement');
var port;
var LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');
var backupPresets = {};
function playClip(player, values) {
  var clipFileName = values[0];
  var announceVolume = settings.announceVolume || 40;
  if (/^\d+$/i.test(values[1])) {
    // first parameter is volume
    announceVolume = values[1];
  }
  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName)).then(function (duration) {
    return singlePlayerAnnouncement(player, "http://".concat(player.system.localEndpoint, ":").concat(port, "/clips/").concat(clipFileName), announceVolume, duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('clip', playClip);
};