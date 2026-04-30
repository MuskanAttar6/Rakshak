'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'linux-failed-services',
  name: 'Failed Services',
  category: 'linux',
  platform: 'linux',
  blocking: true,
  async run() {
    const failed = await osLayer.getFailedServices();
    if (failed.length === 0) {
      return {
        status: 'ok',
        message: 'No failed systemd services.',
        suggestion: 'No action needed.',
        details: { failed }
      };
    }
    if (failed.length > 3) {
      return {
        status: 'critical',
        message: `${failed.length} failed services: ${failed.slice(0, 5).join(', ')}…`,
        suggestion: 'Inspect with "systemctl status <name>" and restart or fix the units.',
        details: { failed }
      };
    }
    return {
      status: 'warning',
      message: `Failed services: ${failed.join(', ')}.`,
      suggestion: 'Run "systemctl status <name>" to diagnose, then restart or disable.',
      details: { failed }
    };
  }
};
