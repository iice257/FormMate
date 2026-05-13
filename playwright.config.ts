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
    command: `node ./node_modules/vite/bin/vite.js dev --configLoader native --host 127.0.0.1 --port ${port}`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
