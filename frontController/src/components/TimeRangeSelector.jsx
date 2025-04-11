import React, { useState, useEffect } from "react";

const TimeRangeSelector = ({
  label,
  defaultStart,
  defaultEnd,
  onTimeChange,
}) => {
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  // Sync state with new props when they change
  useEffect(() => {
    setStartTime(defaultStart);
  }, [defaultStart]);

  useEffect(() => {
    setEndTime(defaultEnd);
  }, [defaultEnd]);

  const handleStartTimeChange = (event) => {
    const newStartTime = event.target.value;
    setStartTime(newStartTime);
    if (onTimeChange) {
      onTimeChange(newStartTime, endTime);
    }
  };

  const handleEndTimeChange = (event) => {
    const newEndTime = event.target.value;
    setEndTime(newEndTime);
    if (onTimeChange) {
      onTimeChange(startTime, newEndTime);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="d-flex align-items-center">
        <input
          type="time"
          className="form-control me-2"
          value={startTime}
          onChange={handleStartTimeChange}
        />
        <span className="mx-2">to</span>
        <input
          type="time"
          className="form-control"
          value={endTime}
          onChange={handleEndTimeChange}
        />
      </div>
    </div>
  );
};

export default TimeRangeSelector;
