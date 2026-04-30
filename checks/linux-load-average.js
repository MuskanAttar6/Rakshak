'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'linux-load-average',
  name: 'Load Average',
  category: 'linux',
  platform: 'linux',
  async run() {
    const la = await osLayer.getLoadAverage();
    const ratio = la.load5 / la.cores;
    const base = { details: la };
    if (ratio >= 2) {
      return {
        status: 'critical',
        message: `Load average is very high (${la.load5} on ${la.cores} cores).`,
        suggestion: 'Identify high-CPU processes via "top" or "htop" and stop unneeded ones.',
        ...base
      };
    }
    if (ratio >= 1) {
      return {
        status: 'warning',
        message: `Load average is elevated (${la.load5} on ${la.cores} cores).`,
        suggestion: 'Investigate processes contributing to load.',
        ...base
      };
    }
    return {
      status: 'ok',
      message: `Load average healthy (${la.load5} on ${la.cores} cores).`,
      suggestion: 'No action needed.',
      ...base
    };
  }
};
