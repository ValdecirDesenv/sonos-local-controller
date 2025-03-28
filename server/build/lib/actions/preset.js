'use strict';

var fs = require('fs');
var util = require('util');
var logger = require('sonos-discovery/lib/helpers/logger');
var presets = require('../presets-loader');
function presetsAction(player, values) {
  var value = decodeURIComponent(values[0]);
  var preset;
  if (value.startsWith('{')) {
    preset = JSON.parse(value);
  } else {
    preset = presets[value];
  }
  if (preset) {
    return player.system.applyPreset(preset);
  } else {
    var simplePresets = Object.keys(presets);
    return Promise.resolve(simplePresets);
  }
}
module.exports = function (api) {
  api.registerAction('preset', presetsAction);
};