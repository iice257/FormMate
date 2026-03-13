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
const PUBLIC_SCREENS = ['auth', 'landing', 'capture'];

export function registerScreen(name, renderFn) {
  routes[name] = renderFn;
}

export function navigateTo(screen, replace = false) {
  const overlay = document.getElementById('page-transition-overlay');
  const isForward = !replace;

  if (isForward && overlay) {
    const circle = document.createElement('div');
    circle.className = 'transition-circle expanding';
    circle.style.left = `${window.__fmClickX}px`;
    circle.style.top = `${window.__fmClickY}px`;
    overlay.appendChild(circle);

    setTimeout(() => {
      performNavigation(screen, replace);
      
      setTimeout(() => {
        circle.classList.remove('expanding');
        circle.classList.add('fading');
        setTimeout(() => circle.remove(), 400);
      }, 100);
    }, 450);
  } else {
    performNavigation(screen, replace);
  }
}

function performNavigation(screen, replace = false) {
  const app = document.getElementById('app');

  // URL matching
  let path = `/${screen === 'landing' ? '' : screen}`;
  if (screen === 'landing') path = '/';

  // Preserve query string for direct-entry screens (e.g. /capture?t=...) on initial load.
  // Assisted Capture relies on the token in the query string.
  if (replace) {
    const currentPath = window.location.pathname;
    const currentScreen = currentPath.replace(/^\/+/, '') || 'landing';
    if (window.location.search && currentScreen === screen) {
      path = `${currentPath}${window.location.search}`;
    }
  }

  // Redirect settings -> accounts
  if (screen === 'settings') {
    screen = 'accounts';
    path = '/accounts';
  }

  // Route guard (in-app navigations too)
  const authed = isAuthenticated();
  if (!authed && !PUBLIC_SCREENS.includes(screen)) {
    screen = 'auth';
    path = '/auth';
    replace = true;
  } else if (authed && screen === 'auth') {
    screen = 'dashboard';
    path = '/dashboard';
    replace = true;
  }

  // State push
  if (!replace) {
    window.history.pushState({ screen }, '', path);
  } else {
    window.history.replaceState({ screen }, '', path);
  }

  // Standard fade-out exit for non-interactive navigations
  const currentContent = app.firstElementChild;
  if (currentContent && replace) {
    currentContent.classList.remove('screen-enter');
    currentContent.classList.add('screen-exit');
  }

  // Switch content
  const timeout = (currentContent && replace) ? 200 : 0;
  
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
    
    // Update Document Title
    const titleMap = {
      'landing': 'Home | FormMate',
      'auth': 'Sign In | FormMate',
      'new': 'New Form | FormMate',
      'workspace': 'Workspace | FormMate',
      'analyzing': 'Analyzing Form... | FormMate',
      'review': 'Review Results | FormMate',
      'success': 'Success! | FormMate',
      'accounts': 'My Account | FormMate',
      'analytics': 'Analytics | FormMate',
      'docs': 'Documentation | FormMate',
      'pricing': 'Pricing | FormMate',
      'help': 'Help Center | FormMate',
      'examples': 'Examples | FormMate',
      'onboarding': 'Welcome | FormMate',
      'dashboard': 'Dashboard | FormMate',
      'ai-chat': 'AI Chat | FormMate',
      'history': 'History | FormMate',
      'vault': 'Vault | FormMate',
      'capture': 'Assisted Capture | FormMate'
    };
    document.title = titleMap[screen] || 'FormMate AI — AI-Assisted Form Companion';

    if (routes[screen]) {
      app.innerHTML = '';
      const { html, init } = routes[screen]();

      if (!html && !init) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'screen-enter';
      wrapper.innerHTML = html;
      app.appendChild(wrapper);

      if (init) {
        currentCleanup = init(wrapper) || null;
      }
    }
  }, timeout);
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
    // Signed-in users should land on the app dashboard by default
    if (initialScreen === 'landing') {
      navigateTo('dashboard', true);
      return;
    }
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
