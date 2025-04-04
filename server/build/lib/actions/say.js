'use strict';

var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var tryDownloadTTS = require('../helpers/try-download-tts');
var singlePlayerAnnouncement = require('../helpers/single-player-announcement');
var settings = require('../../settings');
var port;
var system;
function say(player, values) {
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
    return singlePlayerAnnouncement(player, "http://".concat(system.localEndpoint, ":").concat(port).concat(result.uri), announceVolume, result.duration);
  });
}
module.exports = function (api) {
  port = api.getPort();
  api.registerAction('say', say);
  system = api.discovery;
};