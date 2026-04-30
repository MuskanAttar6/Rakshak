import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './UnusedAppsPage.css';

// ── Icons ─────────────────────────────────────────────────────────────────────

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm8 3.38 6-3.38V9.21l-6 3.37v6.71z"/>
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const THRESHOLD_OPTIONS = [
  { label: '1 month',  days: 30  },
  { label: '2 months', days: 60  },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function timeAgo(iso) {
  if (!iso) return null;
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1)   return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30)  return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12)    return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/** Generate a deterministic pastel colour from the first letter of a string */
function letterColor(name) {
  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981',
    '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  ];
  const idx = (name.charCodeAt(0) || 0) % COLORS.length;
  return COLORS[idx];
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META = {
  unused:          { label: 'Unused',         cls: 'unused'         },
  'never-detected':{ label: 'Never run',       cls: 'never-detected' },
  active:          { label: 'Active',          cls: 'active'         },
  unknown:         { label: 'Unknown',         cls: 'unknown'        },
};

function StatusBadge({ status }) {
  const { label, cls } = STATUS_META[status] || STATUS_META.unknown;
  return <span className={`ua-badge ua-badge--${cls}`}>{label}</span>;
}

// ── Prefetch warning banner ───────────────────────────────────────────────────

function PrefetchBanner() {
  return (
    <div className="ua-banner ua-banner--warn">
      <WarningIcon />
      <div>
        <strong>Limited accuracy — Prefetch access denied</strong>
        <p>
          Windows Prefetch data (last-launch timestamps) requires Administrator
          rights. All apps are shown as <em>Unknown</em>. Restart Rakshak as
          Administrator to see accurate last-used dates.
        </p>
      </div>
    </div>
  );
}

// ── Individual app row ────────────────────────────────────────────────────────

function AppRow({ app, onUninstall }) {
  const color = letterColor(app.name);
  return (
    <div className={`ua-app-row ua-app-row--${app.status}`}>
      {/* Avatar */}
      <div className="ua-app-avatar" style={{ background: color }}>
        {app.name[0].toUpperCase()}
      </div>

      {/* Name + meta */}
      <div className="ua-app-info">
        <div className="ua-app-name">{app.name}</div>
        <div className="ua-app-meta">
          {app.publisher && <span>{app.publisher}</span>}
          {app.version   && <span>v{app.version}</span>}
          {app.installDate && (
            <span title={`Installed ${formatDate(app.installDate)}`}>
              Installed {formatDate(app.installDate)}
            </span>
          )}
          {app.estimatedSizeMB && (
            <span>{app.estimatedSizeMB} MB</span>
          )}
        </div>
      </div>

      {/* Last run */}
      <div className="ua-app-lastrun">
        {app.lastRun ? (
          <>
            <span className="ua-lr-label">Last used</span>
            <span className="ua-lr-value" title={formatDate(app.lastRun)}>
              {timeAgo(app.lastRun)}
            </span>
          </>
        ) : (
          <>
            <span className="ua-lr-label">Last used</span>
            <span className="ua-lr-value ua-lr-value--none">
              {app.status === 'unknown' ? 'Unknown' : 'Never detected'}
            </span>
          </>
        )}
      </div>

      {/* Status badge */}
      <StatusBadge status={app.status} />

      {/* Uninstall button (only for unused / never-detected) */}
      {(app.status === 'unused' || app.status === 'never-detected') && (
        <button
          className="ua-btn ua-btn--uninstall"
          title="Open Add/Remove Programs to uninstall"
          onClick={() => onUninstall(app)}
        >
          <TrashIcon /> Uninstall
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UnusedAppsPage() {
  const [thresholdDays, setThresholdDays] = useState(60);
  const [scanning,      setScanning]      = useState(false);
  const [result,        setResult]        = useState(null);
  const [scanError,     setScanError]     = useState(null);
  const [activeFilter,  setActiveFilter]  = useState('unused');
  const [search,        setSearch]        = useState('');

  const runScan = useCallback(async (days) => {
    const threshold = days ?? thresholdDays;
    setScanning(true);
    setScanError(null);
    try {
      const res = await window.rakshak?.unusedApps?.scan(threshold);
      if (!res || !res.ok) throw new Error(res?.error || 'Unknown error');
      setResult(res);
      // Auto-select "unused" tab, fall back to "all" if nothing unused
      setActiveFilter(res.unusedCount > 0 ? 'unused' : 'all');
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanning(false);
    }
  }, [thresholdDays]);

  // Run on first mount
  useEffect(() => { runScan(thresholdDays); }, []); // eslint-disable-line

  const handleThresholdChange = (days) => {
    setThresholdDays(days);
    runScan(days);
  };

  const handleUninstall = useCallback(async (app) => {
    await window.rakshak?.unusedApps?.openUninstall();
  }, []);

  const filteredApps = useMemo(() => {
    if (!result?.apps) return [];
    let apps = result.apps;
    if (activeFilter !== 'all') apps = apps.filter(a => a.status === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.publisher || '').toLowerCase().includes(q)
      );
    }
    return apps;
  }, [result, activeFilter, search]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabs = result
    ? [
        { id: 'all',            label: 'All',           count: result.total              },
        { id: 'unused',         label: 'Unused',        count: result.unusedCount        },
        { id: 'never-detected', label: 'Never run',     count: result.neverDetectedCount },
        { id: 'active',         label: 'Active',        count: result.activeCount        },
      ]
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ua-page">

      {/* Hero / controls */}
      <div className="ua-hero">
        <div className="ua-hero-left">
          <div className="ua-hero-icon">
            <PackageIcon />
          </div>
          <div>
            <h2>Unused Apps</h2>
            <p>
              {result
                ? `${result.total} apps installed · ${result.unusedCount} unused`
                : 'Detect apps you haven\'t opened in a while'}
            </p>
          </div>
        </div>

        <div className="ua-hero-right">
          {/* Threshold selector */}
          <div className="ua-threshold">
            <label htmlFor="ua-threshold-sel">Unused if not run in</label>
            <select
              id="ua-threshold-sel"
              className="ua-select"
              value={thresholdDays}
              onChange={e => handleThresholdChange(Number(e.target.value))}
              disabled={scanning}
            >
              {THRESHOLD_OPTIONS.map(o => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Scan button */}
          <button
            className="ua-btn ua-btn--scan"
            onClick={() => runScan()}
            disabled={scanning}
          >
            {scanning ? <><span className="ua-spinner" /> Scanning…</> : <><RefreshIcon /> Rescan</>}
          </button>
        </div>
      </div>

      {/* Prefetch access-denied warning */}
      {result && !result.prefetchAccessible && <PrefetchBanner />}

      {/* Scan timestamp */}
      {result && (
        <div className="ua-scan-meta">
          <InfoIcon />
          Scanned {formatDate(result.scannedAt)} · {result.total} apps ·
          threshold: not used in {result.thresholdDays} days
        </div>
      )}

      {/* Error */}
      {scanError && (
        <div className="ua-banner ua-banner--error">
          <WarningIcon />
          <div>
            <strong>Scan failed</strong>
            <p>{scanError}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {scanning && !result && (
        <div className="ua-loading">
          <div className="ua-spinner ua-spinner--lg" />
          <p>Reading registry and Prefetch data…</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Filter tabs */}
          <div className="ua-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`ua-tab ${activeFilter === t.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(t.id)}
              >
                {t.label}
                <span className="ua-tab-count">{t.count}</span>
              </button>
            ))}

            {/* Search */}
            <div className="ua-search-wrap">
              <SearchIcon />
              <input
                className="ua-search"
                type="text"
                placeholder="Search by name or publisher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* App list */}
          {filteredApps.length === 0 ? (
            <div className="ua-empty">
              {search
                ? 'No apps match your search.'
                : activeFilter === 'unused'
                ? 'No unused apps found — everything looks active!'
                : 'No apps in this category.'}
            </div>
          ) : (
            <div className="ua-app-list">
              {filteredApps.map((app, i) => (
                <AppRow key={`${app.name}-${i}`} app={app} onUninstall={handleUninstall} />
              ))}
            </div>
          )}

          {/* Footer hint */}
          {(activeFilter === 'unused' || activeFilter === 'never-detected') && filteredApps.length > 0 && (
            <div className="ua-footer-hint">
              <ShieldIcon />
              Clicking <strong>Uninstall</strong> opens Windows{' '}
              <em>Programs and Features</em> where you can safely remove any app.
            </div>
          )}
        </>
      )}
    </div>
  );
}
