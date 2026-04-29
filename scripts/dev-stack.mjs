import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
const API_HOST = '127.0.0.1';
const API_BIND_HOST = String(process.env.FORMMATE_API_BIND_HOST || API_HOST).trim() || API_HOST;
const API_VERSION = '2026-04-18.1';
const DEFAULT_API_PORT = 3000;
const API_PORT_CANDIDATES = [DEFAULT_API_PORT, 3001, 3002, 3003];
const STARTUP_TIMEOUT_MS = 20_000;
const HEALTH_CHECK_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 1500;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiHealthUrl(port) {
  return `http://${API_HOST}:${port}/api/health`;
}

async function fetchApiHealth(port, timeoutMs = HEALTH_CHECK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(getApiHealthUrl(port), {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isCompatibleHealth(payload) {
  return Boolean(
    payload
    && payload.status === 'ok'
    && payload.apiVersion === API_VERSION,
  );
}

async function waitForApiReady(child, port, timeoutMs = STARTUP_TIMEOUT_MS) {
  const startedAt = Date.now();
  let lastHealth = null;
  let childExited = false;
  let childExitCode = 0;

  const onExit = (code) => {
    childExited = true;
    childExitCode = code || 0;
  };
  child.once('exit', onExit);

  try {
    while (Date.now() - startedAt < timeoutMs) {
      const health = await fetchApiHealth(port);
      if (health) lastHealth = health;
      if (isCompatibleHealth(health)) return;

      if (childExited) {
        const observedVersion = lastHealth?.apiVersion ? `Observed apiVersion=${lastHealth.apiVersion}.` : 'No compatible /api/health payload detected.';
        throw new Error(`Local API process exited before readiness (code ${childExitCode}). ${observedVersion}`);
      }

      await delay(HEALTH_CHECK_INTERVAL_MS);
    }

    const observedVersion = lastHealth?.apiVersion ? `Observed apiVersion=${lastHealth.apiVersion}.` : 'No compatible /api/health payload detected.';
    throw new Error(`Timed out waiting for local API readiness on ${getApiHealthUrl(port)}. ${observedVersion}`);
  } finally {
    child.removeListener('exit', onExit);
  }
}

let selectedApiPort = null;

for (const candidatePort of API_PORT_CANDIDATES) {
  const existingHealth = await fetchApiHealth(candidatePort);
  if (isCompatibleHealth(existingHealth)) {
    selectedApiPort = candidatePort;
    console.error(`[dev:stack] Reusing compatible local API on ${getApiHealthUrl(candidatePort)} (apiVersion=${existingHealth.apiVersion}).`);
    break;
  }
}

if (selectedApiPort === null) {
  for (const candidatePort of API_PORT_CANDIDATES) {
    const backendChild = run(['run', 'dev:api-local'], {
      ...backendEnv,
      FORMMATE_API_HOST: API_BIND_HOST,
      FORMMATE_API_PORT: String(candidatePort),
    }, { propagateExitCode: false });

    let startupFailed = false;
    let startupError = null;

    try {
      await waitForApiReady(backendChild, candidatePort, STARTUP_TIMEOUT_MS);
      selectedApiPort = candidatePort;
      console.error(`[dev:stack] Started local API on ${getApiHealthUrl(candidatePort)}.`);
      break;
    } catch (error) {
      startupFailed = true;
      startupError = error;
    }

    if (startupFailed) {
      const message = String(startupError?.message || startupError);
      console.error(`[dev:stack] API startup attempt on port ${candidatePort} failed: ${message}`);
    }
  }
}

if (selectedApiPort === null) {
  stopChildren();
  console.error(`[dev:stack] Local API server failed readiness checks on candidate ports: ${API_PORT_CANDIDATES.join(', ')}.`);
  console.error('[dev:stack] Stop stale processes that occupy these ports, then retry.');
  process.exit(1);
}

if (selectedApiPort !== DEFAULT_API_PORT) {
  console.error(`[dev:stack] Using fallback local API port ${selectedApiPort}.`);
}

run(['run', 'dev:vite'], {
  VITE_API_PROXY_TARGET: `http://${API_HOST}:${selectedApiPort}`,
  VITE_STRICT_PORT: '1',
});
