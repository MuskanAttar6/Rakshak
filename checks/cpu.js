'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'cpu',
  name: 'CPU Usage',
  category: 'common',
  fix: { id: 'open-task-manager', label: 'Open Task Manager' },
  async run() {
    const usage = await osLayer.getCPUUsage();
    if (usage >= 90) {
      return {
        status: 'critical',
        message: `CPU usage is very high (${usage}%).`,
        suggestion: 'Close heavy applications or background processes consuming CPU.',
        details: { usagePercent: usage }
      };
    }
    if (usage >= 75) {
      return {
        status: 'warning',
        message: `CPU usage is elevated (${usage}%).`,
        suggestion: 'Check Task Manager / top for processes using high CPU.',
        details: { usagePercent: usage }
      };
    }
    return {
      status: 'ok',
      message: `CPU usage is healthy (${usage}%).`,
      suggestion: 'No action needed.',
      details: { usagePercent: usage }
    };
  }
};
