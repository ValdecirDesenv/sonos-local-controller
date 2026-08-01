import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Button, Card, CardActions, CardContent, CardMedia, Typography } from '@mui/material';
import type { SpotifyPlaylistEntry, Weekday } from '../../ws/types.js';

interface PlaylistCardProps {
  day: Weekday;
  entry?: SpotifyPlaylistEntry;
  isToday: boolean;
  onPlay: (day: Weekday, url: string) => void;
}

export function PlaylistCard({ day, entry, isToday, onPlay }: PlaylistCardProps) {
  const hasPlaylist = Boolean(entry?.url);

  return (
    <Card
      variant={isToday ? 'outlined' : undefined}
      sx={isToday ? { borderColor: 'success.main', borderWidth: 2 } : undefined}
    >
      {entry?.image ? (
        <CardMedia component="img" image={entry.image} alt={entry.name} sx={{ aspectRatio: '1 / 1', objectFit: 'cover' }} />
      ) : (
        <Box sx={{ aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
          <MusicNoteIcon fontSize="large" color="disabled" />
        </Box>
      )}
      <CardContent>
        <Typography variant="subtitle1">{day}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap title={entry?.name}>
          {entry?.name ?? 'No Playlist'}
        </Typography>
      </CardContent>
      {hasPlaylist && entry && (
        <CardActions>
          <Button size="small" color="secondary" startIcon={<PlayArrowIcon />} onClick={() => onPlay(day, entry.url)}>
            Play
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
