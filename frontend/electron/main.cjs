const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8000;
const FRONTEND_URL =
  process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

function getPythonPath() {
  if (process.platform === 'win32') {
    return path.join(
      __dirname,
      '..',
      '..',
      'backend',
      'venv',
      'Scripts',
      'python.exe'
    );
  }

  return path.join(
    __dirname,
    '..',
    '..',
    'backend',
    'venv',
    'bin',
    'python'
  );
}

function getBackendDir() {
  return path.join(
    __dirname,
    '..',
    '..',
    'backend'
  );
}

function isBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: '/api/health',
        timeout: 1000,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForBackend(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = async () => {
      const running = await isBackendRunning();

      if (running) {
        resolve();
        return;
      }

      if (Date.now() - started >= timeout) {
        reject(
          new Error(
            'FastAPI backend did not start within 30 seconds.'
          )
        );
        return;
      }

      setTimeout(check, 300);
    };

    check();
  });
}

async function startBackend() {
  const pythonPath = getPythonPath();
  const backendDir = getBackendDir();

  console.log('Starting FastAPI backend...');
  console.log('Python:', pythonPath);
  console.log('Backend:', backendDir);

  /*
   * If another backend is already running, don't start
   * another Uvicorn process on port 8000.
   */
  if (await isBackendRunning()) {
    console.log(
      'FastAPI backend is already running on port 8000.'
    );
    return;
  }

  backendProcess = spawn(
    pythonPath,
    [
      '-m',
      'uvicorn',
      'main:app',
      '--host',
      BACKEND_HOST,
      '--port',
      String(BACKEND_PORT),
    ],
    {
      cwd: backendDir,
      stdio: 'inherit',
      windowsHide: true,
    }
  );

  backendProcess.on('error', (err) => {
    console.error(
      'FastAPI backend process error:',
      err
    );
  });

  backendProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(
        `FastAPI backend exited with code ${code}`
      );
    }

    if (signal) {
      console.log(
        `FastAPI backend stopped with signal ${signal}`
      );
    }

    backendProcess = null;
  });

  await waitForBackend();

  console.log(
    'FastAPI backend ready at http://127.0.0.1:8000'
  );
}

function stopBackend() {
  if (!backendProcess) {
    return;
  }

  console.log('Stopping FastAPI backend...');

  try {
    backendProcess.kill('SIGTERM');
  } catch (err) {
    console.warn(
      'Could not stop backend:',
      err
    );
  }

  backendProcess = null;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'NextRound | InterviewAI',
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(
        __dirname,
        'preload.cjs'
      ),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  try {
    await mainWindow.loadURL(FRONTEND_URL);
  } catch (err) {
    console.error(
      'Could not load frontend:',
      err
    );

    setTimeout(() => {
      if (
        mainWindow &&
        !mainWindow.isDestroyed()
      ) {
        mainWindow.loadURL(FRONTEND_URL);
      }
    }, 1500);
  }

  mainWindow.on('blur', () => {
    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send(
        'window-blur'
      );
    }
  });

  mainWindow.on('focus', () => {
    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send(
        'window-focus'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on(
  'toggle-fullscreen',
  () => {
    if (mainWindow) {
      mainWindow.setFullScreen(
        !mainWindow.isFullScreen()
      );
    }
  }
);

app.whenReady().then(async () => {
  try {
    await startBackend();
    await createWindow();
  } catch (err) {
    console.error(
      'Failed to start NextRound:',
      err
    );

    app.quit();
    return;
  }

  app.on('activate', () => {
    if (
      BrowserWindow.getAllWindows()
        .length === 0
    ) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('window-all-closed', () => {
  stopBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});