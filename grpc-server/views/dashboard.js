'use strict';

const { CSS, ICONS, shieldSvg, escHtml } = require('./shared');

/**
 * Render the node dashboard — full SPA with tab navigation.
 * All sections (Dashboard, Performance, Storage, Processes, Network, Alerts, Reports, About)
 * are rendered client-side from /api/nodes/:id data.
 * @param {string} nodeId
 */
function render(nodeId) {
  const safeId = escHtml(nodeId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rakshak — Node Dashboard</title>
  ${CSS}
  <style>
    .conn-badge{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 10px;border-radius:99px;font-weight:600}
    .conn-badge.on{background:rgba(16,185,129,.1);color:#34d399}.conn-badge.off{background:rgba(71,85,105,.1);color:#64748b}
    .conn-dot{width:7px;height:7px;border-radius:50%}
    .conn-badge.on .conn-dot{background:#10b981;animation:pulse 2s infinite}
    .conn-badge.off .conn-dot{background:#475569}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spin-anim{animation:spin 1s linear infinite}
    .topbar-icon-shield{width:36px;height:36px;border-radius:9px;background:rgba(59,130,246,.1);display:flex;align-items:center;justify-content:center}
    .mc-net-row{display:flex;align-items:center;gap:6px;font-size:12px}.mc-net-row+.mc-net-row{margin-top:4px}
    .skeleton{background:linear-gradient(90deg,#1e293b 25%,#243044 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
    @keyframes shimmer{to{background-position:-200% 0}}
    .no-data{font-size:20px;color:var(--text3);font-weight:700}
    /* Score section */
    .score-section{display:flex;align-items:center;gap:32px;padding:20px 28px 0}
    .score-ring-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
    .score-info{flex:1}.score-title{font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px}.score-sub{font-size:13px;color:var(--text3)}
    .score-pills{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
    .score-pill{font-size:12px;font-weight:600;padding:4px 12px;border-radius:99px}
    .score-pill.ok{background:rgba(16,185,129,.12);color:#34d399}.score-pill.warning{background:rgba(245,158,11,.12);color:#fbbf24}.score-pill.critical{background:rgba(239,68,68,.12);color:#f87171}
    /* Results tiles */
    .results-section{padding:16px 28px 0}
    .results-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .results-title{font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:8px}
    .results-stats{display:flex;gap:8px}
    .rstat{font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px}
    .rstat.ok{background:rgba(16,185,129,.12);color:#34d399}.rstat.warning{background:rgba(245,158,11,.12);color:#fbbf24}.rstat.critical{background:rgba(239,68,68,.12);color:#f87171}
    .results-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
    .rtile{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
    .rtile:hover{border-color:var(--border2);box-shadow:0 4px 12px rgba(0,0,0,.2)}
    .rtile.ok{border-left:3px solid #10b981}.rtile.warning{border-left:3px solid #f59e0b}.rtile.critical{border-left:3px solid #ef4444}
    .rtile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    .rtile-icon{font-size:20px;line-height:1;flex-shrink:0;margin-top:1px}
    .rtile-body{flex:1;min-width:0}
    .rtile-name{font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px}
    .rtile-msg{font-size:11px;color:var(--text3);line-height:1.4}
    .rtile-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;flex-shrink:0;margin-top:2px}
    .rtile-badge.ok{background:rgba(16,185,129,.12);color:#34d399}.rtile-badge.warning{background:rgba(245,158,11,.12);color:#fbbf24}.rtile-badge.critical{background:rgba(239,68,68,.12);color:#f87171}
    .rtile-detail{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:none}
    .rtile.open .rtile-detail{display:block}
    .rtile-suggestion{margin-top:8px;padding:8px 10px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:7px;font-size:11px;color:#93c5fd;line-height:1.5}
    /* Empty state */
    .section-empty{text-align:center;padding:48px 20px;color:var(--text3)}
    .section-empty-icon{font-size:36px;margin-bottom:12px}
    .section-empty-title{font-size:14px;color:var(--text2);font-weight:600;margin-bottom:6px}
    .section-empty-sub{font-size:12px}
    /* Network detail */
    .net-detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px 28px 0}
    .net-detail-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
    .ndc-label{font-size:10px;text-transform:uppercase;color:var(--text3);letter-spacing:.5px;margin-bottom:8px}
    .ndc-val{font-size:24px;font-weight:800}.ndc-sub{font-size:11px;color:var(--text3);margin-top:4px}
    /* Reports */
    .report-section{padding:16px 28px 0}
    .report-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .rsum-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center}
    .rsum-val{font-size:28px;font-weight:800}.rsum-label{font-size:11px;color:var(--text3);margin-top:4px}
    .report-full{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
    .report-full-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border)}
    .report-full-title{font-size:13px;font-weight:600;color:var(--text)}
    .report-full-body{max-height:420px;overflow-y:auto}
    .report-row{display:flex;align-items:flex-start;gap:12px;padding:11px 18px;border-bottom:1px solid var(--border)}
    .report-row:last-child{border-bottom:none}
    .report-row-icon{font-size:16px;flex-shrink:0;margin-top:1px}
    .report-row-body{flex:1;min-width:0}
    .report-row-name{font-size:12px;font-weight:600;color:var(--text)}
    .report-row-msg{font-size:11px;color:var(--text3);margin-top:2px}
    .report-row-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0;margin-top:2px}
    .report-row-badge.ok{background:rgba(16,185,129,.12);color:#34d399}.report-row-badge.warning{background:rgba(245,158,11,.12);color:#fbbf24}.report-row-badge.critical{background:rgba(239,68,68,.12);color:#f87171}
    .export-btns{display:flex;gap:8px}
    .btn-export{font-size:11px;font-weight:600;padding:6px 14px;border-radius:7px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);transition:all .15s}
    .btn-export:hover{border-color:var(--blue);color:var(--blue)}
    /* About */
    .about-section{padding:24px 28px}
    .about-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:28px;max-width:680px}
    .about-logo{display:flex;align-items:center;gap:16px;margin-bottom:24px}
    .about-title{font-size:24px;font-weight:800;color:var(--text)}.about-version{font-size:12px;color:var(--text3);margin-top:2px}
    .about-desc{font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:20px}
    .about-features{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
    .about-feat{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--card2);border-radius:8px}
    .about-feat-icon{font-size:18px;flex-shrink:0}
    .about-feat-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
    .about-feat-sub{font-size:11px;color:var(--text3)}
    /* Alerts full view */
    .alerts-section{padding:16px 28px 0}
    .alerts-full-list{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
    .alerts-filter-row{display:flex;gap:8px;margin-bottom:14px}
    .filter-btn{font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text2);transition:all .15s}
    .filter-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}
    .filter-btn:hover:not(.active){border-color:var(--blue);color:var(--blue)}
    /* View sections */
    .view-section{display:none}
    .view-section.active{display:block}
    #view-dashboard.active{display:flex;flex-direction:column}
  </style>
</head>
<body>
<div class="app">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="brand">
      ${shieldSvg(30, '#3b82f6')}
      <div class="brand-text">
        <span class="brand-name">Rakshak</span>
        <span class="brand-tag">The Performance Guard</span>
      </div>
    </div>
    <nav class="nav" id="sidebar-nav">
      <a href="/nodes" class="nav-item">
        <span class="nav-icon">${ICONS.nodes}</span><span>Nodes</span>
      </a>
      <a href="#" class="nav-item active" id="nav-dashboard" onclick="navigate('dashboard');return false;">
        <span class="nav-icon">${ICONS.dashboard}</span><span>Dashboard</span>
      </a>
      <a href="#" class="nav-item" id="nav-performance" onclick="navigate('performance');return false;">
        <span class="nav-icon">${ICONS.performance}</span><span>Performance</span>
      </a>
      <a href="#" class="nav-item" id="nav-storage" onclick="navigate('storage');return false;">
        <span class="nav-icon">${ICONS.storage}</span><span>Storage</span>
      </a>
      <a href="#" class="nav-item" id="nav-processes" onclick="navigate('processes');return false;">
        <span class="nav-icon">${ICONS.processes}</span><span>Processes</span>
      </a>
      <a href="#" class="nav-item" id="nav-network" onclick="navigate('network');return false;">
        <span class="nav-icon">${ICONS.network}</span><span>Network</span>
      </a>
      <a href="#" class="nav-item" id="nav-alerts" onclick="navigate('alerts');return false;">
        <span class="nav-icon">${ICONS.alerts}</span><span>Alerts</span>
        <span class="nav-badge" id="alerts-badge" style="display:none">0</span>
      </a>
      <a href="#" class="nav-item" id="nav-reports" onclick="navigate('reports');return false;">
        <span class="nav-icon">${ICONS.reports}</span><span>Health Reports</span>
      </a>
      <a href="#" class="nav-item" id="nav-about" onclick="navigate('about');return false;">
        <span class="nav-icon">${ICONS.about}</span><span>About</span>
      </a>
    </nav>
    <div class="sys-status">
      <div class="ss-label">System Status</div>
      <div class="ss-inner">
        <div class="ss-icon green" id="ss-icon">${shieldSvg(18,'#10b981')}</div>
        <div>
          <div class="ss-title" id="ss-title">All Systems</div>
          <div class="ss-sub green" id="ss-sub">Protected</div>
        </div>
      </div>
    </div>
    <div class="version">v1.0.0</div>
  </aside>

  <!-- MAIN -->
  <div class="main">

    <!-- TOPBAR (shared) -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon-shield">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <div class="topbar-title" id="topbar-title">System Health Overview</div>
          <div class="topbar-sub" id="topbar-sub">Real-time monitoring and intelligent alerts for a healthy system</div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="last-scan" id="last-scan">—</span>
        <div id="conn-badge" class="conn-badge off"><span class="conn-dot"></span><span id="conn-label">Connecting…</span></div>
        <button class="btn-scan" id="scan-btn" onclick="triggerScan()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Scan Now
        </button>
      </div>
    </div>

    <!-- ═══ DASHBOARD ═══════════════════════════════════════════════════ -->
    <div class="view-section active" id="view-dashboard">
      <div class="metrics-row">
        <div class="metric-card">
          <div class="mc-header"><div class="mc-left">
            <div class="mc-icon blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
                <line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/>
                <line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>
                <line x1="2" y1="9" x2="4" y2="9"/><line x1="20" y1="9" x2="22" y2="9"/>
                <line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="15" x2="22" y2="15"/>
              </svg>
            </div>
            <span class="mc-label">CPU Usage</span>
          </div></div>
          <div class="mc-body">
            <div><div class="mc-value green" id="cpu-val"><span class="no-data">—</span></div><div class="mc-sub" id="cpu-sub">—</div></div>
            <div class="mc-sparkline" id="cpu-spark"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="mc-header"><div class="mc-left">
            <div class="mc-icon orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                <path d="M2 6h20v12H2z"/><path d="M6 6V4"/><path d="M10 6V4"/><path d="M14 6V4"/><path d="M18 6V4"/>
                <path d="M6 18v2"/><path d="M10 18v2"/><path d="M14 18v2"/><path d="M18 18v2"/>
              </svg>
            </div>
            <span class="mc-label">Memory Usage</span>
          </div></div>
          <div class="mc-body">
            <div><div class="mc-value orange" id="mem-val"><span class="no-data">—</span></div><div class="mc-sub" id="mem-sub">—</div></div>
            <div class="mc-sparkline" id="mem-spark"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="mc-header"><div class="mc-left">
            <div class="mc-icon purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <span class="mc-label">Storage Usage</span>
          </div></div>
          <div class="mc-body">
            <div><div class="mc-value red" id="disk-val"><span class="no-data">—</span></div><div class="mc-sub" id="disk-sub">—</div></div>
            <div class="mc-sparkline" id="disk-spark"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="mc-header"><div class="mc-left">
            <div class="mc-icon green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                <path d="M10.54 16a3 3 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <span class="mc-label">Internet Speed</span>
          </div></div>
          <div class="mc-body">
            <div style="flex:1">
              <div class="mc-net-row"><span style="font-size:18px;font-weight:700" id="net-speed">—</span></div>
              <div class="mc-sub" id="net-latency-sub">—</div>
              <div class="mc-sub" id="net-status" style="margin-top:2px">—</div>
            </div>
            <div class="mc-sparkline" id="net-spark"></div>
          </div>
        </div>
      </div>

      <div class="section" style="margin-top:12px">
        <div class="section-hd">
          <div class="section-hd-left">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              Storage / Drives
            </div>
            <div class="section-sub">Intelligent drive monitoring with adaptive alert thresholds</div>
          </div>
          <button class="btn-sm" onclick="navigate('storage')">⚙ Manage Drives</button>
        </div>
        <div class="drives-grid" id="drives-grid">
          <div class="empty-state" style="padding:30px 0"><div class="empty-sub">Waiting for scan data…</div></div>
        </div>
      </div>

      <div class="opt-banner" id="opt-banner" style="display:none">
        <div>
          <div class="opt-title">⚡ Storage Optimization Recommended</div>
          <div class="opt-sub" id="opt-sub">Analyzing storage…</div>
        </div>
        <button class="btn-optimize" onclick="navigate('storage')">⚙ Optimize Now</button>
      </div>

      <div class="bottom-row">
        <div class="bottom-card">
          <div class="bc-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Recent Alerts
            <span class="view-all" onclick="navigate('alerts')" style="cursor:pointer">View All Alerts →</span>
          </div>
          <div id="alerts-list"><div class="empty-sub" style="color:var(--text3);font-size:12px;padding:12px 0">Loading alerts…</div></div>
        </div>
        <div class="bottom-card">
          <div class="bc-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Live Monitoring
          </div>
          <div class="mc-sub" style="margin-bottom:10px" id="dash-score-row">Health score: —</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Quick links</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn-sm" onclick="navigate('performance')">⚡ Performance</button>
            <button class="btn-sm" onclick="navigate('network')">🌐 Network</button>
            <button class="btn-sm" onclick="navigate('processes')">⚙ Processes</button>
            <button class="btn-sm" onclick="navigate('reports')">📊 Reports</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ PERFORMANCE ════════════════════════════════════════════════ -->
    <div class="view-section" id="view-performance">
      <div class="score-section" id="perf-score-section" style="display:none">
        <div class="score-ring-wrap" id="perf-score-ring"></div>
        <div class="score-info">
          <div class="score-title" id="perf-score-title">—</div>
          <div class="score-sub" id="perf-score-sub">Run a scan to see performance details</div>
          <div class="score-pills" id="perf-score-pills"></div>
        </div>
      </div>
      <div class="results-section">
        <div class="results-header">
          <div class="results-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Performance Checks
          </div>
          <div class="results-stats" id="perf-stats"></div>
        </div>
        <div class="results-grid" id="perf-grid">
          <div class="section-empty"><div class="section-empty-icon">⏳</div><div class="section-empty-title">Waiting for scan data</div><div class="section-empty-sub">Click Scan Now to run a health check</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ STORAGE ════════════════════════════════════════════════════ -->
    <div class="view-section" id="view-storage">
      <div class="section" style="margin-top:16px">
        <div class="section-hd">
          <div class="section-hd-left">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              Storage / Drives
            </div>
            <div class="section-sub">Intelligent drive monitoring with adaptive alert thresholds</div>
          </div>
        </div>
        <div class="drives-grid" id="storage-drives-grid">
          <div class="section-empty"><div class="section-empty-icon">⏳</div><div class="section-empty-title">Waiting for scan data</div></div>
        </div>
      </div>
      <div class="results-section" style="margin-top:16px">
        <div class="results-header">
          <div class="results-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            Storage Checks
          </div>
          <div class="results-stats" id="storage-stats"></div>
        </div>
        <div class="results-grid" id="storage-grid">
          <div class="section-empty"><div class="section-empty-icon">⏳</div><div class="section-empty-title">Waiting for scan data</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ PROCESSES ══════════════════════════════════════════════════ -->
    <div class="view-section" id="view-processes">
      <div class="results-section" style="margin-top:16px">
        <div class="results-header">
          <div class="results-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>
              <line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/>
              <line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/>
            </svg>
            Processes &amp; Services
          </div>
          <div class="results-stats" id="proc-stats"></div>
        </div>
        <div class="results-grid" id="proc-grid">
          <div class="section-empty"><div class="section-empty-icon">⏳</div><div class="section-empty-title">Waiting for scan data</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ NETWORK ════════════════════════════════════════════════════ -->
    <div class="view-section" id="view-network">
      <div class="net-detail-grid" id="net-detail-grid"></div>
      <div class="results-section" style="margin-top:16px">
        <div class="results-header">
          <div class="results-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Network Checks
          </div>
          <div class="results-stats" id="net-stats"></div>
        </div>
        <div class="results-grid" id="net-grid">
          <div class="section-empty"><div class="section-empty-icon">⏳</div><div class="section-empty-title">Waiting for scan data</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ ALERTS ══════════════════════════════════════════════════════ -->
    <div class="view-section" id="view-alerts">
      <div class="alerts-section">
        <div class="alerts-filter-row">
          <button class="filter-btn active" onclick="filterAlerts('all',this)">All</button>
          <button class="filter-btn" onclick="filterAlerts('CRITICAL',this)">Critical</button>
          <button class="filter-btn" onclick="filterAlerts('WARNING',this)">Warning</button>
          <button class="filter-btn" onclick="filterAlerts('INFO',this)">Info</button>
        </div>
        <div class="alerts-full-list" id="alerts-full-list">
          <div class="section-empty"><div class="section-empty-icon">🔔</div><div class="section-empty-title">No alerts yet</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ REPORTS ══════════════════════════════════════════════════════ -->
    <div class="view-section" id="view-reports">
      <div class="report-section">
        <div class="report-summary">
          <div class="rsum-card"><div class="rsum-val" id="rep-score" style="color:#10b981">—</div><div class="rsum-label">Health Score</div></div>
          <div class="rsum-card"><div class="rsum-val" id="rep-ok" style="color:#10b981">—</div><div class="rsum-label">OK Checks</div></div>
          <div class="rsum-card"><div class="rsum-val" id="rep-warn" style="color:#f59e0b">—</div><div class="rsum-label">Warnings</div></div>
          <div class="rsum-card"><div class="rsum-val" id="rep-crit" style="color:#ef4444">—</div><div class="rsum-label">Critical</div></div>
        </div>
        <div class="report-full">
          <div class="report-full-hd">
            <span class="report-full-title">Full Check Results</span>
            <div class="export-btns">
              <button class="btn-export" onclick="exportReport('json')">⬇ Export JSON</button>
              <button class="btn-export" onclick="exportReport('text')">⬇ Export Text</button>
            </div>
          </div>
          <div class="report-full-body" id="report-full-body">
            <div class="section-empty"><div class="section-empty-icon">📊</div><div class="section-empty-title">No report data yet</div><div class="section-empty-sub">Run a scan to generate a report</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ ABOUT ═════════════════════════════════════════════════════════ -->
    <div class="view-section" id="view-about">
      <div class="about-section">
        <div class="about-card">
          <div class="about-logo">
            ${shieldSvg(48,'#3b82f6')}
            <div>
              <div class="about-title">Rakshak</div>
              <div class="about-version">Version 1.0.0 — The Performance Guard</div>
            </div>
          </div>
          <div class="about-desc">
            Rakshak is a real-time system health monitoring tool that keeps your machines protected.
            It continuously checks CPU, memory, storage, network, services and security — alerting you before problems escalate.
            The central server aggregates health data from all connected Rakshak nodes.
          </div>
          <div class="about-features">
            <div class="about-feat"><div class="about-feat-icon">⚡</div><div><div class="about-feat-title">Real-time Monitoring</div><div class="about-feat-sub">Live metrics pushed via gRPC streams</div></div></div>
            <div class="about-feat"><div class="about-feat-icon">🛡️</div><div><div class="about-feat-title">Security Checks</div><div class="about-feat-sub">Antivirus, firewall & update status</div></div></div>
            <div class="about-feat"><div class="about-feat-icon">💾</div><div><div class="about-feat-title">Storage Analysis</div><div class="about-feat-sub">Intelligent drive monitoring with adaptive thresholds</div></div></div>
            <div class="about-feat"><div class="about-feat-icon">🌐</div><div><div class="about-feat-title">Network Intelligence</div><div class="about-feat-sub">Speed, latency, location & connectivity checks</div></div></div>
            <div class="about-feat"><div class="about-feat-icon">📊</div><div><div class="about-feat-title">Health Reports</div><div class="about-feat-sub">Export full scan results as JSON or text</div></div></div>
            <div class="about-feat"><div class="about-feat-icon">🔔</div><div><div class="about-feat-title">Smart Alerts</div><div class="about-feat-sub">Severity-based alerting across all nodes</div></div></div>
          </div>
          <div style="font-size:11px;color:var(--text3)">Node ID: <span style="font-family:monospace;color:var(--text2)">${safeId}</span></div>
        </div>
      </div>
    </div>

  </div><!-- /main -->
</div><!-- /app -->

<script>
  const NODE_ID = '${safeId}';

  let _node = null, _alerts = [], _alertFilter = 'all';

  // ── Navigation ──────────────────────────────────────────────────────────────
  const TOPBAR_META = {
    dashboard:   { title:'System Health Overview',    sub:'Real-time monitoring and intelligent alerts for a healthy system' },
    performance: { title:'Performance',               sub:'CPU, memory and system load metrics' },
    storage:     { title:'Storage',                   sub:'Disk usage, health and file system checks' },
    processes:   { title:'Processes',                 sub:'Running services, startup apps and background process health' },
    network:     { title:'Network',                   sub:'Internet connectivity, firewall, DNS and location checks' },
    alerts:      { title:'Alerts',                    sub:'System health alerts and notifications' },
    reports:     { title:'Health Reports',            sub:'Full system scan results with export options' },
    about:       { title:'About Rakshak',             sub:'System health monitoring — The Performance Guard' },
  };

  function navigate(tab) {
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById('nav-' + tab);
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const viewEl = document.getElementById('view-' + tab);
    if (viewEl) viewEl.classList.add('active');
    const meta = TOPBAR_META[tab] || TOPBAR_META.dashboard;
    document.getElementById('topbar-title').textContent = meta.title;
    document.getElementById('topbar-sub').textContent   = meta.sub;
    if (_node) {
      if (tab === 'performance') renderPerformance(_node);
      if (tab === 'storage')     renderStorageView(_node);
      if (tab === 'processes')   renderProcesses(_node);
      if (tab === 'network')     renderNetworkView(_node);
      if (tab === 'alerts')      renderAlertsView(_alerts);
      if (tab === 'reports')     renderReports(_node);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function mCls(v,w,c){return v>=c?'red':v>=w?'orange':'green'}
  function mHex(c){return c==='red'?'#ef4444':c==='orange'?'#f59e0b':'#10b981'}
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function fmtTime(ts){try{return new Date(ts).toLocaleString()}catch{return ts||'—'}}

  function sparkline(data,color){
    if(!data||data.length<2)return '';
    const W=80,H=32,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
    const pts=data.map((v,i)=>{
      const x=(i/(data.length-1))*W,y=H-((v-min)/range)*(H-6)-3;
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    return '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" fill="none" style="overflow:visible">'
      +'<polyline points="'+pts+'" stroke="'+color+'" stroke-width="1.5" opacity="0.85" stroke-linejoin="round"/>'
      +'</svg>';
  }

  function donut(pct,color,size=110){
    const r=40,cx=size/2,cy=size/2,circ=2*Math.PI*r;
    const fill=Math.max(0,Math.min(pct,100))/100*circ;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#1e293b" stroke-width="9"/>'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="9"'
      +' stroke-dasharray="'+fill.toFixed(2)+' '+(circ-fill).toFixed(2)+'"'
      +' transform="rotate(-90 '+cx+' '+cy+')" stroke-linecap="round"/>'
      +'<text x="'+cx+'" y="'+(cy+6)+'" text-anchor="middle" fill="'+color+'" font-size="16" font-weight="800">'+Math.round(pct)+'%</text>'
      +'<text x="'+cx+'" y="'+(cy+20)+'" text-anchor="middle" fill="#64748b" font-size="9">Used</text>'
      +'</svg>';
  }

  function scoreRing(score,size=110){
    const color=score>=75?'#10b981':score>=50?'#f59e0b':'#ef4444';
    const r=40,cx=size/2,cy=size/2,circ=2*Math.PI*r;
    const fill=Math.max(0,Math.min(score,100))/100*circ;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#1e293b" stroke-width="9"/>'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="9"'
      +' stroke-dasharray="'+fill.toFixed(2)+' '+(circ-fill).toFixed(2)+'"'
      +' transform="rotate(-90 '+cx+' '+cy+')" stroke-linecap="round"/>'
      +'<text x="'+cx+'" y="'+(cy+6)+'" text-anchor="middle" fill="'+color+'" font-size="18" font-weight="800">'+score+'</text>'
      +'<text x="'+cx+'" y="'+(cy+20)+'" text-anchor="middle" fill="#64748b" font-size="9">/ 100</text>'
      +'</svg>';
  }

  // ── Check metadata ───────────────────────────────────────────────────────────
  const CHECK_META = {
    'cpu':{'icon':'⚡','label':'CPU Usage'},
    'ram':{'icon':'🧠','label':'Memory'},
    'disk':{'icon':'💾','label':'Storage'},
    'internet':{'icon':'🌐','label':'Internet'},
    'network-quality':{'icon':'📶','label':'Connection Stability'},
    'network-speed':{'icon':'🚀','label':'Download Speed'},
    'network-location':{'icon':'📍','label':'Network Location'},
    'win-startup-apps':{'icon':'🏁','label':'Startup Apps'},
    'win-defender':{'icon':'🛡️','label':'Windows Defender'},
    'win-firewall':{'icon':'🧱','label':'Windows Firewall'},
    'win-critical-services':{'icon':'⚙️','label':'Critical Services'},
    'linux-failed-services':{'icon':'⚙️','label':'Failed Services'},
    'linux-firewall':{'icon':'🧱','label':'Linux Firewall'},
    'linux-load-average':{'icon':'📊','label':'Load Average'},
    'linux-log-errors':{'icon':'📋','label':'Log Errors'},
    'updates':{'icon':'🔄','label':'System Updates'},
    'antivirus':{'icon':'🛡️','label':'Antivirus'},
    'duplicates':{'icon':'📁','label':'Duplicate Files'},
    'unused-apps':{'icon':'📦','label':'Unused Apps'},
    'git':{'icon':'🔀','label':'Git Status'},
  };
  function getMeta(id){return CHECK_META[id]||{icon:'🔍',label:id.charAt(0).toUpperCase()+id.slice(1).replace(/-/g,' ')};}

  // ── Section filters ───────────────────────────────────────────────────────────
  const SECTION_IDS = {
    performance: ['cpu','ram','win-startup-apps','linux-load-average','updates'],
    storage:     ['disk','duplicates','unused-apps'],
    processes:   ['win-critical-services','linux-failed-services','win-startup-apps','linux-log-errors'],
    network:     ['internet','network-quality','network-speed','network-location','win-firewall','linux-firewall'],
  };
  const SECTION_KEYWORDS = {
    performance: ['cpu','ram','memory','load','startup'],
    storage:     ['disk','storage','duplicate','unused'],
    processes:   ['service','process','startup'],
    network:     ['internet','network','firewall','speed','dns','latency'],
  };

  function filterResults(results,section){
    if(!results)return [];
    const ids=SECTION_IDS[section]||[];
    const byId=results.filter(r=>ids.includes(r.id));
    if(byId.length>0)return byId;
    const kw=SECTION_KEYWORDS[section]||[];
    return results.filter(r=>kw.some(k=>
      r.id.toLowerCase().includes(k)||
      (r.category||'').toLowerCase().includes(k)||
      r.name.toLowerCase().includes(k)
    ));
  }

  // ── Tile rendering ────────────────────────────────────────────────────────────
  let _tc=0;
  function renderTile(result){
    const meta=getMeta(result.id);
    const tid='tile-'+(++_tc);
    const detailHtml=(result.status!=='ok'&&result.suggestion)?
      '<div class="rtile-suggestion">💡 '+esc(result.suggestion)+'</div>':'';
    let detailJsonHtml='';
    if(result.details_json){
      try{
        const d=JSON.parse(result.details_json);
        const rows=Object.entries(d)
          .filter(([k,v])=>typeof v!=='object'&&v!==null&&v!=='')
          .map(([k,v])=>'<div style="font-size:11px;line-height:2"><span style="color:var(--text3)">'+esc(k)+':</span> <span style="color:var(--text2)">'+esc(String(v))+'</span></div>')
          .join('');
        if(rows)detailJsonHtml='<div style="margin-top:8px">'+rows+'</div>';
      }catch{}
    }
    return '<div class="rtile '+result.status+'" id="'+tid+'" onclick="toggleTile(this.id)">'
      +'<div class="rtile-top">'
      +'<div class="rtile-icon">'+meta.icon+'</div>'
      +'<div class="rtile-body"><div class="rtile-name">'+esc(meta.label)+'</div><div class="rtile-msg">'+esc(result.message||result.name)+'</div></div>'
      +'<span class="rtile-badge '+result.status+'">'+result.status.toUpperCase()+'</span>'
      +'</div>'
      +(detailHtml||detailJsonHtml?'<div class="rtile-detail">'+detailHtml+detailJsonHtml+'</div>':'')
      +'</div>';
  }
  function toggleTile(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
  function statsHtml(res){
    const ok=res.filter(r=>r.status==='ok').length;
    const w=res.filter(r=>r.status==='warning').length;
    const c=res.filter(r=>r.status==='critical').length;
    return '<span class="rstat ok">'+ok+' OK</span>'
      +(w?'<span class="rstat warning">'+w+' Warning</span>':'')
      +(c?'<span class="rstat critical">'+c+' Critical</span>':'');
  }
  function emptyState(msg){
    return '<div class="section-empty" style="grid-column:1/-1"><div class="section-empty-icon">✅</div><div class="section-empty-title">'+msg+'</div></div>';
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────────
  function renderDashboard(node,alerts){
    const r=node.lastReport, h=node.history||[];
    const cb=document.getElementById('conn-badge'),cl=document.getElementById('conn-label');
    if(node.connected){cb.className='conn-badge on';cl.textContent='Live';}
    else{cb.className='conn-badge off';cl.textContent='Disconnected';}
    if(!r){document.getElementById('last-scan').textContent='No data yet — click Scan Now';return;}
    document.getElementById('last-scan').textContent='Last scanned: '+fmtTime(r.timestamp);

    const cpuPct=r.cpu?.usage_percent??0,cpuCls=mCls(cpuPct,75,90),cpuHist=h.map(x=>x.cpu).filter(v=>v!=null);
    document.getElementById('cpu-val').className='mc-value '+cpuCls;
    document.getElementById('cpu-val').textContent=cpuPct.toFixed(1)+'%';
    document.getElementById('cpu-sub').textContent=cpuCls==='red'?'Critical — close heavy processes':cpuCls==='orange'?'Elevated — monitor usage':'Healthy';
    document.getElementById('cpu-spark').innerHTML=sparkline(cpuHist,mHex(cpuCls));

    const memPct=r.memory?.percent??0,memCls=mCls(memPct,80,90),memHist=h.map(x=>x.mem).filter(v=>v!=null);
    document.getElementById('mem-val').className='mc-value '+memCls;
    document.getElementById('mem-val').textContent=memPct.toFixed(1)+'%';
    document.getElementById('mem-sub').textContent=(r.memory?.used_gb?.toFixed(1)??'?')+' / '+(r.memory?.total_gb?.toFixed(0)??'?')+' GB used';
    document.getElementById('mem-spark').innerHTML=sparkline(memHist,mHex(memCls));

    const diskUsed=r.storage?+(100-(r.storage.free_percent??0)).toFixed(1):0,diskCls=mCls(diskUsed,70,93),diskHist=h.map(x=>x.storUsed).filter(v=>v!=null);
    document.getElementById('disk-val').className='mc-value '+diskCls;
    document.getElementById('disk-val').textContent=diskUsed.toFixed(0)+'%';
    document.getElementById('disk-sub').textContent=(r.storage?.drive??'')+' — '+(r.storage?.free_gb?.toFixed(1)??'?')+' GB free';
    document.getElementById('disk-spark').innerHTML=sparkline(diskHist,mHex(diskCls));

    const online=r.network?.online??false,latency=r.network?.avg_latency??null,loss=r.network?.avg_loss??0;
    const netHist=h.map(x=>x.latency).filter(v=>v!=null&&v>0);
    const netCls=!online?'red':loss>=20?'red':loss>=5?'orange':(latency!=null&&latency>200)?'orange':'green';
    const speedRes=(r.results||[]).find(x=>x.id==='network-speed');
    let speedMbps=null;
    if(speedRes?.details_json){try{const d=JSON.parse(speedRes.details_json);speedMbps=d.downloadMbps??d.speedMbps??d.mbps??null;}catch{}}
    const speedEl=document.getElementById('net-speed');
    speedEl.style.color=mHex(netCls);
    speedEl.textContent=speedMbps!=null?speedMbps.toFixed(2)+' Mbps':(online?'— Mbps':'Offline');
    document.getElementById('net-latency-sub').textContent=latency!=null?latency.toFixed(0)+' ms latency · '+loss.toFixed(0)+'% loss':'Checking…';
    document.getElementById('net-status').textContent=online?(netCls==='green'?'✓ Stable connection':'⚠ Unstable connection'):'✗ Offline';
    document.getElementById('net-status').style.color=mHex(netCls);
    document.getElementById('net-spark').innerHTML=sparkline(netHist,mHex(netCls));

    renderDrivesGrid(r,'drives-grid');
    const banner=document.getElementById('opt-banner'),st=r.storage;
    if(st&&st.free_gb<20){document.getElementById('opt-sub').textContent='Low disk space on '+st.drive+' — consider freeing up space.';banner.style.display='flex';}
    else{banner.style.display='none';}

    renderDashboardAlerts(alerts);

    const score=r.score??100;
    const scoreColor=score>=75?'#10b981':score>=50?'#f59e0b':'#ef4444';
    document.getElementById('dash-score-row').innerHTML='Health score: <strong style="color:'+scoreColor+'">'+score+'/100</strong>';
    updateSidebarStatus(score);

    const nb=document.getElementById('alerts-badge');
    const badgeCount=alerts.filter(a=>a.severity==='CRITICAL'||a.severity==='WARNING').length;
    if(badgeCount>0){nb.textContent=Math.min(badgeCount,99);nb.style.display='inline-block';}
    else{nb.style.display='none';}
  }

  function renderDrivesGrid(r,gridId){
    const el=document.getElementById(gridId),st=r.storage;
    if(!st||!st.total_gb){
      el.innerHTML='<div class="section-empty" style="padding:20px 0"><div class="section-empty-icon">💾</div><div class="section-empty-title">No storage data available</div></div>';
      return;
    }
    const drives=[{drive:st.drive||'C',total_gb:st.total_gb,used_gb:st.used_gb,free_gb:st.free_gb,free_percent:st.free_percent,type:'System Drive'}];
    const driveRes=(r.results||[]).find(x=>x.id==='disk');
    if(driveRes?.details_json){
      try{
        const d=JSON.parse(driveRes.details_json);
        if(d.drives&&Array.isArray(d.drives)){
          d.drives.forEach(drv=>{
            if(!drives.find(x=>x.drive===drv.drive))
              drives.push({drive:drv.drive,total_gb:drv.totalGB,used_gb:drv.usedGB,free_gb:drv.freeGB,free_percent:drv.freePercent,type:'Data Drive'});
          });
        }
      }catch{}
    }
    el.innerHTML=drives.map(dv=>{
      const fp=dv.free_percent!=null?dv.free_percent:(dv.total_gb?(dv.free_gb/dv.total_gb)*100:0);
      const usedPct=+(100-fp).toFixed(1);
      const dCls=mCls(usedPct,70,93),dHex=mHex(dCls);
      const dBadge=dCls==='red'?'critical':dCls==='orange'?'warning':'ok';
      const dLabel=dCls==='red'?'CRITICAL':dCls==='orange'?'WARNING':'OK';
      return '<div class="drive-card">'
        +'<div class="drive-donut">'+donut(usedPct,dHex)+'</div>'
        +'<div class="drive-info">'
        +'<div class="drive-top"><div><div class="drive-name">'+esc(dv.drive)+' Drive</div><div class="drive-type">'+esc(dv.type||'Drive')+'</div></div><span class="badge-drive '+dBadge+'">'+dLabel+'</span></div>'
        +'<div class="drive-stat"><span class="drive-stat-label">Total Space</span><span class="drive-stat-val">'+Number(dv.total_gb).toFixed(0)+' GB</span></div>'
        +'<div class="drive-stat"><span class="drive-stat-label">Used Space</span><span class="drive-stat-val '+(dCls!=='green'?dCls:'')+'">'+Number(dv.used_gb).toFixed(1)+' GB</span></div>'
        +'<div class="drive-stat"><span class="drive-stat-label">Free Space</span><span class="drive-stat-val">'+Number(dv.free_gb).toFixed(1)+' GB</span></div>'
        +'<div class="drive-thresholds"><div class="threshold-row"><span class="t-dot" style="background:#f59e0b"></span> 70% Orange Alert</div><div class="threshold-row"><span class="t-dot" style="background:#ef4444"></span> 90% Red Alert</div></div>'
        +'<div class="drive-alert-bar '+dCls+'">'
        +(dCls==='red'?'⛔ '+esc(dv.drive)+' usage is above 90%. Immediate action recommended.'
         :dCls==='orange'?'⚠ '+esc(dv.drive)+' usage is above 70%. Consider cleaning up space.'
         :'✓  '+esc(dv.drive)+' storage looks healthy.')
        +'</div>'
        +'</div></div>';
    }).join('');
  }

  function renderDashboardAlerts(alerts){
    const el=document.getElementById('alerts-list'),top=alerts.slice(0,6);
    if(!top.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:12px 0">No alerts for this node.</div>';return;}
    el.innerHTML=top.map(a=>'<div class="alert-item"><span class="alert-dot '+a.severity+'"></span>'
      +'<div style="flex:1;min-width:0"><div class="alert-top"><span class="alert-cat">'+esc(a.category)+'</span><span class="sev-badge '+a.severity+'">'+esc(a.severity)+'</span></div>'
      +'<div class="alert-msg">'+esc(a.message)+'</div><div class="alert-time">'+fmtTime(a.timestamp)+'</div></div></div>').join('');
  }

  // ── PERFORMANCE ──────────────────────────────────────────────────────────────
  function renderPerformance(node){
    const r=node.lastReport;if(!r)return;
    const results=filterResults(r.results||[],'performance');
    const score=r.score??0;
    const scoreSection=document.getElementById('perf-score-section');
    scoreSection.style.display='flex';
    document.getElementById('perf-score-ring').innerHTML=scoreRing(score);
    const scoreColor=score>=75?'#10b981':score>=50?'#f59e0b':'#ef4444';
    const scoreLabel=score>=75?'System Healthy':score>=50?'Some Issues Found':'Critical Issues';
    document.getElementById('perf-score-title').innerHTML='<span style="color:'+scoreColor+'">'+scoreLabel+'</span>';
    document.getElementById('perf-score-sub').textContent='Last scanned: '+fmtTime(r.timestamp);
    const all=r.results||[];
    const ok=all.filter(x=>x.status==='ok').length,w=all.filter(x=>x.status==='warning').length,c=all.filter(x=>x.status==='critical').length;
    document.getElementById('perf-score-pills').innerHTML=
      '<span class="score-pill ok">'+ok+' OK</span>'+(w?'<span class="score-pill warning">'+w+' Warning</span>':'')+(c?'<span class="score-pill critical">'+c+' Critical</span>':'');
    document.getElementById('perf-stats').innerHTML=statsHtml(results);
    document.getElementById('perf-grid').innerHTML=results.length?results.map(renderTile).join(''):emptyState('All performance checks passed');
  }

  // ── STORAGE VIEW ─────────────────────────────────────────────────────────────
  function renderStorageView(node){
    const r=node.lastReport;if(!r)return;
    renderDrivesGrid(r,'storage-drives-grid');
    const results=filterResults(r.results||[],'storage');
    document.getElementById('storage-stats').innerHTML=statsHtml(results);
    document.getElementById('storage-grid').innerHTML=results.length?results.map(renderTile).join(''):emptyState('All storage checks passed');
  }

  // ── PROCESSES ────────────────────────────────────────────────────────────────
  function renderProcesses(node){
    const r=node.lastReport;if(!r)return;
    const results=filterResults(r.results||[],'processes');
    document.getElementById('proc-stats').innerHTML=statsHtml(results);
    document.getElementById('proc-grid').innerHTML=results.length?results.map(renderTile).join(''):emptyState('All process and service checks passed');
  }

  // ── NETWORK VIEW ─────────────────────────────────────────────────────────────
  function renderNetworkView(node){
    const r=node.lastReport;if(!r)return;
    const online=r.network?.online??false,latency=r.network?.avg_latency??null,loss=r.network?.avg_loss??0;
    const netCls=!online?'red':loss>=20?'red':loss>=5?'orange':(latency!=null&&latency>200)?'orange':'green';
    const netHex=mHex(netCls);
    const speedRes=(r.results||[]).find(x=>x.id==='network-speed');
    let speedMbps=null;
    if(speedRes?.details_json){try{const d=JSON.parse(speedRes.details_json);speedMbps=d.downloadMbps??d.speedMbps??d.mbps??null;}catch{}}
    document.getElementById('net-detail-grid').innerHTML=
      '<div class="net-detail-card"><div class="ndc-label">Status</div><div class="ndc-val" style="color:'+netHex+'">'+(online?'Online':'Offline')+'</div><div class="ndc-sub">'+(netCls==='green'?'Stable connection':netCls==='orange'?'Unstable':'No connection')+'</div></div>'
      +'<div class="net-detail-card"><div class="ndc-label">Latency</div><div class="ndc-val" style="color:'+mHex(mCls(latency??0,100,200))+'">'+(latency!=null?latency.toFixed(0)+' ms':'—')+'</div><div class="ndc-sub">Average round-trip time</div></div>'
      +'<div class="net-detail-card"><div class="ndc-label">Packet Loss</div><div class="ndc-val" style="color:'+mHex(mCls(loss,5,20))+'">'+loss.toFixed(0)+'%</div><div class="ndc-sub">'+(loss===0?'No packet loss':loss<5?'Minor loss':'Significant loss')+'</div></div>'
      +'<div class="net-detail-card"><div class="ndc-label">Download Speed</div><div class="ndc-val" style="color:#10b981">'+(speedMbps!=null?speedMbps.toFixed(2)+' Mbps':'—')+'</div><div class="ndc-sub">Last measured speed</div></div>';
    const results=filterResults(r.results||[],'network');
    document.getElementById('net-stats').innerHTML=statsHtml(results);
    document.getElementById('net-grid').innerHTML=results.length?results.map(renderTile).join(''):emptyState('All network checks passed');
  }

  // ── ALERTS VIEW ───────────────────────────────────────────────────────────────
  let _allAlerts=[];
  function renderAlertsView(alerts){_allAlerts=alerts;applyAlertFilter();}
  function filterAlerts(sev,btn){
    _alertFilter=sev;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    applyAlertFilter();
  }
  function applyAlertFilter(){
    const filtered=_alertFilter==='all'?_allAlerts:_allAlerts.filter(a=>a.severity===_alertFilter);
    const el=document.getElementById('alerts-full-list');
    if(!filtered.length){
      el.innerHTML='<div class="section-empty"><div class="section-empty-icon">✅</div><div class="section-empty-title">No alerts'+((_alertFilter!=='all')?' for this filter':'')+'</div><div class="section-empty-sub">All systems operating normally</div></div>';
      return;
    }
    el.innerHTML=filtered.map(a=>'<div class="alert-item" style="padding:12px 18px"><span class="alert-dot '+a.severity+'"></span>'
      +'<div style="flex:1;min-width:0"><div class="alert-top"><span class="alert-cat">'+esc(a.category)+'</span><span class="sev-badge '+a.severity+'">'+esc(a.severity)+'</span></div>'
      +'<div class="alert-msg">'+esc(a.message)+'</div><div class="alert-time">'+fmtTime(a.timestamp)+'</div></div></div>').join('');
  }

  // ── REPORTS ───────────────────────────────────────────────────────────────────
  function renderReports(node){
    const r=node.lastReport;if(!r)return;
    const results=r.results||[];
    const ok=results.filter(x=>x.status==='ok').length,w=results.filter(x=>x.status==='warning').length,c=results.filter(x=>x.status==='critical').length;
    const scoreColor=(r.score??0)>=75?'#10b981':(r.score??0)>=50?'#f59e0b':'#ef4444';
    document.getElementById('rep-score').style.color=scoreColor;
    document.getElementById('rep-score').textContent=(r.score??'—')+(r.score!=null?'%':'');
    document.getElementById('rep-ok').textContent=ok;
    document.getElementById('rep-warn').textContent=w;
    document.getElementById('rep-crit').textContent=c;
    const sorted=[...results].sort((a,b)=>({critical:0,warning:1,ok:2}[a.status]??3)-({critical:0,warning:1,ok:2}[b.status]??3));
    document.getElementById('report-full-body').innerHTML=sorted.length
      ?sorted.map(res=>{const meta=getMeta(res.id);return '<div class="report-row"><div class="report-row-icon">'+meta.icon+'</div><div class="report-row-body"><div class="report-row-name">'+esc(meta.label)+'</div><div class="report-row-msg">'+esc(res.message||res.name)+'</div></div><span class="report-row-badge '+res.status+'">'+res.status.toUpperCase()+'</span></div>';}).join('')
      :'<div class="section-empty"><div class="section-empty-icon">📊</div><div class="section-empty-title">No check results yet</div></div>';
  }

  function exportReport(fmt){
    if(!_node?.lastReport){alert('No report data to export.');return;}
    const r=_node.lastReport;
    let content,filename,mime;
    if(fmt==='json'){
      content=JSON.stringify({nodeId:NODE_ID,...r},null,2);
      filename='rakshak-report-'+new Date().toISOString().slice(0,10)+'.json';
      mime='application/json';
    }else{
      const lines=['Rakshak Health Report','Node: '+NODE_ID,'Generated: '+fmtTime(r.timestamp),'Score: '+(r.score??'—')+'/100','','CHECK RESULTS','─────────────'];
      (r.results||[]).forEach(res=>{
        const meta=getMeta(res.id);
        lines.push('['+res.status.toUpperCase()+'] '+meta.label+': '+(res.message||res.name));
        if(res.status!=='ok'&&res.suggestion)lines.push('  → '+res.suggestion);
      });
      content=lines.join('\\n');
      filename='rakshak-report-'+new Date().toISOString().slice(0,10)+'.txt';
      mime='text/plain';
    }
    const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  }

  // ── Sidebar status ───────────────────────────────────────────────────────────
  function updateSidebarStatus(score){
    const sIcon=document.getElementById('ss-icon'),sTitle=document.getElementById('ss-title'),sSub=document.getElementById('ss-sub');
    if(!sIcon)return;
    if(score>=75){sIcon.className='ss-icon green';sTitle.textContent='All Systems';sSub.className='ss-sub green';sSub.textContent='Protected';}
    else if(score>=50){sIcon.className='ss-icon orange';sTitle.textContent='Some Issues';sSub.className='ss-sub orange';sSub.textContent='Needs Attention';}
    else{sIcon.className='ss-icon red';sTitle.textContent='Critical Issues';sSub.className='ss-sub red';sSub.textContent='Action Required';}
  }

  // ── Data fetching ─────────────────────────────────────────────────────────────
  let scanInFlight=false;

  async function loadData(){
    try{
      const [nodeRes,alertRes]=await Promise.all([
        fetch('/api/nodes/'+NODE_ID),
        fetch('/api/alerts?nodeId='+NODE_ID),
      ]);
      if(nodeRes.status===401||alertRes.status===401){location.href='/';return;}
      if(!nodeRes.ok)return;
      _node=await nodeRes.json();
      _alerts=alertRes.ok?await alertRes.json():[];
      renderDashboard(_node,_alerts);
      const activeId=(document.querySelector('.view-section.active')||{}).id||'view-dashboard';
      const tab=activeId.replace('view-','');
      if(tab!=='dashboard'&&tab!=='about'){navigate(tab);}
    }catch(e){console.error('Dashboard fetch error:',e);}
  }

  async function triggerScan(){
    if(scanInFlight)return;
    scanInFlight=true;
    const btn=document.getElementById('scan-btn');
    btn.disabled=true;
    btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-anim"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Scanning…';
    try{
      const r=await fetch('/api/nodes/'+NODE_ID+'/scan',{method:'POST'});
      if(r.status===401){location.href='/';return;}
      setTimeout(()=>loadData(),4000);
      setTimeout(()=>loadData(),9000);
    }catch(e){console.error('Scan trigger error:',e);}
    finally{
      setTimeout(()=>{
        btn.disabled=false;
        btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Scan Now';
        scanInFlight=false;
      },10000);
    }
  }

  loadData();
  setInterval(loadData,30000);
</script>
</body>
</html>`;
}

module.exports = { render };
