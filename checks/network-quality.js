'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'network-quality',
  name: 'Network Quality',
  category: 'common',
  blocking: true,
  fix: { id: 'open-network-settings', label: 'Open Network Settings' },
  async run() {
    const q = await osLayer.getNetworkQuality();
    const base = { details: q };

    if (!q.online) {
      return {
        status: 'critical',
        message: 'You appear to be offline — no ping replies from public DNS.',
        suggestion: 'Reconnect to Wi-Fi/Ethernet, or check VPN, proxy, and DNS settings before continuing.',
        ...base
      };
    }
    if (q.avgLoss >= 20) {
      return {
        status: 'critical',
        message: `High packet loss (${q.avgLoss}%) — connection is unstable.`,
        suggestion: 'Move closer to your router or switch to Ethernet. Restart your network adapter.',
        ...base
      };
    }
    if (q.avgLatency != null && q.avgLatency > 200) {
      return {
        status: 'warning',
        message: `High latency (${q.avgLatency} ms avg) — remote work tools may feel sluggish.`,
        suggestion: 'Switch to a faster network, disable bandwidth-heavy apps, or move closer to the router.',
        ...base
      };
    }
    if (q.avgLoss >= 5) {
      return {
        status: 'warning',
        message: `Some packet loss detected (${q.avgLoss}%).`,
        suggestion: 'Investigate Wi-Fi signal strength or driver updates.',
        ...base
      };
    }
    return {
      status: 'ok',
      message: `Network is stable (${q.avgLatency} ms, ${q.avgLoss}% loss).`,
      suggestion: 'No action needed.',
      ...base
    };
  }
};
