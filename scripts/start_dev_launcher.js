const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getPythonExecutable() {
  const rootDir = path.resolve(__dirname, '..');
  
  // Check virtual environment candidates first
  const venvPaths = [
    path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
    path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
    path.join(rootDir, '.venv', 'bin', 'python3'),
    path.join(rootDir, '.venv', 'bin', 'python'),
    path.join(rootDir, 'venv', 'bin', 'python3'),
    path.join(rootDir, 'venv', 'bin', 'python')
  ];

  for (const venvPath of venvPaths) {
    if (fs.existsSync(venvPath)) {
      return venvPath;
    }
  }

  // System Python fallbacks based on OS
  if (process.platform === 'win32') {
    return 'python'; // or 'py'
  }
  return 'python3';
}

const pythonExe = getPythonExecutable();
const scriptPath = path.resolve(__dirname, 'start_dev.py');

console.log(`[Launcher] Launching dev environment via: ${pythonExe} ${scriptPath}`);

const child = spawn(pythonExe, [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  if (err.code === 'ENOENT' && process.platform === 'win32' && pythonExe === 'python') {
    console.log('[Launcher] "python" not found, attempting "py"...');
    const pyChild = spawn('py', [scriptPath], { stdio: 'inherit', env: process.env });
    pyChild.on('exit', (code) => process.exit(code || 0));
  } else {
    console.error(`[Launcher] Failed to start Python script: ${err.message}`);
    process.exit(1);
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
