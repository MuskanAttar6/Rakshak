'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'git',
  name: 'Git',
  category: 'common',
  async run() {
    const git = await osLayer.checkGit();
    if (!git.installed) {
      return {
        status: 'critical',
        message: 'Git is not installed.',
        suggestion: 'Install Git from https://git-scm.com/downloads to enable version control.',
        details: git
      };
    }
    if (!git.configured) {
      return {
        status: 'warning',
        message: 'Git is installed but user.name / user.email not configured.',
        suggestion: 'Run: git config --global user.name "Your Name" && git config --global user.email "you@example.com".',
        details: git
      };
    }
    return {
      status: 'ok',
      message: `Git is installed and configured (${git.userName} <${git.userEmail}>).`,
      suggestion: 'No action needed.',
      details: git
    };
  }
};
