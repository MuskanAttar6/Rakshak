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

async function runHealthCheck() {
  const checks = loadChecks().filter(applicableToPlatform);
  const results = await Promise.all(checks.map(runSingle));

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

module.exports = { runHealthCheck, calculateScore };
