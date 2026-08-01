import { Alert, Snackbar } from '@mui/material';
import { useClearToast, useToast } from '../../ws/useWsStore.js';

export function ToastHost() {
  const toast = useToast();
  const clearToast = useClearToast();

  return (
    <Snackbar
      key={toast?.id}
      open={toast !== null}
      autoHideDuration={6000}
      onClose={clearToast}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      {toast ? (
        <Alert onClose={clearToast} severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
