'use strict';

require('events').EventEmitter.defaultMaxListeners = 20;
const { changeGroupVolume, changeGroupPlaybackStatus } = require('./lib/sonosController');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const bodyParser = require('body-parser');
//const SonosSystem = require('sonos-discovery');
const Discovery = require('sonos-discovery');
const sonosRoutes = require('./routers/sonosRoutes');
const { off } = require('process');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const defaultStartTime = '06:00';
const defaultStopTime = '23:00';
const { EventEmitter } = require('events');
const historicalDevicesPath = path.join(__dirname, 'default.json');

let filteredData = {};
let historicalDevices = {};
let payload = {
  offLineData: true,
  type: 'initial',
  data: {},
  devices: {},
};

if (fs.existsSync(historicalDevicesPath)) {
  try {
    historicalDevices = JSON.parse(fs.readFileSync(historicalDevicesPath, 'utf8'));
    console.log('Default devices loaded from:', historicalDevicesPath);
  } catch (err) {
    console.error('Error reading or parsing default devices file:', err.message);
  }
} else {
  console.log('Default devices file not found. Initializing with an empty object.');
  fs.writeFileSync(historicalDevicesPath, JSON.stringify(historicalDevices, null, 2));
}

//const discovery = new SonosSystem({});
const discovery = new Discovery();

discovery.setMaxListeners(20);
discovery.removeAllListeners('topology-change');

app.use(bodyParser.json());
app.use('/', sonosRoutes(discovery));

const savehistoricalDevices = (historicalDevices) => {
  if (Object.keys(historicalDevices).length === 0) {
    // console.log('No data to save. Skipping file update.');
    return;
  }
  fs.writeFileSync(historicalDevicesPath, JSON.stringify(historicalDevices, null, 2));
  //console.log('Default devices data updated and saved.');
};

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
//TODO: check better way when there is not data, or part of it, to prevent errors
function getFilteredData(dataToSend) {
  const resultFiltereData = dataToSend.zones.map((zone) => ({
    uuid: zone.uuid,
    coordinator: {
      roomName: zone?.coordinator?.roomName ?? zone.name,
      uuid: zone?.coordinator?.uuid ?? zone.uuid,
      state: {
        playbackState: zone?.coordinator?.state?.playbackState,
        volume: zone?.coordinator?.state?.volume,
        mute: zone?.coordinator?.state?.mute,
      },
    },
    members:
      zone.members?.length > 0
        ? zone.members.map((member) => ({
            roomName: member.roomName,
            state: {
              playbackState: member?.state?.playbackState,
              volume: member?.state?.volume,
              mute: member?.state?.mute,
            },
          }))
        : [
            {
              roomName: zone?.coordinator?.roomName ?? zone.name,
              state: {
                playbackState: zone?.coordinator?.state?.playbackState,
                volume: zone?.coordinator?.state?.volume,
                mute: zone?.coordinator?.state?.mute,
              },
            },
          ],
    connectionStatus: dataToSend.offLineData ? 'offline' : zone.connectionStatus ?? 'offline',
    hasTimePlay: zone.hasTimePlay ?? true,
    timeStart: zone.timeStart ?? defaultStartTime,
    timeStop: zone.timeStop ?? defaultStopTime,
    keepPlaying: zone.keepPlaying ?? false,
    isInTimeFrameToPlay: zone.isInTimeFrameToPlay ?? false,
  }));
  return resultFiltereData;
}

function updateDeviceState() {
  discovery.zones.forEach((zone) => {
    const { coordinator, members } = zone;
    const uuid = coordinator.uuid;

    historicalDevices[uuid] = {
      ...historicalDevices[uuid],
      connectionStatus: 'online',
      name: coordinator.roomName,
      uuid,
      playbackState: coordinator.state?.playbackState ?? 'STOPPED',
      volume: coordinator.state?.volume,
      mute: coordinator.state?.mute ?? false,
      triggerEventTime: historicalDevices[uuid]?.triggerEventTime,
      hasTimePlay: historicalDevices[uuid]?.hasTimePlay ?? true,
      timeStart: historicalDevices[uuid]?.timeStart ?? defaultStartTime,
      timeStop: historicalDevices[uuid]?.timeStop ?? defaultStopTime,
      keepPlaying: historicalDevices[uuid]?.keepPlaying ?? false,
      isInTimeFrameToPlay: historicalDevices[uuid]?.isInTimeFrameToPlay ?? false,
      members: members.map((member) => ({
        roomName: member.roomName,
        state: {
          playbackState: member?.state?.playbackState || 'undefined',
          volume: member?.state?.volume,
          mute: member?.state?.mute,
        },
      })),
    };
    //console.log(`Device updated/added: ${coordinator.roomName} (UUID: ${uuid})`);
  });

  Object.keys(historicalDevices).forEach((uuid) => {
    if (!discovery.zones.some((zone) => zone.coordinator.uuid === uuid)) {
      historicalDevices[uuid].connectionStatus = 'offline';
      //console.log(`Device marked as offline: ${historicalDevices[uuid].name} (UUID: ${uuid})`);
    }
  });
  savehistoricalDevices(historicalDevices);
}

async function changeStatusDevice(device, action) {
  const { name, uuid } = device;
  //console.log(`changeStatusDevice: ${name} (${uuid}) - Sending command: ${action}`);

  try {
    3;
    await changeGroupPlaybackStatus(device, action);
    console.log(`changeStatusDevice: ${name} - Playback ${action} changed successfully`);
  } catch (err) {
    console.error(`changeStatusDevice: Failed to change ${name} to ${action}:`, err.message);
  }
}

// Listen for topology changes to keep historicalDevices updated
// ------------------------ DISCOVERY ON ------------------------
discovery.on('transport-state', (device) => {
  console.log('Player State Updated:');
  const { uuid } = device;
  if (historicalDevices[uuid]) {
    updateDeviceState();
    broadcastUpdate();
  }
});

discovery.on('device-state-change', (device) => {
  console.log('Device state changed:', device);
  const { uuid } = device;
  if (historicalDevices[uuid]) {
    updateDeviceState();
    broadcastUpdate();
  }
});

discovery.on('topology-change', () => {
  //console.log('Topology change detected');
  updateDeviceState();
  broadcastUpdate();
});
// ------------------------ DISCOVERY ON ------------------------

// setInterval(() => {
//   console.log('Currently discovered zones:');
//   discovery.zones.forEach((zone) => {
//     console.log(`Room Name: ${zone.coordinator.roomName}, Volume: ${zone.coordinator.state.volume}`);
//   });
//   updateDeviceState();
//   broadcastUpdate();
// }, 10000);

// -------------------- SET INTERVAL LOGIC --------------------
setInterval(async () => {
  for (const deviceKey of Object.keys(historicalDevices)) {
    const device = historicalDevices[deviceKey];
    const { uuid, name, playbackState, keepPlaying, hasTimePlay } = device;
    const triggerEventTime = device?.triggerEventTime ?? false;
    historicalDevices[deviceKey].triggerEventTime = triggerEventTime;
    const isInTimeRangeToPlay = getInTimeFrameToPlay(device);
    device.isInTimeFrameToPlay = isInTimeRangeToPlay;
    if (String(device.connectionStatus).toLowerCase() === 'offline') {
      continue;
    }
    // Skip if recently triggered
    if (triggerEventTime) {
      const secondsSinceLastTrigger = (Date.now() - new Date(triggerEventTime)) / 4000;
      if (secondsSinceLastTrigger <= 10) {
        continue;
      }
    }

    const shouldPlay = keepPlaying || (playbackState !== 'PLAYING' && isInTimeRangeToPlay && hasTimePlay);
    const shouldPause = !keepPlaying && hasTimePlay && !isInTimeRangeToPlay && playbackState === 'PLAYING';

    if (shouldPlay) {
      await changeStatusDevice(device, 'play');
    } else if (shouldPause) {
      await changeStatusDevice(device, 'pause');
    } else {
      console.log(`No action for ${name}`);
    }
  }

  console.log('--- Interval Check Complete ---');
}, 30000);

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  const { query } = url.parse(req.url, true);
  const clientType = query.client || 'unknown';

  ws.id = Date.now();
  ws.clientType = clientType;

  //console.log(`Client connected with ID: ${ws.id}, Type: ${clientType}`);
  broadcastUpdate();

  ws.on('message', (message) => {
    //console.log(`Received message from client (ID: ${ws.id}):`);
    try {
      const parsedMessage = JSON.parse(message);
      const { type, uuid, hasTimePlay, timeStart, timeStop, isKeepPlaying } = parsedMessage;

      if (!type) {
        console.error('Message type is missing.');
        return;
      }

      if (!uuid || !historicalDevices[uuid]) {
        console.error(`Device with UUID ${uuid} not found in historicalDevices.`);
        return;
      }

      switch (type) {
        case 'timeFrameUpdate':
          if (hasTimePlay !== undefined) historicalDevices[uuid].hasTimePlay = hasTimePlay;
          if (timeStart) historicalDevices[uuid].timeStart = timeStart;
          if (timeStop) historicalDevices[uuid].timeStop = timeStop;
          //console.log(`Updated time frame settings for ${historicalDevices[uuid].name}: hasTimePlay=${historicalDevices[uuid].hasTimePlay}, timeStart=${historicalDevices[uuid].timeStart}, timeStop=${historicalDevices[uuid].timeStop}`);
          break;

        case 'keepPlayerUpdate':
          if (isKeepPlaying !== undefined) {
            historicalDevices[uuid].keepPlaying = isKeepPlaying;
            //console.log(`Updated keepPlaying setting for ${historicalDevices[uuid].name}: keepPlaying=${historicalDevices[uuid].keepPlaying}`);
          }
          break;

        default:
          console.error(`Unknown message type: ${type}`);
          return;
      }

      savehistoricalDevices(historicalDevices);
      broadcastUpdate();
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error (ID: ${ws.id}):`, error);
  });

  ws.on('close', () => {
    savehistoricalDevices(historicalDevices);
    console.log(`WebSocket client disconnected (ID: ${ws.id})`);
  });
});

function broadcastUpdate() {
  payload.data = getFilteredData({
    zones: Object.values(historicalDevices),
    offLineData: discovery.zones.length === 0,
  });
  payload.type = 'update';
  payload.devices = Object.values(historicalDevices).map((zone) => ({
    uuid: zone.uuid,
    roomName: zone.name,
  }));

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.clientType === 'sonosWhachdog') {
      //console.log(`Sending update to React client (ID: ${client.id}) Type: ${client.clientType}`);
      client.send(JSON.stringify(payload));
    } else if (client.readyState !== WebSocket.OPEN) {
      console.log(`Client (ID: ${client.id}) is not open. Skipping.`);
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
