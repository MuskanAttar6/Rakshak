'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'linux-log-errors',
  name: 'System Log Errors',
  category: 'linux',
  platform: 'linux',
  async run() {
    const r = await osLayer.getCriticalLogErrors();
    if (!r.available) {
      return {
        status: 'warning',
        message: 'Could not read journalctl logs.',
        suggestion: 'Ensure systemd-journald is running and the user has access.',
        details: r
      };
    }
    if (r.count > 50) {
      return {
        status: 'critical',
        message: `${r.count} error-level log entries in recent journal.`,
        suggestion: 'Inspect with "journalctl -p err -xb" and address recurring errors.',
        details: r
      };
    }
    if (r.count > 10) {
      return {
        status: 'warning',
        message: `${r.count} error-level log entries found.`,
        suggestion: 'Review recent journal entries for patterns.',
        details: r
      };
    }
    return {
      status: 'ok',
      message: `Few or no recent error logs (${r.count}).`,
      suggestion: 'No action needed.',
      details: r
    };
  }
};
