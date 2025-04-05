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

const discovery = new SonosSystem({});
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
  console.log('Default devices data updated and saved.');
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

const logAndChangePlaybackGeneric = async (source, action, getName, getCoordinator, getUUID, getPlaybackState) => {
  console.log(`${source}: Sending command: ${action === 'play' ? 'Start' : 'Stop'} playing ${getName()}`);
  try {
    await changeGroupPlaybackStatus(getCoordinator(), action);
    console.log(`Playback ${action}ed successfully`);
    historicalDevices[getUUID()].playbackState = getPlaybackState(action);
    historicalDevices[getUUID()].triggerEventTime = new Date();
    payload.data = historicalDevices;
    broadcastUpdate(payload);
  } catch (err) {
    console.error(`Failed to change playback:`, err.message);
  }
};

// Listen for topology changes to keep historicalDevices updated
// ------------------------ DISCOVERY ON ------------------------
discovery.on('device-state-change', (device) => {
  const { uuid } = device;
  if (historicalDevices[uuid]) {
    historicalDevices[uuid].playbackState = device.state?.playbackState ?? 'STOPPED';
    historicalDevices[uuid].volume = device.state?.volume;
    historicalDevices[uuid].mute = device.state?.mute ?? false;
    historicalDevices[uuid].triggerEventTime = new Date();
    console.log(`Device state updated: ${device.roomName} (UUID: ${uuid})`);
  }
});

discovery.on('topology-change', () => {
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
    console.log(`Device updated/added: ${coordinator.roomName} (UUID: ${uuid})`);
  });

  Object.keys(historicalDevices).forEach((uuid) => {
    if (!discovery.zones.some((zone) => zone.coordinator.uuid === uuid)) {
      historicalDevices[uuid].connectionStatus = 'offline';
      console.log(`Device marked as offline: ${historicalDevices[uuid].name} (UUID: ${uuid})`);
    }
  });

  savehistoricalDevices(historicalDevices);
  console.log('Historical devices updated:', historicalDevices);
});
// ------------------------ DISCOVERY ON ------------------------

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  let dataToSend = {
    zones: Object.values(historicalDevices),
    offLineData: discovery.zones.length === 0,
  };

  let fetchSonosDevices = () => {
    const sonosDevices = dataToSend.zones.map((zone) => ({
      uuid: zone.uuid,
      roomName: zone?.coordinator?.roomName || zone.name,
    }));
    return sonosDevices;
  };

  let filteredData = getFilteredData(dataToSend);

  let payload = {
    offLineData: dataToSend.offLineData,
    type: 'initial',
    data: filteredData,
    devices: fetchSonosDevices(),
  };

  ws.send(JSON.stringify(payload));

  ws.on('message', (message) => {
    console.log('Received message from client:');
    try {
      const parsedMessage = JSON.parse(message);
      const { type, uuid, hasTimePlay, timeStart, timeStop, keepPlaying } = parsedMessage;

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
          console.log(`Updated time frame settings for ${historicalDevices[uuid].name}: hasTimePlay=${historicalDevices[uuid].hasTimePlay}, timeStart=${historicalDevices[uuid].timeStart}, timeStop=${historicalDevices[uuid].timeStop}`);
          break;

        case 'keepPlayerUpdate':
          if (keepPlaying !== undefined) {
            historicalDevices[uuid].keepPlaying = keepPlaying;
            console.log(`Updated keepPlaying setting for ${historicalDevices[uuid].name}: keepPlaying=${historicalDevices[uuid].keepPlaying}`);
          }
          break;

        default:
          console.error(`Unknown message type: ${type}`);
          return;
      }

      savehistoricalDevices(historicalDevices);
      payload.data = getFilteredData({
        zones: Object.values(historicalDevices),
        offLineData: discovery.zones.length === 0,
      });
      payload.type = 'initial';
      payload.devices = fetchSonosDevices();
      broadcastUpdate(payload);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    savehistoricalDevices(historicalDevices);
    console.log('WebSocket client disconnected');
  });
});

// -------------------- SET INTERVAL LOGIC --------------------
// setInterval(async () => {
//   for (const uuid of Object.keys(historicalDevices)) {
//     const device = historicalDevices[uuid];

//     // Ensure the device exists before proceeding
//     if (!device) {
//       console.log(`Device with UUID ${uuid} not found in historicalDevices. Skipping.`);
//       continue;
//     }

//     if (!device.hasOwnProperty('hasTimePlay')) {
//       historicalDevices[uuid].hasTimePlay = false;
//       continue;
//     }

//     const isInTimeFrameToPlay = getInTimeFrameToPlay(device);
//     historicalDevices[uuid].isInTimeFrameToPlay = isInTimeFrameToPlay;

//     const { keepPlaying, hasTimePlay } = historicalDevices[uuid];
//     const playbackState = historicalDevices[uuid]?.playbackState;

//     const logAndChangePlayback = async (action) => {
//       await logAndChangePlaybackGeneric(
//         'setInterval',
//         action,
//         () => device.name,
//         () => device.coordinator,
//         () => device.uuid,
//         () => device.playbackState
//       );
//     };

//     if (historicalDevices[uuid].triggerEventTime) {
//       const currentTime = new Date();
//       const timeDifference = (currentTime - new Date(historicalDevices[uuid].triggerEventTime)) / 1000;
//       if (timeDifference <= 10) {
//         console.log(`setInterval: Skipping action for ${device.name} as the last trigger was within 10 seconds.`);
//         return;
//       }
//     }

//     if (keepPlaying || (playbackState !== 'PLAYING' && isInTimeFrameToPlay && hasTimePlay)) {
//       await logAndChangePlayback('play');
//     } else if (!keepPlaying && hasTimePlay) {
//       if (isInTimeFrameToPlay) {
//         await logAndChangePlayback('play');
//       } else if (playbackState === 'PLAYING') {
//         await logAndChangePlayback('pause');
//       }
//     } else {
//       console.log(`setInterval: No action required to change playback state. DEVICE: ${device.name}`);
//     }
//   }
//   savehistoricalDevices(historicalDevices);
//   console.log('------------------------------------');
// }, 30000);

// Function to broadcast updates to all connected clients
function broadcastUpdate(payload) {
  console.log('Broadcasting update to clients:', payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
