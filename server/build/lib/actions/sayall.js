'use strict';

var tryDownloadTTS = require('../helpers/try-download-tts');
var allPlayerAnnouncement = require('../helpers/all-player-announcement');
var settings = require('../../settings');
var port;
var system;
function sayAll(player, values) {
  var text;
  try {
    text = decodeURIComponent(values[0]);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = "The encoded phrase ".concat(values[0], " could not be URI decoded. Make sure your url encoded values (%xx) are within valid ranges. xx should be hexadecimal representations");
    }
    return Promise.reject(err);
  }
  var announceVolume;
  var language;
  if (/^\d+$/i.test(values[1])) {
    // first parameter is volume
    announceVolume = values[1];
    // language = 'en-gb';
  } else {
    language = values[1];
    announceVolume = values[2] || settings.announceVolume || 40;
  }
  return tryDownloadTTS(text, language).then(function (result) {
    return allPlayerAnnouncement(player.system, "http://".concat(player.system.localEndpoint, ":").concat(port).concat(result.uri), announceVolume, result.duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('sayall', sayAll);
};