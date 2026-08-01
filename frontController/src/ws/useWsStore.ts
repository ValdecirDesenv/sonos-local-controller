import { useSyncExternalStore } from 'react';
import { clearToast, getState, sendMessage, subscribe } from './store.js';
import type { WsState } from './store.js';

function useWsSelector<T>(selector: (state: WsState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}

export const useGroups = () => useWsSelector((s) => s.groups);
export const useDevices = () => useWsSelector((s) => s.devices);
export const usePlaylists = () => useWsSelector((s) => s.playlists);
export const useConnectionStatus = () => useWsSelector((s) => s.status);
export const useHasReceivedInitialUpdate = () => useWsSelector((s) => s.hasReceivedInitialUpdate);
export const useToast = () => useWsSelector((s) => s.toast);
export const useSendMessage = () => sendMessage;
export const useClearToast = () => clearToast;
