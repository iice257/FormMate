import { spawn } from 'node:child_process';
import net from 'node:net';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const STARTUP_TIMEOUT_MS = 20_000;

function run(args, extraEnv = {}) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
  });

  children.push(child);
  child.on('exit', (code) => {
    if (code && !process.exitCode) {
      process.exitCode = code;
    }
  });

  return child;
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit();
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit();
});

function waitForApiPort({ host, port, timeoutMs }) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

const vercelChild = run(['run', 'dev:vercel']);
let vercelExitedEarly = false;

vercelChild.once('exit', (code) => {
  if (code && code !== 0) {
    vercelExitedEarly = true;
  }
});

try {
  await waitForApiPort({ host: API_HOST, port: API_PORT, timeoutMs: STARTUP_TIMEOUT_MS });
} catch (error) {
  stopChildren();
  const message = String(error?.message || error);
  console.error('[dev:stack] Failed to start `vercel dev` on http://127.0.0.1:3000.');
  if (vercelExitedEarly) {
    console.error('[dev:stack] `vercel dev` exited early. Confirm Vercel CLI auth (`npx vercel login`) and local TLS trust settings.');
  }
  console.error(`[dev:stack] ${message}`);
  process.exit(1);
}

run(['run', 'dev'], {
  VITE_API_PROXY_TARGET: `http://${API_HOST}:${API_PORT}`,
  VITE_STRICT_PORT: '1',
});
