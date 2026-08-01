import HomeIcon from '@mui/icons-material/Home';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import SpeakerGroupIcon from '@mui/icons-material/SpeakerGroup';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import { NavLink } from 'react-router-dom';

export const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: <HomeIcon /> },
  { to: '/devices', label: 'Devices', icon: <SpeakerGroupIcon /> },
  { to: '/spotifyWeekList', label: 'Playlist Settings', icon: <LibraryMusicIcon /> },
];

interface SideNavProps {
  variant: 'permanent' | 'temporary';
  open: boolean;
  onClose: () => void;
}

export function SideNav({ variant, open, onClose }: SideNavProps) {
  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton key={item.to} component={NavLink} to={item.to} onClick={variant === 'temporary' ? onClose : undefined}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
