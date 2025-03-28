'use strict';

function getMetadata(id, parentUri, type, title) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\" xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n<item id=\"".concat(id, "\" parentID=\"").concat(parentUri, "\" restricted=\"true\">\n  <dc:title>\"").concat(title, "\"</dc:title>\n  <upnp:class>").concat(type, "</upnp:class>\n  <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON51463_X_#Svc51463-0-Token</desc>\n</item>\n</DIDL-Lite>");
}
function getSongUri(id) {
  return "x-sonosapi-hls-static:catalog%2ftracks%2f".concat(id, "%2f%3falbumAsin%3dB01JDKZWK0?sid=201&flags=0&sn=4");
}
function getAlbumUri(id) {
  return "x-rincon-cpcontainer:1004206ccatalog%2falbums%2f".concat(id, "%2f%23album_desc?sid=201&flags=8300&sn=4");
}
var uriTemplates = {
  song: getSongUri,
  album: getAlbumUri
};
var CLASSES = {
  song: 'object.container.album.musicAlbum.#AlbumView',
  album: 'object.container.album.musicAlbum'
};
var METADATA_URI_STARTERS = {
  song: '10030000catalog%2ftracks%2f',
  album: '1004206ccatalog'
};
var METADATA_URI_ENDINGS = {
  song: '%2f%3falbumAsin%3d',
  album: '%2f%23album_desc'
};
var PARENTS = {
  song: '1004206ccatalog%2falbums%2f',
  album: '10052064catalog%2fartists%2f'
};
function amazonMusic(player, values) {
  var action = values[0];
  var track = values[1];
  var type = track.split(':')[0];
  var trackID = track.split(':')[1];
  var nextTrackNo = 0;
  var metadataID = METADATA_URI_STARTERS[type] + encodeURIComponent(trackID) + METADATA_URI_ENDINGS[type];
  var metadata = getMetadata(metadataID, PARENTS[type], CLASSES[type], '');
  var uri = uriTemplates[type](encodeURIComponent(trackID));
  if (action == 'queue') {
    return player.coordinator.addURIToQueue(uri, metadata);
  } else if (action == 'now') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    var promise = Promise.resolve();
    if (player.coordinator.avTransportUri.startsWith('x-rincon-queue') === false) {
      promise = promise.then(function () {
        return player.coordinator.setAVTransport("x-rincon-queue:".concat(player.coordinator.uuid, "#0"));
      });
    }
    return promise.then(function () {
      return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
    }).then(function () {
      if (nextTrackNo != 1) player.coordinator.nextTrack();
    }).then(function () {
      return player.coordinator.play();
    });
  } else if (action == 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }
}
module.exports = function (api) {
  api.registerAction('amazonmusic', amazonMusic);
};