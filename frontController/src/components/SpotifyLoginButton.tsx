import React from 'react';
import { useWebSocketContext } from '../hooks/WebSocketProvider';

const SpotifyLoginButton: React.FC = () => {
  const { messages, sendMessage } = useWebSocketContext();

  const handleLogin = () => {
    //window.location.href = 'http://localhost:3000/spotify/login'; // Your backend URL
    sendMessage({
      type: 'spotifyLogin',
      data: {},
    });
  };

  return (
    <button onClick={handleLogin} className="btn btn-success">
      Login with Spotify
    </button>
  );
};

export default SpotifyLoginButton;
