import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ScoreRing from './components/ScoreRing.jsx';
import IssueList from './components/IssueList.jsx';
import CriticalGate from './components/CriticalGate.jsx';
import ToastContainer, { useToast } from './components/ToastContainer.jsx';
import SearchBar from './components/SearchBar.jsx';
import ExportButton from './components/ExportButton.jsx';
import Tooltip from './components/Tooltip.jsx';
import ScanProgress from './components/ScanProgress.jsx';

function useAnimatedNumber(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = val;
    const to = target;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('rakshak-theme');
    return stored ? stored === 'dark' : true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [scanProgress, setScanProgress] = useState({ current: '', completed: 0, total: 0 });
  const { toasts, showToast, removeToast } = useToast();
  const animatedScore = useAnimatedNumber(report?.score ?? 0);

  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!report?.results || !searchQuery.trim()) return report?.results || [];
    const query = searchQuery.toLowerCase();
    return report.results.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.category?.toLowerCase().includes(query) ||
      r.message.toLowerCase().includes(query)
    );
  }, [report?.results, searchQuery]);

  // Apply theme
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rakshak-theme', theme);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
    showToast(darkMode ? 'Light mode activated' : 'Dark mode activated', 'info', 2500);
  };

  const runScan = useCallback(async () => {
    if (!window.rakshak) return;
    setLoading(true);
    setSearchQuery('');
    setScanProgress({ current: 'Initializing...', completed: 0, total: 0 });

    try {
      // Simulate progress updates based on check names
      const checkNames = ['cpu', 'ram', 'disk', 'internet', 'updates'];
      let completed = 0;

      const progressInterval = setInterval(() => {
        if (completed < checkNames.length) {
          setScanProgress({
            current: checkNames[completed],
            completed,
            total: checkNames.length
          });
          completed++;
        }
      }, 800);

      const r = await window.rakshak.runHealthCheck();

      clearInterval(progressInterval);
      setScanProgress({ current: '', completed: 0, total: 0 });

      setReport(r);
      setAcknowledged(false);
      if (r.score >= 85) {
        showToast('Great! Your system is healthy.', 'success');
      } else if (r.criticalCount > 0) {
        showToast(`${r.criticalCount} critical issue${r.criticalCount > 1 ? 's' : ''} found.`, 'error');
      }
    } catch (err) {
      showToast('Scan failed. Check logs for details.', 'error');
    } finally {
      setLoading(false);
      setScanProgress({ current: '', completed: 0, total: 0 });
    }
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (!loading) runScan();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, runScan]);

  useEffect(() => {
    if (!window.rakshak) return;
    window.rakshak.getPlatform().then(setPlatform);
    const off = window.rakshak.onAutoReport((r) => setReport(r));
    runScan();
    return () => off && off();
  }, [runScan]);

  return (
    <div className="app">
      {report?.mustFix && !acknowledged && (
        <CriticalGate
          blockers={report.blockers}
          scanning={loading}
          onRescan={runScan}
          onAcknowledge={() => setAcknowledged(true)}
        />
      )}

      <div className="hero">
        <div className="hero-top">
          <div className="brand">
            <div className="brand-logo">R</div>
            <div className="brand-title">Rakshak</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="hero-meta">
              {report ? `Last checked: ${new Date(report.timestamp).toLocaleTimeString()}` : ' '}
            </div>
            <Tooltip text={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              <button className="theme-toggle" onClick={toggleTheme}>
                {darkMode ? '☀️' : '🌙'}
              </button>
            </Tooltip>
            <Tooltip text="Export report">
              <ExportButton report={report} />
            </Tooltip>
          </div>
        </div>

        <div className="hero-center">
          <ScoreRing score={animatedScore} />
          <div className="hero-tagline">
            {!report ? 'Click below to check your computer\u2019s health' :
              report.score >= 90 ? 'Your computer is in great shape!' :
              report.score >= 75 ? 'Your computer is doing well' :
              report.score >= 60 ? 'A few things need your attention' :
              'Your computer needs help \u2014 see below'}
          </div>
        </div>

        <div className="hero-summary">
          <div className="sum-pill sum-ok">
            <div className="sum-icon">✓</div>
            <div className="sum-num">{report?.okCount ?? 0}</div>
            <div className="sum-label">Healthy</div>
          </div>
          <div className="sum-pill sum-warn">
            <div className="sum-icon">!</div>
            <div className="sum-num">{report?.warningCount ?? 0}</div>
            <div className="sum-label">Need Attention</div>
          </div>
          <div className="sum-pill sum-crit">
            <div className="sum-icon">×</div>
            <div className="sum-num">{report?.criticalCount ?? 0}</div>
            <div className="sum-label">Critical</div>
          </div>
        </div>

        {loading && scanProgress.current && (
          <ScanProgress
            currentCheck={scanProgress.current}
            totalChecks={scanProgress.total}
            completedChecks={scanProgress.completed}
          />
        )}

        <button className="btn btn-primary-lg" onClick={runScan} disabled={loading}>
          {loading ? <><span className="spinner" /> Checking your computer…</> : 'Check My System'}
        </button>
      </div>

      <main className="main-content">
        {report && (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredResults.length}
            totalCount={report.results.length}
          />
        )}
        <IssueList results={filteredResults} isFiltered={!!searchQuery} />
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
