import { WEEKDAYS, type Weekday } from '../ws/types.js';

export { WEEKDAYS };

export function getTodayWeekday(): Weekday {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }) as Weekday;
}
