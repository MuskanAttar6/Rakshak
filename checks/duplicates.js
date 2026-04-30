 'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '__pycache__', 'vendor']);
const MAX_FILES = 5000;          // cap total files scanned
const MAX_FILE_SIZE = 100 * 1024 * 1024; // skip full-hash for files > 100 MB
const CONCURRENCY = 8;           // parallel hash workers
const DEADLINE_MS = 14000;       // bail out before engine's 20 s timeout

async function collectFiles(root, deadline, maxFiles = MAX_FILES) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    if (Date.now() > deadline || files.length >= maxFiles) break;
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..') continue;
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        files.push(full);
        if (files.length >= maxFiles) return files;
      }
    }
  }
  return files;
}

async function partialHash(filePath, bytes = 8192) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    const hash = crypto.createHash('sha256');
    hash.update(buffer.slice(0, bytesRead));
    return hash.digest('hex');
  } finally {
    await handle.close();
  }
}

function fullHashStream(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Run tasks with limited concurrency
async function pool(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

module.exports = {
  id: 'duplicates',
  name: 'Duplicate Files',
  category: 'disk',
  fix: { id: 'open-explorer', label: 'Open File Explorer' },
  async run() {
    const os = require('os');
    const deadline = Date.now() + DEADLINE_MS;

    const home = os.homedir();
    const defaultDirs = ['Documents', 'Downloads', 'Desktop', 'Pictures', 'Music', 'Videos'];
    const envPaths = process.env.RAKSHAK_DUPLICATE_PATHS;
    const roots = envPaths
      ? envPaths.split(',').map(p => p.trim()).filter(Boolean)
      : defaultDirs.map(d => path.join(home, d)).filter(Boolean);

    // Collect files across all roots — each root gets an equal per-root budget
    // so Pictures/Music/Videos are never starved by large Documents/Downloads folders.
    const validRoots = [];
    for (const r of roots) {
      try {
        const stat = await fs.promises.stat(r);
        if (stat.isDirectory()) validRoots.push(r);
      } catch { /* root doesn't exist, skip */ }
    }

    const perRootCap = Math.ceil(MAX_FILES / Math.max(validRoots.length, 1));
    let allFiles = [];
    for (const r of validRoots) {
      if (Date.now() > deadline) break;
      const files = await collectFiles(r, deadline, perRootCap);
      allFiles = allFiles.concat(files);
    }

    if (allFiles.length === 0) {
      allFiles = await collectFiles(process.cwd(), deadline, MAX_FILES);
    }

    const capped = allFiles.length >= MAX_FILES;

    // Stat each file — skip zero-byte and unreadable
    const statsResults = await pool(allFiles, async (f) => {
      try {
        const s = await fs.promises.stat(f);
        return s.size > 0 ? { path: f, size: s.size } : null;
      } catch { return null; }
    }, CONCURRENCY);

    const validFiles = statsResults.filter(Boolean);

    // Group by size
    const bySize = new Map();
    for (const entry of validFiles) {
      if (!bySize.has(entry.size)) bySize.set(entry.size, []);
      bySize.get(entry.size).push(entry.path);
    }

    // Only sizes with >1 file are candidates
    const candidates = [];
    for (const [, list] of bySize) {
      if (list.length > 1) candidates.push(...list);
    }

    // Partial-hash candidates concurrently
    const partialResults = await pool(candidates, async (f) => {
      if (Date.now() > deadline) return null;
      try {
        return { path: f, hash: await partialHash(f) };
      } catch { return null; }
    }, CONCURRENCY);

    // Group by partial hash
    const byPartial = new Map();
    for (const r of partialResults) {
      if (!r) continue;
      if (!byPartial.has(r.hash)) byPartial.set(r.hash, []);
      byPartial.get(r.hash).push(r.path);
    }

    // Full-hash groups that still have >1 match after partial hash
    const duplicateGroups = [];
    for (const files of byPartial.values()) {
      if (files.length < 2) continue;
      if (Date.now() > deadline) break;

      const fullResults = await pool(files, async (f) => {
        if (Date.now() > deadline) return null;
        try {
          const size = bySize.get(validFiles.find(v => v.path === f)?.size ?? 0);
          // For large files, trust partial hash alone
          const stat = await fs.promises.stat(f);
          if (stat.size > MAX_FILE_SIZE) return { path: f, hash: 'partial:' + await partialHash(f) };
          return { path: f, hash: await fullHashStream(f) };
        } catch { return null; }
      }, CONCURRENCY);

      const byFull = new Map();
      for (const r of fullResults) {
        if (!r) continue;
        if (!byFull.has(r.hash)) byFull.set(r.hash, []);
        byFull.get(r.hash).push(r.path);
      }
      for (const dupList of byFull.values()) {
        if (dupList.length > 1) duplicateGroups.push(dupList);
      }
    }

    let duplicateCount = 0;
    let sizeSavedBytes = 0;
    const groups = [];

    for (const g of duplicateGroups) {
      const stats = await Promise.all(g.map(p => fs.promises.stat(p).catch(() => null)));
      const sizes = stats.map(s => s ? s.size : 0);
      const total = sizes.reduce((a, b) => a + b, 0);
      const saved = total - (sizes[0] || 0);
      duplicateCount += g.length - 1;
      sizeSavedBytes += saved;
      groups.push({ files: g, original: g[0], groupSizeBytes: total });
    }

    const status = duplicateCount > 0 ? 'warning' : 'ok';
    const message = duplicateCount > 0
      ? `Found ${duplicateCount} duplicate file${duplicateCount > 1 ? 's' : ''} across ${groups.length} group${groups.length > 1 ? 's' : ''}.${capped ? ` (scan capped at ${MAX_FILES} files)` : ''}`
      : `No duplicate files found.${capped ? ` (scan capped at ${MAX_FILES} files)` : ''}`;

    return {
      status,
      message,
      suggestion: duplicateCount > 0
        ? `You can free ~${(sizeSavedBytes / 1024 / 1024).toFixed(1)} MB by removing duplicate copies.`
        : 'No action needed.',
      details: {
        scannedRoots: roots,
        filesScanned: allFiles.length,
        capped,
        duplicateCount,
        sizeSavedBytes,
        groups
      }
    };
  }
};
