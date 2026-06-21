const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');

let backendProcess = null;

// Helper to check if a port is active
function checkPortActive(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(250); // Quick check
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

// Poll port until it becomes active or max retries is reached
function waitForPort(port, host = '127.0.0.1', maxRetries = 20, delay = 250) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      checkPortActive(port, host).then((active) => {
        if (active) {
          resolve(true);
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(check, delay);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'V-GPU Array',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  checkPortActive(5173, '127.0.0.1').then((isRunning) => {
    if (isRunning) {
      console.log("Vite dev server is active. Loading http://localhost:5173");
      win.loadURL('http://localhost:5173');
    } else {
      console.log("Vite dev server is offline. Falling back to local static files.");
      win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
}

app.whenReady().then(async () => {
  const backendActive = await checkPortActive(8000);
  if (!backendActive) {
    console.log("Backend not active on port 8000. Launching automatic backend server...");
    
    let pythonPath = 'python';
    const venvWin = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
    const venvUnix = path.join(__dirname, '..', '.venv', 'bin', 'python');
    
    if (process.platform === 'win32' && fs.existsSync(venvWin)) {
      pythonPath = venvWin;
    } else if (process.platform !== 'win32' && fs.existsSync(venvUnix)) {
      pythonPath = venvUnix;
    }
    
    const env = { ...process.env, PYTHONUTF8: '1', PYTHONUNBUFFERED: '1' };
    backendProcess = spawn(
      pythonPath,
      ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'],
      {
        cwd: path.join(__dirname, '..'),
        env: env,
        shell: true
      }
    );
    
    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend stdout] ${data.toString().trim()}`);
    });
    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend stderr] ${data.toString().trim()}`);
    });
    
    // Wait for the backend to start accepting connections (up to 120 seconds for docker build)
    const started = await waitForPort(8000, '127.0.0.1', 120, 1000);
    if (started) {
      console.log("Automatic backend server is ready.");
    } else {
      console.error("Automatic backend server failed to initialize in time.");
    }
  } else {
    console.log("Existing backend detected on port 8000. Reusing existing server.");
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanupBackend() {
  if (backendProcess) {
    console.log("Stopping spawned backend process...");
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${backendProcess.pid} /T /F`, (err) => {
        if (err) {
          console.error("Failed to cleanly kill backend process tree: ", err);
          backendProcess.kill();
        }
      });
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}

app.on('will-quit', () => {
  cleanupBackend();
});

app.on('window-all-closed', () => {
  cleanupBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
