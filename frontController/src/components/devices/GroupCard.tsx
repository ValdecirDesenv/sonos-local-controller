import SaveIcon from '@mui/icons-material/Save';
import { Button, Card, CardContent, Divider, FormControlLabel, Stack, Switch, Tooltip, Typography } from '@mui/material';
import type { GroupItem } from '../../ws/types.js';
import { useSendMessage } from '../../ws/useWsStore.js';
import { getPrimaryMemberState } from '../../utils/group.js';
import { GroupCardHeader } from './GroupCardHeader.js';
import { MembersTable } from './MembersTable.js';
import { TimeRangeFields } from './TimeRangeFields.js';

interface GroupCardProps {
  group: GroupItem;
}

export function GroupCard({ group }: GroupCardProps) {
  const sendMessage = useSendMessage();
  const primaryState = getPrimaryMemberState(group);
  const isOnline = group.connectionStatus === 'online';

  return (
    <Card>
      <GroupCardHeader
        roomName={group.coordinator.roomName}
        isOnline={isOnline}
        onDeleteConfirmed={() => sendMessage({ type: 'removeGroup', uuid: group.uuid })}
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          Volume: {primaryState?.volume ?? 'unknown'} · Mute: {primaryState?.mute ? 'Yes' : 'No'} · Playback: {primaryState?.playbackState ?? 'unknown'}
        </Typography>

        <Stack sx={{ mt: 2 }} spacing={0.5}>
          <FormControlLabel
            control={
              <Switch
                checked={group.isKeepPlaying}
                onChange={(e) => sendMessage({ type: 'keepPlayerUpdate', uuid: group.uuid, isKeepPlaying: e.target.checked })}
              />
            }
            label="Always Keep Playing"
          />
          <FormControlLabel
            control={
              <Switch
                checked={group.hasTimePlay}
                onChange={(e) =>
                  sendMessage({
                    type: 'timeFrameUpdate',
                    uuid: group.uuid,
                    hasTimePlay: e.target.checked,
                    timeStart: group.timeStart,
                    timeStop: group.timeStop,
                  })
                }
              />
            }
            label="Audio TimeFrame"
          />
          {group.hasTimePlay && (
            <TimeRangeFields
              timeStart={group.timeStart}
              timeStop={group.timeStop}
              onChange={(timeStart, timeStop) =>
                sendMessage({ type: 'timeFrameUpdate', uuid: group.uuid, hasTimePlay: group.hasTimePlay, timeStart, timeStop })
              }
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={0.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button size="small" startIcon={<SaveIcon />} onClick={() => sendMessage({ type: 'saveDesiredGroup', uuid: group.uuid })}>
              Save current as desired
            </Button>
            <Typography variant="caption" color="text.secondary">
              {group.hasDesiredGroupConfigured
                ? `Desired configuration saved ${group.desiredGroupSavedAt ? new Date(group.desiredGroupSavedAt).toLocaleString() : ''}`
                : 'No desired configuration saved'}
            </Typography>
          </Stack>
          <Tooltip title={group.hasDesiredGroupConfigured ? '' : 'Save a desired configuration first'}>
            <span>
              <FormControlLabel
                disabled={!group.hasDesiredGroupConfigured}
                control={
                  <Switch
                    checked={group.autoRestoreGroupEnabled}
                    onChange={(e) => sendMessage({ type: 'setAutoRestoreGroup', uuid: group.uuid, autoRestoreGroupEnabled: e.target.checked })}
                  />
                }
                label="Enable Automatic Group Restore"
              />
            </span>
          </Tooltip>
        </Stack>

        <Divider sx={{ my: 2 }} />
        <MembersTable members={group.members} />
      </CardContent>
    </Card>
  );
}
