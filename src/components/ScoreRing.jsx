import React from 'react';
import { getScoreLabel } from '../friendly.js';

function colorFor(score) {
  if (score >= 75) return '#3fb950';
  if (score >= 60) return '#d29922';
  return '#f85149';
}

export default function ScoreRing({ score = 0, size = 260, stroke = 18 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = colorFor(score);
  const label = getScoreLabel(score);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="ring-bg"
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
        />
        <circle
          className="ring-fg"
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-value">
        <div className="score-emoji">{label.emoji}</div>
        <div className="score-num" style={{ color }}>{score}</div>
        <div className="score-status" style={{ color }}>{label.text}</div>
      </div>
    </div>
  );
}
