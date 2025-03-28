'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
require('events').EventEmitter.defaultMaxListeners = 20;
var _require = require('./lib/sonosController'),
  changeGroupVolume = _require.changeGroupVolume,
  changeGroupPlaybackStatus = _require.changeGroupPlaybackStatus;
var path = require('path');
var fs = require('fs');
var express = require('express');
var http = require('http');
var WebSocket = require('ws');
var bodyParser = require('body-parser');
var SonosSystem = require('sonos-discovery');
var sonosRoutes = require('./routers/sonosRoutes');
var _require2 = require('process'),
  off = _require2.off;
var app = express();
var server = http.createServer(app);
var wss = new WebSocket.Server({
  server: server
});
var defaultStartTime = '06:00';
var defaultStopTime = '21:00';
var _require3 = require('events'),
  EventEmitter = _require3.EventEmitter;
var defaultDevicesPath = path.join(__dirname, 'default.json');
if (!fs.existsSync(defaultDevicesPath)) {
  fs.writeFileSync(defaultDevicesPath, JSON.stringify({}));
} else {
  console.log('Default devices: ', defaultDevicesPath);
}
var defaultDevicesData = JSON.parse(fs.readFileSync(defaultDevicesPath, 'utf8'));
app.use(bodyParser.json());
var discovery = new SonosSystem({});
discovery.setMaxListeners(20);
discovery.removeAllListeners('topology-change');
app.use('/', sonosRoutes(discovery));
wss.on('connection', function (ws) {
  console.log('WebSocket client connected');
  var saveDefaultDevicesData = function saveDefaultDevicesData(historicalDevices) {
    fs.writeFileSync(defaultDevicesPath, JSON.stringify(historicalDevices, null, 2));
    console.log('Default devices data updated and saved.');
  };
  var dataToSend = discovery.zones.length > 0 ? {
    zones: discovery.zones,
    offLineData: false
  } : {
    zones: Object.values(defaultDevicesData),
    offLineData: true
  };
  var historicalDevices = {};
  dataToSend.zones.forEach(function (zone) {
    var _defaultDevicesData$z, _defaultDevicesData$z2, _defaultDevicesData$z3;
    historicalDevices[zone.uuid] = {
      keepPlaying: zone.keepPlaying || false,
      hasTimePlay: zone.hasTimePlay || false,
      triggerStartStop: zone.triggerStartStop || 0,
      timeStart: zone.timeStart || defaultStartTime,
      timeStop: zone.timeStop || defaultStopTime,
      name: zone.coordinator.roomName,
      uuid: zone.uuid,
      playbackState: zone.coordinator.state.playbackState,
      coordinator: _objectSpread(_objectSpread({}, zone.coordinator), {}, {
        avTransportUri: zone.coordinator.avTransportUri && zone.coordinator.avTransportUri.trim() !== '' ? zone.coordinator.avTransportUri : (_defaultDevicesData$z = defaultDevicesData[zone.uuid]) === null || _defaultDevicesData$z === void 0 || (_defaultDevicesData$z = _defaultDevicesData$z.coordinator) === null || _defaultDevicesData$z === void 0 ? void 0 : _defaultDevicesData$z.avTransportUri,
        avTransportUriMetadata: zone.coordinator.avTransportUriMetadata && zone.coordinator.avTransportUriMetadata.trim() !== '' ? zone.coordinator.avTransportUriMetadata : (_defaultDevicesData$z2 = defaultDevicesData[zone.uuid]) === null || _defaultDevicesData$z2 === void 0 || (_defaultDevicesData$z2 = _defaultDevicesData$z2.coordinator) === null || _defaultDevicesData$z2 === void 0 ? void 0 : _defaultDevicesData$z2.avTransportUriMetadata,
        roomName: zone.coordinator.roomName,
        state: zone.coordinator.state.currentTrack.album && zone.coordinator.state.currentTrack.album.trim() !== '' ? zone.coordinator.state : (_defaultDevicesData$z3 = defaultDevicesData[zone.uuid]) === null || _defaultDevicesData$z3 === void 0 ? void 0 : _defaultDevicesData$z3.coordinator.state,
        uuid: zone.coordinator.uuid
      }),
      members: zone.members.map(function (member) {
        return {
          roomName: member.roomName,
          state: member.state
        };
      })
    };
  });
  if (Object.keys(defaultDevicesData).length === 0) {
    saveDefaultDevicesData(historicalDevices);
  }
  setInterval(function () {
    Object.keys(historicalDevices).forEach(function (uuid) {
      if (historicalDevices[uuid].hasTimePlay) {
        console.log("Zone ".concat(historicalDevices[uuid].roomName, " has time playing enabled."));
        console.log("Playback state changed: ".concat(historicalDevices[uuid].coordinator.roomName, " actual playbackState: ").concat(historicalDevices[uuid].playbackState));
        var currentTime = new Date();
        var _historicalDevices$uu = historicalDevices[uuid].timeStart.split(':').map(Number),
          _historicalDevices$uu2 = _slicedToArray(_historicalDevices$uu, 2),
          startHour = _historicalDevices$uu2[0],
          startMinute = _historicalDevices$uu2[1];
        var _historicalDevices$uu3 = historicalDevices[uuid].timeStop.split(':').map(Number),
          _historicalDevices$uu4 = _slicedToArray(_historicalDevices$uu3, 2),
          stopHour = _historicalDevices$uu4[0],
          stopMinute = _historicalDevices$uu4[1];
        var startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        var stopTime = new Date();
        stopTime.setHours(stopHour, stopMinute, 0, 0);
        var isInTimeRange = currentTime >= startTime && currentTime <= stopTime;
        if (historicalDevices[uuid].playbackState !== 'PLAYING' && isInTimeRange) {
          if (historicalDevices[uuid].triggerStartStop < 2) {
            console.log("send a msg ".concat(historicalDevices[uuid].coordinator.roomName, " to  Start playing"));
            historicalDevices[uuid].triggerStartStop++;
            changeGroupPlaybackStatus(historicalDevices[uuid], 'play').then(function () {
              return console.log('Playback changed successfully');
            })["catch"](function (err) {
              return console.error('Failed to change playback:', err.message);
            });
          }
        } else if (historicalDevices[uuid].triggerStartStop > -2 && !isInTimeRange) {
          console.log("send a msg ".concat(historicalDevices[uuid].roomName, " to  Stop playing"));
          historicalDevices[uuid].triggerStartStop--;
          changeGroupPlaybackStatus(historicalDevices[uuid].coordinator, 'stop').then(function () {
            return console.log('Playback changed successfully');
          })["catch"](function (err) {
            return console.error('Failed to change playback:', err.message);
          });
        } else {
          console.log('TIME MENAGEMENT: No action requered to change');
        }
      } else {
        console.log('There is no Time Management');
      }
    });
  }, 50000);
  Object.keys(historicalDevices).forEach(function (uuid) {
    if (defaultDevicesData[uuid]) {
      if (defaultDevicesData[uuid].hasOwnProperty('keepPlaying')) {
        console.log("Updating historical data for ".concat(historicalDevices[uuid].coordinator.roomName));
        historicalDevices[uuid].keepPlaying = defaultDevicesData[uuid].keepPlaying;
        historicalDevices[uuid].hasTimePlay = defaultDevicesData[uuid].hasTimePlay;
      } else {
        historicalDevices[uuid].keepPlaying = false;
        historicalDevices[uuid].hasTimePlay = false;
        defaultDevicesData[uuid].keepPlaying = false;
        defaultDevicesData[uuid].hasTimePlay = false;
      }
    }
  });
  var listDevices = dataToSend.zones.reduce(function (acc, zone) {
    zone.members.forEach(function (member) {
      acc[member.uuid] = member.roomName;
    });
    return acc;
  }, {});
  var initialData = {
    offLineData: dataToSend.offLineData,
    type: 'initial',
    data: historicalDevices,
    devices: listDevices
  };
  ws.send(JSON.stringify(initialData));
  ws.on('message', function (message) {
    try {
      var parsedMessage = JSON.parse(message);
      if (!defaultDevicesData[parsedMessage.uuid]) {
        console.warn("Group ID ".concat(parsedMessage.uuid, " not found in default devices."));
        return;
      }
      if (parsedMessage.type === 'toggle-update') {
        var uuid = parsedMessage.uuid,
          isKeepPlaying = parsedMessage.isKeepPlaying;
        console.log("Toggle state updated: Group ID = ".concat(uuid, ", hasTimePlay = ").concat(isKeepPlaying));
        defaultDevicesData[uuid].keepPlaying = isKeepPlaying;
        console.log("".concat(defaultDevicesData[uuid].coordinator.roomName, ", Device ID: ").concat(defaultDevicesData[uuid].id, ", keepPlaying: ").concat(defaultDevicesData[uuid].keepPlaying));
        saveDefaultDevicesData(historicalDevices);
      } else if (parsedMessage.type === 'time-range-update') {
        var _uuid = parsedMessage.uuid,
          timeStart = parsedMessage.timeStart,
          timeStop = parsedMessage.timeStop,
          hasTimePlay = parsedMessage.hasTimePlay;
        defaultDevicesData[_uuid].timeStart = timeStart ? timeStart : defaultStartTime;
        defaultDevicesData[_uuid].timeStop = timeStop ? timeStop : defaultStopTime;
        defaultDevicesData[_uuid].hasTimePlay = hasTimePlay;
        console.log("".concat(defaultDevicesData[_uuid].coordinator.roomName, ", Device uuid: ").concat(_uuid, ", hasTimePlay: ").concat(defaultDevicesData[_uuid].hasTimePlay, "  Time Start: ").concat(defaultDevicesData[_uuid].timeStart, ", Time Stop: ").concat(defaultDevicesData[_uuid].timeStop));
        saveDefaultDevicesData(historicalDevices);
      } else {
        console.warn("Request Type : ".concat(parsedMessage.type, " not found").concat(player.roomName, "."));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });
  ws.on('close', function () {
    saveDefaultDevicesData(historicalDevices);
    console.log('WebSocket client disconnected');
  });
  discovery.on('transport-state', function (player) {
    console.log("Playback state changed: ".concat(player.roomName, " is now ").concat(player.state.playbackState));
    if (defaultDevicesData[player.uuid].keepPlaying && player.state.playbackState !== 'PLAYING') {
      console.log("send a msg ".concat(player.roomName, " to  play"));
      changeGroupPlaybackStatus(player, 'play').then(function () {
        return console.log('Playback changed successfully');
      })["catch"](function (err) {
        return console.error('Failed to change playback:', err.message);
      });
    } else {
      console.log('No action requered to change');
    }
    defaultDevicesData[player.uuid].playbackState = player.state.playbackState;
  });

  // discovery.on('topology-change', (zones) => {
  //   zones.forEach((zone) => {
  //     console.log(`Room Name: ${zone.coordinator.roomName}, Status: ${zone.coordinator.groupState.mute ? 'Muted' : 'Unmuted'}, State: ${zone.coordinator.state.playbackState}`);
  //   });
  //   console.log('Topology change detected. Sending updated zones.', zones);
  //   ws.send(JSON.stringify({ type: 'topology-change', data: zones }));
  // });
});

// Start server
var PORT = 3000;
server.listen(PORT, function () {
  console.log("Server running on http://localhost:".concat(PORT));
});