'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'win-startup-apps',
  name: 'Startup Applications',
  category: 'windows',
  platform: 'win32',
  async run() {
    const count = await osLayer.getStartupAppCount();
    if (count > 20) {
      return {
        status: 'critical',
        message: `${count} startup applications detected — boot performance will suffer.`,
        suggestion: 'Open Task Manager → Startup tab and disable apps you do not need.',
        details: { count }
      };
    }
    if (count > 10) {
      return {
        status: 'warning',
        message: `${count} startup applications enabled.`,
        suggestion: 'Disable non-essential startup apps to speed up boot.',
        details: { count }
      };
    }
    return {
      status: 'ok',
      message: `${count} startup applications — within healthy range.`,
      suggestion: 'No action needed.',
      details: { count }
    };
  }
};
