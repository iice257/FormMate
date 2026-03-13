import { defineConfig } from '@playwright/test';

const PORT = process.env.PW_PORT || '5174';
const BASE_URL = process.env.PW_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: BASE_URL,
    // Prefer system Chrome channel on Windows to avoid heavyweight browser downloads.
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

