import { getState, setState } from './state';
import { getSession, isAuthenticated } from './auth/auth-service';
import { isOnboardingComplete } from './storage/local-store';
import { createSafeHtmlFragment } from './utils/safe-html';

type ScreenRenderResult = {
  html: string;
  init?: (wrapper: HTMLElement) => void | (() => void) | null;
};

type ScreenRenderer = () => ScreenRenderResult;

declare global {
  interface Window {
    __fmOpenAccountModalTab?: (tab?: 'profile' | 'settings' | 'help') => void;
    __fmPreviousScreen?: string | null;
  }
}

const routes: Record<string, ScreenRenderer> = {};
let currentCleanup: null | (() => void) = null;
const historyStack: string[] = [];

const PUBLIC_SCREENS = ['auth', 'landing', 'capture'];

export function getHomeScreenForUser() {
  if (!isAuthenticated()) return 'landing';
  return isOnboardingComplete() ? 'dashboard' : 'onboarding';
}

export function getDashboardActionScreenForUser() {
  if (!isAuthenticated()) return 'auth';
  return isOnboardingComplete() ? 'dashboard' : 'onboarding';
}

export function getFormsEntryScreenForUser() {
  if (!isAuthenticated()) return 'auth';
  return isOnboardingComplete() ? 'new' : 'onboarding';
}

export function registerScreen(name: string, renderFn: ScreenRenderer) {
  routes[name] = renderFn;
}

export function navigateTo(screen: string, replace = false, direction = replace ? 'back' : 'forward') {
  void direction;
  performNavigation(screen, replace);
}

function performNavigation(screen: string, replace = false) {
  const app = document.getElementById('app');
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

  const mountScreen = (wrapper: HTMLElement) => {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    if (init) {
      currentCleanup = init(wrapper) || null;
    }
  };

  const nextWrapper = document.createElement('div');
  nextWrapper.appendChild(createSafeHtmlFragment(html));
  app.replaceChildren(nextWrapper);
  mountScreen(nextWrapper);
}

export function initRouter() {
  window.addEventListener('popstate', (e: PopStateEvent) => {
    const nextState = e.state as { screen?: string } | null;
    if (nextState?.screen) {
      navigateTo(nextState.screen, true, 'back');
    } else {
      const homeScreen = getHomeScreenForUser();
      navigateTo(homeScreen, true, 'back');
      window.history.pushState({ screen: homeScreen }, '', homeScreen === 'landing' ? '/' : `/${homeScreen}`);
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
    navigateTo(initialScreen === 'capture' ? 'capture' : 'onboarding', true);
  } else if (initialScreen === 'landing' || initialScreen === 'auth') {
    navigateTo('dashboard', true);
  } else if (routes[initialScreen]) {
    navigateTo(initialScreen, true);
  } else {
    navigateTo('dashboard', true);
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
