import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h2">404</Typography>
        <Typography variant="body1" color="text.secondary">
          This page doesn't exist.
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Back to Home
        </Button>
      </Stack>
    </Container>
  );
}
