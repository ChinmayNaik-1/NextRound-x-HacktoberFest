const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  enterFullscreen: () => ipcRenderer.send('enter-fullscreen'),
  onFullscreenChange: (callback) => ipcRenderer.on('fullscreen-change', (_event, isFs) => callback(isFs)),
  isElectron: true,
});
