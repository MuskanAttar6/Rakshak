import React, { useState } from 'react';
import { getMeta, getFriendlyMessage } from '../friendly.js';

const TOP_N = 4;

export default function CriticalGate({ blockers = [], onRescan, onAcknowledge, scanning }) {
  const [busyFix, setBusyFix] = useState(null);
  const top = blockers.slice(0, TOP_N);

  const runFix = async (fixId) => {
    setBusyFix(fixId);
    try { await window.rakshak.runFix(fixId); }
    finally { setTimeout(() => setBusyFix(null), 800); }
  };

  return (
    <div className="gate-backdrop" role="dialog" aria-modal="true">
      <div className="gate-card">
        <div className="gate-icon-circle">⚠️</div>

        <div className="gate-title">Your computer needs attention</div>
        <div className="gate-sub">
          We found {blockers.length} important issue{blockers.length === 1 ? '' : 's'} that may slow you down or cause damage. Please fix {blockers.length === 1 ? 'it' : 'them'} before continuing.
        </div>

        <div className="gate-list">
          {top.map(b => {
            const meta = getMeta(b.id);
            return (
              <div className="gate-row" key={b.id}>
                <div className="gate-row-icon">{meta.icon}</div>
                <div className="gate-row-main">
                  <div className="gate-row-name">{meta.label}</div>
                  <div className="gate-row-msg">{getFriendlyMessage(b.id, b.status)}</div>
                  <div className="gate-row-fix">{b.suggestion}</div>
                </div>
                {b.fix && (
                  <button
                    className="btn btn-fix"
                    disabled={busyFix === b.fix.id}
                    onClick={() => runFix(b.fix.id)}
                  >
                    {busyFix === b.fix.id ? 'Opening…' : 'Fix Now'}
                  </button>
                )}
              </div>
            );
          })}
          {blockers.length > TOP_N && (
            <div className="gate-more">
              + {blockers.length - TOP_N} more issue{blockers.length - TOP_N > 1 ? 's' : ''} — fix the above first
            </div>
          )}
        </div>

        <div className="gate-actions">
          <button className="btn btn-primary-lg" onClick={onRescan} disabled={scanning}>
            {scanning ? 'Checking again…' : 'I\u2019ve fixed it — Check Again'}
          </button>
          <button className="btn btn-ghost" onClick={onAcknowledge}>
            Continue Anyway
          </button>
        </div>
        <div className="gate-foot-note">
          Ignoring these issues may lead to data loss, security risks, or work delays.
        </div>
      </div>
    </div>
  );
}
