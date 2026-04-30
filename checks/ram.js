'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'ram',
  name: 'Memory (RAM)',
  category: 'common',
  blocking: true,
  fix: { id: 'open-task-manager', label: 'Open Task Manager' },
  async run() {
    const ram = await osLayer.getRAMUsage();
    const base = { details: ram };
    if (ram.percent >= 90) {
      return {
        status: 'critical',
        message: `RAM usage is very high (${ram.percent}%, ${ram.usedGB}/${ram.totalGB} GB used).`,
        suggestion: 'Close memory-intensive apps. Consider adding more RAM if this is frequent.',
        ...base
      };
    }
    if (ram.percent >= 80) {
      return {
        status: 'warning',
        message: `RAM usage is elevated (${ram.percent}%, ${ram.usedGB}/${ram.totalGB} GB used).`,
        suggestion: 'Close unused tabs or background apps to free memory.',
        ...base
      };
    }
    return {
      status: 'ok',
      message: `Memory looks good (${ram.percent}% used, ${ram.freeGB} GB free).`,
      suggestion: 'No action needed.',
      ...base
    };
  }
};
