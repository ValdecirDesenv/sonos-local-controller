'use strict';

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var path = require('path');
var fileDuration = require('../helpers/file-duration');
var settings = require('../../settings');
var logger = require('sonos-discovery/lib/helpers/logger');
var exec = require('child_process').exec;
function macSay(phrase, voice) {
  if (!settings.macSay) {
    return Promise.resolve();
  }
  var selcetedRate = settings.macSay.rate;
  if (!selcetedRate) {
    selcetedRate = "default";
  }
  var selectedVoice = settings.macSay.voice;
  if (voice) {
    selectedVoice = voice;
  }

  // Construct a filesystem neutral filename
  var phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  var filename = "macSay-".concat(phraseHash, "-").concat(selcetedRate, "-").concat(selectedVoice, ".m4a");
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
    logger.info("announce file for phrase \"".concat(phrase, "\" does not seem to exist, downloading"));
  }
  return new Promise(function (resolve, reject) {
    //
    // For more information on the "say" command, type "man say" in Terminal
    // or go to
    // https://developer.apple.com/legacy/library/documentation/Darwin/Reference/ManPages/man1/say.1.html
    //
    // The list of available voices can be configured in
    // System Preferences -> Accessibility -> Speech -> System Voice
    //

    var execCommand = "say \"".concat(phrase, "\" -o ").concat(filepath);
    if (selectedVoice && selcetedRate != "default") {
      execCommand = "say -r ".concat(selcetedRate, " -v ").concat(selectedVoice, " \"").concat(phrase, "\" -o ").concat(filepath);
    } else if (selectedVoice) {
      execCommand = "say -v ".concat(selectedVoice, " \"").concat(phrase, "\" -o ").concat(filepath);
    } else if (selcetedRate != "default") {
      execCommand = "say -r ".concat(selcetedRate, " \"").concat(phrase, "\" -o ").concat(filepath);
    }
    exec(execCommand, function (error, stdout, stderr) {
      if (error !== null) {
        reject(error);
      } else {
        resolve(expectedUri);
      }
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
module.exports = macSay;