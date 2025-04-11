// Example usage in a component
import React from "react";
import { useWebSocketContext } from "../hooks/WebSocketProvider";

const Controls: React.FC = () => {
  const { sendMessage } = useWebSocketContext();

  const handlePlay = () => {
    sendMessage({ action: "play" });
  };

  const handlePause = () => {
    sendMessage({ action: "pause" });
  };

  return (
    <div>
      <button onClick={handlePlay}>Play</button>
      <button onClick={handlePause}>Pause</button>
    </div>
  );
};

export default Controls;
