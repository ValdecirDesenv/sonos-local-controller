const fs = require('fs');
const path = require('path');
const { defaultStartTime, defaultStopTime } = require('../utils/timeUtils');
const historicalDevicesPath = path.join(__dirname, '../data/default.json');

let historicalDevices = {};

if (fs.existsSync(historicalDevicesPath)) {
  try {
    historicalDevices = JSON.parse(fs.readFileSync(historicalDevicesPath, 'utf8'));
    console.log('Loaded historical devices.');
  } catch (e) {
    console.error('Error loading historical devices:', e);
  }
}

const saveHistoricalDevices = () => {
  fs.writeFileSync(historicalDevicesPath, JSON.stringify(historicalDevices, null, 2));
};

const getFilteredData = (dataToSend) => {
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
    isKeepPlaying: zone.isKeepPlaying ?? false,
    isInTimeFrameToPlay: zone.isInTimeFrameToPlay ?? false,
  }));
  return resultFiltereData;
};

const updateDeviceState = (discovery) => {
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
      isKeepPlaying: historicalDevices[uuid]?.isKeepPlaying ?? false,
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
  saveHistoricalDevices();
};

const getDevices = () => historicalDevices;
const setDevice = (uuid, data) => {
  historicalDevices[uuid] = { ...historicalDevices[uuid], ...data };
};

module.exports = {
  getFilteredData,
  updateDeviceState,
  getDevices,
  setDevice,
  saveHistoricalDevices,
};
