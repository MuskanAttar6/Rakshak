'use strict';

const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { runHealthCheck } = require('../core/engine');
const { LiveMonitor } = require('../core/live-monitor');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;
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

  // Run an initial scan shortly after launch
  setTimeout(() => { runScanAndNotify(); }, 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: run a full health check on demand (optimized, low CPU)
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
