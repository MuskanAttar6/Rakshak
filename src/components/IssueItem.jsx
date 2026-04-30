import React, { useState } from 'react';
import { getMeta, getFriendlyMessage, getFriendlyStatus } from '../friendly.js';
import DuplicatesPanel from './DuplicatesPanel.jsx';

const STATUS_ICON = {
  ok: '✓',
  warning: '!',
  critical: '×',
};

export default function IssueItem({ issue }) {
  const [open, setOpen] = useState(false);
  const [busyFix, setBusyFix] = useState(false);
  const meta = getMeta(issue.id);
  const friendlyMsg = getFriendlyMessage(issue.id, issue.status);
  const statusLabel = getFriendlyStatus(issue.status);

  const runFix = async (e) => {
    e.stopPropagation();
    if (!issue.fix || !window.rakshak) return;
    setBusyFix(true);
    try { await window.rakshak.runFix(issue.fix.id); }
    finally { setTimeout(() => setBusyFix(false), 800); }
  };

  return (
    <div className={`tile tile-${issue.status}${issue.id === 'duplicates' && open ? ' tile-full-span' : ''}`} onClick={() => setOpen(o => !o)}>
      <div className="tile-icon">{meta.icon}</div>
      <div className="tile-body">
        <div className="tile-label">{meta.label}</div>
        <div className="tile-msg">{friendlyMsg}</div>
      </div>
      <div className={`tile-badge tile-badge-${statusLabel.color}`}>
        <span className="tile-badge-icon">{STATUS_ICON[issue.status]}</span>
      </div>

      {open && (
        <div className="tile-detail" onClick={(e) => e.stopPropagation()}>
          <div className="tile-detail-row">
            <div className="tile-detail-label">What it means</div>
            <div className="tile-detail-text">{issue.message}</div>
          </div>
          {issue.status !== 'ok' && (
            <div className="tile-detail-row">
              <div className="tile-detail-label">What to do</div>
              <div className="tile-detail-text">{issue.suggestion}</div>
            </div>
          )}
          {issue.fix && issue.status !== 'ok' && issue.id !== 'duplicates' && (
            <button className="btn btn-fix-tile" onClick={runFix} disabled={busyFix}>
              {busyFix ? 'Opening…' : `→ ${issue.fix.label}`}
            </button>
          )}
          {issue.id === 'duplicates' && (
            <DuplicatesPanel details={issue.details} />
          )}
          {issue.id === 'cpu' && issue.details && (
            <div className="tile-detail-row">
              <div className="tile-detail-label">Measurement</div>
              <div className="tile-detail-text">
                <div>Method: <strong>{issue.details.method}</strong></div>
                <div>Counter: {issue.details.counterName}</div>
                <div>Response time: {issue.details.responseTimeMs}ms</div>
                {issue.details.method === 'PDH' && (
                  <div style={{ marginTop: '4px', color: '#3fb950' }}>
                    ✓ Task Manager-accurate reading
                  </div>
                )}
                {issue.details.method === 'NodeJS' && (
                  <div style={{ marginTop: '4px', color: '#d29922' }}>
                    ⚠ Fallback method (less accurate)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
