import React, { useEffect, useState, useCallback, useMemo } from 'react';
import IssueList from './components/IssueList.jsx';
import CriticalGate from './components/CriticalGate.jsx';
import ToastContainer, { useToast } from './components/ToastContainer.jsx';
import SearchBar from './components/SearchBar.jsx';
import ExportButton from './components/ExportButton.jsx';
import ScanProgress from './components/ScanProgress.jsx';
import LiveAlerts from './components/LiveAlerts.jsx';
import Tooltip from './components/Tooltip.jsx';
import DiskSpaceAnalyzer from './components/DiskSpaceAnalyzer.jsx';
import AboutPage from './components/AboutPage.jsx';
import AntivirusPage from './components/AntivirusPage.jsx';
import UnusedAppsPage from './components/UnusedAppsPage.jsx';
import ScoreRing from './components/ScoreRing.jsx';
import RemoteNodesPage from './components/RemoteNodesPage.jsx';
import './components/RemoteNodesPage.css';

// Dashboard Icons (SVG components)
const Icons = {
  Dashboard: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  Performance: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>,
  Storage: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/></svg>,
  Processes: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h4v2H4zm0 5h4v2H4zm0 5h4v2H4zm6-10h10v2H10zm0 5h10v2H10zm0 5h10v2H10z"/></svg>,
  Network: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>,
  RemoteNodes: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-.61.08-1.21.21-1.78L8.99 15v1c0 1.1.9 2 2 2v1.93C7.06 19.43 4 16.07 4 12zm13.89 5.4c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V8h2c1.1 0 2-.9 2-2v-.41A7.984 7.984 0 0 1 20 12c0 2.08-.81 3.98-2.11 5.4z"/></svg>,
  Alerts: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  Reports: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.03 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  About: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
  CPU: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2v2H7V2h2zm10 2v2h-2V4h2zM9 20v2H7v-2h2zm10 0v2h-2v-2h2zM4 9h2v2H4V9zm0 4h2v2H4v-2zm16-4h-2v2h2V9zm0 4h-2v2h2v-2zM13 2h-2v3h2V2zm0 17h-2v3h2v-3zM4 6V4h3v2H4zm17 0V4h-3v2h3zM4 20v-2h3v2H4zm17 0v-2h-3v2h3zM10 8h4v8h-2v-6h-2V8z"/></svg>,
  Memory: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>,
  Drive: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 12h20v10H2V12zm2 8h16v-2H4v2zm15-10H5c-1.1 0-2 .9-2 2v4h2V6h16v10h2V10c0-1.1-.9-2-2-2z"/></svg>,
  Wifi: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>,
  ShieldCheck: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 15l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  Warning: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
};

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

// Circular Progress Component
function CircularProgress({ value, size = 120, strokeWidth = 8, color = '#3b82f6', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="circular-progress-content">{children}</div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, unit, icon: Icon, color, sparklineData, trend }) {
  const getStatusColor = (val) => {
    if (val >= 80) return '#ef4444';
    if (val >= 60) return '#f59e0b';
    return '#3b82f6';
  };

  const colorValue = getStatusColor(value);

  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon" style={{ color: color || colorValue }}>
          <Icon />
        </div>
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value" style={{ color: color || colorValue }}>
        {value}
        <span className="stat-unit">{unit}</span>
      </div>
      {sparklineData && (
        <div className="sparkline">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke={color || colorValue}
              strokeWidth="2"
              points={sparklineData.map((v, i) => `${(i / (sparklineData.length - 1)) * 100},${30 - v}`).join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// Navigation Item
function NavItem({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon />
      <span>{label}</span>
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

// Alert Item
function AlertItem({ title, message, status, time, drive }) {
  const statusConfig = {
    critical: { icon: Icons.Warning, color: '#ef4444', label: 'CRITICAL' },
    warning: { icon: Icons.Warning, color: '#f59e0b', label: 'WARNING' },
    info: { icon: Icons.Shield, color: '#3b82f6', label: 'INFO' }
  };

  const config = statusConfig[status] || statusConfig.info;
  const Icon = config.icon;

  return (
    <div className="alert-item">
      <div className="alert-icon" style={{ color: config.color }}>
        <Icon />
      </div>
      <div className="alert-content">
        <div className="alert-header">
          <span className="alert-title">{title}</span>
          <span className="alert-status" style={{ color: config.color }}>{config.label}</span>
        </div>
        <div className="alert-message">{message}</div>
      </div>
      <div className="alert-time">{time}</div>
    </div>
  );
}

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [drives, setDrives] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('rakshak-theme');
    return stored ? stored === 'dark' : true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [scanProgress, setScanProgress] = useState({ current: '', completed: 0, total: 0 });
  const [grpcConnected, setGrpcConnected] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cpuOnlyResult, setCpuOnlyResult] = useState(null);
  const [checkingCpu, setCheckingCpu] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const animatedScore = useAnimatedNumber(report?.score ?? 0);

  // Map nav items to check categories
  const categoryMap = {
    'dashboard': null, // Show all overview
    'performance': ['cpu', 'ram', 'load'],
    'storage': ['disk', 'disk-health', 'large-files', 'temp-files'],
    'processes': ['processes', 'services', 'startup'],
    'network': ['internet', 'network-location', 'firewall', 'dns'],
    'alerts': ['critical', 'warning'], // Show issues only
    'reports': null, // Export view
    'settings': [], // Settings panel
    'about': [] // About panel
  };

  // Filter results based on search query AND active tab category
  const filteredResults = useMemo(() => {
    if (!report?.results) return [];
    let results = report.results;

    // Filter by category if not dashboard
    const categories = categoryMap[activeTab];
    if (categories && categories.length > 0) {
      results = results.filter(r => {
        // Match by check ID
        if (categories.includes(r.id)) return true;
        // Match by category field
        if (r.category && categories.some(cat => r.category.toLowerCase().includes(cat))) return true;
        // Match by name
        if (categories.some(cat => r.name.toLowerCase().includes(cat))) return true;
        return false;
      });
    } else if (activeTab === 'alerts') {
      // Show only non-ok items in alerts tab
      results = results.filter(r => r.status !== 'ok');
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query) ||
        r.message.toLowerCase().includes(query)
      );
    }

    return results;
  }, [report?.results, searchQuery, activeTab]);

  // Get summary stats for current category view
  const categoryStats = useMemo(() => {
    if (!report?.results) return { ok: 0, warning: 0, critical: 0, total: 0 };
    const categories = categoryMap[activeTab];
    let items = report.results;

    if (categories && categories.length > 0) {
      items = report.results.filter(r =>
        categories.includes(r.id) ||
        (r.category && categories.some(cat => r.category.toLowerCase().includes(cat))) ||
        categories.some(cat => r.name.toLowerCase().includes(cat))
      );
    } else if (activeTab === 'alerts') {
      items = report.results.filter(r => r.status !== 'ok');
    }

    return {
      ok: items.filter(r => r.status === 'ok').length,
      warning: items.filter(r => r.status === 'warning').length,
      critical: items.filter(r => r.status === 'critical').length,
      total: items.length
    };
  }, [report?.results, activeTab]);

  // Apply theme
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rakshak-theme', theme);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
    showToast(darkMode ? 'Light mode activated' : 'Dark mode activated', 'info', 5000);
  };

  const runScan = useCallback(async () => {
    if (!window.rakshak) return;
    setLoading(true);
    setSearchQuery('');
    setScanProgress({ current: 'Initializing...', completed: 0, total: 0 });

    // Subscribe to real progress updates
    const unsubscribe = window.rakshak.onHealthProgress((progress) => {
      setScanProgress({
        current: progress.checkId,
        completed: progress.completed,
        total: progress.total
      });
    });

    try {
      const r = await window.rakshak.runHealthCheck();

      unsubscribe();
      setScanProgress({ current: '', completed: 0, total: 0 });

      setReport(r);
      setAcknowledged(false);
      // Refresh drive data after each scan
      if (window.rakshak.getAllDrives) {
        window.rakshak.getAllDrives().then(d => { if (d?.length) setDrives(d); });
      }
      if (r.score >= 85) {
        showToast('Great! Your system is healthy.', 'success');
      } else if (r.criticalCount > 0) {
        showToast(`${r.criticalCount} critical issue${r.criticalCount > 1 ? 's' : ''} found.`, 'error');
      }
    } catch (err) {
      unsubscribe();
      showToast('Scan failed. Check logs for details.', 'error');
    } finally {
      setLoading(false);
      setScanProgress({ current: '', completed: 0, total: 0 });
    }
  }, [showToast]);

  const runCpuCheck = useCallback(async () => {
    if (!window.rakshak) return;
    setCheckingCpu(true);

    try {
      const { result } = await window.rakshak.runCpuCheck();
      setCpuOnlyResult(result);
      showToast(`CPU: ${result.message}`, result.status === 'ok' ? 'success' : 'warning');
    } catch (err) {
      showToast('CPU check failed.', 'error');
    } finally {
      setCheckingCpu(false);
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
    // Load real drive data
    if (window.rakshak.getAllDrives) {
      window.rakshak.getAllDrives().then(d => { if (d?.length) setDrives(d); });
    }
    // gRPC connection status
    if (window.rakshak.getGrpcStatus) {
      window.rakshak.getGrpcStatus().then(s => setGrpcConnected(s?.connected ?? false));
    }
    const offGrpc = window.rakshak.onGrpcStatus?.(s => setGrpcConnected(s?.connected ?? false));
    const off = window.rakshak.onAutoReport((r) => setReport(r));
    runScan();
    return () => {
      off && off();
      offGrpc && offGrpc();
    };
  }, [runScan]);

  // Get values from report
  const cpuResult = report?.results?.find(r => r.id === 'cpu');
  const ramResult = report?.results?.find(r => r.id === 'ram');
  const diskResult = report?.results?.find(r => r.id === 'disk');
  // 'internet' check = connectivity only; 'network-speed' check = download Mbps
  const internetResult   = report?.results?.find(r => r.id === 'internet');
  const netSpeedResult   = report?.results?.find(r => r.id === 'network-speed');

  const cpuValue  = cpuResult?.details?.usagePercent ?? null;
  // RAM: getRAMUsage() returns { percent } (not percentUsed)
  const ramValue   = ramResult?.details?.percent ?? null;
  // diskResult.details has { totalGB, usedGB, freeGB, freePercent } — compute usedPct
  const diskValue  = diskResult?.details?.totalGB
    ? +(((diskResult.details.usedGB || 0) / diskResult.details.totalGB) * 100).toFixed(1)
    : (drives[0]?.usedPct ?? null);

  // Generate sparkline data (simulated for demo)
  const generateSparkline = (baseValue) => {
    return Array.from({ length: 10 }, (_, i) => {
      const variation = Math.sin(i * 0.5) * 10;
      return Math.max(5, Math.min(25, baseValue * 0.25 + variation));
    });
  };

  // Mock alerts data
  const alerts = [
    {
      title: 'C Drive',
      message: 'C Drive usage is above 80% (82%). Immediate action recommended.',
      status: 'critical',
      time: '30 Apr 2026, 10:30 PM'
    },
    {
      title: 'D Drive',
      message: 'D Drive usage is above 70% (72%). Consider cleaning up space.',
      status: 'warning',
      time: '30 Apr 2026, 10:25 PM'
    },
    {
      title: 'Memory',
      message: 'Memory usage is above 85% (88%).',
      status: 'info',
      time: '30 Apr 2026, 10:20 PM'
    }
  ];

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',   icon: Icons.Dashboard },
    { id: 'performance',label: 'Performance',  icon: Icons.Performance },
    { id: 'storage',    label: 'Storage',      icon: Icons.Storage },
    { id: 'disk',       label: 'Disk Analyzer',icon: Icons.Drive },
    { id: 'processes',  label: 'Processes',    icon: Icons.Processes },
    { id: 'network',    label: 'Network',      icon: Icons.Network },
    { id: 'antivirus',    label: 'Antivirus',       icon: Icons.Shield },
    { id: 'unused-apps',  label: 'Unused Apps',     icon: Icons.Processes },
    { id: 'remote-nodes', label: 'Remote Nodes',    icon: Icons.RemoteNodes },
    { id: 'reports',      label: 'Health Reports',  icon: Icons.Reports },
    { id: 'about',        label: 'About',           icon: Icons.About }
  ];

  return (
    <div className="app dashboard-layout">
      {report?.mustFix && !acknowledged && (
        <CriticalGate
          blockers={report.blockers}
          scanning={loading}
          onRescan={runScan}
          onAcknowledge={() => setAcknowledged(true)}
        />
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Icons.ShieldCheck />
          </div>
          <div className="brand-info">
            <h1>Rakshak</h1>
            <p>The Performance Guard</p>
          </div>
          {grpcConnected !== null && (
            <Tooltip text={grpcConnected ? 'Connected to central server' : 'Not connected to central server'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: grpcConnected ? '#4caf50' : '#64748b', cursor: 'default', marginLeft: 'auto' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: grpcConnected ? '#4caf50' : '#475569', display: 'inline-block', flexShrink: 0 }} />
                {grpcConnected ? 'Server' : 'No Server'}
              </div>
            </Tooltip>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              badge={item.badge}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <Icons.ShieldCheck />
            <div className="status-info">
              <div className="status-title">System Status</div>
              <div className="status-value">All Systems Protected</div>
            </div>
          </div>
          <div className="version">v1.0.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-container${activeTab === 'disk' ? ' main-container--disk' : ''}`}>
        {/* Header */}
        <header className="main-header">
          <div className="header-title">
            {activeTab === 'disk' ? <Icons.Drive /> : activeTab === 'antivirus' ? <Icons.ShieldCheck /> : <Icons.Shield />}
            <div className="title-group">
              {activeTab === 'disk'
                ? <><h2>Disk Space Analyzer</h2><p>Explore and manage disk usage — visualise every file and folder like TreeSize</p></>
                : activeTab === 'antivirus'
                ? <><h2>Antivirus Scan</h2><p>ClamAV-powered malware detection — scan files, folders, or your entire drive</p></>
                : activeTab === 'unused-apps'
                ? <><h2>Unused Apps</h2><p>Discover installed apps you haven&apos;t launched in a while and reclaim disk space</p></>
                : activeTab === 'reports'
                ? <><h2>Health Reports</h2><p>Full system scan results with export options — JSON or plain text</p></>
                : activeTab === 'network'
                ? <><h2>Network</h2><p>Internet connectivity, firewall, DNS and location checks</p></>
                : activeTab === 'processes'
                ? <><h2>Processes</h2><p>Running services, startup apps and background process health</p></>
                : activeTab === 'storage'
                ? <><h2>Storage</h2><p>Disk usage, health and file system checks</p></>
                : activeTab === 'performance'
                ? <><h2>Performance</h2><p>CPU, memory and system load metrics</p></>
                : <><h2>System Health Overview</h2><p>Real-time monitoring and intelligent alerts for a healthy system</p></>}
            </div>
          </div>
          <div className="header-actions">
            {activeTab !== 'disk' && activeTab !== 'antivirus' && activeTab !== 'unused-apps' && (
              <span className="last-scanned">
                {report ? `Last scanned: ${new Date(report.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not scanned yet'}
              </span>
            )}
            <Tooltip text={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              <button className="icon-btn" onClick={toggleTheme}>
                {darkMode ? '☀️' : '🌙'}
              </button>
            </Tooltip>
            {activeTab !== 'disk' && activeTab !== 'antivirus' && activeTab !== 'unused-apps' && (
              <ExportButton report={report} />
            )}
            {activeTab !== 'disk' && activeTab !== 'antivirus' && activeTab !== 'unused-apps' && (
              <button className="btn-scan-now" onClick={runScan} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Scan Now'}
              </button>
            )}
          </div>
        </header>

        {/* Disk Analyzer View — fills remaining height, no padding */}
        {activeTab === 'disk' && (
          <div className="disk-panel-wrap">
            <DiskSpaceAnalyzer />
          </div>
        )}

        {/* Antivirus View */}
        {activeTab === 'antivirus' && (
          <div className="dashboard-content">
            <AntivirusPage />
          </div>
        )}

        {/* Unused Apps View */}
        {activeTab === 'unused-apps' && (
          <div className="dashboard-content">
            <UnusedAppsPage />
          </div>
        )}

        {/* About View */}
        {activeTab === 'about' && (
          <div className="dashboard-content">
            <AboutPage />
          </div>
        )}

        {/* Remote Nodes View */}
        {activeTab === 'remote-nodes' && (
          <div className="dashboard-content">
            <RemoteNodesPage />
          </div>
        )}

        {/* Performance View */}
        {activeTab === 'performance' && (
          <div className="dashboard-content">
            {!report ? (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                No report yet. Click <strong>Scan Now</strong> to generate a health report.
              </div>
            ) : (
              <div className="issues-section">
                <div className="section-header">
                  <div className="section-title-with-stats">
                    <h3>Performance Details</h3>
                    <div className="category-stats">
                      <span className="stat-pill ok">{categoryStats.ok} OK</span>
                      <span className="stat-pill warning">{categoryStats.warning} Warning</span>
                      <span className="stat-pill critical">{categoryStats.critical} Critical</span>
                    </div>
                  </div>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredResults.length}
                    totalCount={categoryStats.total}
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <div className="no-results">
                    {searchQuery ? 'No matching results found.' : 'No performance checks found.'}
                  </div>
                ) : (
                  <IssueList results={filteredResults} isFiltered={!!searchQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Storage View */}
        {activeTab === 'storage' && (
          <div className="dashboard-content">
            {!report ? (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                No report yet. Click <strong>Scan Now</strong> to generate a health report.
              </div>
            ) : (
              <div className="issues-section">
                <div className="section-header">
                  <div className="section-title-with-stats">
                    <h3>Storage Details</h3>
                    <div className="category-stats">
                      <span className="stat-pill ok">{categoryStats.ok} OK</span>
                      <span className="stat-pill warning">{categoryStats.warning} Warning</span>
                      <span className="stat-pill critical">{categoryStats.critical} Critical</span>
                    </div>
                  </div>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredResults.length}
                    totalCount={categoryStats.total}
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <div className="no-results">
                    {searchQuery ? 'No matching results found.' : 'No storage checks found.'}
                  </div>
                ) : (
                  <IssueList results={filteredResults} isFiltered={!!searchQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Processes View */}
        {activeTab === 'processes' && (
          <div className="dashboard-content">
            {!report ? (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                No report yet. Click <strong>Scan Now</strong> to generate a health report.
              </div>
            ) : (
              <div className="issues-section">
                <div className="section-header">
                  <div className="section-title-with-stats">
                    <h3>Process Details</h3>
                    <div className="category-stats">
                      <span className="stat-pill ok">{categoryStats.ok} OK</span>
                      <span className="stat-pill warning">{categoryStats.warning} Warning</span>
                      <span className="stat-pill critical">{categoryStats.critical} Critical</span>
                    </div>
                  </div>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredResults.length}
                    totalCount={categoryStats.total}
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <div className="no-results">
                    {searchQuery ? 'No matching results found.' : 'No process checks found.'}
                  </div>
                ) : (
                  <IssueList results={filteredResults} isFiltered={!!searchQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Network View */}
        {activeTab === 'network' && (
          <div className="dashboard-content">
            {!report ? (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                No report yet. Click <strong>Scan Now</strong> to generate a health report.
              </div>
            ) : (
              <div className="issues-section">
                <div className="section-header">
                  <div className="section-title-with-stats">
                    <h3>Network Details</h3>
                    <div className="category-stats">
                      <span className="stat-pill ok">{categoryStats.ok} OK</span>
                      <span className="stat-pill warning">{categoryStats.warning} Warning</span>
                      <span className="stat-pill critical">{categoryStats.critical} Critical</span>
                    </div>
                  </div>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredResults.length}
                    totalCount={categoryStats.total}
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <div className="no-results">
                    {searchQuery ? 'No matching results found.' : 'No network checks found.'}
                  </div>
                ) : (
                  <IssueList results={filteredResults} isFiltered={!!searchQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Health Reports View */}
        {activeTab === 'reports' && (
          <div className="dashboard-content">
            {!report ? (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                No report yet. Click <strong>Scan Now</strong> to generate a health report.
              </div>
            ) : (
              <div className="issues-section">
                <div className="report-summary-bar">
                  <div className="report-summary-left">
                    <div className="report-score-badge" style={{
                      background: report.score >= 75 ? 'rgba(63,185,80,0.15)' : report.score >= 60 ? 'rgba(210,153,34,0.15)' : 'rgba(248,81,73,0.15)',
                      borderColor: report.score >= 75 ? '#3fb950' : report.score >= 60 ? '#d29922' : '#f85149',
                      color: report.score >= 75 ? '#3fb950' : report.score >= 60 ? '#d29922' : '#f85149',
                    }}>
                      <span className="report-score-num">{report.score}</span>
                      <span className="report-score-label">{report.score >= 75 ? 'Good' : report.score >= 60 ? 'Fair' : 'Poor'}</span>
                    </div>
                    <div className="report-summary-info">
                      <h3>System Health Report</h3>
                      <p>Generated {new Date(report.timestamp).toLocaleString()} &middot; {report.platform}</p>
                    </div>
                  </div>
                  <div className="report-summary-right">
                    <div className="category-stats">
                      <span className="stat-pill ok">{report.okCount} OK</span>
                      <span className="stat-pill warning">{report.warningCount} Warning</span>
                      <span className="stat-pill critical">{report.criticalCount} Critical</span>
                    </div>
                    <ExportButton report={report} />
                  </div>
                </div>
                <div className="report-divider" />
                <div className="issues-section-header">
                  <h3>All Checks ({report.results.length})</h3>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredResults.length}
                    totalCount={report.results.length}
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <div className="no-results">No matching results found.</div>
                ) : (
                  <IssueList results={filteredResults} isFiltered={!!searchQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* All other tabs — single scrollable pane */}
        {activeTab !== 'disk' && activeTab !== 'about' && activeTab !== 'antivirus' && activeTab !== 'unused-apps' && activeTab !== 'reports' && activeTab !== 'network' && activeTab !== 'processes' && activeTab !== 'storage' && activeTab !== 'performance' && activeTab !== 'remote-nodes' && (
          <div className="dashboard-content">
          {loading && scanProgress.current && (
            <div className="scan-progress-bar">
              <div className="scan-progress-info">
                <span>Scanning: {scanProgress.current}</span>
                <span>{Math.round((scanProgress.completed / scanProgress.total) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(scanProgress.completed / scanProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="stats-grid">
            <StatCard
              title="CPU Usage"
              value={cpuValue ?? 0}
              unit="%"
              icon={Icons.CPU}
              color="#3b82f6"
              sparklineData={generateSparkline(cpuValue ?? 0)}
            />
            <StatCard
              title="Memory Usage"
              value={ramValue ?? 0}
              unit="%"
              icon={Icons.Memory}
              color="#f59e0b"
              sparklineData={generateSparkline(ramValue ?? 0)}
            />
            <StatCard
              title="Storage Usage"
              value={diskValue ?? 0}
              unit="%"
              icon={Icons.Drive}
              color="#ef4444"
              sparklineData={generateSparkline(diskValue ?? 0)}
            />
            <StatCard
              title="Internet Speed"
              value={netSpeedResult?.details?.mbps ?? 0}
              unit=" Mbps"
              icon={Icons.Wifi}
              color="#10b981"
              trend={netSpeedResult?.details?.mbps ? `↓ ${netSpeedResult.details.mbps} Mbps` : ''}
            />
          </div>

          {/* Storage Section */}
          <div className="storage-section">
            <div className="section-header">
              <div className="section-title-group">
                <Icons.Drive />
                <div>
                  <h3>Storage / Drives</h3>
                  <p>Intelligent multi-drive monitoring with adaptive thresholds</p>
                </div>
              </div>
              <button className="btn-manage">Manage Drives</button>
            </div>

            <div className="drives-grid">
              {drives.length === 0 ? (
                <div className="drive-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                  Loading drive info…
                </div>
              ) : drives.map(drv => {
                const statusColor = drv.status === 'critical' ? '#ef4444' : drv.status === 'warning' ? '#f59e0b' : '#22c55e';
                const usedColor   = drv.status === 'critical' ? '#ef4444' : drv.status === 'warning' ? '#f59e0b' : undefined;
                const alertMsg    = drv.status === 'critical'
                  ? `Red Alert: ${drv.drive} usage is above ${drv.critPct}%. Consider cleaning up space.`
                  : drv.status === 'warning'
                  ? `Orange Alert: ${drv.drive} usage is above ${drv.warnPct}%.`
                  : null;
                return (
                  <div key={drv.drive} className={`drive-card ${drv.status}`}>
                    <div className="drive-header">
                      <div className="drive-info">
                        <div className={`drive-icon ${drv.isSystem ? 'windows' : 'data'}`}>
                          {drv.isSystem ? <Icons.Shield /> : <Icons.Drive />}
                        </div>
                        <div className="drive-details">
                          <h4>{drv.drive} Drive</h4>
                          <span>({drv.isSystem ? 'System Drive' : 'Data Drive'})</span>
                        </div>
                      </div>
                      {drv.status !== 'ok' && (
                        <span className={`drive-status ${drv.status}`}>{drv.status.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="drive-content">
                      <CircularProgress value={drv.usedPct} size={140} color={statusColor}>
                        <div className="drive-stats">
                          <span className="drive-percent">{drv.usedPct}%</span>
                          <span className="drive-label">Used</span>
                        </div>
                      </CircularProgress>
                      <div className="drive-metrics">
                        <div className="metric">
                          <span className="metric-label">Total Space</span>
                          <span className="metric-value">{drv.totalGB} GB</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Used Space</span>
                          <span className="metric-value" style={usedColor ? { color: usedColor } : {}}>{drv.usedGB} GB</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Free Space</span>
                          <span className="metric-value" style={{ color: '#22c55e' }}>{drv.freeGB} GB</span>
                        </div>
                        <div className="alert-thresholds">
                          <div className="threshold">
                            <span className="dot orange" /> {drv.warnPct}% Orange Alert
                          </div>
                          <div className="threshold">
                            <span className="dot red" /> {drv.critPct}% Red Alert
                          </div>
                        </div>
                      </div>
                    </div>
                    {alertMsg && (
                      <div className="drive-alert">
                        <Icons.Warning />
                        <span>{alertMsg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts & Live Monitor */}
          <div className="bottom-section">
            <div className="recent-alerts">
              <div className="section-header">
                <h3>Recent Alerts</h3>
                <button className="link-view-all">View All Alerts →</button>
              </div>
              <div className="alerts-list">
                {alerts.map((alert, idx) => (
                  <AlertItem key={idx} {...alert} />
                ))}
              </div>
            </div>
            <LiveAlerts />
          </div>

          {/* Category-Specific Health Details */}
          {report && activeTab !== 'settings' && activeTab !== 'about' && (
            <div className="issues-section">
              <div className="section-header">
                <div className="section-title-with-stats">
                  <h3>
                    {activeTab === 'dashboard' && 'System Health Details'}
                    {activeTab === 'performance' && 'Performance Details'}
                    {activeTab === 'storage' && 'Storage Details'}
                    {activeTab === 'processes' && 'Process Details'}
                    {activeTab === 'network' && 'Network Details'}
                    {activeTab === 'alerts' && 'All Alerts'}
                    {activeTab === 'reports' && 'Health Reports'}
                  </h3>
                  {activeTab !== 'dashboard' && activeTab !== 'reports' && (
                    <div className="category-stats">
                      <span className="stat-pill ok">{categoryStats.ok} OK</span>
                      <span className="stat-pill warning">{categoryStats.warning} Warning</span>
                      <span className="stat-pill critical">{categoryStats.critical} Critical</span>
                    </div>
                  )}
                </div>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  resultCount={filteredResults.length}
                  totalCount={activeTab === 'dashboard' ? report.results.length : categoryStats.total}
                />
              </div>
              {filteredResults.length === 0 ? (
                <div className="no-results">
                  {searchQuery ? 'No matching results found.' : 'No items in this category.'}
                </div>
              ) : (
                <IssueList results={filteredResults} isFiltered={!!searchQuery || activeTab !== 'dashboard'} />
              )}
            </div>
          )}
        </div>
        )}

      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
