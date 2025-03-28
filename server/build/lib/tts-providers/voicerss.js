'use strict';

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var path = require('path');
var fileDuration = require('../helpers/file-duration');
var settings = require('../../settings');
function voicerss(phrase, language) {
  if (!settings.voicerss) {
    return Promise.resolve();
  }
  if (!language) {
    language = 'en-gb';
  }
  // Use voicerss tts translation service to create a mp3 file
  // Option "c=MP3" added. Otherwise a WAV file is created that won't play on Sonos.
  var ttsRequestUrl = "http://api.voicerss.org/?key=".concat(settings.voicerss, "&f=22khz_16bit_mono&hl=").concat(language, "&src=").concat(encodeURIComponent(phrase), "&c=MP3");

  // Construct a filesystem neutral filename
  var phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  var filename = "voicerss-".concat(phraseHash, "-").concat(language, ".mp3");
  var filepath = path.resolve(settings.webroot, 'tts', filename);
  var expectedUri = "/tts/".concat(filename);
  try {
    fs.accessSync(filepath, fs.R_OK);
    return fileDuration(filepath).then(function (duration) {
      return {
        duration: duration,
        uri: expectedUri
      };
    });
  } catch (err) {
    console.log("announce file for phrase \"".concat(phrase, "\" does not seem to exist, downloading"));
  }
  return new Promise(function (resolve, reject) {
    var file = fs.createWriteStream(filepath);
    http.get(ttsRequestUrl, function (response) {
      if (response.statusCode < 300 && response.statusCode >= 200) {
        response.pipe(file);
        file.on('finish', function () {
          file.end();
          resolve(expectedUri);
        });
      } else {
        reject(new Error("Download from voicerss failed with status ".concat(response.statusCode, ", ").concat(response.message)));
      }
    }).on('error', function (err) {
      fs.unlink(dest);
      reject(err);
    });
  }).then(function () {
    return fileDuration(filepath);
  }).then(function (duration) {
    return {
      duration: duration,
      uri: expectedUri
    };
  });
}
module.exports = voicerss;