import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface DeleteGroupDialogProps {
  open: boolean;
  roomName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGroupDialog({ open, roomName, onClose, onConfirm }: DeleteGroupDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Remove group?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove "{roomName}"? This can't be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}
