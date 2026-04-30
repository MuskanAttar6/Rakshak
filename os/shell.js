'use strict';

const { exec } = require('child_process');

/**
 * Run a shell command and resolve with { stdout, stderr, code }.
 * Never rejects on non-zero exit — checks should interpret outputs themselves.
 */
function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 * 4, ...opts }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout || '').toString().trim(),
        stderr: (stderr || '').toString().trim(),
        code: err ? (err.code ?? 1) : 0,
        error: err || null
      });
    });
  });
}

/** Run a PowerShell command (Windows). */
function runPS(script) {
  // -NoProfile speeds up startup; -Command runs an inline script
  const escaped = script.replace(/"/g, '\\"');
  return run(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${escaped}"`);
}

module.exports = { run, runPS };
