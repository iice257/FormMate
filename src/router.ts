// @ts-nocheck
import { getState, setState } from './state';
import { getSession, isAuthenticated } from './auth/auth-service';
import { isOnboardingComplete } from './storage/local-store';

const routes = {};
let currentCleanup = null;
const historyStack = [];
let navigationToken = 0;

const PUBLIC_SCREENS = ['auth', 'landing', 'capture'];

export function getHomeScreenForUser() {
  return 'landing';
}

export function getDashboardActionScreenForUser() {
  return isAuthenticated() ? 'dashboard' : 'auth';
}

export function getFormsEntryScreenForUser() {
  return isAuthenticated() ? 'new' : 'auth';
}

export function registerScreen(name, renderFn) {
  routes[name] = renderFn;
}

export function navigateTo(screen, replace = false, direction = replace ? 'back' : 'forward') {
  void performNavigation(screen, replace, direction);
}

async function performNavigation(screen, replace = false, direction = replace ? 'back' : 'forward') {
  const app = document.getElementById('app');
  const animationsEnabled = getState().settings?.ui?.animationsEnabled !== false;
  const navToken = ++navigationToken;
  const modalTab = screen === 'accounts'
    ? 'profile'
    : screen === 'settings'
      ? 'settings'
      : screen === 'help'
        ? 'help'
        : null;

  if (modalTab && app?.childElementCount && typeof window.__fmOpenAccountModalTab === 'function') {
    window.__fmOpenAccountModalTab(modalTab);
    return;
  }

  let path = `/${screen === 'landing' ? '' : screen}`;
  if (screen === 'landing') path = '/';

  if (replace) {
    const currentPath = window.location.pathname;
    const currentScreen = currentPath.replace(/^\/+/, '') || 'landing';
    if (window.location.search && currentScreen === screen) {
      path = `${currentPath}${window.location.search}`;
    }
  }

  if (screen === 'settings') {
    screen = 'accounts';
    path = '/accounts';
  }

  const authed = isAuthenticated();
  const onboardingComplete = isOnboardingComplete();
  if (!authed && !PUBLIC_SCREENS.includes(screen)) {
    screen = 'auth';
    path = '/auth';
    replace = true;
  } else if (authed && !onboardingComplete && screen !== 'onboarding' && screen !== 'capture') {
    screen = 'onboarding';
    path = '/onboarding';
    replace = true;
  } else if (authed && screen === 'auth') {
    screen = onboardingComplete ? 'dashboard' : 'onboarding';
    path = onboardingComplete ? '/dashboard' : '/onboarding';
    replace = true;
  }

  if (!replace) {
    window.history.pushState({ screen }, '', path);
  } else {
    window.history.replaceState({ screen }, '', path);
  }

  window.scrollTo(0, 0);

  const { currentScreen } = getState();
  if (currentScreen && !replace) {
    historyStack.push(currentScreen);
  }

  setState({ currentScreen: screen });
  window.__fmPreviousScreen = historyStack.length > 0 ? historyStack[historyStack.length - 1] : null;

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
  document.title = titleMap[screen] || 'FormMate AI - AI-Assisted Form Companion';

  if (!routes[screen]) return;

  const { html, init } = routes[screen]();
  if (!html && !init) return;

  const mountScreen = (wrapper) => {
    if (navToken !== navigationToken) return;
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    if (init) {
      currentCleanup = init(wrapper) || null;
    }
  };

  const currentWrapper = app.firstElementChild;
  const nextWrapper = document.createElement('div');
  nextWrapper.className = animationsEnabled ? `screen-shell screen-enter-${direction}` : 'screen-shell';
  nextWrapper.innerHTML = html;

  if (animationsEnabled && currentWrapper) {
    currentWrapper.classList.remove('screen-enter-forward', 'screen-enter-backward');
    currentWrapper.classList.add('screen-shell', 'screen-overlay-old', `screen-exit-${direction}`);
    nextWrapper.classList.add('screen-overlay-new');
    app.appendChild(nextWrapper);

    mountScreen(nextWrapper);
    await new Promise((resolve) => window.setTimeout(resolve, 170));
    if (navToken !== navigationToken) {
      nextWrapper.remove();
      return;
    }

    currentWrapper.remove();
    nextWrapper.classList.remove('screen-overlay-new');
    return;
  }

  app.innerHTML = '';
  app.appendChild(nextWrapper);
  mountScreen(nextWrapper);
}

export function initRouter() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.screen) {
      navigateTo(e.state.screen, true, 'back');
    } else {
      navigateTo('landing', true, 'back');
      window.history.pushState({ screen: 'landing' }, '', '/');
    }
  });

  const authenticated = isAuthenticated();
  const onboarded = isOnboardingComplete();

  if (authenticated) {
    const session = getSession();
    if (session?.user) {
      setState({
        isAuthenticated: true,
        authUser: session.user,
        tier: session.user.tier || session.tier || 'free',
        userProfile: {
          ...getState().userProfile,
          name: session.user.name || '',
          email: session.user.email || '',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || 'User')}&background=2298da&color=fff&bold=true`
        }
      });
    } else {
      setState({ isAuthenticated: true });
    }
  }

  const path = window.location.pathname.replace(/^\/+/, '');
  const initialScreen = path || 'landing';

  if (!authenticated) {
    navigateTo(PUBLIC_SCREENS.includes(initialScreen) ? initialScreen : 'auth', true);
  } else if (!onboarded) {
    navigateTo('onboarding', true);
  } else if (initialScreen === 'landing') {
    navigateTo('landing', true);
  } else if (routes[initialScreen]) {
    navigateTo(initialScreen, true);
  } else {
    navigateTo('landing', true);
  }
}

export function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else if (historyStack.length > 0) {
    const previousScreen = historyStack.pop();
    navigateTo(previousScreen, true, 'back');
  } else {
    navigateTo(getHomeScreenForUser(), true, 'back');
  }
}
