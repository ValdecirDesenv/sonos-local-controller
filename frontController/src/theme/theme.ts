import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#5B8DEF' },
    secondary: { main: '#1DB954' },
    error: { main: '#E5484D' },
    warning: { main: '#F5A524' },
    success: { main: '#1DB954' },
    background: { default: '#121417', paper: '#1B1F24' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiAppBar: { defaultProps: { color: 'default', elevation: 0 } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});
