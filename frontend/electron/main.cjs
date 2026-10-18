const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isWindows = process.platform === 'win32';
  const pythonPath = isWindows
    ? path.join(__dirname, '..', '..', 'backend', 'venv', 'Scripts', 'python.exe')
    : path.join(__dirname, '..', '..', 'backend', 'venv', 'bin', 'python');

  const backendDir = path.join(__dirname, '..', '..', 'backend');

  try {
    backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: backendDir,
      stdio: 'inherit',
    });

    backendProcess.on('error', (err) => {
      console.warn('Backend process error:', err);
    });
  } catch (err) {
    console.warn('Could not launch backend subprocess automatically:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'NextRound | InterviewAI',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load URL from Vite dev server or fallback to built dist
  const startUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl).catch(() => {
    // If dev server not yet ready, retry shortly
    setTimeout(() => {
      mainWindow.loadURL(startUrl);
    }, 1500);
  });

  // Track window focus loss for proctoring anti-cheat
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-blur');
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
