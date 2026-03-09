// ═══════════════════════════════════════════
// FormMate — Router (Enhanced)
// ═══════════════════════════════════════════

import { getState, setState, subscribe } from './state.js';
import { isAuthenticated } from './auth/auth-service.js';
import { isOnboardingComplete } from './storage/local-store.js';

const routes = {};
let currentCleanup = null;
const historyStack = [];

// Screens that don't require auth
const PUBLIC_SCREENS = ['auth', 'landing'];

export function registerScreen(name, renderFn) {
  routes[name] = renderFn;
}

export function navigateTo(screen, replace = false) {
  const app = document.getElementById('app');

  // URL matching
  let path = `/${screen === 'landing' ? '' : screen}`;
  if (screen === 'landing') path = '/';

  // State push
  if (!replace) {
    window.history.pushState({ screen }, '', path);
  } else {
    window.history.replaceState({ screen }, '', path);
  }

  // Exit animation
  const currentContent = app.firstElementChild;
  if (currentContent) {
    currentContent.classList.remove('screen-enter');
    currentContent.classList.add('screen-exit');
  }

  setTimeout(() => {
    // Scroll to top on navigation
    window.scrollTo(0, 0);

    // Cleanup previous screen
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    const { currentScreen } = getState();
    if (currentScreen && !replace) {
      historyStack.push(currentScreen);
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
  // Listen for back button
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.screen) {
      // Use replace=true to avoid double-pushing during back navigation
      navigateTo(e.state.screen, true);
    } else {
      navigateTo('landing', true);
      // If we got here with no state, let's make sure we pushstate to avoid exiting on the next back press
      window.history.pushState({ screen: 'landing' }, '', '/');
    }
  });

  // Determine start screen
  const authenticated = isAuthenticated();
  const onboarded = isOnboardingComplete();

  if (authenticated) {
    setState({ isAuthenticated: true });
  }

  // Check URL first
  const path = window.location.pathname.replace(/^\/+/, '');
  const initialScreen = path || 'landing';

  if (!authenticated) {
    if (PUBLIC_SCREENS.includes(initialScreen)) {
      navigateTo(initialScreen, true);
    } else {
      // Show auth screen first
      navigateTo('auth', true);
    }
  } else if (!onboarded) {
    navigateTo('onboarding', true);
  } else {
    // if requested a valid route, go there, else home
    if (routes[initialScreen]) {
      navigateTo(initialScreen, true);
    } else {
      navigateTo('landing', true);
    }
  }
}

export function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else if (historyStack.length > 0) {
    const previousScreen = historyStack.pop();
    navigateTo(previousScreen, true);
  } else {
    // Fallback if no history
    navigateTo('landing', true);
  }
}
