"use strict";

var fs = require('fs');
var JSON5 = require('json5');
var logger;
try {
  logger = require('sonos-discovery/lib/helpers/logger');
} catch (e) {
  console.error('Logger module is not found. Please check the module path.');
  process.exit(1);
}
function tryLoadJson(path) {
  try {
    var fileContent = fs.readFileSync(path);
    var parsedContent = JSON5.parse(fileContent);
    return parsedContent;
  } catch (e) {
    if (e.code === 'ENOENT') {
      logger.info("Could not find file ".concat(path));
    } else {
      logger.warn("Could not read file ".concat(path, ", ignoring."), e);
    }
  }
  return {};
}
module.exports = tryLoadJson;