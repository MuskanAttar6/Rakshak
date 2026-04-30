'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'win-critical-services',
  name: 'Critical Services',
  category: 'windows',
  platform: 'win32',
  blocking: true,
  fix: { id: 'open-services', label: 'Open Services Manager' },
  async run() {
    const list = await osLayer.getCriticalServicesStatus();
    if (!list.length) {
      return {
        status: 'warning',
        message: 'Could not enumerate critical services.',
        suggestion: 'Run services.msc to verify essential services are running.',
        details: { list }
      };
    }
    const stopped = list.filter(s => !s.running).map(s => s.name);
    if (stopped.length > 0) {
      return {
        status: 'critical',
        message: `Critical services stopped: ${stopped.join(', ')}.`,
        suggestion: 'Start the listed services via services.msc or "Start-Service <name>".',
        details: { list }
      };
    }
    return {
      status: 'ok',
      message: 'All critical services are running.',
      suggestion: 'No action needed.',
      details: { list }
    };
  }
};
