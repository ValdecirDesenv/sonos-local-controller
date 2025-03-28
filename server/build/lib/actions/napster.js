'use strict';

function getMetadata(id, parentUri, type, title) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\"\n  xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n  <item id=\"".concat(id, "\" parentID=\"").concat(parentUri, "\" restricted=\"true\"><dc:title>\"").concat(title, "\"</dc:title><upnp:class>").concat(type, "</upnp:class>\n  <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON51975_X_#Svc51975-0-Token</desc></item></DIDL-Lite>");
}
function getUri(id, type) {
  var uri = {
    song: "x-sonos-http:ondemand_track%3a%3atra.".concat(id, "%7cv1%7cALBUM%7calb.mp4?sid=203&flags=8224&sn=13"),
    album: "x-rincon-cpcontainer:100420ecexplore%3aalbum%3a%3aAlb.".concat(id)
  };
  return uri[type];
}
var CLASSES = {
  song: 'object.item.audioItem.musicTrack',
  album: 'object.container.album.musicAlbum'
};
var METADATA_URI_STARTERS = {
  song: '10032020ondemand_track%3a%3atra.',
  album: '100420ec'
};
var PARENTS = {
  song: '100420ecexplore%3a',
  album: '100420ecexplore%3aalbum%3a'
};
function napster(player, values) {
  var action = values[0];
  var trackID = values[1].split(':')[1];
  var type = values[1].split(':')[0];
  var nextTrackNo = 0;
  var metadataID = METADATA_URI_STARTERS[type] + encodeURIComponent(trackID);
  var metadata = getMetadata(metadataID, PARENTS[type], CLASSES[type], '');
  var uri = getUri(encodeURIComponent(trackID), type);
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
      return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo).then(function (addToQueueStatus) {
        return player.coordinator.trackSeek(addToQueueStatus.firsttracknumberenqueued);
      }).then(function () {
        return player.coordinator.play();
      });
    });
  } else if (action == 'next') {
    nextTrackNo = player.coordinator.state.trackNo + 1;
    return player.coordinator.addURIToQueue(uri, metadata, true, nextTrackNo);
  }
}
module.exports = function (api) {
  api.registerAction('napster', napster);
};