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

  const dataToSend = discovery.zones.length > 0 ? { zones: discovery.zones, offLineData: false } : { zones: Object.values(defaultDevicesData), offLineData: true };

  const historicalDevices = dataToSend.zones.map((zone) => ({
    keepPlaying: zone.keepPlaying || false,
    hasTimePlay: zone.hasTimePlay || false,
    timeStart: zone.timeStart || '06:00',
    timeStop: zone.timeStop || '20:00',
    name: zone.coordinator.roomName,
    uuid: zone.uuid,
    state: zone.coordinator.state.playbackState,
    coordinator: zone.coordinator,
    members: zone.members.map((member) => ({
      roomName: member.roomName,
      state: member.state,
    })),
  }));

  let zonesOff = [];
  historical.forEach((device) => {
    const extraZone = defaultDevicesData[device.uuid];
    if (extraZone) {
      zonesOff.push({
        keepPlaying: extraZone.keepPlaying || false,
        hasTimePlay: extraZone.hasTimePlay || false,
        timeStop: extraZone.timeStart || '06:00',
        timeStop: extraZone.timeStop || '21:00',
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

  ws.send(JSON.stringify(initialData));

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      //const { uuid, state } = parsedMessage;
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
        defaultDevicesData[uuid].timeStart = timeStart ? timeStart : defaultDevicesData[uuid].timeStart;
        defaultDevicesData[uuid].timeStop = timeStop ? timeStop : defaultDevicesData[uuid].timeStop;
        defaultDevicesData[uuid].hasTimePlay = hasTimePlay;

        console.log(`${defaultDevicesData[uuid].coordinator.roomName}, Device uuid: ${uuid}, Time Start: ${defaultDevicesData[uuid].timeStart}, Time Stop: ${defaultDevicesData[uuid].timeStop}`);
        saveDefaultDevicesData();
      } else {
        console.warn(`Request Type : ${parsedMessage.type} not found.`);
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
