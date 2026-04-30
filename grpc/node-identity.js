'use strict';

const os  = require('os');
const fs  = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Resolves where to persist the node identity JSON.
 * Uses Electron userData if available, otherwise falls back to the project root.
 */
function getStorePath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'node-identity.json');
  } catch {
    return path.join(__dirname, '..', '.node-identity.json');
  }
}

let _identity = null;

/**
 * Returns a stable identity for this node.
 * Generated once on first run, then persisted to disk.
 */
function getNodeIdentity() {
  if (_identity) return _identity;

  const storePath = getStorePath();

  try {
    if (fs.existsSync(storePath)) {
      _identity = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return _identity;
    }
  } catch { /* corrupt file — regenerate */ }

  _identity = {
    node_id:  crypto.randomUUID(),
    hostname: os.hostname(),
    platform: process.platform,
    arch:     process.arch,
    version:  '1.0.0',
  };

  try {
    fs.writeFileSync(storePath, JSON.stringify(_identity, null, 2), 'utf8');
  } catch { /* non-fatal: identity stays in memory for this session */ }

  return _identity;
}

module.exports = { getNodeIdentity };
