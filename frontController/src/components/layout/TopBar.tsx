import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { SpotifyLoginButton } from './SpotifyLoginButton.js';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ mr: 2, display: { sm: 'none' } }} aria-label="open navigation">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sonos Control
        </Typography>
        <Box>
          <SpotifyLoginButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
