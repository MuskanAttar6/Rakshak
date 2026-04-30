'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'docker',
  name: 'Docker',
  category: 'common',
  async run() {
    const d = await osLayer.checkDocker();
    if (!d.installed) {
      return {
        status: 'warning',
        message: 'Docker is not installed.',
        suggestion: 'Install Docker Desktop (Windows) or docker-ce (Linux) if you need containers.',
        details: d
      };
    }
    if (!d.running) {
      return {
        status: 'warning',
        message: 'Docker is installed but the daemon is not running.',
        suggestion: 'Start Docker Desktop or run: sudo systemctl start docker.',
        details: d
      };
    }
    return {
      status: 'ok',
      message: `Docker is running (${d.version}).`,
      suggestion: 'No action needed.',
      details: d
    };
  }
};
