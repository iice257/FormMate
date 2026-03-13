// ═══════════════════════════════════════════
// FormMate — Application Entry Point
// ═══════════════════════════════════════════

// Self-hosted fonts (bundled by Vite — no CDN dependency)
import 'material-symbols/outlined.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';

// Design system & styles
import './design-tokens.css';
import './styles.css';

// Core
import { registerScreen, initRouter } from './router.js';

// Screens
import { authScreen } from './screens/auth.js';
import { onboardingScreen } from './screens/onboarding.js';
import { landingScreen } from './screens/landing.js';
import { analyzingScreen } from './screens/analyzing.js';
import { workspaceScreen } from './screens/workspace.js';
import { reviewScreen } from './screens/review.js';
import { successScreen } from './screens/success.js';
import { accountsScreen } from './screens/accounts.js';
import { analyticsScreen } from './screens/analytics.js';
import { docsScreen } from './screens/docs.js';
import { pricingScreen } from './screens/pricing.js';
import { helpScreen } from './screens/help.js';
import { examplesScreen } from './screens/examples.js';
import { newFormScreen } from './screens/new-form.js';
import { dashboardScreen } from './screens/dashboard.js';
import { aiChatScreen } from './screens/ai-chat.js';
import { historyScreen } from './screens/history.js';
import { vaultScreen } from './screens/vault.js';
import { captureScreen } from './screens/capture.js';


// Register all screens
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



// Global hiding header logic
function initHidingHeader() {
  let lastScrollY = window.scrollY;
  // We attach to window scroll
  window.addEventListener('scroll', () => {
    const headers = document.querySelectorAll('header[data-fm-hide-on-scroll="true"]');
    if (!headers.length) return;
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      // Scrolling down
      headers.forEach(h => {
        h.style.transform = 'translateY(-100%)';
        h.style.opacity = '0';
      });
    } else {
      // Scrolling up
      headers.forEach(h => {
        h.style.transform = 'translateY(0)';
        h.style.opacity = '1';
      });
    }
    lastScrollY = currentScrollY;
  }, { passive: true });

  // Add transitional styling dynamically to make sure existing styles don't conflict, though transition-all should be on most headers
  const style = document.createElement('style');
  style.textContent = `
    header[data-fm-hide-on-scroll="true"] {
      transition: transform 0.3s ease, opacity 0.3s ease !important;
      will-change: transform, opacity;
    }
  `;
  document.head.appendChild(style);
}

// Global transition logic
function initTransitions() {
  const overlay = document.createElement('div');
  overlay.id = 'page-transition-overlay';
  document.body.appendChild(overlay);

  // Track coordinates globally
  window.__fmClickX = window.innerWidth / 2;
  window.__fmClickY = window.innerHeight / 2;

  document.addEventListener('mousedown', (e) => {
    window.__fmClickX = e.clientX;
    window.__fmClickY = e.clientY;
  }, { capture: true, passive: true });
}

// Initialize the app
let __booted = false;

function renderFatalError(err) {
  const app = document.getElementById('app');
  if (!app) return;

  const details =
    (err && typeof err === 'object' && 'stack' in err && err.stack)
      ? String(err.stack)
      : String(err ?? 'Unknown error');

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

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function boot() {
  if (__booted) return;
  __booted = true;

  try {
    initTransitions();

    // Sync initial auth state but never block routing on auth read.
    try {
      const { getSession } = await import('./auth/auth-service.js');
      const session = getSession();
      if (session) {
        const { setState } = await import('./state.js');
        setState({ isAuthenticated: true, authUser: session.user, tier: session.tier });
      }
    } catch (authErr) {
      console.warn('[boot] Failed to load auth session; continuing unauthenticated.', authErr);
    }

    initRouter();
    initHidingHeader();
  } catch (err) {
    console.error('[boot] Fatal startup error:', err);
    renderFatalError(err);
  }
}

document.addEventListener('DOMContentLoaded', boot);

// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  boot();
}

// If anything slips through, render a visible error instead of a blank page.
window.addEventListener('error', (e) => {
  // Avoid clobbering Vite's dev overlay in development.
  if (import.meta?.env?.DEV) return;
  console.error('[global] Uncaught error:', e?.error || e);
  renderFatalError(e?.error || e);
});

window.addEventListener('unhandledrejection', (e) => {
  if (import.meta?.env?.DEV) return;
  console.error('[global] Unhandled promise rejection:', e?.reason || e);
  renderFatalError(e?.reason || e);
});
