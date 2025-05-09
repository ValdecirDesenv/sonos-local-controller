import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebSocketContextProps {
  messages: any[];
  sendMessage: (msg: any) => void;
  toggleStates: { [key: string]: boolean };
  setToggleState: (groupId: string, state: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [toggleStates, setToggleStates] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    let ws: WebSocket;
    let retryTimeout: NodeJS.Timeout;
    let fetchInterval: NodeJS.Timeout;

    const connectWebSocket = () => {
      ws = new WebSocket('ws://localhost:3000?client=sonosWhachdog');

      ws.onopen = () => {
        console.log('WebSocket connection established.');
        setSocket(ws);

        // Fetch initial toggle states from the front-end server
        fetch('/api/toggle-states')
          .then((res) => res.json())
          .then((data) => setToggleStates(data))
          .catch((err) => console.error('Error fetching toggle states:', err));

        // Start periodic fetching of toggle states every 10 seconds
        fetchInterval = setInterval(() => {
          fetch('/api/toggle-states')
            .then((res) => res.json())
            .then((data) => setToggleStates(data))
            .catch((err) => console.error('Error fetching toggle states:', err));
        }, 10000);
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        setMessages((prev) => [JSON.parse(event.data)]);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        console.warn('WebSocket connection closed. Retrying...');
        clearTimeout(fetchInterval);
        retryTimeout = setTimeout(connectWebSocket, 3000); // Retry in 3 seconds
      };
    };

    connectWebSocket();

    return () => {
      ws?.close();
      clearTimeout(retryTimeout);
      clearInterval(fetchInterval); // Clear the interval on cleanup
    };
  }, []);

  const sendMessage = (msg: any) => {
    if (socket) {
      socket.send(JSON.stringify(msg));
    }
  };

  const setToggleState = (groupId: string, state: boolean) => {
    setToggleStates((prev) => ({ ...prev, [groupId]: state }));

    fetch('/api/toggle-states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, state }),
    }).catch((err) => console.error('Error updating toggle state:', err));
  };

  return <WebSocketContext.Provider value={{ messages, sendMessage, toggleStates, setToggleState }}>{children}</WebSocketContext.Provider>;
};

const useWebSocketContext = (): WebSocketContextProps => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export { WebSocketProvider, useWebSocketContext };
