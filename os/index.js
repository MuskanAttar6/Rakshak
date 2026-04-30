'use strict';

/**
 * OS abstraction layer entry point.
 * Resolves the correct platform module so check modules don't need to branch.
 */

const platform = process.platform;
const network = require('./network');

let impl;
if (platform === 'win32') {
  impl = require('./windows');
} else if (platform === 'linux') {
  impl = require('./linux');
} else {
  // Fallback — degrade gracefully on other platforms (e.g. macOS during dev)
  impl = require('./linux');
}

module.exports = {
  platform,
  ...impl,
  ...network
};
