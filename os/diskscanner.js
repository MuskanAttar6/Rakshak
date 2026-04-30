'use strict';

const fs   = require('fs');
const path = require('path');

const CLUSTER_SIZE = 4096;
const MAX_DEPTH    = 14;
const IO_LIMIT     = 64; // conservative — avoids EMFILE on Windows

const SKIP_NAMES = new Set([
  '$RECYCLE.BIN', 'System Volume Information', 'Recovery', '$WinREAgent',
  'DumpStack.log.tmp', 'swapfile.sys', 'pagefile.sys', 'hiberfil.sys',
  'bootmgr', 'BOOTNXT', 'BOOTSECT.BAK'
]);

// ── Semaphore ──────────────────────────────────────────────────────────────────
class Semaphore {
  constructor(n) { this._n = n; this._q = []; }
  acquire() {
    return new Promise(r => {
      if (this._n > 0) { this._n--; r(); }
      else { this._q.push(r); }
    });
  }
  release() { const next = this._q.shift(); if (next) next(); else this._n++; }
}
const sem = new Semaphore(IO_LIMIT);

async function safeLstat(fp) {
  await sem.acquire();
  try   { return await fs.promises.lstat(fp); }
  catch { return null; }
  finally { sem.release(); }
}
async function safeReaddir(dir) {
  await sem.acquire();
  try   { return await fs.promises.readdir(dir, { withFileTypes: true }); }
  catch { return null; }
  finally { sem.release(); }
}

// ── Propagate size/allocated delta upward through parent chain ──────────────
function propagateUp(node, dSize, dAlloc, dFiles, dFolders) {
  let cur = node._parent;
  while (cur) {
    cur.size      += dSize;
    cur.allocated += dAlloc;
    cur.files     += dFiles;
    cur.folders   += dFolders;
    cur = cur._parent;
  }
}

/**
 * Top-down mutable scan — key properties:
 *  1. Each directory node is created and attached to its parent IMMEDIATELY
 *     (before its own files or subdirs are scanned), so the tree structure
 *     appears live as scanning progresses.
 *  2. File sizes are propagated upward as soon as stats arrive, so root
 *     size increments in real time.
 *  3. Subfolders are recursed fully in parallel (bounded by semaphore).
 */
async function scanDirectory(dirPath, parentNode, state, depth = 0) {
  if (state.aborted || depth > MAX_DEPTH) return null;

  // ── 1. Create node and attach to parent IMMEDIATELY ────────────────────────
  const node = {
    name:  path.basename(dirPath) || dirPath,
    path:  dirPath,
    size:        0,
    allocated:   0,
    files:       0,
    folders:     0,
    modified:    0,
    children:    [],
    accessDenied: false,
    _scanning:   true,  // used by UI to show spinner
    _parent:     parentNode || null
  };

  if (parentNode) {
    parentNode.children.push(node);
    // Reserve folder count immediately so parent already shows it's non-empty
    propagateUp(node, 0, 0, 0, 1);
  } else {
    // This is the root — register it for snapshot sending
    state.root = node;
  }

  // ── 2. Read entries ────────────────────────────────────────────────────────
  const [entries, dirSt] = await Promise.all([safeReaddir(dirPath), safeLstat(dirPath)]);
  if (!entries) {
    node.accessDenied = true;
    node._scanning = false;
    return node;
  }
  if (dirSt) node.modified = dirSt.mtime.getTime();

  const fileEntries = entries.filter(e => e.isFile()      && !SKIP_NAMES.has(e.name));
  const dirEntries  = entries.filter(e => e.isDirectory() && !SKIP_NAMES.has(e.name));

  // ── 3. Stat all files in parallel and immediately propagate sizes ──────────
  const fileStats = await Promise.all(
    fileEntries.map(e => safeLstat(path.join(dirPath, e.name)))
  );

  let dSize = 0, dAlloc = 0;
  for (const s of fileStats) {
    if (!s || s.isDirectory()) continue;
    const sz = s.size;
    dSize  += sz;
    dAlloc += sz > 0 ? Math.ceil(sz / CLUSTER_SIZE) * CLUSTER_SIZE : 0;
    if (s.mtime.getTime() > node.modified) node.modified = s.mtime.getTime();
  }
  node.size      += dSize;
  node.allocated += dAlloc;
  node.files      = fileEntries.length;
  state.scanned  += fileEntries.length;

  // Propagate file sizes to all ancestors right now (not after children)
  if (dSize > 0 || dAlloc > 0) propagateUp(node, dSize, dAlloc, fileEntries.length, 0);

  // ── 4. Recurse all subdirs in parallel ─────────────────────────────────────
  if (dirEntries.length && !state.aborted) {
    await Promise.all(
      dirEntries.map(e => scanDirectory(path.join(dirPath, e.name), node, state, depth + 1))
    );
  }

  // Sort children by size descending after all children are done
  node.children.sort((a, b) => b.size - a.size);
  node._scanning = false;
  state.completed++;
  return node;
}

module.exports = { scanDirectory };
