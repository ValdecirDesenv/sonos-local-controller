import React, { useState, useEffect } from "react";
import { useWebSocketContext } from "../hooks/WebSocketProvider";
import GroupDetails from "../components/GroupDetails";
import { Typography } from "@mui/material";
import "../css/styles.css";

const Devices: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);

  const { messages } = useWebSocketContext();

  useEffect(() => {
    console.log("WebSocket Messages:", messages);
  }, [messages]);

  useEffect(() => {
    if (messages) {
      setGroups(messages);
    } else {
      console.log("No valid data:", messages);
    }
  }, [messages]);

  return (
    <>
      <div>
        {groups.length === 0 ? (
          <Typography>No groups available</Typography>
        ) : (
          groups.map((group, index) => (
            <GroupDetails key={index} group={group} />
          ))
        )}
      </div>
    </>
  );
};

export default Devices;
