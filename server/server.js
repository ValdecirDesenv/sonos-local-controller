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
const defaultDevicesPath = path.join(__dirname, 'default.json');
const historicalDevices = {};
let filteredData = {};

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

// Listen for topology changes to keep historicalDevices updated
discovery.on('topology-change', () => {
  console.log('Topology change detected. Updating historical devices.');

  // Update historicalDevices with the latest Sonos devices
  discovery.zones.forEach((zone) => {
    const coordinator = zone.coordinator;
    const uuid = coordinator.uuid;

    if (!historicalDevices[uuid]) {
      // Add new device to historicalDevices
      historicalDevices[uuid] = {
        name: coordinator.roomName,
        playbackState: coordinator.state?.playbackState || 'STOPPED',
        volume: coordinator.state?.volume ?? null,
        mute: coordinator.state?.mute ?? false,
        triggerEventTime: null,
        isInTimeFrameToPlay: false,
        hasTimePlay: defaultDevicesData[zone.uuid]?.hasTimePlay || true,
        timeStart: defaultDevicesData[zone.uuid]?.timeStart || defaultStartTime,
        timeStop: defaultDevicesData[zone.uuid]?.timeStop || defaultStopTime,
        keepPlaying: defaultDevicesData[zone.uuid]?.keepPlaying || false,
      };
      console.log(`Added new device: ${coordinator.roomName} (UUID: ${uuid})`);
    } else {
      // Update existing device information
      historicalDevices[uuid].playbackState = coordinator.state?.playbackState || 'STOPPED';
      historicalDevices[uuid].volume = coordinator.state?.volume ?? null;
      historicalDevices[uuid].mute = coordinator.state?.mute ?? false;
      console.log(`Updated device: ${coordinator.roomName} (UUID: ${uuid})`);
    }
  });

  // Remove devices that are no longer in the topology
  Object.keys(historicalDevices).forEach((uuid) => {
    const deviceExists = discovery.zones.some((zone) => zone.coordinator.uuid === uuid);
    if (!deviceExists) {
      console.log(`Removing device: ${historicalDevices[uuid].name} (UUID: ${uuid})`);
      delete historicalDevices[uuid];
    }
  });
  saveDefaultDevicesData(historicalDevices);
  console.log('Historical devices updated:', historicalDevices);
});

const saveDefaultDevicesData = (historicalDevices) => {
  if (Object.keys(historicalDevices).length === 0) {
    console.log('No data to save. Skipping file update.');
    return;
  }
  fs.writeFileSync(defaultDevicesPath, JSON.stringify(historicalDevices, null, 2));
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

const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offLineData: false } : { zones: Object.values(defaultDevicesData), offLineData: true };

let payload = {
  offLineData: true,
  type: 'initial',
  data: {},
  devices: {},
};

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

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Fetch connected Sonos devices when a new client connects
  const fetchSonosDevices = () => {
    const sonosDevices = discovery.zones.map((zone) => ({
      uuid: zone.uuid,
      roomName: zone.coordinator.roomName,
      state: zone.coordinator.state?.playbackState || 'STOPPED',
      volume: zone.coordinator.state?.volume ?? null,
      mute: zone.coordinator.state?.mute ?? false,
      hasTimePlay: defaultDevicesData[zone.uuid]?.hasTimePlay || true,
      timeStart: defaultDevicesData[zone.uuid]?.timeStart || defaultStartTime,
      timeStop: defaultDevicesData[zone.uuid]?.timeStop || defaultStopTime,
      keepPlaying: defaultDevicesData[zone.uuid]?.keepPlaying || false,
    }));

    return sonosDevices;
  };

  // Prepare the initial payload
  const dataToSend = {
    zones: discovery.zones.length > 0 ? discovery.zones : Object.values(defaultDevicesData),
    offLineData: discovery.zones.length === 0, // Set true if no devices are found
  };

  // Filter the necessary data
  const filteredData = dataToSend.zones.map((zone) => ({
    uuid: zone.uuid,
    coordinator: {
      roomName: zone.coordinator.roomName,
      uuid: zone.coordinator.uuid,
      state: {
        playbackState: zone.coordinator.state?.playbackState || 'STOPPED',
        volume: zone.coordinator.state?.volume ?? null,
        mute: zone.coordinator.state?.mute ?? false,
      },
    },
    members: zone.members.map((member) => ({
      roomName: member.roomName,
      state: member.state,
    })),
    hasTimePlay: defaultDevicesData[zone.uuid]?.hasTimePlay || true,
    timeStart: defaultDevicesData[zone.uuid]?.timeStart || defaultStartTime,
    timeStop: defaultDevicesData[zone.uuid]?.timeStop || defaultStopTime,
    keepPlaying: defaultDevicesData[zone.uuid]?.keepPlaying || false,
  }));

  // Update the payload with the latest device list
  const payload = {
    offLineData: dataToSend.offLineData,
    type: 'initial',
    data: filteredData,
    devices: fetchSonosDevices(), // Get the current list of devices
  };

  // Send the payload to the connected client
  ws.send(JSON.stringify(payload));

  // Listen for client disconnection
  ws.on('close', () => {
    saveDefaultDevicesData(historicalDevices);
    console.log('WebSocket client disconnected');
  });
});

// -------------------- SET INTERVAL LOGIC --------------------
setInterval(async () => {
  for (const uuid of Object.keys(historicalDevices)) {
    const device = defaultDevicesData[uuid];

    if (!device.hasOwnProperty('hasTimePlay')) {
      defaultDevicesData[uuid].hasTimePlay = false;
      continue;
    }

    const isInTimeRangeToPlay = getInTimeFrameToPlay(device);
    historicalDevices[device.uuid].isInTimeFrameToPlay = isInTimeRangeToPlay;

    const { keepPlaying, hasTimePlay } = device;
    const playbackState = historicalDevices[device.uuid]?.playbackState;

    const logAndChangePlayback = async (action) => {
      await logAndChangePlaybackGeneric(
        'setInterval',
        action,
        () => device.name,
        () => device.coordinator,
        () => device.uuid,
        () => device.playbackState
      );
    };

    if (historicalDevices[device.uuid].triggerEventTime) {
      const currentTime = new Date();
      const timeDifference = (currentTime - new Date(historicalDevices[device.uuid].triggerEventTime)) / 1000; // in seconds
      if (timeDifference <= 10) {
        console.log(`setInterval: Skipping action for ${device.name} as the last trigger was within 10 seconds.`);
        return;
      }
    }

    if (keepPlaying || (playbackState !== 'PLAYING' && isInTimeRangeToPlay && hasTimePlay)) {
      await logAndChangePlayback('play');
    } else if (!keepPlaying && hasTimePlay) {
      if (isInTimeRangeToPlay) {
        await logAndChangePlayback('play');
      } else if (playbackState === 'PLAYING') {
        await logAndChangePlayback('pause');
      }
    } else {
      console.log(`setInterval: No action required to change playback state. DEVICE: ${device.name}`);
    }
  }
  console.log('------------------------------------');
}, 30000);

// Function to broadcast updates to all connected clients
function broadcastUpdate(payload) {
  console.log('Broadcasting update to clients:', payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}
// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
