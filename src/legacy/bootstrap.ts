// @ts-nocheck
import { registerScreen, initRouter } from '../router';
import { registerAccountModalOpener } from '../components/layout';
import { initAccountModal } from '../components/account-modal';
import { applyTheme } from '../theme';
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
import { pricingScreen } from '../screens/pricing';
import { helpScreen } from '../screens/help';
import { examplesScreen } from '../screens/examples';
import { newFormScreen } from '../screens/new-form';
import { dashboardScreen } from '../screens/dashboard';
import { aiChatScreen } from '../screens/ai-chat';
import { historyScreen } from '../screens/history';
import { vaultScreen } from '../screens/vault';
import { captureScreen } from '../screens/capture';

let booted = false;
let screensRegistered = false;
let hidingHeaderInitialized = false;
let transitionsInitialized = false;
let errorHandlersInitialized = false;

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
  registerScreen('pricing', pricingScreen);
  registerScreen('help', helpScreen);
  registerScreen('examples', examplesScreen);
  registerScreen('new', newFormScreen);
  registerScreen('dashboard', dashboardScreen);
  registerScreen('ai-chat', aiChatScreen);
  registerScreen('history', historyScreen);
  registerScreen('vault', vaultScreen);
  registerScreen('capture', captureScreen);

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
      transition: transform 0.3s ease, opacity 0.3s ease !important;
      will-change: transform, opacity;
    }
  `;
  document.head.appendChild(style);
  hidingHeaderInitialized = true;
}

function initTransitions() {
  if (transitionsInitialized) return;

  const overlay = document.createElement('div');
  overlay.id = 'page-transition-overlay';
  document.body.appendChild(overlay);

  window.__fmClickX = window.innerWidth / 2;
  window.__fmClickY = window.innerHeight / 2;

  document.addEventListener('mousedown', (event) => {
    window.__fmClickX = event.clientX;
    window.__fmClickY = event.clientY;
  }, { capture: true, passive: true });

  transitionsInitialized = true;
}

function renderFatalError(error: unknown) {
  const app = document.getElementById('app');
  if (!app) return;

  const details =
    error && typeof error === 'object' && 'stack' in error && error.stack
      ? String(error.stack)
      : String(error ?? 'Unknown error');

  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:#0b1220;color:#e5e7eb;">
      <div style="max-width:900px;width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px;">
        <div style="font-weight:900;font-size:18px;letter-spacing:-0.02em;">FormMate failed to start</div>
        <div style="margin-top:6px;color:rgba(229,231,235,0.85);font-size:13px;line-height:1.4;">
          Open DevTools Console for more context. The error below is also printed to the console.
        </div>
        <pre style="margin-top:14px;white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:12px;font-size:12px;line-height:1.35;overflow:auto;max-height:55vh;">${escapeHtml(details)}</pre>
      </div>
    </div>
  `;
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
    renderFatalError(event.error || event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (import.meta.env.DEV) return;
    console.error('[global] Unhandled promise rejection:', event.reason || event);
    renderFatalError(event.reason || event);
  });

  errorHandlersInitialized = true;
}

async function boot() {
  if (booted) return;
  booted = true;

  try {
    initTransitions();
    const { getState, subscribe } = await import('../state');
    applyTheme(getState().settings?.ui?.theme);
    subscribe((nextState) => {
      applyTheme(nextState?.settings?.ui?.theme);
    });

    const openModal = initAccountModal();
    registerAccountModalOpener(openModal);

    try {
      const { getSession } = await import('../auth/auth-service');
      const session = getSession();

      if (session) {
        const { setState } = await import('../state');
        setState({ isAuthenticated: true, authUser: session.user, tier: session.tier });

        try {
          const { hydrateFromRemote } = await import('../storage/storage-provider');
          const hydrated = await hydrateFromRemote(session.user);
          if (hydrated) {
            setState(hydrated);
            applyTheme(hydrated?.settings?.ui?.theme ?? getState().settings?.ui?.theme);
          }
        } catch (hydrateErr) {
          console.warn('[boot] Remote storage hydration failed; continuing with local cache.', hydrateErr);
        }
      }
    } catch (authErr) {
      console.warn('[boot] Failed to load auth session; continuing unauthenticated.', authErr);
    }

    initRouter();
    initHidingHeader();
  } catch (error) {
    console.error('[boot] Fatal startup error:', error);
    renderFatalError(error);
  }
}

export function mountLegacyApp() {
  registerScreens();
  initGlobalErrorHandlers();
  void boot();

  return () => undefined;
}
