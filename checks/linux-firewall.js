'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'linux-firewall',
  name: 'Firewall',
  category: 'linux',
  platform: 'linux',
  async run() {
    const fw = await osLayer.getFirewallStatus();
    if (!fw.active) {
      return {
        status: 'warning',
        message: `Firewall (${fw.tool}) appears inactive.`,
        suggestion: 'Enable ufw: "sudo ufw enable" or configure iptables rules.',
        details: fw
      };
    }
    return {
      status: 'ok',
      message: `Firewall (${fw.tool}) is active.`,
      suggestion: 'No action needed.',
      details: fw
    };
  }
};
