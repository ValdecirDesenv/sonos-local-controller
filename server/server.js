'use strict';

require('events').EventEmitter.defaultMaxListeners = 20;
const { changeGroupVolume, changeGroupPlaybackStatus } = require('./lib/sonosController');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const SonosSystem = require('sonos-discovery');
const sonosRoutes = require('./routers/sonosRoutes');
const testJson = require('./testes/mockTest.json');
const { off } = require('process');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const defaultStartTime = '06:00';
const defaultStopTime = '21:00';
const { EventEmitter } = require('events');
const defaultDevicesPath = path.join(__dirname, 'default.json');

if (!fs.existsSync(defaultDevicesPath)) {
  fs.writeFileSync(defaultDevicesPath, JSON.stringify({}));
} else {
  console.log('Default devices: ', defaultDevicesPath);
}

let defaultDevicesData = JSON.parse(fs.readFileSync(defaultDevicesPath, 'utf8'));
const testDevicesData = JSON.parse(fs.readFileSync(defaultDevicesPath, 'utf8'));

app.use(bodyParser.json());

const discovery = new SonosSystem({});
discovery.setMaxListeners(20);
discovery.removeAllListeners('topology-change');

app.use('/', sonosRoutes(discovery));

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  const saveDefaultDevicesData = () => {
    fs.writeFileSync(defaultDevicesPath, JSON.stringify(defaultDevicesData, null, 2));
    console.log('Default devices data updated and saved.');
  };
  const devices = discovery.getAnyPlayer();

  const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offLineData: false } : { zones: Object.values(defaultDevicesData), offLineData: true };

  const historicalDevices = {};
  dataToSend.zones.forEach((zone) => {
    historicalDevices[zone.uuid] = {
      keepPlaying: zone.keepPlaying || false,
      hasTimePlay: zone.hasTimePlay || false,
      triggerStartStop: zone.triggerStartStop || 0,
      timeStart: zone.timeStart || defaultStartTime,
      timeStop: zone.timeStop || defaultStopTime,
      name: zone.coordinator.roomName,
      uuid: zone.uuid,
      playbackState: zone.coordinator.state.playbackState,
      coordinator: {
        ...zone.coordinator,
        avTransportUri: zone.coordinator.avTransportUri && zone.coordinator.avTransportUri.trim() !== '' ? zone.coordinator.avTransportUri : defaultDevicesData[zone.uuid]?.coordinator?.avTransportUri,
        avTransportUriMetadata: zone.coordinator.avTransportUriMetadata && zone.coordinator.avTransportUriMetadata.trim() !== '' ? zone.coordinator.avTransportUriMetadata : defaultDevicesData[zone.uuid]?.coordinator?.avTransportUriMetadata,
        roomName: zone.coordinator.roomName,
        state: zone.coordinator.state.currentTrack.album && zone.coordinator.state.currentTrack.album.trim() !== '' ? zone.coordinator.state : defaultDevicesData[zone.uuid]?.coordinator.state,
        roomName: zone.coordinator.roomName,
        uuid: zone.coordinator.uuid,
      },
      members: zone.members.map((member) => ({
        roomName: member.roomName,
        state: member.state,
      })),
    };
  });

  setInterval(() => {
    Object.keys(historicalDevices).forEach((uuid) => {
      if (historicalDevices[uuid].hasTimePlay) {
        console.log(`Zone ${historicalDevices[uuid].roomName} has time playing enabled.`);
        console.log(`Playback state changed: ${historicalDevices[uuid].coordinator.roomName} actual playbackState: ${historicalDevices[uuid].playbackState}`);
        const currentTime = new Date();
        const [startHour, startMinute] = historicalDevices[uuid].timeStart.split(':').map(Number);
        const [stopHour, stopMinute] = historicalDevices[uuid].timeStop.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        const stopTime = new Date();
        stopTime.setHours(stopHour, stopMinute, 0, 0);
        const isInTimeRange = currentTime >= startTime && currentTime <= stopTime;

        if (historicalDevices[uuid].playbackState !== 'PLAYING' && isInTimeRange) {
          if (historicalDevices[uuid].triggerStartStop < 2) {
            console.log(`send a msg ${historicalDevices[uuid].coordinator.roomName} to  Start playing`);
            historicalDevices[uuid].triggerStartStop++;
            changeGroupPlaybackStatus(historicalDevices[uuid], 'play')
              .then(() => console.log('Playback changed successfully'))
              .catch((err) => console.error('Failed to change playback:', err.message));
          }
        } else if (historicalDevices[uuid].triggerStartStop > -2 && !isInTimeRange) {
          console.log(`send a msg ${historicalDevices[uuid].roomName} to  Stop playing`);
          historicalDevices[uuid].triggerStartStop--;
          changeGroupPlaybackStatus(historicalDevices[uuid].coordinator, 'stop')
            .then(() => console.log('Playback changed successfully'))
            .catch((err) => console.error('Failed to change playback:', err.message));
        } else {
          console.log('TIME MENAGEMENT: No action requered to change');
        }
      } else {
        console.log('There is no Time Management');
      }
    });
  }, 50000);

  Object.keys(historicalDevices).forEach((uuid) => {
    if (defaultDevicesData[uuid]) {
      historicalDevices[uuid].keepPlaying = defaultDevicesData[uuid].keepPlaying;
      historicalDevices[uuid].hasTimePlay = defaultDevicesData[uuid].hasTimePlay;
    }
  });

  const listDevices = dataToSend.zones.reduce((acc, zone) => {
    zone.members.forEach((member) => {
      acc[member.uuid] = member.roomName;
    });
    return acc;
  }, {});

  const initialData = {
    offLineData: dataToSend.offLineData,
    type: 'initial',
    data: historicalDevices,
    devices: listDevices,
  };

  ws.send(JSON.stringify(initialData));

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      if (!defaultDevicesData[parsedMessage.uuid]) {
        console.warn(`Group ID ${uuid} not found in default devices.`);
        return;
      }

      if (parsedMessage.type === 'toggle-update') {
        const { uuid, isKeepPlaying } = parsedMessage;
        console.log(`Toggle state updated: Group ID = ${uuid}, hasTimePlay = ${isKeepPlaying}`);
        defaultDevicesData[uuid].keepPlaying = isKeepPlaying;
        console.log(`${defaultDevicesData[uuid].coordinator.roomName}, Device ID: ${defaultDevicesData[uuid].id}, keepPlaying: ${defaultDevicesData[uuid].keepPlaying}`);
        saveDefaultDevicesData();
      } else if (parsedMessage.type === 'time-range-update') {
        const { uuid, timeStart, timeStop, hasTimePlay } = parsedMessage;
        defaultDevicesData[uuid].timeStart = timeStart ? timeStart : defaultStartTime;
        defaultDevicesData[uuid].timeStop = timeStop ? timeStop : defaultStopTime;
        defaultDevicesData[uuid].hasTimePlay = hasTimePlay;

        console.log(`${defaultDevicesData[uuid].coordinator.roomName}, Device uuid: ${uuid}, hasTimePlay: ${defaultDevicesData[uuid].hasTimePlay}  Time Start: ${defaultDevicesData[uuid].timeStart}, Time Stop: ${defaultDevicesData[uuid].timeStop}`);
        saveDefaultDevicesData();
      } else {
        console.warn(`Request Type : ${parsedMessage.type} not found${player.roomName}.`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    saveDefaultDevicesData();
    console.log('WebSocket client disconnected');
  });

  discovery.on('transport-state', (player) => {
    console.log(`Playback state changed: ${player.roomName} is now ${player.state.playbackState}`);
    if (defaultDevicesData[player.uuid].keepPlaying && player.state.playbackState !== 'PLAYING') {
      console.log(`send a msg ${player.roomName} to  play`);
      changeGroupPlaybackStatus(player, 'play')
        .then(() => console.log('Playback changed successfully'))
        .catch((err) => console.error('Failed to change playback:', err.message));
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
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
