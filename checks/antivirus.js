'use strict';

/**
 * Antivirus scan module — ClamAV integration (Windows).
 *
 * Uses the `clamscan` npm package to locate the ClamAV installation,
 * then spawns clamscan.exe directly for real-time per-file progress.
 */

const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

// ── ClamAV executable detection ───────────────────────────────────────────────

/**
 * Build a de-duplicated list of candidate clamscan.exe paths on Windows.
 * We include hard-coded defaults plus environment-variable-derived paths.
 */
function buildCandidatePaths() {
  const candidates = new Set([
    'C:\\Program Files\\ClamAV\\clamscan.exe',
    'C:\\Program Files (x86)\\ClamAV\\clamscan.exe',
  ]);

  const envRoots = [
    process.env.ProgramFiles,
    process.env.ProgramW6432,
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
  ];

  for (const root of envRoots) {
    if (root) candidates.add(path.join(root, 'ClamAV', 'clamscan.exe'));
  }

  return [...candidates];
}

/**
 * Locate clamscan.exe on the current machine.
 * @returns {string|null} Absolute path to clamscan.exe, or null if not found.
 */
function findClamScan() {
  for (const candidate of buildCandidatePaths()) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore permission errors on individual paths */
    }
  }
  return null;
}

// ── ClamAV version helper ─────────────────────────────────────────────────────

/**
 * Get the installed ClamAV version string.
 * @returns {Promise<string|null>}
 */
async function getClamAVVersion() {
  const clamPath = findClamScan();
  if (!clamPath) return null;

  return new Promise((resolve) => {
    let output = '';
    const proc = spawn(clamPath, ['--version'], { windowsHide: true });
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => resolve(output.trim() || null));
    proc.on('error', () => resolve(null));
  });
}

// ── Core scan function ────────────────────────────────────────────────────────

/**
 * Run a ClamAV scan and stream per-file progress.
 *
 * ClamAV exit codes:
 *   0 → No viruses found
 *   1 → Virus(es) found
 *   2 → Error during scan
 *
 * stdout format per file:
 *   /path/to/clean.file: OK
 *   /path/to/infected.exe: Win.Trojan.Agent-12345 FOUND
 *
 * @param {string}   targetPath   Absolute path to file or directory to scan.
 * @param {Function} onProgress   Callback: ({ scanned, infected, currentFile, threats })
 * @param {object}   abortHandle  Pass-by-ref object — caller sets .kill() to abort.
 * @returns {Promise<ScanResult>}
 *
 * @typedef {{ aborted: boolean, scanned: number, infected: number,
 *             threats: Array<{file:string,virus:string}>, clean: boolean }} ScanResult
 */
function runAntivirusScan(targetPath, onProgress, abortHandle = {}) {
  const clamPath = findClamScan();
  if (!clamPath) {
    return Promise.reject(new Error('CLAMAV_NOT_FOUND'));
  }

  // Validate targetPath is an absolute path (security: prevent relative traversal)
  if (!path.isAbsolute(targetPath)) {
    return Promise.reject(new Error('targetPath must be an absolute path'));
  }

  return new Promise((resolve, reject) => {
    const args = [
      '--recursive',          // Recurse into subdirectories
      '--stdout',             // Write file results to stdout
      '--no-summary',         // Omit the summary footer
      '--infected',           // Only show infected files in summary (we still see FOUND lines)
      targetPath,
    ];

    const proc = spawn(clamPath, args, { windowsHide: true });

    let scanned  = 0;
    let infected = 0;
    const threats = [];
    let tail = '';

    // Provide the caller a way to kill the scan
    abortHandle.kill = () => {
      abortHandle.aborted = true;
      try { proc.kill('SIGTERM'); } catch { /* ignore */ }
    };

    const processLine = (line) => {
      if (!line.trim()) return;

      if (line.endsWith(': OK')) {
        scanned++;
        const filePath = line.slice(0, -4);
        onProgress?.({ scanned, infected, currentFile: filePath, threats });

      } else if (line.includes(' FOUND')) {
        scanned++;
        infected++;
        // Format: "/path/to/file: VirusName FOUND"
        const m = line.match(/^(.+):\s+(.+)\s+FOUND$/);
        if (m) {
          threats.push({ file: m[1].trim(), virus: m[2].trim() });
        }
        onProgress?.({ scanned, infected, currentFile: line, threats });

      } else if (line.includes(': ') && line.includes('ERROR')) {
        // ClamAV reports access-denied or I/O errors inline — not a virus, just skip
        scanned++;
        onProgress?.({ scanned, infected, currentFile: line, threats });
      }
    };

    proc.stdout.on('data', (chunk) => {
      const raw   = tail + chunk.toString();
      const lines = raw.split(/\r?\n/);
      tail = lines.pop(); // hold incomplete last line
      lines.forEach(processLine);
    });

    proc.stderr.on('data', () => { /* suppress; ClamAV writes nothing important to stderr */ });

    proc.on('close', (code) => {
      if (tail) processLine(tail); // flush remaining line
      if (abortHandle.aborted) {
        return resolve({ aborted: true, scanned, infected, threats, clean: false });
      }
      if (code === 2) {
        return reject(new Error('ClamAV encountered an error during the scan. Check that the virus database is up to date.'));
      }
      resolve({ aborted: false, scanned, infected, threats, clean: infected === 0 });
    });

    proc.on('error', (err) => reject(err));
  });
}

module.exports = { runAntivirusScan, findClamScan, getClamAVVersion };
