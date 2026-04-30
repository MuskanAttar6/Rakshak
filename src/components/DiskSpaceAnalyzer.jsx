import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (!b || b === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return v.toFixed(i <= 1 ? 0 : 1) + ' ' + units[i];
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function barColor(pct) {
  if (pct > 50) return '#f85149';
  if (pct > 25) return '#f0883e';
  if (pct > 10) return '#d29922';
  return '#388bfd';
}

// Returns the right icon for a tree node
function nodeIcon(node) {
  // Windows drive root:  C:\  D:\  etc.
  if (/^[A-Za-z]:[\\\/]?$/.test(node.path)) return '💽';
  // UNC / network path
  if (node.path.startsWith('\\\\') || node.path.startsWith('//')) return '🌐';
  // Still scanning (placeholder folder)
  if (node.scanning) return '📁';
  // Regular folder
  if (node.children?.length) return '📁';
  // File — pick icon by extension
  const ext = node.name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','bmp','svg','ico'].includes(ext)) return '🖼️';
  if (['mp4','mkv','avi','mov','wmv','flv','webm'].includes(ext)) return '🎬';
  if (['mp3','wav','flac','aac','ogg','m4a'].includes(ext)) return '🎵';
  if (['zip','rar','7z','tar','gz','bz2'].includes(ext)) return '🗜️';
  if (['exe','msi','dmg','apk'].includes(ext)) return '⚙️';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc','docx','odt'].includes(ext)) return '📝';
  if (['xls','xlsx','csv'].includes(ext)) return '📊';
  if (['ppt','pptx'].includes(ext)) return '📋';
  return '📄';
}

function flattenTree(node, expanded, sortBy, sortDir, parentSize = 0, depth = 0, rows = []) {
  if (!node) return rows;
  const pct = parentSize > 0 ? (node.size / parentSize * 100) : 100;
  rows.push({ node, depth, pct });
  if (expanded.has(node.path) && node.children?.length) {
    const kids = [...node.children].sort((a, b) => {
      const va = sortBy === 'name' ? a.name.toLowerCase() : (a[sortBy] ?? 0);
      const vb = sortBy === 'name' ? b.name.toLowerCase() : (b[sortBy] ?? 0);
      const c  = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? c : -c;
    });
    for (const k of kids)
      flattenTree(k, expanded, sortBy, sortDir, node.size, depth + 1, rows);
  }
  return rows;
}

function filterTree(node, q, rows = []) {
  if (!node) return rows;
  if (node.name.toLowerCase().includes(q.toLowerCase()))
    rows.push({ node, depth: 0, pct: 0 });
  for (const c of (node.children || [])) filterTree(c, q, rows);
  return rows;
}

function topLargest(node, n = 20, out = []) {
  if (!node) return out;
  out.push(node);
  for (const c of (node.children || [])) topLargest(c, n, out);
  return out.sort((a, b) => b.size - a.size).slice(0, n);
}

function exportCSV(root) {
  const lines = ['Name,Path,Size (bytes),Allocated,Files,Folders,Last Modified'];
  function walk(n) {
    const d = n.modified ? new Date(n.modified).toLocaleString() : '';
    lines.push(`"${n.name.replace(/"/g,'""')}","${n.path.replace(/"/g,'""')}",${n.size},${n.allocated},${n.files},${n.folders},"${d}"`);
    for (const c of (n.children||[])) walk(c);
  }
  walk(root);
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),
    download: `disk-${new Date().toISOString().slice(0,10)}.csv`
  });
  a.click();
}

function exportJSON(root) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(root,null,2)],{type:'application/json'})),
    download: `disk-${new Date().toISOString().slice(0,10)}.json`
  });
  a.click();
}

// ── TreeRow ───────────────────────────────────────────────────────────────────

const TreeRow = React.memo(function TreeRow({ node, depth, pct, isExpanded, scanning, onToggle, onReveal }) {
  const hasKids      = node.children?.length > 0 || node.scanning;
  const isActiveNode = node.scanning && scanning;

  return (
    <tr className={`dsa-row${pct > 50 ? ' dsa-row-crit' : pct > 25 ? ' dsa-row-warn' : ''}${isActiveNode ? ' dsa-row-active' : ''}`}>
      <td className="dsa-td dsa-td-name" style={{ paddingLeft: `${8 + depth * 20}px` }}>
        <div className="dsa-name-inner">
          <span
            className={`dsa-expander${hasKids && !node.scanning ? ' dsa-expander-btn' : ''}`}
            onClick={() => hasKids && !node.scanning && onToggle(node.path)}
          >
            {isActiveNode
              ? <span className="dsa-spin-sm">◌</span>
              : hasKids ? (isExpanded ? '▾' : '▸') : <span style={{opacity:.2}}>·</span>}
          </span>
          <span className="dsa-row-icon">{nodeIcon(node)}</span>
          <span className="dsa-row-name" title={node.path}>{node.name}</span>
          {node.accessDenied && <span className="dsa-lock" title="Access denied">🔒</span>}
        </div>
      </td>
      <td className="dsa-td dsa-td-bar">
        <div className="dsa-bar-cell">
          <div className="dsa-bar-track">
            <div className="dsa-bar-fill" style={{ width:`${Math.min(100,pct)}%`, background: barColor(pct) }} />
          </div>
          <span className="dsa-bar-size">{fmtBytes(node.size)}</span>
        </div>
      </td>
      <td className="dsa-td dsa-td-num">{fmtBytes(node.allocated)}</td>
      <td className="dsa-td dsa-td-num">{node.files.toLocaleString()}</td>
      <td className="dsa-td dsa-td-num">{node.folders.toLocaleString()}</td>
      <td className="dsa-td dsa-td-pct">
        <span className="dsa-pct-txt">{pct > 0.05 ? pct.toFixed(1)+'%' : '—'}</span>
      </td>
      <td className="dsa-td dsa-td-date">{fmtDate(node.modified)}</td>
      <td className="dsa-td dsa-td-act">
        <button className="dsa-reveal-btn" title="Open in Explorer" onClick={() => onReveal(node.path)}>↗</button>
      </td>
    </tr>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────

const MAX_ROWS = 800;

export default function DiskSpaceAnalyzer() {
  const [root,      setRoot]     = useState(null);
  const [expanded,  setExpanded] = useState(new Set());
  const [sortBy,    setSortBy]   = useState('size');
  const [sortDir,   setSortDir]  = useState('desc');
  const [scanning,  setScanning] = useState(false);
  const [stats,     setStats]    = useState({ scanned: 0, speed: 0, elapsed: '0' });
  const [selPath,   setSelPath]  = useState('');
  const [filter,    setFilter]   = useState('');
  const [error,     setError]    = useState('');
  const [showTop,   setShowTop]  = useState(false);
  const [showMore,  setShowMore] = useState(false);

  // ── Scan ──────────────────────────────────────────────────────────
  const scan = useCallback(async (folderPath) => {
    if (!folderPath) return;
    setScanning(true);
    setRoot(null);
    setError('');
    setFilter('');
    setShowMore(false);
    setStats({ scanned: 0, speed: 0, elapsed: '0' });
    setExpanded(new Set([folderPath]));

    try {
      const result = await window.rakshak.scanDisk(folderPath, (snap) => {
        if (snap.tree) {
          setRoot(snap.tree);
          // Keep root expanded
          setExpanded(prev => prev.has(folderPath) ? prev : new Set([...prev, folderPath]));
        }
        setStats({ scanned: snap.scanned || 0, speed: snap.speed || 0, elapsed: snap.elapsed || '0' });
      });

      if (result.ok && result.tree) {
        setRoot(result.tree);
        setStats({ scanned: result.totalScanned || 0, speed: 0, elapsed: result.elapsed || '0' });
        setExpanded(new Set([result.tree.path]));
      } else if (result.error !== 'aborted') {
        setError(result.error || 'Scan failed');
      }
    } finally {
      setScanning(false);
    }
  }, []);

  const pickAndScan = useCallback(async () => {
    const p = await window.rakshak.pickDiskFolder();
    if (p) { setSelPath(p); scan(p); }
  }, [scan]);

  // ── Sort ──────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (col === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  // ── Expand ────────────────────────────────────────────────────────
  const toggleExpand = useCallback((p) => {
    setExpanded(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }, []);

  const expandAll = useCallback(() => {
    if (!root) return;
    const all = new Set();
    (function walk(n) { if (n.children?.length) { all.add(n.path); n.children.forEach(walk); } })(root);
    setExpanded(all);
    setShowMore(true);
  }, [root]);

  const collapseAll = useCallback(() => {
    setExpanded(root ? new Set([root.path]) : new Set());
    setShowMore(false);
  }, [root]);

  // ── Rows ──────────────────────────────────────────────────────────
  const allRows  = useMemo(() => {
    if (!root) return [];
    if (filter) return filterTree(root, filter);
    return flattenTree(root, expanded, sortBy, sortDir);
  }, [root, expanded, sortBy, sortDir, filter]);

  const rows     = showMore ? allRows : allRows.slice(0, MAX_ROWS);
  const hasMore  = allRows.length > MAX_ROWS && !showMore;
  const topItems = useMemo(() => root ? topLargest(root) : [], [root]);
  const onReveal = useCallback((p) => window.rakshak.revealPath(p), []);

  const SortTh = ({ col, label, cls = '' }) => (
    <th className={`dsa-th${cls?' '+cls:''}`} onClick={() => handleSort(col)}>
      {label}{sortBy===col && <span className="dsa-sort-arrow">{sortDir==='asc'?' ↑':' ↓'}</span>}
    </th>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="dsa-wrap">

      {/* Toolbar */}
      <div className="dsa-toolbar">
        <div className="dsa-path-display">
          <span className="dsa-path-icon">💾</span>
          <span className="dsa-path-val" title={selPath}>{selPath || 'Select a drive or folder to analyze'}</span>
        </div>
        <div className="dsa-toolbar-btns">
          <button className="dsa-btn dsa-btn-primary" onClick={pickAndScan} disabled={scanning}>
            📂 {scanning ? 'Scanning…' : 'Choose Folder'}
          </button>
          {scanning && <button className="dsa-btn dsa-btn-danger" onClick={() => window.rakshak.abortDiskScan()}>✕ Stop</button>}
          {root && !scanning && (<>
            <button className="dsa-btn" onClick={expandAll}>⊞ Expand All</button>
            <button className="dsa-btn" onClick={collapseAll}>⊟ Collapse</button>
            <button className={`dsa-btn${showTop?' dsa-btn-active':''}`} onClick={() => setShowTop(s => !s)}>🏆 Top 20</button>
            <button className="dsa-btn" onClick={() => exportCSV(root)}>↓ CSV</button>
            <button className="dsa-btn" onClick={() => exportJSON(root)}>↓ JSON</button>
          </>)}
        </div>
      </div>

      {/* Live scan status */}
      {scanning && (
        <div className="dsa-scan-bar">
          <div className="dsa-scan-bar-runner" />
          <div className="dsa-scan-bar-info">
            <span className="dsa-scan-count">{stats.scanned.toLocaleString()}</span>
            <span className="dsa-scan-label"> items scanned</span>
            {stats.speed > 0 && <span className="dsa-scan-speed"> · {stats.speed.toLocaleString()}/s</span>}
            {root && <span className="dsa-scan-size"> · {fmtBytes(root.size)} found</span>}
          </div>
        </div>
      )}

      {/* Summary bar */}
      {root && (
        <div className="dsa-summary-bar">
          <span className="dsa-sum-chip">{fmtBytes(root.size)}</span>
          <span className="dsa-sum-divider" />
          <span className="dsa-sum-stat"><b>{root.files.toLocaleString()}</b> files</span>
          <span className="dsa-sum-divider" />
          <span className="dsa-sum-stat"><b>{root.folders.toLocaleString()}</b> folders</span>
          {!scanning && (<>
            <span className="dsa-sum-divider" />
            <span className="dsa-sum-stat"><b>{allRows.length.toLocaleString()}</b> rows</span>
            {stats.elapsed > 0 && <><span className="dsa-sum-divider" /><span className="dsa-sum-elapsed">⚡ {stats.elapsed}s</span></>}
          </>)}
          {scanning && <span className="dsa-sum-scanning">↻ live updating…</span>}
          {!scanning && (
            <input className="dsa-filter" placeholder="🔍 Filter by name…" value={filter} onChange={e => setFilter(e.target.value)} />
          )}
        </div>
      )}

      {error && <div className="dsa-error-bar">⚠ {error}</div>}

      {/* Top 20 */}
      {showTop && root && (
        <div className="dsa-top-panel">
          <div className="dsa-top-title">🏆 Top 20 Largest Items</div>
          <div className="dsa-top-grid">
            {topItems.map((n, i) => (
              <div key={n.path} className="dsa-top-row">
                <span className="dsa-top-rank">#{i+1}</span>
                <span className="dsa-top-icon">{nodeIcon(n)}</span>
                <span className="dsa-top-name" title={n.path}>{n.name}</span>
                <span className="dsa-top-size">{fmtBytes(n.size)}</span>
                <button className="dsa-reveal-btn" onClick={() => onReveal(n.path)}>↗</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tree table */}
      {root && (
        <div className="dsa-table-wrap">
          <table className="dsa-table">
            <colgroup>
              <col style={{minWidth:'200px'}} />
              <col style={{width:'200px'}} />
              <col style={{width:'86px'}} />
              <col style={{width:'60px'}} />
              <col style={{width:'60px'}} />
              <col style={{width:'60px'}} />
              <col style={{width:'90px'}} />
              <col style={{width:'32px'}} />
            </colgroup>
            <thead>
              <tr>
                <SortTh col="name"      label="Name"      cls="dsa-th-name" />
                <SortTh col="size"      label="Size" />
                <SortTh col="allocated" label="Allocated" />
                <SortTh col="files"     label="Files" />
                <SortTh col="folders"   label="Folders" />
                <th className="dsa-th dsa-th-pct">%</th>
                <SortTh col="modified"  label="Modified" />
                <th className="dsa-th dsa-th-act" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ node, depth, pct }) => (
                <TreeRow
                  key={node.path}
                  node={node}
                  depth={depth}
                  pct={pct}
                  isExpanded={expanded.has(node.path)}
                  scanning={scanning}
                  onToggle={toggleExpand}
                  onReveal={onReveal}
                />
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="dsa-load-more">
              Showing {MAX_ROWS.toLocaleString()} of {allRows.length.toLocaleString()} rows —{' '}
              <button className="dsa-load-more-btn" onClick={() => setShowMore(true)}>Show all</button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!root && !scanning && !error && (
        <div className="dsa-empty-state">
          <div className="dsa-empty-icon">💾</div>
          <div className="dsa-empty-title">Disk Space Analyzer</div>
          <div className="dsa-empty-sub">Choose a drive or folder to see a live breakdown, just like TreeSize.</div>
          <button className="dsa-btn dsa-btn-primary dsa-btn-lg" onClick={pickAndScan}>📂 Choose Folder to Analyze</button>
        </div>
      )}

      {/* Scanning placeholder before first snapshot */}
      {!root && scanning && (
        <div className="dsa-empty-state">
          <div className="dsa-spin-lg">◌</div>
          <div className="dsa-empty-title">Scanning…</div>
          <div className="dsa-empty-sub">Building tree — results will appear in seconds</div>
        </div>
      )}
    </div>
  );
}

