const defaultStartTime = '06:00';
const defaultStopTime = '21:00';

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getCurrentTimeInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getTimeInMinutes(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function getInTimeFrameToPlay(device) {
  const { timeStart, timeStop, hasTimePlay } = device;
  if (!hasTimePlay) return false;

  const now = getCurrentTimeInMinutes();
  const start = getTimeInMinutes(timeStart || defaultStartTime);
  const stop = getTimeInMinutes(timeStop || defaultStopTime);

  if (start === stop) return true;
  if (start < stop) {
    return now >= start && now < stop;
  } else {
    // Handles overnight range, e.g., 22:00–06:00
    return now >= start || now < stop;
  }
}

module.exports = {
  getInTimeFrameToPlay,
  defaultStartTime,
  defaultStopTime,
};
