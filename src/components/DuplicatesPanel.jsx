import React, { useState } from 'react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function pathBasename(p) {
  return p ? p.replace(/\\/g, '/').split('/').pop() : '';
}
function pathDirname(p) {
  if (!p) return p;
  const parts = p.replace(/\\/g, '/').split('/');
  parts.pop();
  return parts.join('\\') || p;
}

function SkeletonRows() {
  return (
    <div className="dup-skeleton">
      {[80, 65, 90, 55, 75].map((w, i) => (
        <div key={i} className="dup-skel-row">
          <div className="dup-skel-tag" />
          <div className="dup-skel-line" style={{ width: `${w}%` }} />
          <div className="dup-skel-btn" />
        </div>
      ))}
    </div>
  );
}

function GroupCard({ group, idx }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState({});

  const act = async (fn, key) => {
    setBusy(b => ({ ...b, [key]: true }));
    try { await fn(); }
    finally { setTimeout(() => setBusy(b => ({ ...b, [key]: false })), 400); }
  };

  return (
    <div className={`dc-group${expanded ? ' dc-group-open' : ''}`}>
      <div className="dc-group-row" onClick={() => setExpanded(e => !e)}>
        <div className="dc-group-left">
          <span className="dc-badge-copies">{group.files.length} copies</span>
          <div className="dc-group-name-block">
            <span className="dc-group-name" title={pathBasename(group.original)}>{pathBasename(group.original)}</span>
            <span className="dc-group-folder" title={pathDirname(group.original)}>{pathDirname(group.original)}</span>
          </div>
        </div>
        <div className="dc-group-right" onClick={e => e.stopPropagation()}>
          <span className="dc-group-size">{formatBytes(group.groupSizeBytes)}</span>
          <button
            className="dc-action-btn dc-action-btn-outline"
            disabled={!!busy[`open_${idx}`]}
            onClick={() => act(() => window.rakshak?.openPath(pathDirname(group.original)), `open_${idx}`)}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.764c.415 0 .813.165 1.107.46L8.5 3.6H13.5A1.5 1.5 0 0 1 15 5.1v7.4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>
            Open
          </button>
          <button
            className="dc-action-btn dc-action-btn-outline"
            disabled={!!busy[`reveal_${idx}`]}
            onClick={() => act(() => window.rakshak?.revealPath(group.original), `reveal_${idx}`)}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
            Reveal
          </button>
          <span className={`dc-chevron${expanded ? ' open' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>
          </span>
        </div>
      </div>

      {expanded && (
        <div className="dc-file-list">
          {group.files.map((f, fi) => (
            <div key={fi} className={`dc-file-row${fi === 0 ? ' dc-file-orig' : ''}`}>
              <span className={`dc-file-tag${fi === 0 ? ' orig' : ' copy'}`}>
                {fi === 0 ? 'original' : 'copy'}
              </span>
              <span className="dc-file-path" title={f}>{f}</span>
              <button
                className="dc-action-btn dc-action-btn-xs"
                onClick={() => act(() => window.rakshak?.revealPath(f), `r_${idx}_${fi}`)}
                disabled={!!busy[`r_${idx}_${fi}`]}
              >
                Reveal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DuplicatesPanel({ details }) {
  const [scanning, setScanning] = useState(false);
  const [customPaths, setCustomPaths] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const activeDetails = result?.details || details;
  const activeGroups  = activeDetails?.groups || [];
  const scannedRoots  = activeDetails?.scannedRoots || [];
  const capped        = activeDetails?.capped;

  const pickFolder = async () => {
    const paths = await window.rakshak?.pickFolder();
    if (paths?.length) setCustomPaths(paths);
  };

  const runScan = async () => {
    setScanning(true);
    setError('');
    try {
      const res = await window.rakshak?.runDuplicateScan(customPaths.length ? customPaths : null);
      setResult(res);
    } catch (e) {
      setError('Scan failed: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const defaultFolders = scannedRoots.length > 0
    ? scannedRoots.map(r => r.split(/[\\/]/).pop()).join(', ')
    : 'Documents, Downloads, Desktop, Pictures, Music, Videos';

  return (
    <div className="dc-panel" onClick={e => e.stopPropagation()}>

      {/* ── Folder target bar ── */}
      <div className="dc-target-bar">
        <div className="dc-target-label">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{flexShrink:0,opacity:.6}}><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.764c.415 0 .813.165 1.107.46L8.5 3.6H13.5A1.5 1.5 0 0 1 15 5.1v7.4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>
          {customPaths.length === 0
            ? <span className="dc-target-default">Scanning: <em>{defaultFolders}</em></span>
            : <div className="dc-chips">{customPaths.map((p, i) => (
                <span key={i} className="dc-chip">
                  {p.split(/[\\/]/).pop() || p}
                  <button className="dc-chip-x" onClick={() => setCustomPaths(ps => ps.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}</div>
          }
        </div>
        <div className="dc-target-actions">
          <button className="dc-action-btn dc-action-btn-outline" onClick={pickFolder}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.764c.415 0 .813.165 1.107.46L8.5 3.6H13.5A1.5 1.5 0 0 1 15 5.1v7.4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>
            Choose Folder
          </button>
          {customPaths.length > 0 && (
            <button className="dc-action-btn dc-action-btn-ghost" onClick={() => setCustomPaths([])}>Reset</button>
          )}
          <button className="dc-action-btn dc-action-btn-primary" onClick={runScan} disabled={scanning}>
            {scanning
              ? <><span className="dc-spin" />Scanning…</>
              : <><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>Scan Now</>}
          </button>
        </div>
      </div>

      {error && <div className="dc-error-banner">{error}</div>}

      {/* ── Stats row ── */}
      {activeDetails && (
        <div className="dc-stats">
          {[
            { val: activeDetails.duplicateCount ?? 0, lbl: 'Duplicates',    accent: true },
            { val: activeGroups.length,                lbl: 'Groups' },
            { val: formatBytes(activeDetails.sizeSavedBytes ?? 0), lbl: 'Reclaimable', accent: true },
            { val: (activeDetails.filesScanned ?? '—') + (capped ? '*' : ''), lbl: 'Files Scanned' },
          ].map(({ val, lbl, accent }) => (
            <div key={lbl} className={`dc-stat${accent ? ' dc-stat-accent' : ''}`}>
              <span className="dc-stat-val">{val}</span>
              <span className="dc-stat-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer note ── */}
      {capped && (
        <div className="dc-footer-note">
          * Scan was capped at 5,000 files. Use "Choose Folder" to target a specific folder.
        </div>
      )}

      {/* ── Divider ── */}
      <div className="dc-divider" />

      {/* ── Groups list / empty / skeleton ── */}
      {scanning && <SkeletonRows />}

      {!scanning && activeGroups.length === 0 && (
        <div className="dc-empty-state">
          <div className="dc-empty-icon">✓</div>
          <div className="dc-empty-text">No duplicate files found in scanned folders.</div>
        </div>
      )}

      {!scanning && activeGroups.length > 0 && (
        <>
          <div className="dc-list-header">
            <span>File</span>
            <span>Actions</span>
          </div>
          <div className="dc-groups-list">
            {activeGroups.map((g, i) => (
              <GroupCard key={i} group={g} idx={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
