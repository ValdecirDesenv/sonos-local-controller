import React, { useState } from "react";

const ToggleSwitch = ({ label, defaultChecked = false, onToggle }) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    setIsChecked(!isChecked);
    if (onToggle) {
      onToggle(!isChecked);
    }
  };

  return (
    <div className="form-group">
      <div className="d-flex align-items-center">
        <label htmlFor="toggleSwitch" className="form-label me-2 custom-text-1">
          {label}
        </label>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="toggleSwitch"
            checked={isChecked}
            onChange={handleToggle}
          />
          <label
            className="form-check-label custom-text-2"
            htmlFor="toggleSwitch"
          >
            {isChecked ? "On" : "Off"}
          </label>
        </div>
      </div>
    </div>
  );
};

export default ToggleSwitch;
