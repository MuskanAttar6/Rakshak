'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rakshak', {
  runHealthCheck: () => ipcRenderer.invoke('health:run'),
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
  }
});
