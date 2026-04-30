'use strict';

// ─── Shared CSS injected into every page ──────────────────────────────────────
const CSS = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #0b0f1a;
  --sidebar: #0d1117;
  --card:    #111827;
  --card2:   #141c2b;
  --border:  #1e293b;
  --border2: #243044;
  --blue:    #3b82f6;
  --blue2:   #1d4ed8;
  --green:   #10b981;
  --orange:  #f59e0b;
  --red:     #ef4444;
  --purple:  #8b5cf6;
  --text:    #f1f5f9;
  --text2:   #94a3b8;
  --text3:   #475569;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg); color: var(--text);
  overflow-x: hidden; line-height: 1.5;
}
a { text-decoration: none; color: inherit; }

/* ── App shell ─────────────────────────────────────── */
.app { display: flex; height: 100vh; overflow: hidden; }
.main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; }

/* ── Sidebar ───────────────────────────────────────── */
.sidebar {
  width: 220px; min-width: 220px;
  background: var(--sidebar);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow-y: auto;
}
.brand {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}
.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.brand-tag  { font-size: 10px; color: var(--text3); margin-top: 1px; }

.nav { padding: 10px 8px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px; cursor: pointer;
  font-size: 13px; color: var(--text2);
  text-decoration: none; margin-bottom: 2px;
  transition: all 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
.nav-item.active { background: rgba(59,130,246,0.12); color: var(--blue); font-weight: 600; }
.nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-badge {
  margin-left: auto; background: var(--red); color: #fff;
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px; min-width: 18px; text-align: center;
}

.sys-status {
  padding: 14px 16px; border-top: 1px solid var(--border);
}
.ss-label { font-size: 10px; text-transform: uppercase; color: var(--text3); letter-spacing: 0.8px; margin-bottom: 8px; }
.ss-inner { display: flex; align-items: center; gap: 10px; }
.ss-icon  { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ss-icon.green  { background: rgba(16,185,129,0.15); }
.ss-icon.orange { background: rgba(245,158,11,0.15); }
.ss-icon.red    { background: rgba(239,68,68,0.15); }
.ss-title { font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.3; }
.ss-sub.green  { font-size: 11px; color: var(--green); }
.ss-sub.orange { font-size: 11px; color: var(--orange); }
.ss-sub.red    { font-size: 11px; color: var(--red); }
.version { padding: 8px 16px; font-size: 10px; color: var(--text3); }

/* ── Top bar ───────────────────────────────────────── */
.topbar {
  padding: 16px 28px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--card); flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-icon { width: 36px; height: 36px; border-radius: 9px; background: rgba(59,130,246,0.12); display: flex; align-items: center; justify-content: center; }
.topbar-title { font-size: 17px; font-weight: 700; color: var(--text); }
.topbar-sub   { font-size: 11px; color: var(--text3); margin-top: 2px; }
.topbar-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.last-scan { font-size: 12px; color: var(--text3); }
.btn-scan {
  background: var(--blue); color: #fff; border: none;
  padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.15s;
}
.btn-scan:hover    { background: var(--blue2); }
.btn-scan:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Metric cards ──────────────────────────────────── */
.metrics-row {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 16px; padding: 20px 28px 8px;
}
.metric-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 18px;
}
.mc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.mc-left  { display: flex; align-items: center; gap: 10px; }
.mc-icon  {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
}
.mc-icon.blue   { background: rgba(59,130,246,0.12); }
.mc-icon.green  { background: rgba(16,185,129,0.12); }
.mc-icon.orange { background: rgba(245,158,11,0.12); }
.mc-icon.purple { background: rgba(139,92,246,0.12); }
.mc-label { font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.mc-body  { display: flex; align-items: flex-end; justify-content: space-between; }
.mc-value { font-size: 32px; font-weight: 800; line-height: 1; }
.mc-value.green  { color: var(--green); }
.mc-value.orange { color: var(--orange); }
.mc-value.red    { color: var(--red); }
.mc-sub { font-size: 11px; color: var(--text3); margin-top: 4px; }
.mc-sparkline { height: 36px; width: 80px; flex-shrink: 0; display: flex; align-items: center; }
.mc-sparkline svg { overflow: visible; }

/* ── Sections ──────────────────────────────────────── */
.section { padding: 12px 28px 0; }
.section-hd {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 14px;
}
.section-hd-left {}
.section-title { font-size: 14px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
.section-sub   { font-size: 11px; color: var(--text3); margin-top: 3px; }
.btn-sm {
  background: transparent; border: 1px solid var(--border);
  color: var(--text2); padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:hover { border-color: var(--blue); color: var(--blue); }

/* ── Drive cards ───────────────────────────────────── */
.drives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.drive-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px; display: flex; gap: 18px; align-items: flex-start;
}
.drive-donut { flex-shrink: 0; }
.drive-info  { flex: 1; min-width: 0; }
.drive-top   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.drive-name  { font-size: 14px; font-weight: 700; color: var(--text); }
.drive-type  { font-size: 11px; color: var(--text3); margin-bottom: 14px; }
.drive-stat  { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
.drive-stat-label { color: var(--text3); }
.drive-stat-val   { color: var(--text); font-weight: 500; }
.drive-stat-val.orange { color: var(--orange); }
.drive-stat-val.red    { color: var(--red); }
.drive-thresholds { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 10px; }
.threshold-row  { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text3); margin-bottom: 4px; }
.t-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.drive-alert-bar {
  display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500;
  padding: 8px 10px; border-radius: 7px; margin-top: 12px;
}
.drive-alert-bar.green  { background: rgba(16,185,129,0.08); color: #34d399; border: 1px solid rgba(16,185,129,0.15); }
.drive-alert-bar.orange { background: rgba(245,158,11,0.08); color: #fbbf24; border: 1px solid rgba(245,158,11,0.15); }
.drive-alert-bar.red    { background: rgba(239,68,68,0.08);  color: #f87171; border: 1px solid rgba(239,68,68,0.15); }
.badge-drive {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
}
.badge-drive.warning  { background: rgba(245,158,11,0.15); color: #fbbf24; }
.badge-drive.critical { background: rgba(239,68,68,0.15);  color: #f87171; }
.badge-drive.ok       { background: rgba(16,185,129,0.15); color: #34d399; }

/* ── Optimization banner ───────────────────────────── */
.opt-banner {
  margin: 14px 28px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-radius: 10px;
  background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.18);
}
.opt-title { font-size: 13px; font-weight: 600; color: var(--green); }
.opt-sub   { font-size: 11px; color: var(--text3); margin-top: 2px; }
.btn-optimize {
  background: var(--green); color: #fff; border: none;
  padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}

/* ── Bottom grid ───────────────────────────────────── */
.bottom-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px 28px 28px; }
.bottom-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
.bc-title {
  font-size: 13px; font-weight: 600; color: var(--text);
  margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.view-all {
  margin-left: auto; font-size: 11px; color: var(--blue);
  display: flex; align-items: center; gap: 3px; cursor: pointer;
}

/* Alerts */
.alert-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 0; border-bottom: 1px solid var(--border);
}
.alert-item:last-child { border-bottom: none; }
.alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.alert-dot.CRITICAL { background: var(--red); }
.alert-dot.WARNING  { background: var(--orange); }
.alert-dot.INFO     { background: var(--blue); }
.alert-top   { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.alert-cat   { font-size: 12px; font-weight: 600; color: var(--text); }
.sev-badge   { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 4px; }
.sev-badge.CRITICAL { background: rgba(239,68,68,0.15);  color: #f87171; }
.sev-badge.WARNING  { background: rgba(245,158,11,0.15); color: #fbbf24; }
.sev-badge.INFO     { background: rgba(59,130,246,0.15); color: #93c5fd; }
.alert-msg   { font-size: 11px; color: var(--text2); }
.alert-time  { font-size: 10px; color: var(--text3); margin-top: 2px; }

/* Tips */
.tip-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border);
  font-size: 12px; color: var(--text2);
}
.tip-item:last-child { border-bottom: none; }
.tip-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }

/* ── Node list page ─────────────────────────────────── */
.nodes-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px; padding: 20px 28px;
}
.node-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px; cursor: pointer;
  transition: all 0.2s; text-decoration: none; display: block;
}
.node-card:hover { border-color: var(--blue); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.nc-top    { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.nc-name   { font-size: 16px; font-weight: 700; color: var(--text); }
.nc-id     { font-size: 10px; color: var(--text3); font-family: monospace; margin-bottom: 12px; }
.nc-status { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.nc-status.on  { background: rgba(16,185,129,0.12); color: var(--green); }
.nc-status.off { background: rgba(71,85,105,0.12);  color: var(--text3); }
.nc-platform   { font-size: 12px; color: var(--text3); margin-bottom: 16px; }
.nc-metrics    { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.ncm           { background: var(--card2); border-radius: 8px; padding: 10px 8px; text-align: center; }
.ncm-val { font-size: 18px; font-weight: 700; }
.ncm-lbl { font-size: 10px; color: var(--text3); margin-top: 2px; }
.nc-score-row  { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.nc-score-label { font-size: 12px; color: var(--text3); }
.score-bar  { flex: 1; height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.score-fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
.nc-btn {
  width: 100%; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2);
  color: var(--blue); padding: 9px; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; text-align: center; transition: all 0.15s;
}
.node-card:hover .nc-btn { background: var(--blue); color: #fff; border-color: var(--blue); }

/* ── Login page ─────────────────────────────────────── */
.login-body {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg);
}
.login-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 16px; padding: 40px 36px; width: 100%; max-width: 400px; text-align: center;
}
.login-logo  { margin-bottom: 20px; }
.login-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
.login-sub   { font-size: 13px; color: var(--text3); margin-bottom: 28px; line-height: 1.6; }
.form-group  { text-align: left; margin-bottom: 20px; }
.form-label  { font-size: 12px; color: var(--text2); margin-bottom: 6px; display: block; }
.input-wrap  { position: relative; }
.input-icon  { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); }
.form-input  {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 11px 12px 11px 36px; font-size: 14px;
  color: var(--text); outline: none; transition: border-color 0.15s;
}
.form-input:focus { border-color: var(--blue); }
.btn-login {
  width: 100%; background: var(--blue); color: #fff; border: none;
  padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-login:hover { background: var(--blue2); }
.login-error {
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: #f87171; padding: 10px 14px; border-radius: 8px;
  font-size: 13px; margin-bottom: 16px; text-align: left;
}
.login-hint { margin-top: 20px; font-size: 12px; color: var(--text3); }

/* ── Utilities ──────────────────────────────────────── */
.empty-state      { text-align: center; padding: 70px 20px; color: var(--text3); }
.empty-icon       { font-size: 40px; margin-bottom: 16px; }
.empty-title      { font-size: 15px; color: var(--text2); margin-bottom: 6px; font-weight: 600; }
.empty-sub        { font-size: 12px; line-height: 1.7; }
.content-pad      { padding: 20px 28px; }

/* Scrollbars */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--border2); }
</style>`;

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function shieldSvg(size = 32, color = '#3b82f6') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L5 8v8c0 6.5 5 11.5 11 13.2C22 27.5 27 22.5 27 16V8L16 3z"
          fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="16" y="20" text-anchor="middle" fill="${color}" font-size="10" font-weight="700" font-family="system-ui">R</text>
  </svg>`;
}

/** Sidebar nav icons as tiny SVG */
const ICONS = {
  dashboard:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  performance: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  storage:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  processes:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/></svg>`,
  network:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  alerts:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  reports:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  settings:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  about:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  nodes:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>`,
};

/**
 * Build the sidebar HTML.
 * @param {string} active     - key of the active nav item
 * @param {number} alertCount - badge count for Alerts nav item
 * @param {string} nodeId     - optional, for linking Alerts to node
 */
function sidebarHtml(active = 'dashboard', alertCount = 0, nodeId = '') {
  const navItems = [
    { key: 'nodes',       label: 'Nodes',       href: '/nodes',                 icon: ICONS.nodes       },
    { key: 'dashboard',   label: 'Dashboard',   href: nodeId ? `/node/${nodeId}` : '/nodes', icon: ICONS.dashboard   },
    { key: 'performance', label: 'Performance', href: '#',                      icon: ICONS.performance  },
    { key: 'storage',     label: 'Storage',     href: '#storage',               icon: ICONS.storage      },
    { key: 'processes',   label: 'Processes',   href: '#',                      icon: ICONS.processes    },
    { key: 'network',     label: 'Network',     href: '#network',               icon: ICONS.network      },
    { key: 'alerts',      label: 'Alerts',      href: '#alerts',                icon: ICONS.alerts, badge: alertCount },
    { key: 'reports',     label: 'Reports',     href: '#',                      icon: ICONS.reports      },
    { key: 'settings',    label: 'Settings',    href: '#',                      icon: ICONS.settings     },
    { key: 'about',       label: 'About',       href: '#',                      icon: ICONS.about        },
  ];

  const navHtml = navItems.map(item => `
    <a href="${item.href}" class="nav-item${active === item.key ? ' active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
    </a>`).join('');

  return `
  <aside class="sidebar">
    <div class="brand">
      ${shieldSvg(30, '#3b82f6')}
      <div class="brand-text">
        <span class="brand-name">Rakshak</span>
        <span class="brand-tag">The Performance Guard</span>
      </div>
    </div>
    <nav class="nav">${navHtml}</nav>
    <div class="sys-status" id="sys-status-sidebar">
      <div class="ss-label">System Status</div>
      <div class="ss-inner">
        <div class="ss-icon green" id="ss-icon">${shieldSvg(18, '#10b981')}</div>
        <div>
          <div class="ss-title" id="ss-title">All Systems</div>
          <div class="ss-sub green" id="ss-sub">Protected</div>
        </div>
      </div>
    </div>
    <div class="version">v1.0.0</div>
  </aside>`;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function metricColor(value, warnAt = 75, critAt = 90) {
  if (value >= critAt)  return 'red';
  if (value >= warnAt)  return 'orange';
  return 'green';
}

module.exports = { CSS, sidebarHtml, shieldSvg, escHtml, metricColor, ICONS };
