import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./css/index.css";
import { WebSocketProvider } from "./hooks/WebSocketProvider.js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <WebSocketProvider>
    <App />
  </WebSocketProvider>
);
