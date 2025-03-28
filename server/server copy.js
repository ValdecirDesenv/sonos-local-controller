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

  // setInterval(() => {
  //   Object.keys(historicalDevices).forEach((uuid) => {
  //     const device = defaultDevicesData[uuid];
  //     const currentTime = new Date();
  //     const [startHour, startMinute] = device.timeStart.split(':').map(Number);
  //     const [stopHour, stopMinute] = device.timeStop.split(':').map(Number);
  //     const startTime = new Date();
  //     startTime.setHours(startHour, startMinute, 0, 0);
  //     const stopTime = new Date();
  //     stopTime.setHours(stopHour, stopMinute, 0, 0);
  //     const isInTimeRangeToPlay = currentTime >= startTime && currentTime <= stopTime;
  //     //---------// Parse time ranges      
  //     historicalDevices[device.uuid].isInTimeFrameToPlay = isInTimeRangeToPlay;
  //     //---------
  //     if (!device.hasOwnProperty('hasTimePlay')) {
  //       defaultDevicesData[uuid].hasTimePlay = false;
  //       return;
  //     }
      
  //     if (device.hasTimePlay) {
  //       console.log(`Zone ${device.name} has time playing enabled.`);
  //       console.log(`Playback state: ${device.coordinator.roomName} is currently ${device.playbackState}`);

  //       // If within time range, ensure playback is ON
  //       if (device.playbackState !== 'PLAYING' && isInTimeRangeToPlay && !device.flagResp) {
  //         // if (device.triggerStartStop < 2) {
  //           // if (device.coordinator.roomName == "0A-Washrooms"){
  //           //   console.log(`Device ${device.name} should keep playing.`);
  //           //   changeGroupPlaybackStatus(device, 'play')
  //           //     .then(() => console.log('Playback started successfully'))
  //           //     .catch((err) => console.error('Failed to start playback:', err.message));
  //           //   const dois = 2;
  //           // }
  //           console.log(`Sending command: Start playing ${device.coordinator.roomName}`);
  //           device.triggerStartStop++;
  //           changeGroupPlaybackStatus(device, 'play')
  //             .then(() => {console.log('Playback started successfully');
  //               historicalDevices[device.uuid].flagResp = false;
  //             })
  //             .catch((err) => {console.error('Failed to start playback:', err.message);
  //               historicalDevices[device.uuid].flagResp = false;
  //             });

  //         // }
  //       }
  //       // If outside time range, ensure playback is OFF
  //       else if (!isInTimeRangeToPlay && !device.flagResp && device.playbackState == 'PLAYING') {
  //         historicalDevices[device.uuid].flagResp = true;
  //         console.log(`Sending command: Stop playing ${device.name}`);
  //         device.triggerStartStop--;
  //         changeGroupPlaybackStatus(device, 'pause') // "pause" should be lowercase
  //           .then(() => { console.log(`${device.name} Playback stopped successfully`);
  //             historicalDevices[device.uuid].flagResp = false;
  //           }) 
  //           .catch((err) => {console.error('Failed to stop playback:', err.message);
  //             historicalDevices[device.uuid].flagResp = false;
  //           });
  //       } else {
  //         console.log('TIME MANAGEMENT: No action required.');
  //       }
  //       const check = 0;
  //     }

  //     // If no hasTimePlay but keepPlaying is true, force playback
  //     else if (!device.hasTimePlay && device.keepPlaying && device.playbackState !== 'PLAYING') {
        
  //       console.log(`Device ${device.name} should keep playing.`);
  //       changeGroupPlaybackStatus(device, 'play')
  //         .then(() => console.log('Playback started successfully'))
  //         .catch((err) => console.error('Failed to start playback:', err.message));
  //     }
  //   });
  // }, 30000);

    setInterval(() => {
      Object.keys(historicalDevices).forEach(async (uuid) => {
          const device = defaultDevicesData[uuid];
          const currentTime = new Date();
          const [startHour, startMinute] = device.timeStart.split(':').map(Number);
          const [stopHour, stopMinute] = device.timeStop.split(':').map(Number);

          const startTime = new Date();
          startTime.setHours(startHour, startMinute, 0, 0);
          const stopTime = new Date();
          stopTime.setHours(stopHour, stopMinute, 0, 0);

          const isInTimeRangeToPlay = currentTime >= startTime && currentTime <= stopTime;
          historicalDevices[device.uuid].isInTimeFrameToPlay = isInTimeRangeToPlay;

          if (!device.hasOwnProperty('hasTimePlay')) {
              defaultDevicesData[uuid].hasTimePlay = false;
              return;
          }

          const shouldPlay = isInTimeRangeToPlay || device.keepPlaying;
          const currentPlaybackState = device.playbackState === 'PLAYING';

          if (shouldPlay && !currentPlaybackState && !device.flagResp) {
              console.log(`Starting playback: ${device.coordinator.roomName}`);
              device.flagResp = true;
              try {
                  await retryChangeGroupPlaybackStatus(device, 'play');
                  historicalDevices[device.uuid].flagResp = false;
              } catch (err) {
                  historicalDevices[device.uuid].flagResp = false;
              }
          } 
          else if (!shouldPlay && currentPlaybackState && !device.flagResp) {
              console.log(`Pausing playback: ${device.name}`);
              device.flagResp = true;
              try {
                  await retryChangeGroupPlaybackStatus(device, 'pause');
                  historicalDevices[device.uuid].flagResp = false;
              } catch (err) {
                  historicalDevices[device.uuid].flagResp = false;
              }
          } 
          else {
              console.log('TIME MANAGEMENT: No action required.');
          }
      });
  }, 30000);



  async function retryChangeGroupPlaybackStatus(player, status, maxRetries = 3, delay = 2000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
              await changeGroupPlaybackStatus(player, status);
              return; // Exit if successful
          } catch (error) {
              console.error(`Attempt ${attempt} - Failed to change playback status:`, error.message);
              if (attempt < maxRetries) {
                  console.log(`Retrying in ${delay}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  delay *= 2; // Exponential backoff
              } else {
                  console.error(`Failed after ${maxRetries} attempts.`);
              }
          }
      }
  }

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

        console.log(`Device: ${historicalDevices[uuid].coordinator.roomName}, keepPlaying: ${defaultDevicesData[uuid].keepPlaying}`);
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

  discovery.on('transport-state', (player) => {
    if (!player || !player.uuid) {
      console.error("transport-state event received an invalid player:", player);
      return;
    }
  
    if (!historicalDevices[player.uuid]) {
      console.warn(`Player with UUID ${player.uuid} not found in historicalDevices.`);
      return;
    }
  
    if (!player.state || !player.state.playbackState) {
      console.warn(`Missing playbackState for player ${player.roomName} (${player.uuid}).`);
      return;
    }
  
    console.log(`Playback state changed: ${player.roomName} is now ${player.state.playbackState}`);
  




    
    if (historicalDevices[player.uuid].keepPlaying && player.state.playbackState !== 'PLAYING' && player.state.isInTimeFrameToPlay) {
      console.log(`Sending command: Start playing ${player.roomName}`);
      changeGroupPlaybackStatus(player, 'play')
        .then(() => console.log('Playback changed successfully'))
        .catch((err) => console.error('Failed to change playback:', err.message));
    } else {
      console.log('No action required to change playback state.');
    }
  
    historicalDevices[player.uuid].playbackState = player.state.playbackState;
  });
  
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
