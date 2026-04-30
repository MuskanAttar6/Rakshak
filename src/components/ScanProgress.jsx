import React from 'react';

const CHECK_ICONS = {
  cpu: '⚡',
  ram: '🧠',
  disk: '💾',
  internet: '🌐',
  'network-quality': '📶',
  'network-speed': '🚀',
  'network-location': '📍',
  updates: '🔄',
  git: '🔀',
  docker: '🐳',
  'win-startup-apps': '🏁',
  'win-defender': '🛡️',
  'win-firewall': '🧱',
  'win-critical-services': '⚙️',
  'linux-load-average': '📊',
  'linux-failed-services': '⚙️',
  'linux-firewall': '🧱',
  'linux-log-errors': '📋',
  duplicates: '🗂️',
};

export default function ScanProgress({ currentCheck, totalChecks, completedChecks }) {
  const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;
  const icon = CHECK_ICONS[currentCheck] || '🔍';

  return (
    <div className="scan-progress">
      <div className="scan-progress-bar">
        <div
          className="scan-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="scan-progress-info">
        <span className="scan-progress-icon">{icon}</span>
        <span className="scan-progress-text">
          Checking {currentCheck?.replace(/-/g, ' ') || 'system'}...
        </span>
        <span className="scan-progress-count">
          {completedChecks}/{totalChecks}
        </span>
      </div>
    </div>
  );
}
