import { useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { CardHeader, Chip, IconButton } from '@mui/material';
import { DeleteGroupDialog } from './DeleteGroupDialog.js';

interface GroupCardHeaderProps {
  roomName: string;
  isOnline: boolean;
  onDeleteConfirmed: () => void;
}

export function GroupCardHeader({ roomName, isOnline, onDeleteConfirmed }: GroupCardHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <CardHeader
        title={`Group: ${roomName}`}
        action={
          <>
            <Chip size="small" label={isOnline ? 'Online' : 'Offline'} color={isOnline ? 'success' : 'warning'} sx={{ mr: 1 }} />
            {!isOnline && (
              <IconButton aria-label="delete group" onClick={() => setDialogOpen(true)}>
                <DeleteIcon />
              </IconButton>
            )}
          </>
        }
      />
      <DeleteGroupDialog open={dialogOpen} roomName={roomName} onClose={() => setDialogOpen(false)} onConfirm={onDeleteConfirmed} />
    </>
  );
}
