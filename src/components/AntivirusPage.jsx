import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AntivirusPage.css';

// ── Icons ────────────────────────────────────────────────────────────────────

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 15l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
);
const DriveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 12h20v10H2V12zm2 8h16v-2H4v2zm15-10H5c-1.1 0-2 .9-2 2v4h2V6h16v10h2V10c0-1.1-.9-2-2-2z" />
  </svg>
);
const BugIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.42.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
  </svg>
);

// ── Not-Installed banner ──────────────────────────────────────────────────────

function AntivirusNotInstalled() {
  const openDownload = () => {
    window.open?.('https://www.clamav.net/downloads#otherversions', '_blank');
    window.rakshak?.openPath?.('https://www.clamav.net/downloads#otherversions');
  };

  return (
    <div className="av-not-installed">
      <div className="av-ni-icon">
        <WarningIcon />
      </div>
      <h2>ClamAV Not Found</h2>
      <p>
        Rakshak uses <strong>ClamAV</strong> as its open-source antivirus engine.
        ClamAV was not detected on this machine.
      </p>

      <div className="av-ni-steps">
        <h3>How to install ClamAV on Windows</h3>
        <ol>
          <li>
            Go to{' '}
            <button className="av-link-btn" onClick={openDownload}>
              clamav.net/downloads <ExternalLinkIcon />
            </button>
            and download the <strong>Windows installer (.msi)</strong>.
          </li>
          <li>
            Run the installer — the default path is{' '}
            <code>C:\Program Files\ClamAV\</code>.
          </li>
          <li>
            After installation, open a terminal and run:
            <pre>cd "C:\Program Files\ClamAV"
freshclam.exe</pre>
            This downloads the latest virus definitions.
          </li>
          <li>Restart Rakshak — the Antivirus tab will become active.</li>
        </ol>
      </div>

      <div className="av-ni-alt">
        <p>Alternatively, install via <strong>winget</strong>:</p>
        <pre>winget install ClamAV.ClamAV</pre>
        <p>or via <strong>Chocolatey</strong>:</p>
        <pre>choco install clamav</pre>
      </div>

      <button className="av-btn av-btn-primary" onClick={openDownload}>
        <ExternalLinkIcon /> Download ClamAV
      </button>
    </div>
  );
}

// ── Threat List ───────────────────────────────────────────────────────────────

function ThreatList({ threats }) {
  if (!threats.length) return null;
  return (
    <div className="av-threat-list">
      <h3 className="av-threat-title">
        <BugIcon /> {threats.length} Threat{threats.length !== 1 ? 's' : ''} Detected
      </h3>
      <div className="av-threat-items">
        {threats.map((t, i) => (
          <div key={i} className="av-threat-item">
            <div className="av-threat-virus">
              <WarningIcon />
              <span className="av-threat-name">{t.virus}</span>
            </div>
            <div className="av-threat-file" title={t.file}>
              {t.file}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AntivirusPage() {
  const [clamavStatus, setClamavStatus]   = useState(null);   // null = checking
  const [targetPath,   setTargetPath]     = useState('');
  const [scanning,     setScanning]       = useState(false);
  const [progress,     setProgress]       = useState(null);   // live progress
  const [result,       setResult]         = useState(null);   // final result
  const [scanError,    setScanError]      = useState(null);
  const [elapsed,      setElapsed]        = useState(0);

  const unsubRef    = useRef(null);
  const timerRef    = useRef(null);
  const startTimeRef = useRef(null);

  // Check ClamAV installation on mount
  useEffect(() => {
    window.rakshak?.antivirus?.checkInstalled().then(setClamavStatus);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (scanning) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(0));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [scanning]);

  const pickPath = useCallback(async () => {
    const p = await window.rakshak?.antivirus?.pickPath();
    if (p) setTargetPath(p);
  }, []);

  const startScan = useCallback(async (overridePath) => {
    const path = overridePath || targetPath;
    if (!path) return;

    setScanning(true);
    setResult(null);
    setScanError(null);
    setElapsed(0);
    setProgress({ scanned: 0, infected: 0, currentFile: '', threats: [] });

    // Subscribe to live progress events
    unsubRef.current = window.rakshak?.antivirus?.onProgress((data) => {
      setProgress(data);
    });

    try {
      const res = await window.rakshak?.antivirus?.scan(path);
      if (!res.ok && res.error) {
        setScanError(res.error === 'CLAMAV_NOT_FOUND'
          ? 'ClamAV executable not found. Please install ClamAV.'
          : res.error);
      } else {
        setResult(res);
      }
    } catch (err) {
      setScanError(err.message);
    } finally {
      unsubRef.current?.();
      unsubRef.current = null;
      setScanning(false);
    }
  }, [targetPath]);

  const abort = useCallback(async () => {
    await window.rakshak?.antivirus?.abort();
    unsubRef.current?.();
    unsubRef.current = null;
    setScanning(false);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setScanError(null);
    setProgress(null);
    setElapsed(0);
  }, []);

  // ── Loading state (checking installation) ──────────────────────────────────
  if (clamavStatus === null) {
    return (
      <div className="av-page av-page--loading">
        <div className="av-spinner-large" />
        <p>Checking ClamAV installation…</p>
      </div>
    );
  }

  // ── ClamAV not installed ───────────────────────────────────────────────────
  if (!clamavStatus.installed) {
    return (
      <div className="av-page">
        <AntivirusNotInstalled />
      </div>
    );
  }

  // ── Scan in progress ───────────────────────────────────────────────────────
  const pct = progress
    ? Math.min(99, Math.round((progress.scanned / Math.max(progress.scanned + 1, 100)) * 100))
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="av-page">

      {/* Header card */}
      <div className="av-hero">
        <div className="av-hero-icon">
          <ShieldCheckIcon />
        </div>
        <div className="av-hero-text">
          <h2>Antivirus Scan</h2>
          <p>Powered by ClamAV {clamavStatus.version ? `— ${clamavStatus.version}` : ''}</p>
        </div>
        <div className={`av-status-badge ${result ? (result.clean ? 'clean' : 'infected') : 'idle'}`}>
          {result
            ? result.clean ? 'Clean' : `${result.infected} Threat${result.infected !== 1 ? 's' : ''}`
            : scanning ? 'Scanning…' : 'Ready'}
        </div>
      </div>

      {/* Scan target */}
      {!scanning && !result && (
        <div className="av-target-section">
          <h3>Choose scan target</h3>

          {/* Pick folder */}
          <div className="av-target-row">
            <div className="av-target-input-wrap">
              <FolderIcon />
              <input
                className="av-target-input"
                type="text"
                readOnly
                placeholder="No folder selected…"
                value={targetPath}
                title={targetPath}
              />
              <button className="av-btn av-btn-secondary" onClick={pickPath}>
                Browse…
              </button>
            </div>
            <button
              className="av-btn av-btn-primary"
              disabled={!targetPath}
              onClick={() => startScan()}
            >
              <ShieldIcon /> Scan Folder
            </button>
          </div>

          {/* Quick scan — full C:\ */}
          <div className="av-quick-row">
            <div className="av-quick-label">
              <DriveIcon />
              <div>
                <strong>Full Drive Scan</strong>
                <span>Scan the entire C:\ drive — may take a while</span>
              </div>
            </div>
            <button
              className="av-btn av-btn-danger"
              onClick={() => { setTargetPath('C:\\'); startScan('C:\\'); }}
            >
              <DriveIcon /> Scan C:\
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {scanning && progress && (
        <div className="av-progress-section">
          <div className="av-progress-header">
            <span className="av-progress-title">
              Scanning <code>{targetPath}</code>
            </span>
            <span className="av-elapsed">{elapsed}s elapsed</span>
          </div>

          <div className="av-progress-bar-track">
            <div className="av-progress-bar-fill av-progress-bar--indeterminate" />
          </div>

          <div className="av-progress-stats">
            <div className="av-stat">
              <span className="av-stat-num">{progress.scanned.toLocaleString()}</span>
              <span className="av-stat-label">Files scanned</span>
            </div>
            <div className="av-stat av-stat--infected">
              <span className="av-stat-num">{progress.infected}</span>
              <span className="av-stat-label">Threats found</span>
            </div>
          </div>

          {progress.currentFile && (
            <div className="av-current-file" title={progress.currentFile}>
              <span className="av-cf-label">Checking:</span>
              <span className="av-cf-path">{progress.currentFile}</span>
            </div>
          )}

          <button className="av-btn av-btn-abort" onClick={abort}>
            <StopIcon /> Stop Scan
          </button>

          {/* Live threats during scan */}
          {progress.threats?.length > 0 && (
            <ThreatList threats={progress.threats} />
          )}
        </div>
      )}

      {/* Error */}
      {scanError && (
        <div className="av-error-banner">
          <WarningIcon />
          <div>
            <strong>Scan failed</strong>
            <p>{scanError}</p>
          </div>
          <button className="av-btn av-btn-secondary av-btn--sm" onClick={reset}>
            Dismiss
          </button>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <div className={`av-result-card ${result.clean ? 'clean' : 'infected'}`}>
          <div className="av-result-icon">
            {result.clean ? <ShieldCheckIcon /> : <BugIcon />}
          </div>
          <div className="av-result-body">
            {result.aborted ? (
              <h3>Scan aborted</h3>
            ) : result.clean ? (
              <h3>No threats found</h3>
            ) : (
              <h3>{result.infected} threat{result.infected !== 1 ? 's' : ''} detected</h3>
            )}
            <p>
              {result.scanned.toLocaleString()} file{result.scanned !== 1 ? 's' : ''} scanned
              {result.aborted ? ' before stopping.' : '.'}
            </p>
          </div>
          <button className="av-btn av-btn-secondary av-btn--sm" onClick={reset}>
            New Scan
          </button>
        </div>
      )}

      {/* Threat detail list */}
      {result && result.threats?.length > 0 && (
        <ThreatList threats={result.threats} />
      )}
    </div>
  );
}
