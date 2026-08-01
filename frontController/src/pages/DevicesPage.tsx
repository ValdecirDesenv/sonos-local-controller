import { Alert, Box, CircularProgress, Container, Grid, Typography } from '@mui/material';
import { GroupCard } from '../components/devices/GroupCard.js';
import { useGroups, useHasReceivedInitialUpdate } from '../ws/useWsStore.js';

export function DevicesPage() {
  const groups = useGroups();
  const hasReceivedInitialUpdate = useHasReceivedInitialUpdate();

  if (!hasReceivedInitialUpdate) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" disableGutters>
      <Typography variant="h4" gutterBottom>
        Devices
      </Typography>
      {groups.length === 0 ? (
        <Alert severity="info">No groups available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {[...groups]
            .sort((a, b) => a.coordinator.roomName.localeCompare(b.coordinator.roomName))
            .map((group) => (
              <Grid item xs={12} md={6} lg={4} key={group.uuid}>
                <GroupCard group={group} />
              </Grid>
            ))}
        </Grid>
      )}
    </Container>
  );
}
