import { useState } from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { WEEKDAYS, type Weekday } from '../../ws/types.js';
import { useSendMessage } from '../../ws/useWsStore.js';

export function PlaylistForm() {
  const sendMessage = useSendMessage();
  const [url, setUrl] = useState('');
  const [day, setDay] = useState<Weekday>('Monday');

  const handleSave = () => {
    if (!url) return;
    sendMessage({ type: 'saveSpotifyPlaylist', data: { day, url } });
    setUrl('');
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
      <TextField
        label="Spotify Playlist URL"
        type="url"
        id="spotifyPlaylistUrl"
        name="spotifyPlaylistUrl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        fullWidth
      />
      <TextField
        select
        label="Day"
        id="spotifyPlaylistDay"
        name="spotifyPlaylistDay"
        value={day}
        onChange={(e) => setDay(e.target.value as Weekday)}
        sx={{ minWidth: 160 }}
      >
        {WEEKDAYS.map((d) => (
          <MenuItem key={d} value={d}>
            {d}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="contained" onClick={handleSave} sx={{ whiteSpace: 'nowrap' }}>
        Save
      </Button>
    </Stack>
  );
}
