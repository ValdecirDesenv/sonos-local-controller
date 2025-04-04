'use strict';

var deezerDef = {
  country: '',
  search: {
    album: 'https://api.deezer.com/search?limit=1&q=album:',
    song: 'https://api.deezer.com/search?limit=50&q=',
    station: 'https://api.deezer.com/search?limit=1&q=artist:'
  },
  metastart: {
    album: '0004006calbum-',
    song: '00032020tr%3a',
    station: '000c0068radio-artist-'
  },
  parent: {
    album: '00020000search-album:',
    song: '00020000search-track:',
    station: '00050064artist-'
  },
  object: {
    album: 'container.album.musicAlbum.#DEFAULT',
    song: 'item.audioItem.musicTrack.#DEFAULT',
    station: 'item.audioItem.audioBroadcast.#DEFAULT'
  },
  init: function init(flacOn) {
    this.song = flacOn ? '00032020tr-flac%3a' : '00032020tr%3a';
    return this;
  },
  service: setService,
  term: getSearchTerm,
  tracks: loadTracks,
  empty: isEmpty,
  metadata: getMetadata,
  urimeta: getURIandMetadata,
  headers: getTokenHeaders,
  authenticate: authenticateService
};
function getTokenHeaders() {
  return null;
}
function authenticateService() {
  return Promise.resolve();
}
function getURI(type, id) {
  if (type == 'album') {
    return "x-rincon-cpcontainer:0004006calbum-".concat(id);
  } else if (type == 'song') {
    return "x-sonos-http:tr%3a".concat(id, ".mp3?sid=").concat(sid, "&flags=8224&sn=").concat(accountSN);
  } else if (type == 'station') {
    return "x-sonosapi-radio:radio-artist-".concat(id, "?sid=").concat(sid, "&flags=104&sn=").concat(accountSN);
  }
}
function getServiceToken() {
  return "SA_RINCON".concat(serviceType, "_").concat(accountId);
}
var sid = '';
var serviceType = '';
var accountId = '';
var accountSN = '';
var country = '';
function setService(player, p_accountId, p_accountSN, p_country) {
  sid = player.system.getServiceId('Deezer');
  serviceType = player.system.getServiceType('Deezer');
  accountId = p_accountId;
  accountSN = p_accountSN;
  country = p_country;
}
function getSearchTerm(type, term, artist, album, track) {
  var newTerm = '';
  if (album != '') {
    newTerm = album + ' ';
  }
  if (artist != '') {
    newTerm += 'artist:' + artist + (track != '' ? ' ' : '');
  }
  if (track != '') {
    newTerm += 'track:' + track;
  }
  newTerm = encodeURIComponent(newTerm);
  return newTerm;
}
function getMetadata(type, id, name, title) {
  var token = getServiceToken();
  var parentUri = deezerDef.parent[type] + name;
  var objectType = deezerDef.object[type];
  if (type != 'station') {
    title = '';
  }
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\"\n          xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n          <item id=\"".concat(id, "\" parentID=\"").concat(parentUri, "\" restricted=\"true\"><dc:title>").concat(title, "</dc:title><upnp:class>object.").concat(objectType, "</upnp:class>\n          <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">").concat(token, "</desc></item></DIDL-Lite>");
}
function getURIandMetadata(type, resList) {
  var Id = '';
  var Title = '';
  var Name = '';
  var MetadataID = '';
  var UaM = {
    uri: '',
    metadata: ''
  };
  Id = type == 'album' ? resList.data[0].album.id : resList.data[0].artist.id;
  Title = type == 'album' ? resList.data[0].album.title : resList.data[0].artist.name + ' Radio';
  Name = Title.toLowerCase().replace(' radio', '').replace('radio ', '').replace("'", "&apos;");
  MetadataID = deezerDef.metastart[type] + encodeURIComponent(Id);
  UaM.metadata = getMetadata(type, MetadataID, Id, Title);
  UaM.uri = getURI(type, encodeURIComponent(Id));
  return UaM;
}
function loadTracks(type, tracksJson) {
  var tracks = {
    count: 0,
    isArtist: false,
    queueTracks: []
  };

  // Load the tracks from the json results data
  if (tracksJson.data.length > 0) {
    // Filtered list of tracks to play
    tracks.queueTracks = tracksJson.data.reduce(function (tracksArray, track) {
      var skip = false;
      for (var j = 0; j < tracksArray.length && !skip; j++) {
        // Skip duplicate songs
        skip = track.title == tracksArray[j].trackName;
      }
      if (!skip) {
        var metadataID = deezerDef.metastart['song'] + encodeURIComponent(track.id);
        var metadata = getMetadata('song', metadataID, track.title.toLowerCase(), track.title);
        var uri = getURI('song', encodeURIComponent(track.id));
        tracksArray.push({
          trackName: track.title,
          artistName: track.artist.name,
          uri: uri,
          metadata: metadata
        });
        tracks.count++;
      }
      return tracksArray;
    }, []);
  }
  return tracks;
}
function isEmpty(type, resList) {
  return resList.data.length == 0;
}
module.exports = deezerDef;