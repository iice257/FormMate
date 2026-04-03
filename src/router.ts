// @ts-nocheck
import { getState, setState } from './state';
import { getSession, isAuthenticated } from './auth/auth-service';
import { isOnboardingComplete } from './storage/local-store';

const historyStack = [];
let routerInitialized = false;

const PUBLIC_SCREENS = ['auth', 'landing', 'capture', 'examples', 'docs', 'pricing', 'help'];
const SCREEN_TITLES = {
  landing: 'Home | FormMate',
  auth: 'Sign In | FormMate',
  new: 'New Form | FormMate',
  workspace: 'Workspace | FormMate',
  analyzing: 'Analyzing Form | FormMate',
  review: 'Review Results | FormMate',
  success: 'Success | FormMate',
  accounts: 'My Account | FormMate',
  analytics: 'Analytics | FormMate',
  docs: 'Documentation | FormMate',
  pricing: 'Pricing | FormMate',
  help: 'Help Center | FormMate',
  examples: 'Examples | FormMate',
  onboarding: 'Welcome | FormMate',
  dashboard: 'Dashboard | FormMate',
  'ai-chat': 'AI Chat | FormMate',
  history: 'History | FormMate',
  vault: 'Vault | FormMate',
  capture: 'Assisted Capture | FormMate',
};

function getPathForScreen(screen) {
  if (screen === 'landing') return '/';
  return `/${screen}`;
}

function getModalTabForScreen(screen) {
  if (screen === 'settings') return 'settings';
  if (screen === 'help') return 'help';
  return null;
}

function resolveGuardedScreen(screen) {
  const authed = isAuthenticated();
  const onboardingComplete = isOnboardingComplete();

  if (!authed && !PUBLIC_SCREENS.includes(screen)) {
    return 'auth';
  }

  if (authed && !onboardingComplete && screen !== 'onboarding' && screen !== 'capture') {
    return 'onboarding';
  }

  if (authed && screen === 'auth') {
    return onboardingComplete ? 'dashboard' : 'onboarding';
  }

  if (screen === 'settings') {
    return 'accounts';
  }

  return screen;
}

function syncDocumentTitle(screen) {
  document.title = SCREEN_TITLES[screen] || 'FormMate AI';
}

export function getHomeScreenForUser() {
  return 'landing';
}

export function getDashboardActionScreenForUser() {
  return isAuthenticated() ? 'dashboard' : 'auth';
}

export function getFormsEntryScreenForUser() {
  return isAuthenticated() ? 'new' : 'auth';
}

export function registerScreen() {
  // Legacy API kept as a no-op while the runtime is React-driven.
}

export function navigateTo(screen, replace = false, direction = replace ? 'back' : 'forward') {
  const modalTab = getModalTabForScreen(screen);
  if (modalTab && typeof window.__fmOpenAccountModalTab === 'function' && getState().currentScreen) {
    window.__fmOpenAccountModalTab(modalTab);
    return;
  }

  const nextScreen = resolveGuardedScreen(screen || 'landing');
  const currentScreen = getState().currentScreen || 'landing';

  if (currentScreen && currentScreen !== nextScreen && !replace) {
    historyStack.push(currentScreen);
  }

  const path = getPathForScreen(nextScreen);
  if (replace) {
    window.history.replaceState({ screen: nextScreen }, '', path);
  } else {
    window.history.pushState({ screen: nextScreen }, '', path);
  }

  setState({ currentScreen: nextScreen });
  window.__fmPreviousScreen = historyStack.length ? historyStack[historyStack.length - 1] : null;
  syncDocumentTitle(nextScreen);
  window.scrollTo({ top: 0, behavior: direction === 'back' ? 'instant' : 'smooth' });
}

export function initRouter() {
  if (routerInitialized) return;
  routerInitialized = true;

  window.addEventListener('popstate', (event) => {
    const nextScreen = resolveGuardedScreen(event.state?.screen || (window.location.pathname.replace(/^\/+/, '') || 'landing'));
    setState({ currentScreen: nextScreen });
    syncDocumentTitle(nextScreen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

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
        avatar: session.user.avatar || getState().userProfile?.avatar || '',
      },
    });
  }

  const pathname = window.location.pathname.replace(/^\/+/, '') || 'landing';
  const initialScreen = resolveGuardedScreen(pathname);
  window.history.replaceState({ screen: initialScreen }, '', getPathForScreen(initialScreen));
  setState({ currentScreen: initialScreen });
  syncDocumentTitle(initialScreen);

  const modalTab = getModalTabForScreen(initialScreen);
  if (modalTab && typeof window.__fmOpenAccountModalTab === 'function') {
    window.setTimeout(() => {
      window.__fmOpenAccountModalTab(modalTab);
    }, 0);
  }
}

export function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  if (historyStack.length > 0) {
    const previousScreen = historyStack.pop();
    navigateTo(previousScreen, true, 'back');
    return;
  }

  navigateTo(getHomeScreenForUser(), true, 'back');
}
