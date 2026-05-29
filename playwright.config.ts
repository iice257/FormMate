import { defineConfig } from '@playwright/test';

const port = process.env.PW_PORT || '5174';
const baseUrl = process.env.PW_BASE_URL || `http://127.0.0.1:${port}`;
const browserChannel = process.env.PW_CHANNEL || 'msedge';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  outputDir: '.playwright-tmp/results',
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: baseUrl,
    channel: browserChannel,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'node scripts/dev-stack.mjs',
    url: baseUrl,
    env: {
      VITE_DEV_HOST: '127.0.0.1',
      VITE_DEV_PORT: port,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
