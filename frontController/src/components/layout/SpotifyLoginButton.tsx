import { Button } from '@mui/material';
import { FaSpotify } from 'react-icons/fa';
import { useSendMessage } from '../../ws/useWsStore.js';

export function SpotifyLoginButton() {
  const sendMessage = useSendMessage();

  return (
    <Button variant="contained" color="secondary" startIcon={<FaSpotify />} onClick={() => sendMessage({ type: 'spotifyLogin' })}>
      Login with Spotify
    </Button>
  );
}
