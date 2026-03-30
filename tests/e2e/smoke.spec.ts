// @ts-nocheck
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function seedOnboardingComplete(page) {
  await page.addInitScript(() => {
    const entry = { value: true, timestamp: Date.now(), ttl: null };
    localStorage.setItem('formmate_onboarding_complete', JSON.stringify(entry));
  });
}

async function login(page) {
  await page.goto('/auth');
  await page.fill('#login-email', 'free@formmate.ai');
  await page.fill('#login-password', 'password');
  await page.click('#btn-login');

  // Allow SPA navigation to complete
  await page.waitForTimeout(600);
}

test('demo flow: examples -> analyzing -> workspace renders cards', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/examples');
  await page.click('.demo-card[data-url="demo://customer-feedback"]');

  await page.waitForURL('**/workspace');
  await expect(page.locator('[data-card-id]')).toHaveCount(5);
});

test('protected routes redirect unauthenticated users to auth', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/dashboard');
  await page.waitForURL('**/auth');
  await expect(page.locator('#btn-login')).toBeVisible();
});

test('email signup reaches protected app shell', async ({ page }) => {
  await seedOnboardingComplete(page);

  const uniqueEmail = `signup-${Date.now()}@formmate.ai`;
  await page.goto('/auth');
  await page.click('#btn-to-signup');
  await page.fill('#signup-name', 'Playwright User');
  await page.fill('#signup-email', uniqueEmail);
  await page.fill('#signup-password', 'password');
  await page.click('#btn-signup');

  await page.waitForURL('**/dashboard');
  await expect(page.locator('#nav-dashboard')).toBeVisible();
});

test('social login reaches protected app shell', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/auth');
  await page.click('#btn-google');

  await page.waitForURL('**/dashboard');
  await expect(page.locator('#btn-profile-header')).toBeVisible();
});

test('auth-required flow: shows Assisted Capture modal', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  const fixturePath = path.resolve(process.cwd(), 'fixtures', 'auth-wall.html');
  const authHtml = fs.readFileSync(fixturePath, 'utf8');

  await page.route('**/api/proxy/scrape?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: authHtml });
  });

  await page.goto('/new');
  await page.fill('#url-input', 'https://typeform.com/to/protected-form');
  await page.click('#btn-analyze');

  await expect(page.locator('#capture-modal')).toBeVisible();
  await expect(page.locator('#capture-modal-icon')).toHaveText('lock');
  await expect(page.locator('#capture-modal-msg')).toContainText('signed in');
  await page.click('#btn-capture-start');
  await page.waitForURL('**/capture');
});

test('render-required flow: shows Assisted Capture modal for JS shell pages', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  const fixturePath = path.resolve(process.cwd(), 'fixtures', 'js-shell-stray-input.html');
  const shellHtml = fs.readFileSync(fixturePath, 'utf8');

  await page.route('**/api/proxy/scrape?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: shellHtml });
  });

  await page.goto('/new');
  await page.fill('#url-input', 'https://typeform.com/to/rendered-shell');
  await page.click('#btn-analyze');

  await expect(page.locator('#capture-modal')).toBeVisible();
  await expect(page.locator('#capture-modal-icon')).toHaveText('preview');
  await expect(page.locator('#capture-modal-msg')).toContainText('rendered client-side');
});

test('capture flow: postMessage payload imports into workspace', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/capture?t=e2e_token');

  const payload = {
    version: 1,
    pageUrl: 'https://example.com/rendered-form',
    title: 'E2E Captured Form',
    description: 'Captured via postMessage',
    fields: [
      { label: 'Full name', type: 'text', required: true },
      { label: 'Tell us about yourself', type: 'textarea', required: false },
      { label: 'Country', type: 'select', required: true, options: ['Nigeria', 'United States'] },
    ],
  };

  await page.evaluate((msg) => {
    window.postMessage(msg, '*');
  }, { type: 'FORMMATE_CAPTURE_V1', token: 'e2e_token', payload });

  await page.waitForURL('**/workspace');
  await expect(page.locator('[data-card-id]')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'E2E Captured Form' })).toBeVisible();
});

test('ai contract sanity: regenerate uses text output and updates UI', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.route('**/api/ai/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: 'Mock regenerated answer' } }]
      })
    });
  });

  await page.goto('/examples');
  await page.click('.demo-card[data-url="demo://customer-feedback"]');
  await page.waitForURL('**/workspace');

  const regenerate = page.locator('.btn-regenerate').first();
  await expect(regenerate).toBeVisible();
  const qId = await regenerate.getAttribute('data-question-id');
  expect(qId).toBeTruthy();
  await regenerate.click();

  await expect(page.locator(`.answer-textarea[data-question-id="${qId}"]`)).toHaveValue('Mock regenerated answer');
});

test('docs home button routes signed-in users back to dashboard', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/docs');
  await page.click('#btn-home');
  await page.waitForURL('**/dashboard');
});

test('sign out revokes access to protected routes', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/accounts');
  await page.click('[data-tab-index="4"]');
  await page.click('#btn-signout');
  await page.waitForURL('**/auth');

  await page.goto('/workspace');
  await page.waitForURL('**/auth');
  await expect(page.locator('#btn-login')).toBeVisible();
});
