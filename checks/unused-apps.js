'use strict';

/**
 * Unused Apps scanner — Windows only.
 *
 * Strategy:
 *  1. Query HKLM + HKCU Uninstall registry keys via PowerShell → installed app list
 *  2. Read C:\Windows\Prefetch\*.pf → map of EXE name → last-launched timestamp
 *  3. Cross-reference: if an app's EXE has a Prefetch entry older than `thresholdDays`
 *     (or has no entry) it is flagged as "unused".
 *
 * Prefetch note: reading C:\Windows\Prefetch requires admin rights.
 * If access is denied we still return the app list but set prefetchAccessible=false,
 * and every app gets status='unknown'. The UI shows a banner in that case.
 */

const { execFile } = require('child_process');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');

const PREFETCH_DIR = 'C:\\Windows\\Prefetch';

// EXE names we should never treat as the app's "main" executable
const SKIP_EXE_NAMES = new Set([
  'MSIEXEC.EXE', 'UNINSTALL.EXE', 'UNINST.EXE', 'SETUP.EXE',
  'INSTALL.EXE', 'INSTALLER.EXE', 'UPDATE.EXE', 'UPDATER.EXE',
  'RUNDLL32.EXE', 'REGSVR32.EXE',
]);

// ── Prefetch ──────────────────────────────────────────────────────────────────

/**
 * Build a map of  EXE_NAME_UPPERCASED → Date (last run timestamp)
 * from the Prefetch directory.
 *
 * Prefetch filenames have the form:  APPNAME.EXE-XXXXXXXX.pf
 * The .pf file's mtime == last time that EXE was launched.
 *
 * @returns {{ map: Map<string,Date>, accessible: boolean, error: string|null }}
 */
function buildPrefetchMap() {
  const map = new Map();
  try {
    const entries = fs.readdirSync(PREFETCH_DIR);
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith('.pf')) continue;
      // Capture the EXE portion before the hash suffix
      const m = entry.match(/^(.+\.exe)-[0-9a-f]+\.pf$/i);
      if (!m) continue;
      const key = m[1].toUpperCase();
      let stat;
      try { stat = fs.statSync(path.join(PREFETCH_DIR, entry)); } catch { continue; }
      // Keep only the most-recent entry when multiple hashes exist for the same EXE
      const prev = map.get(key);
      if (!prev || stat.mtime > prev) map.set(key, stat.mtime);
    }
    return { map, accessible: true, error: null };
  } catch (err) {
    return { map, accessible: false, error: err.message };
  }
}

// ── EXE extraction ────────────────────────────────────────────────────────────

/**
 * Try to identify the main EXE name for an installed app from its registry data.
 * We prefer DisplayIcon (usually points to the app EXE) over UninstallString.
 *
 * @param {string|null} displayIcon
 * @param {string|null} uninstallString
 * @returns {string|null}  Upper-cased EXE basename, e.g. "CHROME.EXE"
 */
function extractExeName(displayIcon, uninstallString) {
  for (const src of [displayIcon, uninstallString]) {
    if (!src || typeof src !== 'string') continue;
    // Strip surrounding quotes and icon-index suffix ",N"
    const cleaned = src
      .replace(/^"/, '')
      .split('"')[0]          // take the part before any closing quote
      .replace(/,\s*-?\d+$/, '') // strip ",0" icon index
      .trim();
    const base = path.basename(cleaned).toUpperCase();
    if (
      base.endsWith('.EXE') &&
      !SKIP_EXE_NAMES.has(base) &&
      !base.includes('UNINSTALL') &&
      !base.includes('UNINST')
    ) {
      return base;
    }
  }
  return null;
}

// ── Registry query ────────────────────────────────────────────────────────────

/**
 * Query the Windows Uninstall registry hives via PowerShell and return a
 * raw array of app property objects.
 *
 * We write the PowerShell script to a temp file to avoid all shell-escaping
 * hazards.  The temp file is deleted immediately after execution.
 *
 * @returns {Promise<object[]>}
 */
function queryInstalledApps() {
  // PowerShell script — queries three hives, filters noise, outputs JSON
  const script = [
    '$ErrorActionPreference = "SilentlyContinue"',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$keys = @(',
    '  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
    '  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
    '  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"',
    ')',
    '$all = foreach ($k in $keys) { Get-ItemProperty $k -ErrorAction SilentlyContinue }',
    // Filter: must have a name, must not be a system component or a sub-update patch
    '$filtered = $all | Where-Object {',
    '  $_.DisplayName -and',
    '  ($_.SystemComponent -ne 1) -and',
    '  (-not $_.ParentKeyName)',
    '}',
    '$result = $filtered | Select-Object DisplayName, DisplayVersion, Publisher,',
    '  InstallDate, InstallLocation, DisplayIcon, UninstallString, EstimatedSize',
    'Write-Output (ConvertTo-Json @($result) -Compress -Depth 1)',
  ].join('\r\n');

  const tmpFile = path.join(os.tmpdir(), `rakshak-unused-apps-${process.pid}.ps1`);

  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(tmpFile, script, 'utf8');
    } catch (err) {
      return reject(new Error('Cannot write temp PS1 file: ' + err.message));
    }

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpFile],
      { maxBuffer: 10 * 1024 * 1024, timeout: 45000 },
      (err, stdout, stderr) => {
        // Always clean up temp file
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

        if (err) {
          return reject(new Error('PowerShell failed: ' + (stderr || err.message)));
        }

        const raw = stdout.trim();
        if (!raw) return resolve([]);

        try {
          const parsed = JSON.parse(raw);
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
          reject(new Error('Failed to parse registry JSON: ' + e.message));
        }
      }
    );
  });
}

// ── Install-date parser ───────────────────────────────────────────────────────

/**
 * Convert the YYYYMMDD string the registry stores into an ISO date string.
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function parseInstallDate(raw) {
  if (!raw || !/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scan for installed apps and determine which ones haven't been used recently.
 *
 * @param {number} thresholdDays  Number of days without use → "unused". Default 60.
 * @returns {Promise<ScanResult>}
 *
 * @typedef {{
 *   apps: AppEntry[],
 *   prefetchAccessible: boolean,
 *   prefetchError: string|null,
 *   total: number,
 *   unusedCount: number,
 *   neverDetectedCount: number,
 *   activeCount: number,
 *   thresholdDays: number,
 *   scannedAt: string
 * }} ScanResult
 *
 * @typedef {{
 *   name: string,
 *   version: string|null,
 *   publisher: string|null,
 *   installDate: string|null,
 *   installLocation: string|null,
 *   uninstallString: string|null,
 *   estimatedSizeMB: number|null,
 *   exeName: string|null,
 *   lastRun: string|null,
 *   status: 'active'|'unused'|'never-detected'|'unknown'
 * }} AppEntry
 */
async function scanUnusedApps(thresholdDays = 60) {
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Run Prefetch scan + registry query in parallel
  const { map: prefetchMap, accessible: prefetchAccessible, error: prefetchError } =
    buildPrefetchMap();

  let rawApps;
  try {
    rawApps = await queryInstalledApps();
  } catch (err) {
    throw new Error('Registry read failed: ' + err.message);
  }

  // Deduplicate by lower-cased DisplayName (same app in 64+32-bit hives)
  const seen = new Set();
  const apps = [];

  for (const raw of rawApps) {
    const name = (raw.DisplayName || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const exeName = extractExeName(raw.DisplayIcon, raw.UninstallString);

    // Look up last-run time in Prefetch map
    const lastRunDate = (exeName && prefetchMap.get(exeName)) || null;

    let status;
    if (!prefetchAccessible) {
      status = 'unknown';
    } else if (!lastRunDate) {
      status = 'never-detected';
    } else {
      status = (now - lastRunDate.getTime()) > thresholdMs ? 'unused' : 'active';
    }

    apps.push({
      name,
      version:          raw.DisplayVersion  || null,
      publisher:        raw.Publisher       || null,
      installDate:      parseInstallDate(raw.InstallDate),
      installLocation:  raw.InstallLocation || null,
      uninstallString:  raw.UninstallString || null,
      estimatedSizeMB:  raw.EstimatedSize
                          ? +(raw.EstimatedSize / 1024).toFixed(1)
                          : null,
      exeName,
      lastRun:          lastRunDate ? lastRunDate.toISOString() : null,
      status,
    });
  }

  // Sort: unused → never-detected → active → unknown, then A-Z within each group
  const ORDER = { unused: 0, 'never-detected': 1, active: 2, unknown: 3 };
  apps.sort(
    (a, b) =>
      (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) ||
      a.name.localeCompare(b.name)
  );

  return {
    apps,
    prefetchAccessible,
    prefetchError: prefetchError || null,
    total:              apps.length,
    unusedCount:        apps.filter(a => a.status === 'unused').length,
    neverDetectedCount: apps.filter(a => a.status === 'never-detected').length,
    activeCount:        apps.filter(a => a.status === 'active').length,
    thresholdDays,
    scannedAt: new Date().toISOString(),
  };
}

module.exports = { scanUnusedApps };
