'use strict';

const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { runHealthCheck } = require('../core/engine');
const { RakshakGrpcClient } = require('../grpc/client');
const { LiveMonitor } = require('../core/live-monitor');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow  = null;
let tray        = null;
let grpcClient  = null;
let liveMonitor = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0e1117',
    autoHideMenuBar: true,
    title: 'Rakshak — System Health Checker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    // Lightweight transparent tray icon (1x1) — replace with a real .png in production
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    const menu = Menu.buildFromTemplate([
      { label: 'Open Rakshak', click: () => { if (!mainWindow) createWindow(); else mainWindow.show(); } },
      { label: 'Run Scan', click: async () => { await runScanAndNotify(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('Rakshak — System Health Checker');
    tray.setContextMenu(menu);
  } catch (err) {
    // Tray is optional; ignore if not supported in current environment
    console.warn('Tray init skipped:', err.message);
  }
}

async function runScanAndNotify() {
  try {
    const report = await runHealthCheck();
    if (report.score < 60 && Notification.isSupported()) {
      new Notification({
        title: 'Rakshak: System health is poor',
        body: `Score ${report.score}%. ${report.criticalCount} critical, ${report.warningCount} warnings.`
      }).show();
    }
    if (mainWindow) mainWindow.webContents.send('health:autoreport', report);
    return report;
  } catch (err) {
    console.error('Auto scan failed:', err);
    return null;
  }
}

// Auto-start on system login
function setupAutoLaunch() {
  if (isDev) return;
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false
  });
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupAutoLaunch();

  // gRPC bidirectional client — connect to central health monitor server
  grpcClient = new RakshakGrpcClient();
  grpcClient.on('connected',    (data) => mainWindow?.webContents.send('grpc:status', { connected: true,  ...data }));
  grpcClient.on('disconnected', (data) => mainWindow?.webContents.send('grpc:status', { connected: false, ...data }));
  grpcClient.connect();

  // Run an initial scan shortly after launch
  setTimeout(() => { runScanAndNotify(); }, 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (grpcClient) grpcClient.disconnect();
});

app.on('before-quit', () => {
  if (grpcClient) grpcClient.disconnect();
});

// IPC: run a full health check on demand
ipcMain.handle('health:run', async () => {
  const totalChecks = 12; // Approximate number of checks
  let completed = 0;
  
  return await runHealthCheck({
    sequential: true,      // Run one at a time (lower CPU)
    delayMs: 100,          // 100ms delay between checks
    onProgress: (checkId, done, total) => {
      completed = done;
      // Send progress to renderer
      if (mainWindow) {
        mainWindow.webContents.send('health:progress', {
          checkId,
          completed: done + 1,
          total,
          percent: Math.round(((done + 1) / total) * 100)
        });
      }
    }
  });
});

// IPC: run CPU-only check (quick, isolated)
ipcMain.handle('health:runCpu', async () => {
  const { runSingleCheck } = require('../core/engine');
  const cpuCheck = await runSingleCheck('cpu');
  return {
    ok: true,
    result: cpuCheck
  };
});

// IPC: platform info
ipcMain.handle('app:platform', () => ({
  platform: process.platform,
  arch: process.arch,
  node: process.versions.node,
  electron: process.versions.electron
}));

// IPC: one-click fix actions
const FIX_ACTIONS = {
  'open-disk-cleanup': () => {
    if (process.platform === 'win32') exec('cleanmgr.exe');
    else exec('xdg-open "https://wiki.archlinux.org/title/System_maintenance"');
  },
  'open-task-manager': () => {
    if (process.platform === 'win32') exec('taskmgr.exe');
    else exec('xdg-open gnome-system-monitor');
  },
  'open-network-settings': () => {
    if (process.platform === 'win32') shell.openExternal('ms-settings:network');
    else exec('xdg-open gnome-control-center wifi');
  },
  'open-windows-security': () => {
    if (process.platform === 'win32') shell.openExternal('windowsdefender:');
  },
  'open-firewall-settings': () => {
    if (process.platform === 'win32') exec('control firewall.cpl');
  }
};

ipcMain.handle('app:runFix', (_e, fixId) => {
  const fn = FIX_ACTIONS[fixId];
  if (!fn) return { ok: false, error: 'unknown fix id' };
  try { fn(); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// Open a folder-picker dialog and return selected path(s)
ipcMain.handle('app:pickFolder', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title: 'Select folder to scan for duplicates',
    properties: ['openDirectory', 'multiSelections']
  });
  if (result.canceled) return null;
  return result.filePaths;
});

// Reveal a file in the system file manager
ipcMain.handle('app:revealPath', async (_e, targetPath) => {
  try {
    if (!targetPath) return { ok: false, error: 'no path' };
    shell.showItemInFolder(targetPath);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Open a folder or path
ipcMain.handle('app:openPath', async (_e, targetPath) => {
  try {
    if (!targetPath) return { ok: false, error: 'no path' };
    await shell.openPath(targetPath);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('app:quit', () => { app.quit(); });

// gRPC client status
ipcMain.handle('grpc:status', () => grpcClient ? grpcClient.getStatus() : { connected: false, nodeId: null });

// Run a duplicate scan on custom paths passed from the renderer
ipcMain.handle('duplicates:scan', async (_e, paths) => {
  const dupCheck = require('../checks/duplicates');
  if (Array.isArray(paths) && paths.length) {
    process.env.RAKSHAK_DUPLICATE_PATHS = paths.join(',');
  }
  try {
    return await dupCheck.run();
  } finally {
    delete process.env.RAKSHAK_DUPLICATE_PATHS;
  }
});

// Live Monitor IPC handlers
ipcMain.handle('live:start', async (_e, options = {}) => {
  // Accept configuration from renderer (or use defaults)
  const config = {
    networkCheckInterval: options.networkCheckInterval || 2000,
    networkFastInterval: 500,  // Always fast when issues detected
    alertCooldown: 30000,
    usbMonitoring: true,
    networkMonitoring: true
  };
  
  if (!liveMonitor) {
    liveMonitor = new LiveMonitor(config);
    
    liveMonitor.on('alert', (alert) => {
      // Show native notification for critical alerts
      if (alert.type === 'network-lost' || alert.type === 'usb-connected') {
        if (Notification.isSupported()) {
          new Notification({
            title: `Rakshak: ${alert.type === 'network-lost' ? 'Connection Lost' : 'USB Connected'}`,
            body: alert.message
          }).show();
        }
      }
      
      // Send to renderer
      if (mainWindow) {
        mainWindow.webContents.send('live:alert', alert);
      }
    });
    
    liveMonitor.on('network-status', (status) => {
      if (mainWindow) {
        mainWindow.webContents.send('live:network-status', status);
      }
    });
  } else {
    // Update configuration if monitor already exists
    liveMonitor.config = { ...liveMonitor.config, ...config };
  }
  
  liveMonitor.start();
  return { ok: true, config };
});

ipcMain.handle('live:stop', async () => {
  if (liveMonitor) {
    liveMonitor.stop();
  }
  return { ok: true };
});

ipcMain.handle('live:status', async () => {
  if (!liveMonitor) {
    return { isRunning: false, network: { online: true }, usb: { deviceCount: 0 } };
  }
  return liveMonitor.getStatus();
});

// ── All Drives Info ────────────────────────────────────────────────────────────
const osLayer = require('../os');
ipcMain.handle('drives:getAll', async () => {
  try {
    return await osLayer.getAllDrives();
  } catch (err) {
    console.error('[drives:getAll]', err.message);
    return [];
  }
});

// ── Disk Space Analyzer ────────────────────────────────────────────────────────
const { scanDirectory } = require('../os/diskscanner');

let currentDiskScan = null;

// Recursively serialize a tree node, stripping circular _parent references
function serializeDiskTree(node) {
  if (!node) return null;
  return {
    name:        node.name,
    path:        node.path,
    size:        node.size,
    allocated:   node.allocated,
    files:       node.files,
    folders:     node.folders,
    modified:    node.modified,
    accessDenied: node.accessDenied || false,
    scanning:    node._scanning    || false,
    children:    (node.children || []).map(serializeDiskTree)
  };
}

// Open a single-folder picker for the Disk Analyzer
ipcMain.handle('disk:pickFolder', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title:      'Select folder to analyze',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// Run a disk scan and stream progress snapshots via 'disk:progress' events
ipcMain.handle('disk:scan', async (_e, folderPath) => {
  // Abort any in-progress scan
  if (currentDiskScan) currentDiskScan.aborted = true;

  const state    = { aborted: false, scanned: 0, completed: 0, root: null };
  currentDiskScan = state;

  const startTime = Date.now();
  let lastCount   = 0;
  let lastTime    = startTime;

  // Send a live snapshot every 500 ms so the UI updates in real time
  const progressTimer = setInterval(() => {
    if (!state.root || !mainWindow) return;
    const now   = Date.now();
    const dt    = (now - lastTime) / 1000;
    const speed = dt > 0 ? Math.round((state.scanned - lastCount) / dt) : 0;
    lastCount   = state.scanned;
    lastTime    = now;
    mainWindow.webContents.send('disk:progress', {
      tree:    serializeDiskTree(state.root),
      scanned: state.scanned,
      speed,
      elapsed: ((now - startTime) / 1000).toFixed(1)
    });
  }, 500);

  try {
    await scanDirectory(folderPath, null, state);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (state.aborted) return { ok: false, error: 'aborted' };
    return {
      ok:           true,
      tree:         serializeDiskTree(state.root),
      totalScanned: state.scanned,
      elapsed
    };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearInterval(progressTimer);
    if (currentDiskScan === state) currentDiskScan = null;
  }
});

// Abort the current disk scan
ipcMain.handle('disk:abort', () => {
  if (currentDiskScan) {
    currentDiskScan.aborted = true;
    currentDiskScan = null;
  }
  return { ok: true };
});

// ── Antivirus (ClamAV) ────────────────────────────────────────────────────────
const { runAntivirusScan, findClamScan, getClamAVVersion } = require('../checks/antivirus');

let currentAvScan = {};

// Check if ClamAV is installed on this machine
ipcMain.handle('antivirus:checkInstalled', async () => {
  const clamPath = findClamScan();
  const version  = clamPath ? await getClamAVVersion() : null;
  return { installed: !!clamPath, path: clamPath, version };
});

// Open a file/folder picker for the antivirus scan target
ipcMain.handle('antivirus:pickPath', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title:      'Select file or folder to scan for malware',
    properties: ['openDirectory', 'openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// Run the antivirus scan, streaming per-file progress to the renderer
ipcMain.handle('antivirus:scan', async (_e, targetPath) => {
  // Abort any in-progress AV scan first
  if (typeof currentAvScan.kill === 'function') currentAvScan.kill();
  currentAvScan = {};

  try {
    const result = await runAntivirusScan(
      targetPath,
      (progress) => {
        if (mainWindow) mainWindow.webContents.send('antivirus:progress', progress);
      },
      currentAvScan
    );
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    currentAvScan = {};
  }
});

// Abort the running antivirus scan
ipcMain.handle('antivirus:abort', () => {
  if (typeof currentAvScan.kill === 'function') {
    currentAvScan.kill();
    currentAvScan = {};
  }
  return { ok: true };
});

// ── Unused Apps ───────────────────────────────────────────────────────────────
const { scanUnusedApps } = require('../checks/unused-apps');

// Scan for installed apps that haven't been launched within `thresholdDays`
ipcMain.handle('unusedApps:scan', async (_e, thresholdDays = 60) => {
  try {
    const result = await scanUnusedApps(Number(thresholdDays) || 60);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Open Windows "Programs and Features" (Add/Remove Programs) panel
ipcMain.handle('unusedApps:openUninstall', () => {
  try {
    exec('control appwiz.cpl');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
