import React, { useState, useEffect, useCallback, useRef } from 'react';
import IssueList from './IssueList.jsx';
import SearchBar from './SearchBar.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 75) return '#3fb950';
  if (score >= 60) return '#d29922';
  return '#f85149';
}

function scoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

function timeAgo(isoStr) {
  if (!isoStr) return 'Never';
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s <  60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function MiniBar({ value = 0, color }) {
  const pct = Math.min(100, Math.max(0, value));
  const c   = pct >= 90 ? '#f85149' : pct >= 75 ? '#d29922' : color || '#3fb950';
  return (
    <div className="rn-mini-bar-wrap">
      <div className="rn-mini-bar-track">
        <div className="rn-mini-bar-fill" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="rn-mini-bar-label" style={{ color: c }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Node list card ───────────────────────────────────────────────────────────

function NodeCard({ node, onOpen }) {
  const diskUsed = node.disk_used_pct || 0;
  const color    = scoreColor(node.score);
  return (
    <div className={`rn-node-card ${node.connected ? 'rn-connected' : 'rn-disconnected'}`}>
      <div className="rn-node-card-header">
        <div className="rn-node-identity">
          <span className={`rn-status-dot ${node.connected ? 'on' : 'off'}`} />
          <div>
            <div className="rn-node-hostname">{node.hostname || 'Unknown'}</div>
            <div className="rn-node-meta">{node.platform}/{node.arch}</div>
          </div>
        </div>
        <div className="rn-score-badge" style={{ borderColor: color, color }}>
          <span className="rn-score-num">{node.score}</span>
          <span className="rn-score-lbl">{scoreLabel(node.score)}</span>
        </div>
      </div>

      <div className="rn-metrics">
        <div className="rn-metric"><span>CPU</span><MiniBar value={node.cpu_pct} /></div>
        <div className="rn-metric"><span>RAM</span><MiniBar value={node.mem_pct} /></div>
        <div className="rn-metric"><span>Disk</span><MiniBar value={diskUsed} /></div>
        <div className="rn-metric">
          <span>Net</span>
          <span className={`rn-net-badge ${node.net_online ? 'on' : 'off'}`}>
            {node.net_online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="rn-node-footer">
        <span className="rn-last-seen">Last seen {timeAgo(node.last_heartbeat)}</span>
        <button className="rn-view-btn" onClick={() => onOpen(node.node_id)}>
          View Details →
        </button>
      </div>
    </div>
  );
}

// ─── Node detail view ─────────────────────────────────────────────────────────

function NodeDetailView({ details, alerts, loading, scanTriggered, onBack, onTriggerScan }) {
  const [search, setSearch]  = useState('');
  const report  = details?.last_report;
  const info    = details?.info || {};
  const history = details?.history || [];

  // Map proto CheckResult → IssueList format
  const issueItems = (report?.results || []).map(r => ({
    id:         r.id,
    name:       r.name,
    status:     r.status,
    message:    r.message,
    suggestion: r.suggestion,
    category:   r.category,
    fix:        null,
    details:    r.details_json ? (() => { try { return JSON.parse(r.details_json); } catch { return null; } })() : null,
  }));

  const filtered = search.trim()
    ? issueItems.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.message.toLowerCase().includes(search.toLowerCase())
      )
    : issueItems;

  const color = scoreColor(report?.score || 0);

  return (
    <div className="rn-detail">
      {/* Header bar */}
      <div className="rn-detail-header">
        <button className="rn-back-btn" onClick={onBack}>← Back to Nodes</button>
        <div className="rn-detail-title">
          <span className={`rn-status-dot ${details?.connected ? 'on' : 'off'}`} />
          <h2>{info.hostname || 'Node'}</h2>
          <span className="rn-detail-meta">{info.platform}/{info.arch} · v{info.version}</span>
        </div>
        <button
          className={`rn-scan-btn ${scanTriggered ? 'triggered' : ''}`}
          onClick={onTriggerScan}
          disabled={!details?.connected || scanTriggered}
          title={details?.connected ? 'Request a health scan from this node' : 'Node is offline'}
        >
          {scanTriggered ? '⏳ Scan Requested' : '🔄 Scan Now'}
        </button>
      </div>

      {loading && <div className="rn-loading">Fetching node data…</div>}

      {!loading && !report && (
        <div className="rn-empty-state">No health report received yet. Click Scan Now to request one.</div>
      )}

      {!loading && report && (
        <>
          {/* Summary strip */}
          <div className="rn-summary-strip">
            <div className="rn-sum-score-badge" style={{ borderColor: color, color }}>
              <span className="rn-sum-score-num">{report.score}</span>
              <span className="rn-sum-score-lbl">{scoreLabel(report.score)}</span>
            </div>
            <div className="rn-sum-pills">
              <span className="stat-pill ok">{report.ok_count} OK</span>
              <span className="stat-pill warning">{report.warning_count} Warning</span>
              <span className="stat-pill critical">{report.critical_count} Critical</span>
            </div>
            <div className="rn-sum-metrics">
              <div className="rn-sum-metric"><span>CPU</span><MiniBar value={report.cpu?.usage_percent} /></div>
              <div className="rn-sum-metric"><span>RAM</span><MiniBar value={report.memory?.percent} /></div>
              <div className="rn-sum-metric"><span>Disk Used</span><MiniBar value={100 - (report.storage?.free_percent || 0)} /></div>
              <div className="rn-sum-metric">
                <span>Net</span>
                <span className={`rn-net-badge ${report.network?.online ? 'on' : 'off'}`}>
                  {report.network?.online ? `${(report.network.avg_latency || 0).toFixed(0)} ms` : 'Offline'}
                </span>
              </div>
            </div>
            <div className="rn-sum-ts">
              Scanned {new Date(report.timestamp).toLocaleString()}
            </div>
          </div>

          {/* History sparkline */}
          {history.length > 1 && (
            <div className="rn-history-card">
              <h4>Trend (last {history.length} scans)</h4>
              <div className="rn-sparklines">
                {['CPU', 'RAM', 'Disk'].map((label, li) => {
                  const key  = ['cpu', 'mem', 'stor_used'][li];
                  const vals = history.map(h => h[key] || 0);
                  const max  = Math.max(...vals, 1);
                  return (
                    <div className="rn-sparkline" key={label}>
                      <span className="rn-spark-label">{label}</span>
                      <svg viewBox={`0 0 ${vals.length * 10} 40`} preserveAspectRatio="none" className="rn-spark-svg">
                        <polyline
                          fill="none"
                          stroke={li === 0 ? '#3b82f6' : li === 1 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="1.5"
                          points={vals.map((v, i) => `${i * 10 + 5},${40 - (v / max) * 36}`).join(' ')}
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full check results */}
          <div className="issues-section">
            <div className="issues-section-header">
              <h3>Check Results ({issueItems.length})</h3>
              <SearchBar
                value={search}
                onChange={setSearch}
                resultCount={filtered.length}
                totalCount={issueItems.length}
              />
            </div>
            {filtered.length === 0
              ? <div className="no-results">{search ? 'No matching results.' : 'No check data.'}</div>
              : <IssueList results={filtered} isFiltered={!!search} />
            }
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="issues-section">
              <div className="issues-section-header"><h3>Alerts ({alerts.length})</h3></div>
              <div className="rn-alerts-list">
                {alerts.map(a => (
                  <div key={a.id} className={`rn-alert-row rn-alert-${a.severity.toLowerCase()}`}>
                    <span className="rn-alert-sev">{a.severity}</span>
                    <span className="rn-alert-cat">{a.category}</span>
                    <span className="rn-alert-msg">{a.message}</span>
                    <span className="rn-alert-ts">{timeAgo(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RemoteNodesPage() {
  const [view,          setView]          = useState('list');
  const [nodes,         setNodes]         = useState([]);
  const [selectedId,    setSelectedId]    = useState(null);
  const [nodeDetails,   setNodeDetails]   = useState(null);
  const [nodeAlerts,    setNodeAlerts]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [scanTriggered, setScanTriggered] = useState(false);
  const cleanupRef = useRef(null);

  // ─── Load node list ─────────────────────────────────────────────────────────
  const loadNodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.rakshak.nodes.list();
      if (res.ok) setNodes(res.nodes || []);
      else setError(res.error || 'Failed to load nodes');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  // ─── Watch updates ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = window.rakshak.nodes.onUpdate((update) => {
      const id = update?.details?.node_id;
      if (!id) return;
      // If we're viewing that node, update details in real time
      if (view === 'detail' && id === selectedId) {
        setNodeDetails(update.details);
      }
      // Refresh list summaries
      if (view === 'list') loadNodes();
    });
    cleanupRef.current = cleanup;
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [view, selectedId, loadNodes]);

  // ─── Open node detail ───────────────────────────────────────────────────────
  const openNode = async (nodeId) => {
    setLoading(true);
    setError(null);
    setSelectedId(nodeId);
    try {
      // Start watching (get live updates)
      await window.rakshak.nodes.watch(nodeId);

      const [detailRes, alertRes] = await Promise.all([
        window.rakshak.nodes.get(nodeId),
        window.rakshak.nodes.alerts(nodeId),
      ]);
      if (detailRes.ok) setNodeDetails(detailRes.details);
      else setError(detailRes.error);
      if (alertRes.ok) setNodeAlerts(alertRes.alerts || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setView('detail');
  };

  // ─── Go back ────────────────────────────────────────────────────────────────
  const goBack = () => {
    window.rakshak.nodes.unwatch();
    setView('list');
    setSelectedId(null);
    setNodeDetails(null);
    setNodeAlerts([]);
    loadNodes();
  };

  // ─── Trigger scan ────────────────────────────────────────────────────────────
  const triggerScan = async () => {
    if (!selectedId) return;
    setScanTriggered(true);
    await window.rakshak.nodes.triggerScan(selectedId);
    setTimeout(() => setScanTriggered(false), 5000);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (view === 'detail') {
    return (
      <NodeDetailView
        details={nodeDetails}
        alerts={nodeAlerts}
        loading={loading}
        scanTriggered={scanTriggered}
        onBack={goBack}
        onTriggerScan={triggerScan}
      />
    );
  }

  // List view
  return (
    <div className="rn-list-view">
      <div className="rn-list-header">
        <div>
          <h3>Connected Nodes</h3>
          <p className="rn-list-sub">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} known ·{' '}
            {nodes.filter(n => n.connected).length} online
          </p>
        </div>
        <button className="rn-refresh-btn" onClick={loadNodes} disabled={loading}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {error && <div className="rn-error-banner">⚠ {error}</div>}

      {!loading && nodes.length === 0 && !error && (
        <div className="rn-empty-state">
          No nodes connected yet. Start the gRPC server and run a Rakshak node to see data here.
        </div>
      )}

      <div className="rn-nodes-grid">
        {nodes.map(n => (
          <NodeCard key={n.node_id} node={n} onOpen={openNode} />
        ))}
      </div>
    </div>
  );
}
