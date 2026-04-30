'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rakshak', {
  runHealthCheck: () => ipcRenderer.invoke('health:run'),
  runCpuCheck: () => ipcRenderer.invoke('health:runCpu'),
  onHealthProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('health:progress', listener);
    return () => ipcRenderer.removeListener('health:progress', listener);
  },
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  runFix: (fixId) => ipcRenderer.invoke('app:runFix', fixId),
  revealPath: (p) => ipcRenderer.invoke('app:revealPath', p),
  openPath: (p) => ipcRenderer.invoke('app:openPath', p),
  pickFolder: () => ipcRenderer.invoke('app:pickFolder'),
  runDuplicateScan: (paths) => ipcRenderer.invoke('duplicates:scan', paths),
  quit: () => ipcRenderer.invoke('app:quit'),
  onAutoReport: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('health:autoreport', listener);
    return () => ipcRenderer.removeListener('health:autoreport', listener);
  },
  // Live Monitor API
  liveMonitor: {
    start: (options) => ipcRenderer.invoke('live:start', options),
    stop: () => ipcRenderer.invoke('live:stop'),
    getStatus: () => ipcRenderer.invoke('live:status'),
    onAlert: (cb) => {
      const listener = (_e, data) => cb(data);
      ipcRenderer.on('live:alert', listener);
      return () => ipcRenderer.removeListener('live:alert', listener);
    },
    onNetworkStatus: (cb) => {
      const listener = (_e, data) => cb(data);
      ipcRenderer.on('live:network-status', listener);
      return () => ipcRenderer.removeListener('live:network-status', listener);
    }
  }
});
