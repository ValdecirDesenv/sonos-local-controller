import SpeakerGroupIcon from '@mui/icons-material/SpeakerGroup';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import { useGroups } from '../ws/useWsStore.js';

export function HomePage() {
  const groups = useGroups();
  const onlineCount = groups.filter((g) => g.connectionStatus === 'online').length;
  const offlineCount = groups.length - onlineCount;

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Sonos Control
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your Sonos groups and Spotify playlist schedule.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <SpeakerGroupIcon color="success" />
                <Typography variant="h5">{onlineCount}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Groups online
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <WifiOffIcon color="warning" />
                <Typography variant="h5">{offlineCount}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Groups offline
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
