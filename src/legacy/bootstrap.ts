// @ts-nocheck
import { registerScreen, initRouter } from '../router';
import { registerAccountModalOpener } from '../components/layout';
import { initAccountModal } from '../components/account-modal';
import { authScreen } from '../screens/auth';
import { onboardingScreen } from '../screens/onboarding';
import { landingScreen } from '../screens/landing';
import { analyzingScreen } from '../screens/analyzing';
import { workspaceScreen } from '../screens/workspace';
import { reviewScreen } from '../screens/review';
import { successScreen } from '../screens/success';
import { accountsScreen } from '../screens/accounts';
import { analyticsScreen } from '../screens/analytics';
import { docsScreen } from '../screens/docs';
import { helpScreen } from '../screens/help';
import { examplesScreen } from '../screens/examples';
import { privacyScreen, termsScreen } from '../screens/legal';
import { newFormScreen } from '../screens/new-form';
import { dashboardScreen } from '../screens/dashboard';
import { aiChatScreen } from '../screens/ai-chat';
import { historyScreen } from '../screens/history';
import { vaultScreen } from '../screens/vault';
import { captureScreen } from '../screens/capture';
import { notFoundScreen } from '../screens/not-found';
import { initSessionLifecycle } from '../auth/session-lifecycle';
import { loadRuntimeHealth } from '../app/runtime-health';

let booted = false;
let screensRegistered = false;
let hidingHeaderInitialized = false;
let errorHandlersInitialized = false;
let bootComplete = false;

function registerScreens() {
  if (screensRegistered) return;

  registerScreen('auth', authScreen);
  registerScreen('onboarding', onboardingScreen);
  registerScreen('landing', landingScreen);
  registerScreen('analyzing', analyzingScreen);
  registerScreen('workspace', workspaceScreen);
  registerScreen('review', reviewScreen);
  registerScreen('success', successScreen);
  registerScreen('accounts', accountsScreen);
  registerScreen('analytics', analyticsScreen);
  registerScreen('docs', docsScreen);
  registerScreen('privacy', privacyScreen);
  registerScreen('terms', termsScreen);
  registerScreen('help', helpScreen);
  registerScreen('examples', examplesScreen);
  registerScreen('new', newFormScreen);
  registerScreen('dashboard', dashboardScreen);
  registerScreen('ai-chat', aiChatScreen);
  registerScreen('history', historyScreen);
  registerScreen('vault', vaultScreen);
  registerScreen('capture', captureScreen);
  registerScreen('not-found', notFoundScreen);

  screensRegistered = true;
}

function initHidingHeader() {
  if (hidingHeaderInitialized) return;

  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const headers = document.querySelectorAll<HTMLElement>('header[data-fm-hide-on-scroll="true"]');
    if (!headers.length) return;

    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      headers.forEach((header) => {
        header.style.transform = 'translateY(-100%)';
        header.style.opacity = '0';
      });
    } else {
      headers.forEach((header) => {
        header.style.transform = 'translateY(0)';
        header.style.opacity = '1';
      });
    }

    lastScrollY = currentScrollY;
  }, { passive: true });

  const style = document.createElement('style');
  style.textContent = `
    header[data-fm-hide-on-scroll="true"] {
      transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms cubic-bezier(0.23, 1, 0.32, 1) !important;
      will-change: transform, opacity;
    }
  `;
  document.head.appendChild(style);
  hidingHeaderInitialized = true;
}

function renderFatalError(error: unknown, phase = 'startup') {
  const app = document.getElementById('app');
  if (!app) return;

  const isStartup = phase === 'startup';
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:#0b1220;color:#e5e7eb;">
      <div style="max-width:900px;width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px;">
        <div style="font-weight:900;font-size:18px;letter-spacing:-0.02em;">${isStartup ? 'FormMate failed to start' : 'FormMate hit an unexpected error'}</div>
        <div style="margin-top:6px;color:rgba(229,231,235,0.85);font-size:13px;line-height:1.4;">
          Open DevTools Console for more context. The ${isStartup ? 'startup' : 'runtime'} error was logged to the console.
        </div>
        <div style="margin-top:14px;color:rgba(229,231,235,0.9);font-size:12px;line-height:1.35;">${isStartup ? 'An unexpected startup error occurred.' : escapeHtml(error instanceof Error ? error.message : 'An unexpected runtime error occurred.')}</div>
      </div>
    </div>
  `;
}

function renderRuntimeErrorNotice(error: unknown) {
  const existing = document.getElementById('fm-runtime-error-notice');
  existing?.remove();

  const notice = document.createElement('div');
  notice.id = 'fm-runtime-error-notice';
  notice.setAttribute('role', 'alert');
  notice.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:20px',
    'z-index:99999',
    'width:min(92vw,520px)',
    'transform:translateX(-50%)',
    'border:1px solid rgba(248,113,113,0.28)',
    'border-radius:16px',
    'background:rgba(15,23,42,0.96)',
    'box-shadow:0 24px 70px rgba(15,23,42,0.24)',
    'color:#f8fafc',
    'padding:14px 16px',
    'font-family:Inter,system-ui,sans-serif',
  ].join(';');

  const message = error instanceof Error ? error.message : 'Unexpected runtime error.';
  notice.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:900;letter-spacing:-0.01em;">Something went wrong</div>
        <div style="margin-top:4px;font-size:12px;line-height:1.45;color:rgba(226,232,240,0.86);">${escapeHtml(message)}</div>
      </div>
      <button type="button" aria-label="Dismiss error" style="border:0;background:transparent;color:#cbd5e1;cursor:pointer;font-size:18px;line-height:1;">×</button>
    </div>
  `;
  notice.querySelector('button')?.addEventListener('click', () => notice.remove());
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 8000);
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initGlobalErrorHandlers() {
  if (errorHandlersInitialized) return;

  window.addEventListener('error', (event) => {
    if (import.meta.env.DEV) return;
    console.error('[global] Uncaught error:', event.error || event);
    if (bootComplete) {
      renderRuntimeErrorNotice(event.error || event);
    } else {
      renderFatalError(event.error || event, 'startup');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (import.meta.env.DEV) return;
    console.error('[global] Unhandled promise rejection:', event.reason || event);
    if (bootComplete) {
      renderRuntimeErrorNotice(event.reason || event);
    } else {
      renderFatalError(event.reason || event, 'startup');
    }
  });

  errorHandlersInitialized = true;
}

async function boot() {
  if (booted) return;
  booted = true;

  try {
    const { setState } = await import('../state');

    const openModal = initAccountModal();
    registerAccountModalOpener(openModal);

    try {
      const { ensureAuthBootstrapped, getSession } = await import('../auth/auth-service');
      await ensureAuthBootstrapped();
      const session = getSession();

      if (session) {
        setState({ isAuthenticated: true, authUser: session.user });

        try {
          const { hydrateFromRemote } = await import('../storage/storage-provider');
          const hydrated = await hydrateFromRemote(session.user);
          if (hydrated) {
            setState(hydrated);
          }
        } catch (hydrateErr) {
          console.warn('[boot] Remote storage hydration failed; continuing with local cache.', hydrateErr);
        }
      }
    } catch (authErr) {
      console.warn('[boot] Failed to load auth session; continuing unauthenticated.', authErr);
    }

    initRouter();
    initSessionLifecycle();

    try {
      const { setRuntimeHealth } = await import('../state');
      const runtimeHealth = await loadRuntimeHealth();
      setRuntimeHealth(runtimeHealth);

    } catch (runtimeError) {
      console.warn('[boot] Runtime health check failed; continuing with local assumptions.', runtimeError);
    }

    initHidingHeader();
    bootComplete = true;
  } catch (error) {
    console.error('[boot] Fatal startup error:', error);
    renderFatalError(error, 'startup');
  }
}

export function mountLegacyApp() {
  registerScreens();
  initGlobalErrorHandlers();
  void boot();

  return () => undefined;
}
