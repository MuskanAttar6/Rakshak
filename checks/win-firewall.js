'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'win-firewall',
  name: 'Windows Firewall',
  category: 'windows',
  platform: 'win32',
  blocking: true,
  fix: { id: 'open-firewall-settings', label: 'Open Firewall Settings' },
  async run() {
    const fw = await osLayer.getFirewallStatus();
    if (!fw.profiles || fw.profiles.length === 0) {
      return {
        status: 'warning',
        message: 'Could not read firewall profiles.',
        suggestion: 'Open Windows Security → Firewall & network protection.',
        details: fw
      };
    }
    if (!fw.allEnabled) {
      const off = fw.profiles.filter(p => !p.enabled).map(p => p.name).join(', ');
      return {
        status: 'critical',
        message: `Firewall is disabled for: ${off}.`,
        suggestion: 'Enable all firewall profiles in Windows Security.',
        details: fw
      };
    }
    return {
      status: 'ok',
      message: 'All firewall profiles are enabled.',
      suggestion: 'No action needed.',
      details: fw
    };
  }
};
