const EventEmitter = require('events');
const setupWebSocket = require('./websocketHandler');

function makeFakeWss() {
  const wss = new EventEmitter();
  wss.clients = new Set();
  return wss;
}

function makeFakeWs() {
  const ws = new EventEmitter();
  ws.readyState = 1;
  ws.OPEN = 1;
  ws.send = jest.fn();
  return ws;
}

describe('websocket connection handler', () => {
  const discovery = { zones: [] };

  it('reads clientType from the connection URL query string', () => {
    const wss = makeFakeWss();
    setupWebSocket(wss, discovery);

    const ws = makeFakeWs();
    const req = { url: '/?client=sonosWhachdog', headers: { host: '127.0.0.1:3000' } };

    wss.emit('connection', ws, req);

    expect(ws.clientType).toBe('sonosWhachdog');
  });

  it('falls back to "unknown" when no client query param is present', () => {
    const wss = makeFakeWss();
    setupWebSocket(wss, discovery);

    const ws = makeFakeWs();
    const req = { url: '/', headers: { host: '127.0.0.1:3000' } };

    wss.emit('connection', ws, req);

    expect(ws.clientType).toBe('unknown');
  });
});
