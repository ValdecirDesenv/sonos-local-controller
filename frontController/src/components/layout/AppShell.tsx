import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { ToastHost } from './ToastHost.js';
import { TopBar } from './TopBar.js';
import { DRAWER_WIDTH, SideNav } from './SideNav.js';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar onMenuClick={() => setMobileOpen(true)} />
      <SideNav variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 }, display: { xs: 'none', sm: 'block' } }}
      >
        <SideNav variant="permanent" open onClose={() => {}} />
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
      <ToastHost />
    </Box>
  );
}
