'use strict';

function simplify(items) {
  return items.map(function (item) {
    return {
      title: item.title,
      artist: item.artist,
      album: item.album,
      albumArtUri: item.albumArtUri
    };
  });
}
function queue(player, values) {
  var detailed = values[values.length - 1] === 'detailed';
  var limit;
  var offset;
  if (/\d+/.test(values[0])) {
    limit = parseInt(values[0]);
  }
  if (/\d+/.test(values[1])) {
    offset = parseInt(values[1]);
  }
  var promise = player.coordinator.getQueue(limit, offset);
  if (detailed) {
    return promise;
  }
  return promise.then(simplify);
}
module.exports = function (api) {
  api.registerAction('queue', queue);
};