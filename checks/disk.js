'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'disk',
  name: 'Disk Space',
  category: 'common',
  blocking: true,
  fix: { id: 'open-disk-cleanup', label: 'Open Disk Cleanup' },
  async run() {
    const disk = await osLayer.getDiskSpace();
    const base = { details: disk };
    if (disk.freePercent < 7) {
      return {
        status: 'critical',
        message: `Disk space critically low on ${disk.drive} (${disk.freeGB} GB free, ${disk.freePercent}%).`,
        suggestion: 'Free up space immediately — clear caches, old builds, and Docker images.',
        ...base
      };
    }
    if (disk.freePercent < 15) {
      return {
        status: 'warning',
        message: `Disk space is low on ${disk.drive} (${disk.freeGB} GB free, ${disk.freePercent}%).`,
        suggestion: 'Free up space to avoid slow performance and failed installs.',
        ...base
      };
    }
    return {
      status: 'ok',
      message: `Disk space is healthy on ${disk.drive} (${disk.freeGB} GB free).`,
      suggestion: 'No action needed.',
      ...base
    };
  }
};
