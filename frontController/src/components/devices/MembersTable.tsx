import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { GroupMember } from '../../ws/types.js';

interface MembersTableProps {
  members: GroupMember[];
}

export function MembersTable({ members }: MembersTableProps) {
  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No members available.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Room</TableCell>
            <TableCell align="right">Volume</TableCell>
            <TableCell align="right">Mute</TableCell>
            <TableCell align="right">Playback</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member, index) => (
            <TableRow key={`${member.roomName}-${index}`}>
              <TableCell>{member.roomName}</TableCell>
              <TableCell align="right">{member.state.volume}</TableCell>
              <TableCell align="right">{member.state.mute ? 'Yes' : 'No'}</TableCell>
              <TableCell align="right">{member.state.playbackState}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
