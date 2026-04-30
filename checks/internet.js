'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'internet',
  name: 'Internet Connectivity',
  category: 'common',
  blocking: true,
  fix: { id: 'open-network-settings', label: 'Open Network Settings' },
  async run() {
    const res = await osLayer.checkInternet();
    if (res.online) {
      return {
        status: 'ok',
        message: 'Internet connection is working.',
        suggestion: 'No action needed.',
        details: res
      };
    }
    return {
      status: 'critical',
      message: 'No internet connectivity detected.',
      suggestion: 'Check your network cable / Wi-Fi, DNS, and firewall rules.',
      details: res
    };
  }
};
