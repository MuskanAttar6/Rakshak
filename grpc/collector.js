'use strict';

const { runHealthCheck } = require('../core/engine');

/**
 * Collects full health data — runs all checks once via the engine and extracts
 * the aggregated metric values directly from each check's details object.
 * This avoids running duplicate OS measurements in parallel (e.g. two concurrent
 * PowerShell CPU counters that would inflate each other's readings).
 */
async function collectHealth(nodeId) {
  const fullReport = await runHealthCheck({ sequential: false, delayMs: 0 });

  // Extract raw metrics from check details (already collected by the engine)
  const cpuResult  = fullReport.results.find(r => r.id === 'cpu');
  const ramResult  = fullReport.results.find(r => r.id === 'ram');
  const diskResult = fullReport.results.find(r => r.id === 'disk');
  const netResult  = fullReport.results.find(r => r.id === 'network-quality');

  const cpuDetails  = cpuResult?.details  || {};
  const ramDetails  = ramResult?.details  || {};
  const diskDetails = diskResult?.details || {};
  const netDetails  = netResult?.details  || {};

  return {
    node_id:   nodeId,
    timestamp: new Date().toISOString(),
    score:     fullReport.score,
    cpu: {
      usage_percent: cpuDetails.usagePercent ?? 0,
    },
    memory: {
      used_gb:  ramDetails.usedGB  ?? 0,
      total_gb: ramDetails.totalGB ?? 0,
      free_gb:  ramDetails.freeGB  ?? 0,
      percent:  ramDetails.percent ?? 0,
    },
    storage: {
      drive:        diskDetails.drive        ?? '',
      used_gb:      diskDetails.usedGB       ?? 0,
      total_gb:     diskDetails.totalGB      ?? 0,
      free_gb:      diskDetails.freeGB       ?? 0,
      free_percent: diskDetails.freePercent  ?? 0,
    },
    network: {
      online:      netDetails.online      ?? false,
      avg_latency: netDetails.avgLatency  ?? 0,
      avg_loss:    netDetails.avgLoss     ?? 0,
    },
    results: fullReport.results.map(r => ({
      id:           r.id,
      name:         r.name,
      status:       r.status,
      message:      r.message      || '',
      suggestion:   r.suggestion   || '',
      category:     r.category     || 'common',
      details_json: r.details != null ? JSON.stringify(r.details) : '',
    })),
    ok_count:       fullReport.okCount,
    warning_count:  fullReport.warningCount,
    critical_count: fullReport.criticalCount,
  };
}

module.exports = { collectHealth };
