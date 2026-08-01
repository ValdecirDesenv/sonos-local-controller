import type { ClientMessage, ConnectionStatus, DeviceRef, GroupItem, ServerMessage, SpotifyPlaylistMap } from './types.js';
import { parseServerMessage } from './types.js';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export interface WsState {
  status: ConnectionStatus;
  groups: GroupItem[];
  devices: DeviceRef[];
  hasReceivedInitialUpdate: boolean;
  playlists: SpotifyPlaylistMap;
  toast: Toast | null;
}

const WS_URL = 'ws://localhost:3000/?client=sonosWhachdog';

let state: WsState = {
  status: 'connecting',
  groups: [],
  devices: [],
  hasReceivedInitialUpdate: false,
  playlists: {},
  toast: null,
};

let toastCounter = 0;
const listeners = new Set<() => void>();
let socket: WebSocket | null = null;

function setState(patch: Partial<WsState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function handleServerMessage(message: ServerMessage) {
  switch (message.type) {
    case 'update':
      setState({ groups: message.data, devices: message.devices, hasReceivedInitialUpdate: true });
      return;
    case 'spotifyPlaylists':
      setState({ playlists: message.data });
      return;
    case 'spotifyAuthUrl':
      window.location.href = message.url;
      return;
    case 'success':
    case 'error':
      toastCounter += 1;
      setState({ toast: { id: toastCounter, type: message.type, message: message.message } });
      return;
  }
}

function connect() {
  if (socket) return;
  const ws = new WebSocket(WS_URL);
  socket = ws;
  setState({ status: 'connecting' });

  ws.onopen = () => setState({ status: 'open' });

  ws.onmessage = (event) => {
    const parsed = parseServerMessage(event.data as string);
    if (parsed) handleServerMessage(parsed);
  };

  ws.onerror = () => {
    // onclose always follows; nothing additional to do per-frame.
  };

  ws.onclose = () => {
    socket = null;
    setState({ status: 'closed' });
    window.setTimeout(connect, 3000);
  };
}

let mountCount = 0;

export function ensureConnected(): () => void {
  if (import.meta.env.DEV) {
    mountCount += 1;
    if (mountCount > 1) {
      console.error('[ws] WebSocketProvider mounted more than once — check for a duplicate <WebSocketProvider> in the tree.');
    }
  }
  connect();
  return () => {
    if (import.meta.env.DEV) mountCount -= 1;
  };
}

export function sendMessage(msg: ClientMessage): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    console.error('[ws] socket not open, message dropped:', msg.type);
  }
}

export function clearToast(): void {
  setState({ toast: null });
}

export function getState(): WsState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
