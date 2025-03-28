'use strict';

var url = require('url');
var querystring = require('querystring');
var Anesidora = require('anesidora');
var Fuse = require('fuse.js');
var settings = require('../../settings');
function getPandoraMetadata(id, title, serviceType) {
  return "<DIDL-Lite xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\"\n        xmlns:r=\"urn:schemas-rinconnetworks-com:metadata-1-0/\" xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\">\n        <item id=\"100c206cST%3a".concat(id, "\" parentID=\"0\" restricted=\"true\"><dc:title>").concat(title, "</dc:title><upnp:class>object.item.audioItem.audioBroadcast.#station</upnp:class>\n        <desc id=\"cdudn\" nameSpace=\"urn:schemas-rinconnetworks-com:metadata-1-0/\">SA_RINCON").concat(serviceType, "_X_#Svc").concat(serviceType, "-0-Token</desc></item></DIDL-Lite>");
}
function getPandoraUri(id, title, albumart) {
  return "x-sonosapi-radio:ST%3a".concat(id, "?sid=236&flags=8300&sn=1");
}
function parseQuerystring(uri) {
  var parsedUri = url.parse(uri);
  return querystring.parse(parsedUri.query);
}
function pandora(player, values) {
  var cmd = values[0];
  function userLogin() {
    return new Promise(function (resolve, reject) {
      pAPI.login(function (err) {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }
  function pandoraAPI(command, parameters) {
    return new Promise(function (resolve, reject) {
      pAPI.request(command, parameters, function (err, result) {
        if (!err) {
          resolve(result);
        } else {
          console.log("pandoraAPI " + command + " " + JSON.stringify(parameters));
          console.log("ERROR: " + JSON.stringify(err));
          reject(err);
        }
      });
    });
  }
  function playPandora(player, name) {
    var uri = '';
    var metadata = '';
    var sid = player.system.getServiceId('Pandora');
    return userLogin().then(function () {
      return pandoraAPI("user.getStationList", {
        "includeStationArtUrl": true
      });
    }).then(function (stationList) {
      return pandoraAPI("music.search", {
        "searchText": name
      }).then(function (result) {
        if (result.artists != undefined) {
          result.artists.map(function (artist) {
            if (artist.score > 90) {
              stationList.stations.push({
                "stationId": artist.musicToken,
                "stationName": artist.artistName,
                "type": "artist"
              });
            }
          });
        }
        if (result.songs != undefined) {
          result.songs.map(function (song) {
            if (song.score > 90) {
              stationList.stations.push({
                "stationId": song.musicToken,
                "stationName": song.songName,
                "type": "song"
              });
            }
          });
        }
        return pandoraAPI("station.getGenreStations", {});
      }).then(function (result) {
        result.categories.map(function (category) {
          category.stations.map(function (genreStation) {
            stationList.stations.push({
              "stationId": genreStation.stationToken,
              "stationName": genreStation.stationName,
              "type": "song"
            });
          });
        });
        var fuzzy = new Fuse(stationList.stations, {
          keys: ["stationName"]
        });
        var results = fuzzy.search(name);
        if (results.length > 0) {
          var station = results[0];
          if (station.type == undefined) {
            uri = getPandoraUri(station.item.stationId, station.item.stationName, station.item.artUrl);
            metadata = getPandoraMetadata(station.item.stationId, station.item.stationName, player.system.getServiceType('Pandora'));
            return Promise.resolve();
          } else {
            return pandoraAPI("station.createStation", {
              "musicToken": station.item.stationId,
              "musicType": station.item.type
            }).then(function (stationInfo) {
              uri = getPandoraUri(stationInfo.stationId);
              metadata = getPandoraMetadata(stationInfo.stationId, stationInfo.stationName, player.system.getServiceType('Pandora'));
              return Promise.resolve();
            });
          }
        } else {
          return Promise.reject("No match was found");
        }
      }).then(function () {
        return player.coordinator.setAVTransport(uri, metadata);
      }).then(function () {
        return player.coordinator.play();
      });
    });
  }
  if (settings && settings.pandora) {
    var pAPI = new Anesidora(settings.pandora.username, settings.pandora.password);
    if (cmd == 'play') {
      return playPandora(player, values[1]);
    }
    if (cmd == 'thumbsup' || cmd == 'thumbsdown') {
      var sid = player.system.getServiceId('Pandora');
      var uri = player.state.currentTrack.uri;
      var parameters = parseQuerystring(uri);
      if (uri.startsWith('x-sonosapi-radio') && parameters.sid == sid && player.state.currentTrack.trackUri) {
        var trackUri = player.state.currentTrack.trackUri;
        var trackToken = trackUri.substring(trackUri.search('x-sonos-http:') + 13, trackUri.search('%3a%3aST%3a'));
        var stationToken = trackUri.substring(trackUri.search('%3a%3aST%3a') + 11, trackUri.search('%3a%3aRINCON'));
        var up = cmd == 'thumbsup';
        return userLogin().then(function () {
          return pandoraAPI("station.addFeedback", {
            "stationToken": stationToken,
            "trackToken": trackToken,
            "isPositive": up
          });
        }).then(function () {
          if (cmd == 'thumbsdown') {
            return player.coordinator.nextTrack();
          }
        });
      } else {
        return Promise.reject('The music that is playing is not a Pandora station');
      }
    }
  } else {
    console.log('Missing Pandora settings');
    return Promise.reject('Missing Pandora settings');
  }
}
module.exports = function (api) {
  api.registerAction('pandora', pandora);
};