'use strict';

function getTuneInMetadata(uri, serviceType) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\"\n        xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n        <item id=\"F00092020s".concat(uri, "\" parentID=\"L\" restricted=\"true\"><dc:title>tunein</dc:title><upnp:class>object.item.audioItem.audioBroadcast</upnp:class>\n        <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON").concat(serviceType, "_</desc></item></DIDL-Lite>");
}
function tuneIn(player, values) {
  var action = values[0];
  var tuneInUri = values[1];
  var encodedTuneInUri = encodeURIComponent(tuneInUri);
  var sid = player.system.getServiceId('TuneIn');
  var metadata = getTuneInMetadata(encodedTuneInUri, player.system.getServiceType('TuneIn'));
  var uri = "x-sonosapi-stream:s".concat(encodedTuneInUri, "?sid=").concat(sid, "&flags=8224&sn=0");
  if (!tuneInUri) {
    return Promise.reject('Expected TuneIn station id');
  }
  if (action == 'play') {
    return player.coordinator.setAVTransport(uri, metadata).then(function () {
      return player.coordinator.play();
    });
  }
  if (action == 'set') {
    return player.coordinator.setAVTransport(uri, metadata);
  }
  return Promise.reject('TuneIn only handles the {play} & {set} action');
}
module.exports = function (api) {
  api.registerAction('tunein', tuneIn);
};