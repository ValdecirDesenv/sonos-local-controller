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

app.use(bodyParser.json());

const discovery = new SonosSystem({});
discovery.setMaxListeners(20);
discovery.removeAllListeners('topology-change');

app.use('/', sonosRoutes(discovery));

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  const saveDefaultDevicesData = (historicalDevices) => {
    fs.writeFileSync(defaultDevicesPath, JSON.stringify(historicalDevices, null, 2));
    console.log('Default devices data updated and saved.');
  };

  const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offLineData: false } : { zones: Object.values(defaultDevicesData), offLineData: true };

  const historicalDevices = {};
  dataToSend.zones.forEach((zone) => {
    historicalDevices[zone.uuid] = {
      isInTimeFrameToPlay: defaultDevicesData[zone.uuid]?.isInTimeFrameToPlay || true,
      keepPlaying: defaultDevicesData[zone.uuid]?.keepPlaying || false,
      hasTimePlay: defaultDevicesData[zone.uuid]?.hasTimePlay || false,
      triggerStartStop: defaultDevicesData[zone.uuid]?.triggerStartStop || 0,
      timeStart: defaultDevicesData[zone.uuid]?.timeStart || defaultStartTime,
      timeStop: defaultDevicesData[zone.uuid]?.timeStop || defaultStopTime,
      name: zone.coordinator.roomName,
      uuid: zone.uuid,
      flagResp: defaultDevicesData[zone.uuid]?.flagResp || false,
      playbackState: zone.coordinator.state?.playbackState || false,
      coordinator: {
        ...zone.coordinator,
        avTransportUri: zone.coordinator.avTransportUri && zone.coordinator.avTransportUri.trim() !== '' ? zone.coordinator.avTransportUri : defaultDevicesData[zone.uuid]?.coordinator?.avTransportUri,
        avTransportUriMetadata: zone.coordinator.avTransportUriMetadata && zone.coordinator.avTransportUriMetadata.trim() !== '' ? zone.coordinator.avTransportUriMetadata : defaultDevicesData[zone.uuid]?.coordinator?.avTransportUriMetadata,
        roomName: zone.coordinator.roomName,
        state: zone.coordinator.state?.currentTrack.album && zone.coordinator.state.currentTrack.album.trim() !== '' ? zone.coordinator.state : defaultDevicesData[zone.uuid]?.coordinator.state,
        uuid: zone.coordinator.uuid,
      },
      members: zone.members.map((member) => ({
        roomName: member.roomName,
        state: member.state,
      })),
    };
  });

  if (Object.keys(defaultDevicesData).length === 0) {
    saveDefaultDevicesData(historicalDevices);
  }

  function getInTimeFrameToPlay(device) {
    const currentTime = new Date();
    const [startHour, startMinute] = device.timeStart.split(':').map(Number);
    const [stopHour, stopMinute] = device.timeStop.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);
    const stopTime = new Date();
    stopTime.setHours(stopHour, stopMinute, 0, 0);
    return currentTime >= startTime && currentTime <= stopTime;
  }

  setInterval(async () => {
    for (const uuid of Object.keys(historicalDevices)) {
      const device = defaultDevicesData[uuid];

      // Ensure the device has the 'hasTimePlay' property
      if (!device.hasOwnProperty('hasTimePlay')) {
        defaultDevicesData[uuid].hasTimePlay = false;
        continue;
      }

      const isInTimeRangeToPlay = getInTimeFrameToPlay(device);
      historicalDevices[device.uuid].isInTimeFrameToPlay = isInTimeRangeToPlay;

      const { keepPlaying, hasTimePlay } = device;
      const playbackState = historicalDevices[device.uuid]?.playbackState;

      const logAndChangePlayback = async (action) => {
        console.log(`setInterval: Sending command: ${action === 'play' ? 'Start' : 'Stop'} playing ${device.name}`);
        try {
          await changeGroupPlaybackStatus(device.coordinator, action);
          historicalDevices[device.uuid].playbackState = action === 'play' ? 'PLAYING' : 'PAUSED';
          historicalDevices[device.uuid].triggerEventTime = new Date();
          console.log(`setInterval: Playback ${action}ed successfully`);
        } catch (err) {
          console.error(`Failed to change playback: ${err.message}`);
        }
      };

      if (historicalDevices[device.uuid].triggerEventTime) {
        const currentTime = new Date();
        const timeDifference = (currentTime - new Date(historicalDevices[device.uuid].triggerEventTime)) / 1000; // in seconds
        if (timeDifference <= 10) {
          console.log(`setInterva: Skipping action for ${device.name} as the last trigger was within 10 seconds.`);
          return;
        }
      }

      if (keepPlaying || (playbackState !== 'PLAYING' && isInTimeRangeToPlay && hasTimePlay)) {
        await logAndChangePlayback('play');
      } else if (!keepPlaying && hasTimePlay) {
        if (isInTimeRangeToPlay) {
          await logAndChangePlayback('play');
        } else if (playbackState == 'PLAYING') {
          await logAndChangePlayback('pause');
        }
      } else {
        //device.playbackState;console.log(`setInterval: No action required to change playback state. DEVICE: ${device.name}`);
      }
    }
    console.log('------------------------------------');
  }, 30000);

  Object.keys(historicalDevices).forEach((uuid) => {
    if (defaultDevicesData[uuid]) {
      if (!defaultDevicesData[uuid].hasOwnProperty('keepPlaying')) {
        historicalDevices[uuid].keepPlaying = false;
        historicalDevices[uuid].hasTimePlay = false;
        defaultDevicesData[uuid].keepPlaying = false;
        defaultDevicesData[uuid].hasTimePlay = false;
      }
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
        console.warn(`Group ID ${parsedMessage.uuid} not found in default devices.`);
        return;
      }

      if (parsedMessage.type === 'toggle-update') {
        const { uuid, isKeepPlaying } = parsedMessage;
        console.log(`Toggle state updated: Group ID = ${uuid}, hasTimePlay = ${isKeepPlaying}`);
        defaultDevicesData[uuid].keepPlaying = isKeepPlaying;
        historicalDevices[uuid].keepPlaying = isKeepPlaying;

        console.log(`${historicalDevices[uuid].coordinator.roomName}, Device ID: ${defaultDevicesData[uuid].uuid}, keepPlaying: ${defaultDevicesData[uuid].keepPlaying}`);
        saveDefaultDevicesData(defaultDevicesData);
      } else if (parsedMessage.type === 'time-range-update') {
        const { uuid, timeStart, timeStop, hasTimePlay } = parsedMessage;
        defaultDevicesData[uuid].timeStart = timeStart ? timeStart : defaultStartTime;
        defaultDevicesData[uuid].timeStop = timeStop ? timeStop : defaultStopTime;
        defaultDevicesData[uuid].hasTimePlay = hasTimePlay;
        historicalDevices[uuid].timeStart = timeStart ? timeStart : defaultStartTime;
        historicalDevices[uuid].timeStop = timeStop ? timeStop : defaultStopTime;
        historicalDevices[uuid].hasTimePlay = hasTimePlay;

        console.log(`${defaultDevicesData[uuid].coordinator.roomName}, Device uuid: ${uuid}, hasTimePlay: ${defaultDevicesData[uuid].hasTimePlay}  Time Start: ${defaultDevicesData[uuid].timeStart}, Time Stop: ${defaultDevicesData[uuid].timeStop}`);
        saveDefaultDevicesData(defaultDevicesData);
      } else {
        console.warn(`Request Type : ${parsedMessage.type} not found${player.roomName}.`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    saveDefaultDevicesData(historicalDevices);
    console.log('WebSocket client disconnected');
  });

  discovery.on('transport-state', async (player) => {
    if (!player || !player.uuid) {
      console.error('transport-state event received an invalid player:', player);
      return;
    }

    if (!historicalDevices[player.uuid]) {
      console.warn(`discovery.on: Player with UUID ${player.uuid} not found in historicalDevices.`);
      return;
    }

    if (!player.state || !player.state.playbackState) {
      console.warn(`discovery.on: Missing playbackState for player ${player.roomName} (${player.uuid}).`);
      return;
    }

    const device = defaultDevicesData[player.uuid];
    const isInTimeRangeToPlay = getInTimeFrameToPlay(device);

    const { keepPlaying, isInTimeFrameToPlay, hasTimePlay } = historicalDevices[player.uuid];
    const playbackState = player.state.playbackState;

    const logAndChangePlayback = async (action) => {
      console.log(`discovery.on: Sending command: ${action === 'play' ? 'Start' : 'Stop'} playing ${player.roomName}`);
      try {
        await changeGroupPlaybackStatus(player, action);
        console.log(`Playback ${action}ed successfully`);
        historicalDevices[player.uuid].playbackState = player.state.playbackState;
        historicalDevices[player.uuid].triggerEventTime = new Date();
      } catch (err) {
        console.error(`Failed to change playback:`, err.message);
      }
    };

    if (historicalDevices[player.uuid].triggerEventTime) {
      const currentTime = new Date();
      const timeDifference = (currentTime - new Date(historicalDevices[player.uuid].triggerEventTime)) / 1000; // in seconds
      if (timeDifference <= 10) {
        console.log(`discovery.on: Skipping action for ${player.roomName} as the last trigger was within 10 seconds.`);
        return;
      }
    }

    if (keepPlaying) {
      if (playbackState !== 'PLAYING' && isInTimeFrameToPlay && isInTimeRangeToPlay && hasTimePlay) {
        await logAndChangePlayback('play');
      } else {
        console.log(`discovery.on: No action needed for device ${player.roomName} (keepPlaying is true and already playing or no conditions met).`);
      }
    } else if (!keepPlaying && hasTimePlay) {
      if (isInTimeFrameToPlay) {
        if (playbackState !== 'PLAYING') {
          await logAndChangePlayback('play');
        }
      } else {
        if (playbackState === 'PLAYING') {
          await logAndChangePlayback('pause');
        }
      }
    } else {
      // console.log(`discovery.on: No action required to change playback state. DEVICE: ${player.roomName}`);
    }

    // Update historical playbackState after the action is completed
    historicalDevices[player.uuid].playbackState = player.state.playbackState;
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
