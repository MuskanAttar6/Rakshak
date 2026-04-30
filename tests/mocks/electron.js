// Mock for Electron modules in tests
module.exports = {
  app: {
    getPath: jest.fn(() => '/tmp'),
    getVersion: jest.fn(() => '1.0.0'),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve())
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  Notification: {
    isSupported: jest.fn(() => true)
  },
  Tray: jest.fn(),
  Menu: {
    buildFromTemplate: jest.fn()
  },
  nativeImage: {
    createEmpty: jest.fn()
  },
  shell: {
    openExternal: jest.fn(),
    showItemInFolder: jest.fn(),
    openPath: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  }
};
