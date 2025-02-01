'use strict';

require('events').EventEmitter.defaultMaxListeners = 10;
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

  const historical = discovery.zones.filter((zone) => !defaultDevicesData[zone.uuid]);
  if (historical.length > 0) {
    historical.forEach((zone) => {
      defaultDevicesData[zone.uuid] = { ...zone, keepPlaying: false };
    });
    console.log(
      'New zones added to default devices:',
      historical.map((zone) => zone.uuid)
    );
    saveDefaultDevicesData();
  }

  if (historical.length > 0) {
    console.log('Default devices have more zones than discovery zones. historical zones:', historical);
  }

  // Determine the data to send based on whether discovery zones are available
  const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offLineData: false } : { zones: Object.values(defaultDevicesData), offLineData: true };

  const historicalDevices = dataToSend.zones.map((zone) => ({
    keepPlaying: zone.keepPlaying || false,
    name: zone.coordinator.roomName,
    uuid: zone.uuid,
    state: zone.coordinator.state.playbackState,
    coordinator: zone.coordinator,
    members: zone.members.map((member) => ({
      roomName: member.roomName,
      state: member.state,
    })),
  }));

  // Add extra zones to the response data with an offline flag
  let zonesOff = [];
  historical.forEach((device) => {
    const extraZone = defaultDevicesData[device.uuid];
    if (extraZone) {
      zonesOff.push({
        keepPlaying: extraZone.keepPlaying || false,
        uuid: extraZone.uuid,
        name: extraZone.coordinator.name,
        coordinator: extraZone.coordinator,
        members: extraZone.members.map((member) => ({
          roomName: member.roomName,
          state: member.state,
        })),
        offLineZone: true,
      });
    } else {
      console.warn(`Extra zone with ID ${device.id} not found in default devices.`);
    }
  });

  // TODO: Remove the commented code below
  // if (!dataToSend.offLineData) {
  historicalDevices.forEach((device) => {
    if (defaultDevicesData[device.uuid]) {
      const test = defaultDevicesData[device.uuid].keepPlaying;
      device.keepPlaying = defaultDevicesData[device.uuid].keepPlaying;
    }
  });
  // }

  // Include a flag if extra zones exist
  const initialData = {
    offLineData: dataToSend.offLineData,
    type: 'initial',
    data: historicalDevices,
  };

  // Send the initial data to the client
  ws.send(JSON.stringify(initialData));

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'toggle-update') {
        const { groupId, state } = parsedMessage;
        if (defaultDevicesData[groupId]) {
          console.log(`Toggle state updated: Group ID = ${groupId}, State = ${state}`);

          defaultDevicesData[groupId].keepPlaying = state;
          saveDefaultDevicesData();
        } else {
          console.warn(`Group ID ${groupId} not found in default devices.`);
        }
        console.log(`${defaultDevicesData[groupId].coordinator.roomName}, Device ID: ${defaultDevicesData[groupId].id}, keepPlaying: ${defaultDevicesData[groupId].keepPlaying}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    saveDefaultDevicesData();
    console.log('WebSocket client disconnected');
  });

  discovery.on('topology-change', (zones) => {
    console.log('Topology change detected. Sending updated zones.');
    ws.send(JSON.stringify({ type: 'topology-change', data: zones }));
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
