'use strict';

const crypto = require('crypto');

/** In-memory alert log — newest first */
const store = [];
const MAX_ALERTS = 300;

/**
 * Inspect a HealthReport and push any triggered alerts.
 * @param {object} report  - HealthReport proto object
 * @param {string} hostname
 */
function fromReport(report, hostname) {
  const ts  = new Date().toISOString();
  const nid = report.node_id;

  // ── CPU
  const cpu = report.cpu?.usage_percent ?? 0;
  if      (cpu >= 90) push(nid, hostname, 'CPU',     'CRITICAL', `CPU usage is critically high (${cpu.toFixed(1)}%). Immediate action recommended.`, ts);
  else if (cpu >= 75) push(nid, hostname, 'CPU',     'WARNING',  `CPU usage is elevated (${cpu.toFixed(1)}%).`, ts);

  // ── Memory
  const mem = report.memory?.percent ?? 0;
  if      (mem >= 90) push(nid, hostname, 'Memory',  'CRITICAL', `Memory usage is critically high (${mem.toFixed(1)}%). Immediate action recommended.`, ts);
  else if (mem >= 65) push(nid, hostname, 'Memory',  'INFO',     `Memory usage is above 65% (${mem.toFixed(1)}%).`, ts);

  // ── Storage
  const free  = report.storage?.free_percent ?? 100;
  const used  = +(100 - free).toFixed(0);
  const drive = report.storage?.drive || 'Storage';
  if      (free < 7)  push(nid, hostname, drive, 'CRITICAL', `${drive} usage is above 93% (${used}%). Immediate action recommended.`, ts);
  else if (free < 30) push(nid, hostname, drive, 'WARNING',  `${drive} usage is above 70% (${used}%). Consider cleaning up space.`, ts);

  // ── Network
  if (!report.network?.online) {
    push(nid, hostname, 'Network', 'CRITICAL', 'Node appears to be offline — no network connectivity.', ts);
  } else if ((report.network?.avg_loss ?? 0) >= 20) {
    push(nid, hostname, 'Network', 'WARNING',  `High packet loss detected (${(report.network.avg_loss).toFixed(0)}%).`, ts);
  }
}

function push(nodeId, hostname, category, severity, message, timestamp) {
  store.unshift({
    id:        crypto.randomBytes(8).toString('hex'),
    nodeId,
    hostname,
    category,
    severity,
    message,
    timestamp: timestamp || new Date().toISOString(),
  });
  if (store.length > MAX_ALERTS) store.length = MAX_ALERTS;
}

/** Get alerts, optionally filtered by nodeId */
function get(nodeId) {
  return nodeId ? store.filter(a => a.nodeId === nodeId) : [...store];
}

/** Count unread alerts for a node */
function countFor(nodeId) {
  return store.filter(a => a.nodeId === nodeId).length;
}

module.exports = { fromReport, get, countFor };
