const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

app.setName('NextRound');
app.setAppUserModelId('com.nextround.desktop');
app.setPath('userData', path.join(app.getPath('appData'), 'NextRound'));

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

// Auto-allow camera & microphone streams without headless prompt hang
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let backendProcess = null;
let backendLogStream = null;
let isQuitting = false;
const BACKEND_PORT = 8000;

function getBackendBaseUrl() {
  return `http://127.0.0.1:${BACKEND_PORT}`;
}

function checkBackendHealth(timeoutMs = 800) {
  return new Promise((resolve) => {
    const request = http.get(`${getBackendBaseUrl()}/api/health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function resolveDevelopmentPython() {
  if (process.env.PYTHON_EXECUTABLE) {
    return { command: process.env.PYTHON_EXECUTABLE, prefixArgs: [] };
  }

  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  const localPython = process.platform === 'win32'
    ? [
        path.join(backendDir, 'venv', 'Scripts', 'python.exe'),
        path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
        path.join(backendDir, 'venv', 'bin', 'python.exe'),
        path.join(backendDir, '.venv', 'bin', 'python.exe'),
      ]
    : [
        path.join(backendDir, 'venv', 'bin', 'python'),
        path.join(backendDir, '.venv', 'bin', 'python'),
      ];
  const existingPython = localPython.find((candidate) => fs.existsSync(candidate));
  if (existingPython) return { command: existingPython, prefixArgs: [] };

  return process.platform === 'win32'
    ? { command: 'py', prefixArgs: ['-3'] }
    : { command: 'python3', prefixArgs: [] };
}

function getBackendLaunch() {
  if (app.isPackaged) {
    const executable = path.join(
      process.resourcesPath,
      'backend',
      'NextRoundBackend.exe'
    );
    if (!fs.existsSync(executable)) {
      throw new Error(`The packaged backend executable is missing:\n${executable}`);
    }
    return {
      command: executable,
      args: [],
      cwd: app.getPath('userData'),
    };
  }

  const python = resolveDevelopmentPython();
  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  return {
    command: python.command,
    args: [
      ...python.prefixArgs,
      '-m',
      'uvicorn',
      'main:app',
      '--host',
      '127.0.0.1',
      '--port',
      '8000',
    ],
    cwd: backendDir,
  };
}

function spawnBackend() {
  const launch = getBackendLaunch();
  const userDataDir = app.getPath('userData');
  const logDir = path.join(userDataDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logStream = fs.createWriteStream(path.join(logDir, 'backend.log'), { flags: 'a' });
  backendLogStream = logStream;

  const child = spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXTROUND_DATA_DIR: userDataDir,
      NEXTROUND_PORT: String(BACKEND_PORT),
      PYTHONUTF8: '1',
      PYTHONUNBUFFERED: '1',
    },
  });

  child.stdout.pipe(logStream, { end: false });
  child.stderr.pipe(logStream, { end: false });
  child.on('error', (error) => {
    child.spawnError = error;
    logStream.write(`\n[Electron] Backend launch error: ${error.stack || error}\n`);
  });
  child.on('exit', (code, signal) => {
    logStream.write(`\n[Electron] Backend exited (code=${code}, signal=${signal}).\n`);
    if (backendProcess === child) backendProcess = null;
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'NextRound backend stopped',
        `The local interview service stopped unexpectedly. See the backend log at:\n${path.join(userDataDir, 'logs', 'backend.log')}`
      );
    }
  });

  backendProcess = child;
  return child;
}

async function waitForBackend(child, maxWaitMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    if (child.spawnError) {
      throw new Error(`Could not launch the local backend: ${child.spawnError.message}`);
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`The local backend exited during startup (code ${child.exitCode}, signal ${child.signalCode}).`);
    }

    if (await checkBackendHealth(1000)) return;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const logPath = path.join(app.getPath('userData'), 'logs', 'backend.log');
  throw new Error(
    `The local backend did not become healthy at ${getBackendBaseUrl()}/api/health within ${maxWaitMs / 1000} seconds.\nBackend log: ${logPath}`
  );
}

async function startBackend() {
  if (!app.isPackaged && await checkBackendHealth()) {
    console.log('[Electron] Reusing development backend on port 8000.');
    return;
  }

  if (app.isPackaged && await checkBackendHealth()) {
    throw new Error(
      'Another service is already responding on 127.0.0.1:8000. Close it and restart NextRound so the app can start its own backend.'
    );
  }

  const child = spawnBackend();
  try {
    await waitForBackend(child);
    console.log('[Electron] Backend is ready.');
  } catch (error) {
    stopBackend();
    throw error;
  }
}

function stopBackend() {
  const child = backendProcess;
  const logStream = backendLogStream;
  backendProcess = null;
  backendLogStream = null;

  if (child && child.exitCode === null && child.signalCode === null && !child.killed) {
    if (logStream) {
      child.stdout.unpipe(logStream);
      child.stderr.unpipe(logStream);
      child.once('close', () => logStream.end());
    }
    child.kill();
  } else if (logStream) {
    logStream.end();
  }
}

function loadApplicationWindow() {
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

  const pageLoaded = app.isPackaged
    ? mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    : mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173');

  pageLoaded.catch((error) => {
    dialog.showErrorBox('NextRound could not load', error.message);
    app.quit();
  });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('window-blur');
  });
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('window-focus');
  });
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', true);
    }
  });
  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', false);
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.on('enter-fullscreen', () => {
  if (mainWindow && !mainWindow.isFullScreen()) mainWindow.setFullScreen(true);
});

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    if (session && session.defaultSession) {
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(true);
      });
      session.defaultSession.setPermissionCheckHandler(() => true);
      if (session.defaultSession.setDevicePermissionHandler) {
        session.defaultSession.setDevicePermissionHandler(() => true);
      }
    }

    try {
      await startBackend();
      loadApplicationWindow();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox('NextRound could not start', detail);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) loadApplicationWindow();
    });
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
