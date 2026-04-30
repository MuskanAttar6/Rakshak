'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'network-speed',
  name: 'Network Speed',
  category: 'common',
  fix: { id: 'open-network-settings', label: 'Open Network Settings' },
  async run() {
    const r = await osLayer.downloadSpeedTest();
    const base = { details: r };
    if (!r.ok) {
      return {
        status: 'warning',
        message: 'Could not measure download speed.',
        suggestion: 'Verify internet connectivity and that no firewall is blocking outbound HTTPS.',
        ...base
      };
    }
    if (r.mbps < 2) {
      return {
        status: 'critical',
        message: `Very slow download speed (${r.mbps} Mbps).`,
        suggestion: 'Switch networks or disable bandwidth-heavy apps. Cloud builds and remote tools will fail at this speed.',
        ...base
      };
    }
    if (r.mbps < 10) {
      return {
        status: 'warning',
        message: `Slow download speed (${r.mbps} Mbps).`,
        suggestion: 'Pause large downloads / video calls or move to a faster connection.',
        ...base
      };
    }
    return {
      status: 'ok',
      message: `Download speed looks good (${r.mbps} Mbps).`,
      suggestion: 'No action needed.',
      ...base
    };
  }
};
