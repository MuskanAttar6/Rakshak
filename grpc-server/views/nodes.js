'use strict';

const { CSS, sidebarHtml, escHtml, metricColor } = require('./shared');

/**
 * Render the connected-nodes list page.
 * The page fetches /api/nodes on load and auto-refreshes every 30 s.
 */
function render() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rakshak — Connected Nodes</title>
  ${CSS}
  <style>
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .refresh-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--card2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s; color: var(--text2);
    }
    .refresh-btn:hover { border-color: var(--blue); color: var(--blue); }
    .refresh-btn.spinning svg { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .nodes-count { font-size: 12px; color: var(--text3); }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--green); display: inline-block;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.8)} }
  </style>
</head>
<body>
<div class="app">
  ${sidebarHtml('nodes', 0)}
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
            <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
          </svg>
        </div>
        <div>
          <div class="topbar-title">Connected Nodes</div>
          <div class="topbar-sub">Click a node to view its full system dashboard</div>
        </div>
      </div>
      <div class="topbar-right topbar-actions">
        <span class="nodes-count" id="nodes-count">Loading…</span>
        <button class="refresh-btn" id="refresh-btn" title="Refresh" onclick="loadNodes(true)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
        <a href="/auth/logout" style="font-size:12px;color:var(--text3)">Logout</a>
      </div>
    </div>

    <div id="nodes-container">
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-title">Loading nodes…</div>
      </div>
    </div>
  </div>
</div>

<script>
  async function loadNodes(spin = false) {
    const btn = document.getElementById('refresh-btn');
    if (spin && btn) btn.classList.add('spinning');

    try {
      const res = await fetch('/api/nodes');
      if (res.status === 401) { location.href = '/'; return; }
      const nodes = await res.json();
      renderNodes(nodes);
    } catch (e) {
      document.getElementById('nodes-container').innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load nodes</div><div class="empty-sub">Check that the server is running.</div></div>';
    } finally {
      if (btn) btn.classList.remove('spinning');
    }
  }

  function colorClass(v, w = 75, c = 90) {
    return v >= c ? 'red' : v >= w ? 'orange' : 'green';
  }
  function colorHex(cls) {
    return cls === 'red' ? '#ef4444' : cls === 'orange' ? '#f59e0b' : '#10b981';
  }

  function renderNodes(nodes) {
    const container = document.getElementById('nodes-container');
    const count     = document.getElementById('nodes-count');
    const online    = nodes.filter(n => n.connected).length;

    count.innerHTML = \`<span class="pulse-dot"></span> &nbsp;\${online} online, \${nodes.length - online} offline\`;

    if (!nodes.length) {
      container.innerHTML = \`
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <div class="empty-title">No Rakshak nodes connected yet</div>
          <div class="empty-sub">Start a Rakshak client and point it to this server.<br>
            Set <code style="color:#3b82f6">RAKSHAK_GRPC_SERVER=&lt;this-host&gt;:50051</code> and launch Rakshak.</div>
        </div>\`;
      return;
    }

    const cards = nodes.map(n => {
      const r     = n.lastReport;
      const score = r?.score ?? null;
      const cpu   = r?.cpu?.usage_percent   ?? null;
      const mem   = r?.memory?.percent      ?? null;
      const disk  = r ? 100 - (r.storage?.free_percent ?? 0) : null;

      const scoreColor  = score  !== null ? colorHex(colorClass(score,  75, 90))  : '#475569';
      const scoreBarW   = score  !== null ? score : 0;
      const scoreBarCol = score  !== null ? colorHex(colorClass(score, 75, 90))   : '#475569';

      const metricCell = (val, label, w, c) => val !== null
        ? \`<div class="ncm">
            <div class="ncm-val" style="color:\${colorHex(colorClass(val,w,c))}">\${val.toFixed(0)}%</div>
            <div class="ncm-lbl">\${label}</div>
           </div>\`
        : \`<div class="ncm"><div class="ncm-val" style="color:#475569">—</div><div class="ncm-lbl">\${label}</div></div>\`;

      const ts = n.lastHeartbeat ? new Date(n.lastHeartbeat).toLocaleTimeString() : '—';

      return \`
      <a href="/node/\${encodeURIComponent(n.node_id)}" class="node-card">
        <div class="nc-top">
          <div>
            <div class="nc-name">\${n.info.hostname}</div>
          </div>
          <span class="nc-status \${n.connected ? 'on' : 'off'}">\${n.connected ? '● Online' : '○ Offline'}</span>
        </div>
        <div class="nc-id">\${n.node_id.slice(0,16)}…</div>
        <div class="nc-platform">\${n.info.platform} / \${n.info.arch}</div>

        <div class="nc-metrics">
          \${metricCell(cpu,  'CPU',  75, 90)}
          \${metricCell(mem,  'Mem',  80, 90)}
          \${metricCell(disk, 'Disk', 70, 93)}
        </div>

        <div class="nc-score-row">
          <span class="nc-score-label">Health</span>
          <div class="score-bar">
            <div class="score-fill" style="width:\${scoreBarW}%;background:\${scoreBarCol}"></div>
          </div>
          <span style="font-size:13px;font-weight:700;color:\${scoreColor};min-width:36px;text-align:right">
            \${score !== null ? score + '%' : '—'}
          </span>
        </div>

        <div class="nc-score-row" style="margin-bottom:0;margin-top:-4px">
          <span class="nc-score-label" style="margin-left:auto;font-size:10px">Last heartbeat: \${ts}</span>
        </div>

        <div class="nc-btn">View Dashboard →</div>
      </a>\`;
    }).join('');

    container.innerHTML = \`<div class="nodes-grid">\${cards}</div>\`;
  }

  // Initial load + auto-refresh every 30 s
  loadNodes();
  setInterval(loadNodes, 30000);
</script>
</body>
</html>`;
}

module.exports = { render };
