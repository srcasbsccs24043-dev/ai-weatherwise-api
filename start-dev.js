// ============================================
// start-dev.js
// AI WeatherWise - Full Stack Dev Runner
// ============================================
// Runs both Backend (Express :5000) and Frontend (Vite :5173) concurrently.
// Handles port cleanup, clean logging, and graceful shutdown (Ctrl+C).

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';

/**
 * Ensures required ports are free before starting servers
 */
function freePortIfBusy(port) {
  if (isWindows) {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            console.log(`🧹 Freeing port ${port} (terminating stale process PID ${pid})...`);
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // Port is free
    }
  }
}

// Auto-clean any stale processes on dev ports
freePortIfBusy(5000);
freePortIfBusy(5173);

console.log('\n\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
console.log('\x1b[1;36m🌤️   AI WeatherWise - Intelligent Global Weather Assistant\x1b[0m');
console.log('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
console.log('📡  Backend URL:   \x1b[1;32mhttp://localhost:5000\x1b[0m');
console.log('💻  Frontend URL:  \x1b[1;32mhttp://localhost:5173\x1b[0m');
console.log('⚙️   Mode:          \x1b[1;33mDevelopment (Hot-Reload Enabled)\x1b[0m');
console.log('⌨️   Press \x1b[1;31mCtrl+C\x1b[0m to stop both servers gracefully');
console.log('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m\n');

/**
 * Pipes output with an identifiable prefix
 */
function attachLogger(stream, label, color) {
  if (!stream) return;
  stream.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r\n|\r|\n/);
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${label}\x1b[0m ${line}`);
      }
    }
  });
}

// 1. Launch Backend
const backendCmd = isWindows ? 'npm.cmd run dev' : 'npm run dev';
const backendProcess = spawn(backendCmd, {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});

attachLogger(backendProcess.stdout, '[BACKEND] ', '\x1b[36m');
attachLogger(backendProcess.stderr, '[BACKEND] ', '\x1b[31m');

// 2. Launch Frontend
const frontendCmd = isWindows ? 'npm.cmd run dev' : 'npm run dev';
const frontendProcess = spawn(frontendCmd, {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});

attachLogger(frontendProcess.stdout, '[FRONTEND]', '\x1b[35m');
attachLogger(frontendProcess.stderr, '[FRONTEND]', '\x1b[31m');

// Health-check verification after both servers start up
setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:5000/');
    if (res.ok) {
      console.log('\x1b[1;32m✅ Backend API is live on http://localhost:5000\x1b[0m');
    }
  } catch {
    // Retry once
    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:5000/');
        if (res.ok) console.log('\x1b[1;32m✅ Backend API is live on http://localhost:5000\x1b[0m');
      } catch {}
    }, 2000);
  }

  try {
    const res = await fetch('http://localhost:5173/');
    if (res.ok) {
      console.log('\x1b[1;32m✅ Frontend App is live on http://localhost:5173\x1b[0m');
    }
  } catch {
    // Retry once
    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:5173/');
        if (res.ok) console.log('\x1b[1;32m✅ Frontend App is live on http://localhost:5173\x1b[0m');
      } catch {}
    }, 2000);
  }
}, 2500);

/**
 * Cleanly kill a child process tree on Windows or POSIX
 */
function terminateChild(child) {
  if (!child || !child.pid) return;
  try {
    if (isWindows) {
      spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n\x1b[1;33m🛑 Stopping AI WeatherWise development servers...\x1b[0m');
  terminateChild(backendProcess);
  terminateChild(frontendProcess);
  setTimeout(() => {
    console.log('\x1b[1;32m✅ Servers stopped successfully.\x1b[0m\n');
    process.exit(0);
  }, 600);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  terminateChild(backendProcess);
  terminateChild(frontendProcess);
});

backendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[BACKEND] Process exited with code ${code}\x1b[0m`);
  }
});

frontendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[FRONTEND] Process exited with code ${code}\x1b[0m`);
  }
});
