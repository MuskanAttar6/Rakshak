import React from 'react';
import './IntervalSelector.css';

const INTERVAL_OPTIONS = [
  { value: 500, label: '0.5 seconds (Instant)', description: 'Detect issues instantly - high CPU' },
  { value: 60000, label: '1 minute', description: 'Frequent checks - moderate CPU' },
  { value: 21600000, label: '6 hours (Default)', description: 'Standard background monitoring' },
  { value: 86400000, label: '24 hours', description: 'Daily check - minimal CPU' },
];

export default function IntervalSelector({ value, onChange, disabled }) {
  const selectedOption = INTERVAL_OPTIONS.find(opt => opt.value === value) || INTERVAL_OPTIONS[2]; // Default: 6 hours

  return (
    <div className="interval-selector">
      <label className="interval-label">Check Interval</label>
      <select 
        className="interval-dropdown" 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      >
        {INTERVAL_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="interval-description">
        {selectedOption.description}
      </div>
      <div className="interval-hint">
        💡 0.5s = troubleshooting • 1 min = active use • 6 hrs = daily driver • 24 hrs = minimal
      </div>
    </div>
  );
}
