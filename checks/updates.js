'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'updates',
  name: 'System Updates',
  category: 'common',
  fix: { id: 'open-windows-update', label: 'Open Windows Update' },
  async run() {
    const count = await osLayer.getPendingUpdates();
    if (count === -1) {
      return {
        status: 'warning',
        message: 'Could not determine pending updates.',
        suggestion: 'Run your OS update tool manually to verify.',
        details: { count }
      };
    }
    if (count === 0) {
      return {
        status: 'ok',
        message: 'System is up to date.',
        suggestion: 'No action needed.',
        details: { count }
      };
    }
    if (count > 30) {
      return {
        status: 'critical',
        message: `${count} updates pending — system is significantly out of date.`,
        suggestion: 'Install pending updates to receive security and stability fixes.',
        details: { count }
      };
    }
    return {
      status: 'warning',
      message: `${count} updates pending.`,
      suggestion: 'Install pending updates when convenient.',
      details: { count }
    };
  }
};
