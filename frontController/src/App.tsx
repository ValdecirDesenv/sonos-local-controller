import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Navbar from './components/Navbar';
import { WebSocketProvider, useWebSocketContext } from './hooks/WebSocketProvider';
import Topbar from './components/Topbar';
import { useEffect, useState } from 'react';
import GroupDetails from './components/GroupDetails';
import SpotifyWeekList from './pages/SpotifyWeekList';
import './css/styles.css';
import SpotifyLoginButton from './components/SpotifyLoginButton';

const App: React.FC = () => {
  const [groups, setGroups] = useState(null);
  const { messages } = useWebSocketContext();

  useEffect(() => {
    if (messages?.length) {
      setGroups(messages[0]);
    } else {
      console.warn('No valid data received from WebSocket:', messages);
    }
  }, [messages]);

  return (
    <WebSocketProvider>
      <Router>
        <Topbar />
        <div className="d-flex">
          <Navbar group={groups} />
          <div className="flex-grow-1 custom-flex-grow">
            {groups ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/spotifyWeekList" element={<SpotifyWeekList />} />
                <Route path="/devices" element={<GroupDetails group={groups} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </div>
      </Router>
    </WebSocketProvider>
  );
};

export default App;
