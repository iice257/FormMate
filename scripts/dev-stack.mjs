import { spawn } from 'node:child_process';
import net from 'node:net';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const STARTUP_TIMEOUT_MS = 20_000;
const backendEnv = {};

if (typeof process.env.NODE_TLS_REJECT_UNAUTHORIZED === 'undefined') {
  backendEnv.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.error('[dev:stack] Local backend TLS verification is disabled (NODE_TLS_REJECT_UNAUTHORIZED=0).');
  console.error('[dev:stack] Configure local root certificates and set NODE_TLS_REJECT_UNAUTHORIZED=1 to restore strict TLS validation.');
}

function run(args, extraEnv = {}, { propagateExitCode = true } = {}) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
  });

  children.push(child);
  child.on('exit', (code) => {
    if (propagateExitCode && code && !process.exitCode) {
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

run(['run', 'dev:api-local'], backendEnv, { propagateExitCode: false });

try {
  await waitForApiPort({ host: API_HOST, port: API_PORT, timeoutMs: STARTUP_TIMEOUT_MS });
} catch (error) {
  stopChildren();
  const message = String(error?.message || error);
  console.error(`[dev:stack] Local API server failed to start: ${message}`);
  process.exit(1);
}

run(['run', 'dev:vite'], {
  VITE_API_PROXY_TARGET: `http://${API_HOST}:${API_PORT}`,
  VITE_STRICT_PORT: '1',
});
