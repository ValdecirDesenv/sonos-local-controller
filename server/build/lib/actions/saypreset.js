'use strict';

var tryDownloadTTS = require('../helpers/try-download-tts');
var presetAnnouncement = require('../helpers/preset-announcement');
var presets = require('../presets-loader');
var port;
var system;
function sayPreset(player, values) {
  var text;
  var presetName = decodeURIComponent(values[0]);
  var preset = presets[presetName];
  if (!preset) {
    return Promise.reject(new Error("No preset named ".concat(presetName, " could be found")));
  }
  try {
    text = decodeURIComponent(values[1]);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = "The encoded phrase ".concat(values[0], " could not be URI decoded. Make sure your url encoded values (%xx) are within valid ranges. xx should be hexadecimal representations");
    }
    return Promise.reject(err);
  }
  var language = values[2];
  return tryDownloadTTS(text, language).then(function (result) {
    return presetAnnouncement(player.system, "http://".concat(player.system.localEndpoint, ":").concat(port).concat(result.uri), preset, result.duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('saypreset', sayPreset);
};