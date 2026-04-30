'use strict';

const osLayer = require('../os');

/**
 * Collects the 3 focused health metrics:
 *   1. CPU   — usage percent
 *   2. Memory + Storage — RAM and primary disk
 *   3. Network — online, latency, packet loss
 *
 * Returns a plain object shaped as a HealthReport proto message.
 */
async function collectHealth(nodeId) {
  const [cpuUsage, ram, disk, network] = await Promise.all([
    osLayer.getCPUUsage(),
    osLayer.getRAMUsage(),
    osLayer.getDiskSpace(),
    osLayer.getNetworkQuality(),
  ]);

  // Score each component (0 = critical, 50 = warning, 100 = ok)
  const cpuScore  = cpuUsage >= 90 ? 0 : cpuUsage >= 75 ? 50 : 100;
  const memScore  = ram.percent >= 90 ? 0 : ram.percent >= 80 ? 50 : 100;
  const diskScore = disk.freePercent < 7 ? 0 : disk.freePercent < 15 ? 50 : 100;
  const netScore  = !network.online ? 0
                  : network.avgLoss >= 20 ? 0
                  : network.avgLoss >= 5  ? 50
                  : network.avgLatency != null && network.avgLatency > 200 ? 50
                  : 100;

  const score = Math.round((cpuScore + memScore + diskScore + netScore) / 4);

  return {
    node_id:   nodeId,
    timestamp: new Date().toISOString(),
    score,
    cpu: {
      usage_percent: cpuUsage,
    },
    memory: {
      used_gb:   ram.usedGB,
      total_gb:  ram.totalGB,
      free_gb:   ram.freeGB,
      percent:   ram.percent,
    },
    storage: {
      drive:        disk.drive,
      used_gb:      disk.usedGB,
      total_gb:     disk.totalGB,
      free_gb:      disk.freeGB,
      free_percent: disk.freePercent,
    },
    network: {
      online:      network.online,
      avg_latency: network.avgLatency || 0,
      avg_loss:    network.avgLoss    || 0,
    },
  };
}

module.exports = { collectHealth };
