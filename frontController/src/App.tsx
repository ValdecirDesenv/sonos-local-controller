import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import {
  WebSocketProvider,
  useWebSocketContext,
} from "./hooks/WebSocketProvider";
import Devices from "./pages/Devices";
import Topbar from "./components/Topbar";
import { useEffect, useState } from "react";
import GroupDetails from "./components/GroupDetails";

const App: React.FC = () => {
  const [groups, setGroups] = useState();
  const { messages } = useWebSocketContext();

  useEffect(() => {
    console.log("WebSocket Messages To App:", messages);
  }, [messages]);

  useEffect(() => {
    if (messages && messages[0]) {
      const value = messages[0];
      setGroups(value);
    } else {
      console.log("No valid data:", messages);
    }
  }, [messages]);

  return (
    <WebSocketProvider>
      <Router>
        <Topbar />
        <div className="d-flex">
          <Navbar group={groups} />
          <div className="flex-grow-1">
            {groups ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/devices"
                  element={<GroupDetails group={groups} />}
                />
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
