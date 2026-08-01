import { useEffect, type ReactNode } from 'react';
import { ensureConnected } from './store.js';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  useEffect(() => ensureConnected(), []);
  return <>{children}</>;
}
