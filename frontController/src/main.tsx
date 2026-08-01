import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { App } from './App.js';
import { theme } from './theme/theme.js';
import { WebSocketProvider } from './ws/WebSocketProvider.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </ThemeProvider>
  </React.StrictMode>
);
