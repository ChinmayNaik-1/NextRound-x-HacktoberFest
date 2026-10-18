const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Auto-allow camera & microphone streams without headless prompt hang
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;
let backendProcess;

/** Check if the backend is already serving on port 8000. */
function isBackendAlreadyRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/health', (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => { req.destroy(); resolve(false); });
  });
}

async function startBackend() {
  // If a backend is already running (e.g. from a previous dev session or hot-reload),
  // reuse it instead of spawning a second one which would fail with EADDRINUSE.
  const alreadyUp = await isBackendAlreadyRunning();
  if (alreadyUp) {
    console.log('[Electron] Reusing existing backend on port 8000.');
    return;
  }

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
      console.warn('[Electron] Backend process error:', err);
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[Electron] Backend exited with code ${code}`);
      }
    });
  } catch (err) {
    console.warn('[Electron] Could not launch backend subprocess:', err);
  }
}

/** Poll /api/health until backend is up or timeout reached. */
function waitForBackend(maxWaitMs = 12000, intervalMs = 500) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      const req = http.get('http://127.0.0.1:8000/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('[Electron] Backend is ready.');
          resolve(true);
        } else {
          retry();
        }
        res.resume();
      });
      req.on('error', retry);
      req.setTimeout(400, () => { req.destroy(); retry(); });
    }
    function retry() {
      if (Date.now() - start >= maxWaitMs) {
        console.warn('[Electron] Backend did not start in time — opening app anyway.');
        resolve(false);
      } else {
        setTimeout(check, intervalMs);
      }
    }
    check();
  });
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

app.whenReady().then(async () => {
  // Automatically permit camera and microphone in Electron
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      return true;
    });

    if (session.defaultSession.setDevicePermissionHandler) {
      session.defaultSession.setDevicePermissionHandler(() => true);
    }
  }

  await startBackend();
  // Wait for backend to be healthy before opening the window (up to 12s)
  await waitForBackend(12000, 500);
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
