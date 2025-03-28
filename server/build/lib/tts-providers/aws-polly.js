'use strict';

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var path = require('path');
var AWS = require('aws-sdk');
var fileDuration = require('../helpers/file-duration');
var settings = require('../../settings');
var logger = require('sonos-discovery/lib/helpers/logger');
var DEFAULT_SETTINGS = {
  OutputFormat: 'mp3',
  VoiceId: 'Joanna',
  TextType: 'text'
};
function polly(phrase, voiceName) {
  if (!settings.aws) {
    return Promise.resolve();
  }

  // Construct a filesystem neutral filename
  var dynamicParameters = {
    Text: phrase
  };
  var synthesizeParameters = Object.assign({}, DEFAULT_SETTINGS, dynamicParameters);
  if (settings.aws.name) {
    synthesizeParameters.VoiceId = settings.aws.name;
  }
  if (voiceName) {
    synthesizeParameters.VoiceId = voiceName;
  }
  if (synthesizeParameters.VoiceId.endsWith('Neural')) {
    synthesizeParameters.Engine = 'neural';
    synthesizeParameters.VoiceId = synthesizeParameters.VoiceId.slice(0, -6);
  }
  var phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  var filename = "polly-".concat(phraseHash, "-").concat(synthesizeParameters.VoiceId, ".mp3");
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
  var constructorParameters = Object.assign({
    apiVersion: '2016-06-10'
  }, settings.aws.credentials);
  var polly = new AWS.Polly(constructorParameters);
  return polly.synthesizeSpeech(synthesizeParameters).promise().then(function (data) {
    fs.writeFileSync(filepath, data.AudioStream);
    return fileDuration(filepath);
  }).then(function (duration) {
    return {
      duration: duration,
      uri: expectedUri
    };
  });
}
module.exports = polly;