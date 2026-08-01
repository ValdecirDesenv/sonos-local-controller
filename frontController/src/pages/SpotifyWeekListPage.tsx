import { useEffect } from 'react';
import { Container, Grid, Typography } from '@mui/material';
import { PlaylistCard } from '../components/spotify/PlaylistCard.js';
import { PlaylistForm } from '../components/spotify/PlaylistForm.js';
import { getTodayWeekday, WEEKDAYS } from '../utils/days.js';
import { usePlaylists, useSendMessage } from '../ws/useWsStore.js';
import type { Weekday } from '../ws/types.js';

export function SpotifyWeekListPage() {
  const sendMessage = useSendMessage();
  const playlists = usePlaylists();
  const today = getTodayWeekday();

  useEffect(() => {
    sendMessage({ type: 'spotifyPlaylist' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = (day: Weekday, url: string) => {
    sendMessage({ type: 'spotifyStartPlaylist', data: { day, url } });
  };

  return (
    <Container maxWidth="lg" disableGutters>
      <Typography variant="h4" gutterBottom>
        Spotify Weekly Playlist
      </Typography>
      <PlaylistForm />
      <Grid container spacing={3}>
        {WEEKDAYS.map((day) => (
          <Grid item xs={12} sm={6} md={4} key={day}>
            <PlaylistCard day={day} entry={playlists[day]} isToday={day === today} onPlay={handlePlay} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
