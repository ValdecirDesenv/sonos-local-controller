'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var logger = require('sonos-discovery/lib/helpers/logger');
var tryLoadJson = require('./helpers/try-load-json');
var settings = require('../settings');
var PRESETS_PATH = settings.presetDir;
var PRESETS_FILENAME = "".concat(__dirname, "/../presets.json");
var presets = {};
function readPresetsFromDir(presets, presetPath) {
  var files;
  try {
    files = fs.readdirSync(presetPath);
  } catch (e) {
    logger.warn("Could not find dir ".concat(presetPath, ", are you sure it exists?"));
    logger.warn(e.message);
    return;
  }
  files.map(function (name) {
    var fullPath = path.join(presetPath, name);
    return {
      name: name,
      fullPath: fullPath,
      stat: fs.statSync(fullPath)
    };
  }).filter(function (file) {
    return !file.stat.isDirectory() && !file.name.startsWith('.') && file.name.endsWith('.json');
  }).forEach(function (file) {
    var presetName = file.name.replace(/\.json/i, '');
    var preset = tryLoadJson(file.fullPath);
    if (Object.keys(preset).length === 0) {
      logger.warn("could not parse preset file ".concat(file.name, ", please make sure syntax conforms with JSON5."));
      return;
    }
    presets[presetName] = preset;
  });
}
function readPresetsFromFile(presets, filename) {
  try {
    var presetStat = fs.statSync(filename);
    if (!presetStat.isFile()) {
      return;
    }
    var filePresets = require(filename);
    Object.keys(filePresets).forEach(function (presetName) {
      presets[presetName] = filePresets[presetName];
    });
    logger.warn('You are using a presets.json file! ' + 'Consider migrating your presets into the presets/ ' + 'folder instead, and enjoy auto-reloading of presets when you change them');
  } catch (err) {
    logger.debug("no presets.json file exists, skipping");
  }
}
function initPresets() {
  Object.keys(presets).forEach(function (presetName) {
    delete presets[presetName];
  });
  readPresetsFromFile(presets, PRESETS_FILENAME);
  readPresetsFromDir(presets, PRESETS_PATH);
  logger.info('Presets loaded:', util.inspect(presets, {
    depth: null
  }));
}
initPresets();
var watchTimeout;
try {
  fs.watch(PRESETS_PATH, {
    persistent: false
  }, function () {
    clearTimeout(watchTimeout);
    watchTimeout = setTimeout(initPresets, 200);
  });
} catch (e) {
  logger.warn("Could not start watching dir ".concat(PRESETS_PATH, ", will not auto reload any presets. Make sure the dir exists"));
  logger.warn(e.message);
}
module.exports = presets;