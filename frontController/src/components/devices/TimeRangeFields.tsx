import { Stack, TextField, Typography } from '@mui/material';

interface TimeRangeFieldsProps {
  timeStart: string;
  timeStop: string;
  onChange: (timeStart: string, timeStop: string) => void;
}

export function TimeRangeFields({ timeStart, timeStop, onChange }: TimeRangeFieldsProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
      <TextField
        label="Start"
        type="time"
        size="small"
        value={timeStart}
        onChange={(e) => onChange(e.target.value, timeStop)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Typography color="text.secondary">to</Typography>
      <TextField
        label="Stop"
        type="time"
        size="small"
        value={timeStop}
        onChange={(e) => onChange(timeStart, e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
}
