'use strict';

/**
 * Secure shell execution wrapper
 * - Uses spawn instead of exec to prevent shell injection
 * - Validates commands against allowlist
 * - Sanitizes arguments
 */

const { spawn } = require('child_process');

// Detect if running in test environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Allowlist of safe commands
const ALLOWED_COMMANDS = new Set([
  'ping',
  'git',
  'docker',
  'df',
  'systemctl',
  'journalctl',
  'bash',
  'ufw',
  'iptables',
  'cleanmgr',
  'taskmgr',
  'services.msc',
  'powershell'
]);

// Dangerous characters that could enable injection
const DANGEROUS_CHARS = /[;&|`$(){}[\]\r\n]/;

/**
 * Validate command is in allowlist and args don't contain dangerous chars
 * @param {string} cmd
 * @param {string[]} args
 * @returns {boolean}
 */
function isSafe(cmd, args = []) {
  if (!ALLOWED_COMMANDS.has(cmd)) {
    if (!isTestEnv) console.warn(`[shell-secure] Command not in allowlist: ${cmd}`);
    return false;
  }
  
  for (const arg of args) {
    if (typeof arg !== 'string') continue;
    if (DANGEROUS_CHARS.test(arg)) {
      if (!isTestEnv) console.warn(`[shell-secure] Dangerous characters in arg: ${arg}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Run a command safely using spawn
 * Never rejects - returns { stdout, stderr, code, error }
 * 
 * @param {string} cmd - Command name (must be in allowlist)
 * @param {string[]} args - Arguments as array (safer than string concatenation)
 * @param {object} opts - Spawn options
 * @returns {Promise<{stdout: string, stderr: string, code: number, error: Error|null}>}
 */
function runSafe(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    // Security check
    if (!isSafe(cmd, args)) {
      return resolve({
        stdout: '',
        stderr: 'Command blocked for security',
        code: 1,
        error: new Error(`Command not allowed or unsafe: ${cmd}`)
      });
    }
    
    const proc = spawn(cmd, args, {
      windowsHide: true,
      timeout: opts.timeout || 15000,
      ...opts
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    // Handle timeout
    if (opts.timeout) {
      setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
        }
      }, opts.timeout);
    }
    
    proc.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
        error: code !== 0 ? new Error(`Exit code ${code}`) : null
      });
    });
    
    proc.on('error', (err) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: 1,
        error: err
      });
    });
  });
}

/**
 * PowerShell wrapper - runs PowerShell with a script
 * @param {string} script - PowerShell script (validate carefully)
 * @param {number} timeout
 * @returns {Promise<{stdout, stderr, code, error}>}
 */
function runPSSafe(script, timeout = 15000) {
  // Sanitize script - basic protection
  if (DANGEROUS_CHARS.test(script)) {
    return Promise.resolve({
      stdout: '',
      stderr: 'Script contains dangerous characters',
      code: 1,
      error: new Error('Script blocked for security')
    });
  }
  
  return runSafe('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', script
  ], { timeout });
}

/**
 * Legacy-compatible wrapper - parses command string into args
 * Use this when migrating from old code that uses string commands
 * @param {string} cmdString - Command string like "ping -n 4 8.8.8.8"
 * @param {object} opts
 * @returns {Promise<{stdout, stderr, code, error}>}
 */
function runLegacy(cmdString, opts = {}) {
  // Parse simple command strings (no shell operators)
  if (DANGEROUS_CHARS.test(cmdString)) {
    return Promise.resolve({
      stdout: '',
      stderr: 'Command contains dangerous characters',
      code: 1,
      error: new Error('Command blocked for security')
    });
  }
  
  const parts = cmdString.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  
  return runSafe(cmd, args, opts);
}

module.exports = {
  run: runSafe,
  runPS: runPSSafe,
  runLegacy,
  isSafe,
  ALLOWED_COMMANDS
};
