'use strict';

/**
 * Core Engine
 * - Discovers check modules in /checks
 * - Filters by current platform
 * - Runs them in parallel
 * - Calculates an overall health score
 *
 * A check module exports:
 *   { id, name, category, platform?: 'win32'|'linux', run(): Promise<Result> }
 *
 * Result shape:
 *   { status: 'ok' | 'warning' | 'critical', message: string, suggestion: string, details?: any }
 */

const fs = require('fs');
const path = require('path');

const CHECKS_DIR = path.join(__dirname, '..', 'checks');

const STATUS_POINTS = { ok: 1.0, warning: 0.5, critical: 0.0 };

function loadChecks() {
  const files = fs.readdirSync(CHECKS_DIR).filter(f => f.endsWith('.js'));
  const checks = [];
  for (const f of files) {
    try {
      const mod = require(path.join(CHECKS_DIR, f));
      if (mod && typeof mod.run === 'function' && mod.id) {
        checks.push(mod);
      }
    } catch (err) {
      console.warn(`[engine] failed to load check ${f}:`, err.message);
    }
  }
  return checks;
}

function applicableToPlatform(check) {
  if (!check.platform) return true;
  return check.platform === process.platform;
}

async function runSingle(check) {
  const start = Date.now();
  try {
    const result = await Promise.race([
      check.run(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('check timed out')), 20000))
    ]);
    const status = ['ok', 'warning', 'critical'].includes(result?.status) ? result.status : 'warning';
    return {
      id: check.id,
      name: check.name || check.id,
      category: check.category || 'common',
      blocking: !!check.blocking,
      fix: check.fix || null,
      status,
      message: result.message || '',
      suggestion: result.suggestion || '',
      details: result.details || null,
      durationMs: Date.now() - start
    };
  } catch (err) {
    return {
      id: check.id,
      name: check.name || check.id,
      category: check.category || 'common',
      blocking: !!check.blocking,
      fix: check.fix || null,
      status: 'warning',
      message: `Check failed: ${err.message}`,
      suggestion: 'See application logs for details.',
      details: null,
      durationMs: Date.now() - start
    };
  }
}

function calculateScore(results) {
  if (!results.length) return 100;
  const earned = results.reduce((sum, r) => sum + (STATUS_POINTS[r.status] ?? 0), 0);
  return Math.round((earned / results.length) * 100);
}

/**
 * Run a single check by ID (for targeted checks like CPU-only)
 */
async function runSingleCheck(checkId) {
  const checks = loadChecks().filter(applicableToPlatform);
  const check = checks.find(c => c.id === checkId);
  
  if (!check) {
    throw new Error(`Check '${checkId}' not found`);
  }
  
  return await runSingle(check);
}

/**
 * Optimized health check with throttling to reduce CPU spikes
 * - Runs checks sequentially (not parallel) to avoid CPU overload
 * - Adds small delay between checks
 * - Progress callback for UI updates
 */
async function runHealthCheck(options = {}) {
  const { 
    onProgress,      // callback(checkId, completed, total)
    sequential = true,  // run one at a time (default true for lower CPU)
    delayMs = 100    // ms between checks (default 100ms)
  } = options;
  
  const checks = loadChecks().filter(applicableToPlatform);
  const results = [];
  const total = checks.length;
  
  if (sequential) {
    // Sequential execution - lower CPU impact
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      
      // Report progress before check
      if (onProgress) {
        onProgress(check.id, i, total);
      }
      
      // Run the check
      const result = await runSingle(check);
      results.push(result);
      
      // Small delay to let CPU cool down (except after last check)
      if (i < checks.length - 1 && delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  } else {
    // Parallel execution - faster but higher CPU (original behavior)
    const promises = checks.map((check, i) => {
      if (onProgress) onProgress(check.id, i, total);
      return runSingle(check);
    });
    results.push(...await Promise.all(promises));
  }

  // Stable order: critical → warning → ok, then by name
  const order = { critical: 0, warning: 1, ok: 2 };
  results.sort((a, b) => {
    const d = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });

  const score = calculateScore(results);
  const blockers = results.filter(r => r.blocking && r.status === 'critical');
  return {
    score,
    timestamp: new Date().toISOString(),
    platform: process.platform,
    okCount: results.filter(r => r.status === 'ok').length,
    warningCount: results.filter(r => r.status === 'warning').length,
    criticalCount: results.filter(r => r.status === 'critical').length,
    blockers,
    mustFix: blockers.length > 0,
    results
  };
}

module.exports = { runHealthCheck, runSingleCheck, calculateScore };
