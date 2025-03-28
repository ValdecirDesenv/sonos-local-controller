'use strict';

function getMetadata(id, parentUri, type, title) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\"\n  xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n  <item id=\"".concat(id, "\" parentID=\"").concat(parentUri, "\" restricted=\"true\"><dc:title>\"").concat(title, "\"</dc:title><upnp:class>").concat(type, "</upnp:class>\n  <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON52231_X_#Svc52231-0-Token</desc></item></DIDL-Lite>");
}
function getSongUri(id) {
  return "x-sonos-http:".concat(id, ".mp4?sid=204&flags=8224&sn=4");
}
function getAlbumUri(id) {
  return "x-rincon-cpcontainer:0004206c".concat(id);
}
function getPlaylistUri(id) {
  return "x-rincon-cpcontainer:1006206c".concat(id);
}
var uriTemplates = {
  song: getSongUri,
  album: getAlbumUri,
  playlist: getPlaylistUri
};
var CLASSES = {
  song: 'object.item.audioItem.musicTrack',
  album: 'object.item.audioItem.musicAlbum',
  playlist: 'object.container.playlistContainer.#PlaylistView'
};
var METADATA_URI_STARTERS = {
  song: '00032020',
  album: '0004206c',
  playlist: '1006206c'
};
var PARENTS = {
  song: '0004206calbum%3a',
  album: '00020000album%3a',
  playlist: '1006206cplaylist%3a'
};
function appleMusic(player, values) {
  var action = values[0];
  var trackID = values[1];
  var type = trackID.split(':')[0];
  var nextTrackNo = 0;
  var metadataID = METADATA_URI_STARTERS[type] + encodeURIComponent(trackID);
  var metadata = getMetadata(metadataID, PARENTS[type], CLASSES[type], '');
  var uri = uriTemplates[type](encodeURIComponent(trackID));
  if (action === 'queue') {
    return player.coordinator.addURIToQueue(uri, metadata);
  } else if (action === 'now') {
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
      if (nextTrackNo !== 1) player.coordinator.nextTrack();
    }).then(function () {
      return player.coordinator.play();
    });
  } else if (action === 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }
  return null;
}
module.exports = function appleMusicAction(api) {
  api.registerAction('applemusic', appleMusic);
};