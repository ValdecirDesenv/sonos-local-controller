'use strict';

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
const defaultDevicesData = JSON.parse(fs.readFileSync(defaultDevicesPath, 'utf8'));

app.use(bodyParser.json());

const discovery = new SonosSystem({});

app.use('/', sonosRoutes(discovery));

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  const saveDefaultDevicesData = () => {
    fs.writeFileSync(defaultDevicesPath, JSON.stringify(defaultDevicesData, null, 2));
    console.log('Default devices data updated and saved.');
  };

  const newZones = discovery.zones.filter((zone) => !defaultDevicesData[zone.uuid]);
  if (newZones.length > 0) {
    newZones.forEach((zone) => {
      defaultDevicesData[zone.uuid] = { ...zone, keepPlaying: false };
    });
    console.log(
      'New zones added to default devices:',
      newZones.map((zone) => zone.uuid)
    );
    saveDefaultDevicesData();
  }

  // Identify extra zones that are in defaultDevicesData but not in discovery.zones
  const extraZones = Object.keys(defaultDevicesData).filter((uuid) => !discovery.zones.some((zone) => zone.uuid === uuid));

  if (extraZones.length > 0) {
    console.log('Default devices have more zones than discovery zones. Extra zones:', extraZones);
  }

  // Determine the data to send based on whether discovery zones are available
  const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offlineData: false } : { zones: Object.values(defaultDevicesData), offlineData: true };

  // Map the zones to the response format
  const responseData = dataToSend.zones.map((zone) => ({
    keepPlaying: zone.keepPlaying,
    uuid: zone.uuid,
    name: zone.name,
    id: zone.id,
    coordinator: zone.coordinator,
    offLineZone: false,
    members: zone.members.map((member) => ({
      uuid: member.uuid,
      name: member.name,
      roomName: member.roomName,
      state: member.state,
    })),
  }));

  // Add extra zones to the response data with an offline flag
  extraZones.forEach((uuid) => {
    const extraZone = defaultDevicesData[uuid];
    responseData.push({
      keepPlaying: extraZone.keepPlaying,
      uuid: extraZone.uuid,
      name: extraZone.name,
      id: extraZone.id,
      coordinator: extraZone.coordinator,
      members: extraZone.members.map((member) => ({
        uuid: member.uuid,
        name: member.name,
        roomName: member.roomName,
        state: member.state,
      })),
      offLineZone: true,
    });
  });

  // Include a flag if extra zones exist
  const initialData = {
    offlineData: dataToSend.offlineData,
    type: 'initial',
    data: responseData,
    extraZones: extraZones.length > 0 ? extraZones : null, // Include extra zones if any
  };

  // Send the initial data to the client
  ws.send(JSON.stringify(initialData));

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'toggle-update') {
        const { groupId, state } = parsedMessage;
        console.log(`Toggle state updated: Group ID = ${groupId}, State = ${state}`);

        // Find the entry in defaultDevicesData where id matches groupId
        const deviceKey = Object.keys(defaultDevicesData).find((key) => defaultDevicesData[key].id === groupId);

        if (deviceKey) {
          defaultDevicesData[deviceKey].keepPlaying = state;
          console.log(`Updated keepPlaying for device: ${deviceKey} (ID: ${groupId})`);
          saveDefaultDevicesData();
        } else {
          console.warn(`Group ID ${groupId} not found in default devices.`);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  // Handle topology changes and send updates to the client
  discovery.on('topology-change', (zones) => {
    console.log('Topology change detected. Sending updated zones.');
    ws.send(JSON.stringify({ type: 'topology-change', data: zones }));
  });

  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
