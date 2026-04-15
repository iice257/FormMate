import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

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

run(['run', 'dev:vercel']);
setTimeout(() => {
  run(['run', 'dev'], {
    VITE_API_PROXY_TARGET: 'http://127.0.0.1:3000',
  });
}, 1500);
