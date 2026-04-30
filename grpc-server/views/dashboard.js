'use strict';

const { CSS, sidebarHtml, escHtml } = require('./shared');

/**
 * Render the node dashboard HTML shell.
 * Data is fetched client-side from /api/nodes/:id so auto-refresh works without a full reload.
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
    .topbar-icon-shield { width: 36px; height: 36px; border-radius: 9px; background: rgba(59,130,246,0.1); display:flex; align-items:center; justify-content:center; }
    .spin-anim { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .conn-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; padding: 4px 10px; border-radius: 99px; font-weight: 600;
    }
    .conn-badge.on  { background: rgba(16,185,129,0.1); color: #34d399; }
    .conn-badge.off { background: rgba(71,85,105,0.1);  color: #64748b; }
    .conn-dot { width: 7px; height: 7px; border-radius: 50%; }
    .conn-badge.on  .conn-dot { background: #10b981; animation: pulse 2s infinite; }
    .conn-badge.off .conn-dot { background: #475569; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* metric card net sub */
    .mc-net-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .mc-net-row + .mc-net-row { margin-top: 4px; }

    /* donut chart container */
    .donut-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }

    /* skeleton loading */
    .skeleton { background: linear-gradient(90deg, #1e293b 25%, #243044 50%, #1e293b 75%);
                background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    /* no data state for metric */
    .no-data { font-size: 20px; color: var(--text3); font-weight: 700; }
  </style>
</head>
<body>
<div class="app">
  <div id="sidebar-root">${sidebarHtml('dashboard', 0, safeId)}</div>
  <div class="main">

    <!-- TOP BAR -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon-shield" id="topbar-shield">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <div class="topbar-title">System Health Overview</div>
          <div class="topbar-sub">Real-time monitoring and intelligent alerts for a healthy system</div>
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

    <!-- METRIC CARDS -->
    <div class="metrics-row">
      <!-- CPU -->
      <div class="metric-card">
        <div class="mc-header">
          <div class="mc-left">
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
          </div>
        </div>
        <div class="mc-body">
          <div>
            <div class="mc-value green" id="cpu-val"><span class="no-data">—</span></div>
            <div class="mc-sub" id="cpu-sub">—</div>
          </div>
          <div class="mc-sparkline" id="cpu-spark"></div>
        </div>
      </div>

      <!-- Memory -->
      <div class="metric-card">
        <div class="mc-header">
          <div class="mc-left">
            <div class="mc-icon orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                <path d="M2 6h20v12H2z"/><path d="M6 6V4"/><path d="M10 6V4"/><path d="M14 6V4"/><path d="M18 6V4"/>
                <path d="M6 18v2"/><path d="M10 18v2"/><path d="M14 18v2"/><path d="M18 18v2"/>
              </svg>
            </div>
            <span class="mc-label">Memory Usage</span>
          </div>
        </div>
        <div class="mc-body">
          <div>
            <div class="mc-value orange" id="mem-val"><span class="no-data">—</span></div>
            <div class="mc-sub" id="mem-sub">—</div>
          </div>
          <div class="mc-sparkline" id="mem-spark"></div>
        </div>
      </div>

      <!-- Storage -->
      <div class="metric-card">
        <div class="mc-header">
          <div class="mc-left">
            <div class="mc-icon purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <span class="mc-label">Storage Usage</span>
          </div>
        </div>
        <div class="mc-body">
          <div>
            <div class="mc-value red" id="disk-val"><span class="no-data">—</span></div>
            <div class="mc-sub" id="disk-sub">—</div>
          </div>
          <div class="mc-sparkline" id="disk-spark"></div>
        </div>
      </div>

      <!-- Network -->
      <div class="metric-card">
        <div class="mc-header">
          <div class="mc-left">
            <div class="mc-icon green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <span class="mc-label">Network Quality</span>
          </div>
        </div>
        <div class="mc-body">
          <div style="flex:1">
            <div class="mc-net-row">
              <span style="font-size:18px;font-weight:700" id="net-latency">—</span>
            </div>
            <div class="mc-sub" id="net-loss">—</div>
            <div class="mc-sub" id="net-status" style="margin-top:2px">—</div>
          </div>
          <div class="mc-sparkline" id="net-spark"></div>
        </div>
      </div>
    </div>

    <!-- STORAGE / DRIVES SECTION -->
    <div class="section" id="storage">
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
        <button class="btn-sm">⚙ Manage Drives</button>
      </div>
      <div class="drives-grid" id="drives-grid">
        <div class="empty-state" style="padding:30px 0">
          <div class="empty-sub">Waiting for scan data…</div>
        </div>
      </div>
    </div>

    <!-- OPTIMIZATION BANNER -->
    <div class="opt-banner" id="opt-banner" style="display:none">
      <div>
        <div class="opt-title">⚡ Storage Optimization Recommended</div>
        <div class="opt-sub" id="opt-sub">Analyzing storage…</div>
      </div>
      <button class="btn-optimize">⚙ Optimize Now</button>
    </div>

    <!-- BOTTOM ROW: Alerts + Tips -->
    <div class="bottom-row" id="alerts">
      <div class="bottom-card">
        <div class="bc-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Recent Alerts
          <span class="view-all" id="view-all-link" style="cursor:default">View All Alerts →</span>
        </div>
        <div id="alerts-list">
          <div class="empty-sub" style="color:var(--text3);font-size:12px;padding:12px 0">Loading alerts…</div>
        </div>
      </div>

      <div class="bottom-card">
        <div class="bc-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Storage Tips
        </div>
        <div class="tip-item"><span class="tip-icon">🗑️</span> Delete temporary files and caches to free space</div>
        <div class="tip-item"><span class="tip-icon">📦</span> Uninstall unused applications and programs</div>
        <div class="tip-item"><span class="tip-icon">📁</span> Move large files to an external drive or cloud</div>
        <div class="tip-item"><span class="tip-icon">⚡</span> Regular cleanup keeps your system running fast</div>
        <div class="tip-item"><span class="tip-icon">🔄</span> Use disk cleanup tools to remove Windows artifacts</div>
      </div>
    </div>

  </div><!-- /main -->
</div><!-- /app -->

<script>
  const NODE_ID = '${safeId}';

  // ─── Color helpers ───────────────────────────────────────────────────────────
  function metricClass(v, w, c) { return v >= c ? 'red' : v >= w ? 'orange' : 'green'; }
  function metricHex(cls) {
    return cls === 'red' ? '#ef4444' : cls === 'orange' ? '#f59e0b' : '#10b981';
  }

  // ─── Sparkline SVG ───────────────────────────────────────────────────────────
  function sparkline(data, color) {
    if (!data || data.length < 2) return '';
    const W = 80, H = 32;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 6) - 3;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" fill="none" style="overflow:visible">'
      + '<polyline points="' + pts + '" stroke="' + color + '" stroke-width="1.5" opacity="0.85" stroke-linejoin="round"/>'
      + '</svg>';
  }

  // ─── Donut SVG ───────────────────────────────────────────────────────────────
  function donut(pct, color, size = 110) {
    const r = 40, cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    const fill = Math.max(0, Math.min(pct, 100)) / 100 * circ;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#1e293b" stroke-width="9"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9"'
      + ' stroke-dasharray="' + fill.toFixed(2) + ' ' + (circ - fill).toFixed(2) + '"'
      + ' transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="round"/>'
      + '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" fill="' + color + '" font-size="16" font-weight="800">' + Math.round(pct) + '%</text>'
      + '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" fill="#64748b" font-size="9">Used</text>'
      + '</svg>';
  }

  // ─── Alert severity dot class ─────────────────────────────────────────────────
  function alertDotClass(sev) {
    return sev === 'CRITICAL' ? 'CRITICAL' : sev === 'WARNING' ? 'WARNING' : 'INFO';
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  }

  // ─── Render all sections ─────────────────────────────────────────────────────
  function renderDashboard(node, alerts) {
    const r = node.lastReport;
    const h = node.history || [];

    // --- Connection badge ---
    const cb = document.getElementById('conn-badge');
    const cl = document.getElementById('conn-label');
    if (node.connected) { cb.className = 'conn-badge on'; cl.textContent = 'Live'; }
    else                { cb.className = 'conn-badge off'; cl.textContent = 'Disconnected'; }

    if (!r) {
      document.getElementById('last-scan').textContent = 'No data yet — run a scan';
      return;
    }

    // --- Last scanned ---
    document.getElementById('last-scan').textContent = 'Last scanned: ' + fmtTime(r.timestamp);

    // ── CPU card ──────────────────────────────────────────────────────────────
    const cpuPct   = r.cpu?.usage_percent ?? 0;
    const cpuCls   = metricClass(cpuPct, 75, 90);
    const cpuHist  = h.map(x => x.cpu).filter(v => v != null);
    document.getElementById('cpu-val').className = 'mc-value ' + cpuCls;
    document.getElementById('cpu-val').textContent = cpuPct.toFixed(1) + '%';
    document.getElementById('cpu-sub').textContent = cpuCls === 'red' ? 'Critical — close heavy processes' : cpuCls === 'orange' ? 'Elevated — monitor usage' : 'Healthy';
    document.getElementById('cpu-spark').innerHTML = sparkline(cpuHist, metricHex(cpuCls));

    // ── Memory card ───────────────────────────────────────────────────────────
    const memPct   = r.memory?.percent ?? 0;
    const memCls   = metricClass(memPct, 80, 90);
    const memHist  = h.map(x => x.mem).filter(v => v != null);
    document.getElementById('mem-val').className = 'mc-value ' + memCls;
    document.getElementById('mem-val').textContent = memPct.toFixed(1) + '%';
    document.getElementById('mem-sub').textContent = (r.memory?.used_gb?.toFixed(1) ?? '?') + ' / ' + (r.memory?.total_gb?.toFixed(0) ?? '?') + ' GB used';
    document.getElementById('mem-spark').innerHTML = sparkline(memHist, metricHex(memCls));

    // ── Storage card ──────────────────────────────────────────────────────────
    const diskUsed = r.storage ? +(100 - (r.storage.free_percent ?? 0)).toFixed(1) : 0;
    const diskCls  = metricClass(diskUsed, 70, 93);
    const diskHist = h.map(x => x.storUsed).filter(v => v != null);
    document.getElementById('disk-val').className = 'mc-value ' + diskCls;
    document.getElementById('disk-val').textContent = diskUsed.toFixed(0) + '%';
    document.getElementById('disk-sub').textContent = (r.storage?.drive ?? '') + ' — ' + (r.storage?.free_gb?.toFixed(1) ?? '?') + ' GB free';
    document.getElementById('disk-spark').innerHTML = sparkline(diskHist, metricHex(diskCls));

    // ── Network card ──────────────────────────────────────────────────────────
    const online  = r.network?.online  ?? false;
    const latency = r.network?.avg_latency ?? null;
    const loss    = r.network?.avg_loss ?? 0;
    const netHist = h.map(x => x.latency).filter(v => v != null && v > 0);
    const netCls  = !online ? 'red' : loss >= 20 ? 'red' : loss >= 5 ? 'orange' : latency > 200 ? 'orange' : 'green';

    document.getElementById('net-latency').style.color = metricHex(netCls);
    document.getElementById('net-latency').textContent = latency !== null ? latency.toFixed(0) + ' ms' : 'Offline';
    document.getElementById('net-loss').textContent    = 'Packet loss: ' + loss.toFixed(0) + '%';
    document.getElementById('net-status').textContent  = online ? (netCls === 'green' ? '✓ Stable connection' : '⚠ Unstable') : '✗ Offline';
    document.getElementById('net-status').style.color  = metricHex(netCls);
    document.getElementById('net-spark').innerHTML      = sparkline(netHist, metricHex(netCls));

    // ── Drives section ────────────────────────────────────────────────────────
    const st      = r.storage;
    const drivesEl = document.getElementById('drives-grid');
    if (!st) {
      drivesEl.innerHTML = '<div class="empty-sub" style="color:var(--text3);font-size:12px;padding:12px 0">No storage data available.</div>';
    } else {
      const usedPct = +(100 - st.free_percent).toFixed(1);
      const dCls    = metricClass(usedPct, 70, 93);
      const dHex    = metricHex(dCls);
      const dBadge  = dCls === 'red' ? 'critical' : dCls === 'orange' ? 'warning' : 'ok';
      const dLabel  = dCls === 'red' ? 'CRITICAL' : dCls === 'orange' ? 'WARNING' : 'OK';

      drivesEl.innerHTML = \`
        <div class="drive-card">
          <div class="drive-donut">\${donut(usedPct, dHex)}</div>
          <div class="drive-info">
            <div class="drive-top">
              <div>
                <div class="drive-name">\${st.drive} Drive</div>
                <div class="drive-type">Primary System Drive</div>
              </div>
              <span class="badge-drive \${dBadge}">\${dLabel}</span>
            </div>
            <div class="drive-stat">
              <span class="drive-stat-label">Total Space</span>
              <span class="drive-stat-val">\${st.total_gb.toFixed(0)} GB</span>
            </div>
            <div class="drive-stat">
              <span class="drive-stat-label">Used Space</span>
              <span class="drive-stat-val \${dCls !== 'green' ? dCls : ''}">\${st.used_gb.toFixed(1)} GB</span>
            </div>
            <div class="drive-stat">
              <span class="drive-stat-label">Free Space</span>
              <span class="drive-stat-val">\${st.free_gb.toFixed(1)} GB</span>
            </div>
            <div class="drive-thresholds">
              <div class="threshold-row"><span class="t-dot" style="background:#f59e0b"></span> 70% — Orange Alert</div>
              <div class="threshold-row"><span class="t-dot" style="background:#ef4444"></span> 90% — Red Alert</div>
            </div>
            <div class="drive-alert-bar \${dCls}">
              \${dCls === 'red'    ? '⛔ ' + st.drive + ' usage is above 90%.' :
                dCls === 'orange' ? '⚠ '  + st.drive + ' usage is above 70%.' :
                                    '✓  '  + st.drive + ' storage looks healthy.'}
            </div>
          </div>
        </div>\`;
    }

    // ── Optimization banner ───────────────────────────────────────────────────
    const banner = document.getElementById('opt-banner');
    if (st && st.free_gb < 20) {
      document.getElementById('opt-sub').textContent = 'Low disk space on ' + st.drive + ' — consider freeing up space.';
      banner.style.display = 'flex';
    } else if (st) {
      banner.style.display = 'none';
    }

    // ── Alerts ────────────────────────────────────────────────────────────────
    renderAlerts(alerts);

    // ── Sidebar system status ─────────────────────────────────────────────────
    const score = r.score ?? 100;
    const sIcon  = document.getElementById('ss-icon');
    const sTitle = document.getElementById('ss-title');
    const sSub   = document.getElementById('ss-sub');
    if (sIcon && sTitle && sSub) {
      if (score >= 75) {
        sIcon.className  = 'ss-icon green';
        sTitle.textContent = 'All Systems';
        sSub.className   = 'ss-sub green';
        sSub.textContent   = 'Protected';
      } else if (score >= 50) {
        sIcon.className  = 'ss-icon orange';
        sTitle.textContent = 'Some Issues';
        sSub.className   = 'ss-sub orange';
        sSub.textContent   = 'Needs Attention';
      } else {
        sIcon.className  = 'ss-icon red';
        sTitle.textContent = 'Critical Issues';
        sSub.className   = 'ss-sub red';
        sSub.textContent   = 'Action Required';
      }
    }

    // ── Nav alert badge ───────────────────────────────────────────────────────
    const nb = document.querySelector('.nav-badge');
    if (nb) nb.textContent = Math.min(alerts.length, 99);
  }

  function renderAlerts(alerts) {
    const el  = document.getElementById('alerts-list');
    const top = alerts.slice(0, 8);
    if (!top.length) {
      el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:12px 0">No alerts for this node.</div>';
      return;
    }
    el.innerHTML = top.map(a => \`
      <div class="alert-item">
        <span class="alert-dot \${a.severity}"></span>
        <div style="flex:1;min-width:0">
          <div class="alert-top">
            <span class="alert-cat">\${a.category}</span>
            <span class="sev-badge \${a.severity}">\${a.severity}</span>
          </div>
          <div class="alert-msg">\${a.message}</div>
          <div class="alert-time">\${fmtTime(a.timestamp)}</div>
        </div>
      </div>\`).join('');
  }

  // ─── Data fetching ───────────────────────────────────────────────────────────
  let scanInFlight = false;

  async function loadData() {
    try {
      const [nodeRes, alertRes] = await Promise.all([
        fetch('/api/nodes/' + NODE_ID),
        fetch('/api/alerts?nodeId=' + NODE_ID),
      ]);
      if (nodeRes.status === 401 || alertRes.status === 401) { location.href = '/'; return; }
      if (!nodeRes.ok) return;
      const node   = await nodeRes.json();
      const alerts = alertRes.ok ? await alertRes.json() : [];
      renderDashboard(node, alerts);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
  }

  async function triggerScan() {
    if (scanInFlight) return;
    scanInFlight = true;
    const btn = document.getElementById('scan-btn');
    btn.disabled = true;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-anim"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Scanning…';

    try {
      const r = await fetch('/api/nodes/' + NODE_ID + '/scan', { method: 'POST' });
      if (r.status === 401) { location.href = '/'; return; }
      // Wait a few seconds for the node to report back, then refresh
      setTimeout(() => { loadData(); }, 4000);
      setTimeout(() => { loadData(); }, 9000);
    } catch (e) {
      console.error('Scan trigger error:', e);
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Scan Now';
        scanInFlight = false;
      }, 10000);
    }
  }

  // Initial load + auto-refresh every 30 s
  loadData();
  setInterval(loadData, 30000);
</script>
</body>
</html>`;
}

module.exports = { render };
