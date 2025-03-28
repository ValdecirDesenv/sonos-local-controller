'use strict';

var path = require('path');
var requireDir = require('sonos-discovery/lib/helpers/require-dir');
var providers = [];
requireDir(path.join(__dirname, '../tts-providers'), function (provider) {
  providers.push(provider);
});
providers.push(require('../tts-providers/default/google'));
function tryDownloadTTS(phrase, language) {
  var result;
  return providers.reduce(function (promise, provider) {
    return promise.then(function () {
      if (result) return result;
      return provider(phrase, language).then(function (_result) {
        result = _result;
        return result;
      });
    });
  }, Promise.resolve());
}
module.exports = tryDownloadTTS;