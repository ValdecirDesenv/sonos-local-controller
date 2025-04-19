// websocket/websocketHandler.js
const url = require('url');
const { getFilteredData, getDevices, saveHistoricalDevices, setDevice } = require('../services/deviceService');

function setupWebSocket(wss, discovery) {
  wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    ws.id = Date.now();
    ws.clientType = query.client || 'unknown';
    broadcastUpdate(wss, discovery);

    ws.on('message', (message) => {
      try {
        const { type, uuid, hasTimePlay, timeStart, timeStop, isKeepPlaying } = JSON.parse(message);
        if (!uuid) return;

        const device = getDevices()[uuid];
        if (!device) return;

        if (type === 'timeFrameUpdate') {
          setDevice(uuid, { hasTimePlay, timeStart, timeStop });
        } else if (type === 'keepPlayerUpdate') {
          setDevice(uuid, { isKeepPlaying });
        }

        saveHistoricalDevices();
        broadcastUpdate(wss, discovery);
      } catch (err) {
        console.error('Error parsing WS message:', err.message);
      }
    });

    ws.on('close', () => {
      saveHistoricalDevices();
      console.log(`Client disconnected: ${ws.id}`);
    });
  });
}

function broadcastUpdate(wss, discovery) {
  const payload = {
    type: 'update',
    offLineData: !Array.isArray(discovery.zones) || discovery.zones.length === 0,
    data: getFilteredData({
      zones: Object.values(getDevices()),
      offLineData: !Array.isArray(discovery.zones) || discovery.zones.length === 0,
    }),
    devices: Object.values(getDevices()).map(({ uuid, name }) => ({ uuid, roomName: name })),
  };

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN && client.clientType === 'sonosWhachdog') {
      client.send(JSON.stringify(payload));
    }
  });
}

module.exports = setupWebSocket;
