'use strict';

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var path = require('path');
var ElevenLabs = require('elevenlabs-node');
var fileDuration = require('../helpers/file-duration');
var settings = require('../../settings');
var logger = require('sonos-discovery/lib/helpers/logger');
var DEFAULT_SETTINGS = {
  stability: 0.5,
  similarityBoost: 0.5,
  speakerBoost: true,
  style: 1,
  modelId: "eleven_multilingual_v2"
};

// Provider developed based on structure from aws-polly.js.
// In this tts provider language argument from uri is used to inject custom voiceId
function eleven(phrase, voiceId) {
  if (!settings.elevenlabs) {
    return Promise.resolve();
  }

  // Construct a filesystem neutral filename
  var dynamicParameters = {
    textInput: phrase
  };
  var synthesizeParameters = Object.assign({}, DEFAULT_SETTINGS, dynamicParameters, settings.elevenlabs.config);
  if (voiceId) {
    synthesizeParameters.voiceId = voiceId;
  }
  if (!synthesizeParameters.voiceId) {
    console.log('Voice ID not found neither in settings.elevenlabs.config nor in request!');
    return Promise.resolve();
  }
  var phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  var filename = "elevenlabs-".concat(phraseHash, "-").concat(synthesizeParameters.voiceId, ".mp3");
  var filepath = path.resolve(settings.webroot, 'tts', filename);
  synthesizeParameters.fileName = filepath;
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
  var voice = new ElevenLabs({
    apiKey: settings.elevenlabs.auth.apiKey
  });
  return voice.textToSpeech(synthesizeParameters).then(function (res) {
    console.log('Elevenlabs TTS generated new audio file.');
  }).then(function () {
    return fileDuration(filepath);
  }).then(function (duration) {
    return {
      duration: duration,
      uri: expectedUri
    };
  });
}
module.exports = eleven;