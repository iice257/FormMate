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
  await page.click('[data-dev-test-user]');

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

test('signed-out protected deep links require auth and resume after login', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/history');
  await page.waitForURL('**/auth');
  await expect(page.getByText('Sign up or Log in to continue.')).toBeVisible();

  await page.click('[data-dev-test-user]');
  await page.waitForURL('**/history');
  await expect(page.locator('#nav-history')).toBeVisible();
});

test('dev test access reaches protected app shell', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/auth');
  await page.click('[data-dev-test-user]');

  await page.waitForURL('**/dashboard');
  await expect(page.locator('#nav-dashboard')).toBeVisible();
});

test('auth screen exposes Google and dev access paths', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/auth');
  await expect(page.locator('#btn-google')).toBeVisible();
  await expect(page.locator('[data-dev-test-user]')).toBeVisible();
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
  await expect(page.locator('#capture-modal-msg')).toContainText(/authentication|signed in|permission/i);
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
  await expect(page.locator('#capture-modal-icon')).toHaveText(/preview|lock/);
  await expect(page.locator('#capture-modal-msg')).toContainText(/rendered client-side|interactive-first|authentication/i);
});

test('capture flow: manual payload import imports into workspace', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/capture?t=cap_e2e_token');

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

  await page.fill('#payload-input', JSON.stringify({
    type: 'FORMMATE_CAPTURE_V1',
    token: 'cap_e2e_token',
    payload,
  }));
  await page.click('#btn-import-payload');

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

test('public routes are directly reachable and signed-out unknown routes require auth', async ({ page }) => {
  await seedOnboardingComplete(page);

  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: /Welcome to FormMate/i })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /Privacy/i })).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible();

  await page.goto('/examples');
  await expect(page.getByRole('heading', { name: /Explore Real FormMate/i })).toBeVisible();

  await page.goto('/totally-fake');
  await page.waitForURL('**/auth');
  await expect(page.getByText('Sign up or Log in to continue.')).toBeVisible();
  await page.click('[data-dev-test-user]');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('#nav-dashboard')).toBeVisible();
});

test('signed-in unknown routes render branded 404', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/totally-fake');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByText('LOST IN THE FORM FLOW')).toBeVisible();
  await expect(page.locator('#nav-dashboard')).toBeVisible();
  await expect(page.locator('#nav-examples')).toBeVisible();
  await expect(page.locator('#nav-docs')).toContainText('Docs & Help');
  await expect(page.locator('#nav-terms')).toBeVisible();
});

test('docs home button routes signed-in users back to public home', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/docs');
  await page.click('#btn-home');
  await page.waitForURL('**/');
  await expect(page.getByRole('heading', { name: /Fill Any Form/i })).toBeVisible();
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
  await expect(page.getByText('Sign up or Log in to continue.')).toBeVisible();
});

test('signed-in protected bookmarks open or safely fall back', async ({ page }) => {
  await seedOnboardingComplete(page);
  await login(page);

  await page.goto('/history');
  await expect(page.locator('#nav-history')).toBeVisible();

  await page.goto('/ai-chat');
  await expect(page.locator('#nav-ai-chat')).toBeVisible();

  await page.goto('/workspace');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('#nav-dashboard')).toBeVisible();
});

test('remember this browser controls persistent auth storage', async ({ page }) => {
  await seedOnboardingComplete(page);
  await page.goto('/auth');
  await page.click('[data-dev-test-user]');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('#nav-dashboard')).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('formmate_auth_session'))).resolves.toBeNull();
  await expect(page.evaluate(() => sessionStorage.getItem('formmate_auth_session'))).resolves.toBeTruthy();

  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem('formmate_auth_session');
    localStorage.removeItem('formmate_auth_persistence');
  });

  await page.goto('/auth');
  await page.check('#login-remember');
  await page.click('[data-dev-test-user]');
  await page.waitForURL('**/dashboard');
  await expect(page.evaluate(() => localStorage.getItem('formmate_auth_session'))).resolves.toBeTruthy();
  await expect(page.evaluate(() => sessionStorage.getItem('formmate_auth_session'))).resolves.toBeNull();
});
