// ═══════════════════════════════════════════
// FormMate — Router (Enhanced)
// ═══════════════════════════════════════════

import { getState, setState, subscribe } from './state.js';
import { isAuthenticated } from './auth/auth-service.js';
import { isOnboardingComplete } from './storage/local-store.js';

const routes = {};
let currentCleanup = null;

// Screens that don't require auth
const PUBLIC_SCREENS = ['auth', 'landing'];

export function registerScreen(name, renderFn) {
  routes[name] = renderFn;
}

export function navigateTo(screen) {
  const app = document.getElementById('app');

  // Exit animation
  const currentContent = app.firstElementChild;
  if (currentContent) {
    currentContent.classList.remove('screen-enter');
    currentContent.classList.add('screen-exit');
  }

  setTimeout(() => {
    // Cleanup previous screen
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    setState({ currentScreen: screen });

    if (routes[screen]) {
      app.innerHTML = '';
      const { html, init } = routes[screen]();

      // Handle empty returns (redirects)
      if (!html && !init) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'screen-enter';
      wrapper.innerHTML = html;
      app.appendChild(wrapper);

      if (init) {
        currentCleanup = init(wrapper) || null;
      }
    }
  }, currentContent ? 200 : 0);
}

export function initRouter() {
  // Determine start screen
  const authenticated = isAuthenticated();
  const onboarded = isOnboardingComplete();

  if (authenticated) {
    setState({ isAuthenticated: true });
  }

  if (!authenticated) {
    // Show auth screen first
    navigateTo('auth');
  } else if (!onboarded) {
    navigateTo('onboarding');
  } else {
    navigateTo('landing');
  }
}
