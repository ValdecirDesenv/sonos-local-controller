'use strict';

function getMetadata(station) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\" xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n        <item id=\"83207".concat(station, "\" parentID=\"L\" restricted=\"true\"><dc:title>BBC Sounds</dc:title><upnp:class>object.item.audioItem.audioBroadcast</upnp:class>\n        <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON83207_</desc></item></DIDL-Lite>");
}
function getUri(station) {
  return "x-sonosapi-hls:stations%7eplayable%7e%7e".concat(station, "%7e%7eurn%3abbc%3aradio%3anetwork%3a").concat(station, "?sid=325&flags=288&sn=10");
}

/**
 * @link https://gist.github.com/bpsib/67089b959e4fa898af69fea59ad74bc3 Stream names can be found here
 */
function bbcSounds(player, values) {
  var action = values[0];
  var station = encodeURIComponent(values[1]);
  if (!station) {
    return Promise.reject('Expected BBC Sounds station name.');
  }
  var metadata = getMetadata(station);
  var uri = getUri(station);
  if (action === 'play') {
    return player.coordinator.setAVTransport(uri, metadata).then(function () {
      return player.coordinator.play();
    });
  } else if (action === 'set') {
    return player.coordinator.setAVTransport(uri, metadata);
  }
  return Promise.reject('BBC Sounds only handles the {play} & {set} actions.');
}
module.exports = function (api) {
  api.registerAction('bbcsounds', bbcSounds);
};