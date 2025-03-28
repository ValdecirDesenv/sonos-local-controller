'use strict';

var path = require('path');
var settings = require('../../settings');
var presetAnnouncement = require('../helpers/preset-announcement');
var fileDuration = require('../helpers/file-duration');
var presets = require('../presets-loader');
var port;
var LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');
function playClipOnPreset(player, values) {
  var presetName = decodeURIComponent(values[0]);
  var clipFileName = decodeURIComponent(values[1]);
  var preset = presets[presetName];
  if (!preset) {
    return Promise.reject(new Error("No preset named ".concat(presetName, " could be found")));
  }
  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName)).then(function (duration) {
    return presetAnnouncement(player.system, "http://".concat(player.system.localEndpoint, ":").concat(port, "/clips/").concat(clipFileName), preset, duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('clippreset', playClipOnPreset);
};