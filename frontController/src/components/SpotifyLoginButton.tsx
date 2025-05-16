import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '../hooks/WebSocketProvider';

const SpotifyLoginButton: React.FC = () => {
  const { messages, sendMessage } = useWebSocketContext();
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [popupType, setPopupType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    console.log('Popup message state:', popupMessage);
  }, [popupMessage]);

  const handleLogin = () => {
    sendMessage({
      type: 'spotifyLogin',
      data: {},
    });
  };

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const firstMsg = messages[0];
    console.log('Handling first message:', firstMsg);

    if (firstMsg.type === 'success' || firstMsg.type === 'error') {
      setPopupMessage(firstMsg.message || '');
      setPopupType(firstMsg.type);

      // Auto-hide the popup after 3 seconds
      const timer = setTimeout(() => {
        setPopupMessage(null);
        setPopupType(null);
      }, 6000);

      return () => clearTimeout(timer); // Clean up if component unmounts
    }
  }, [messages]);

  return (
    <div className="relative">
      <button onClick={handleLogin} className="btn btn-success">
        Login with Spotify
      </button>
      {popupMessage && <div style={{ position: 'fixed', top: 20, left: 20, backgroundColor: '#ffc107', color: 'white', padding: '10px', zIndex: 9999 }}>{popupMessage}</div>}{' '}
    </div>
  );
};

export default SpotifyLoginButton;
