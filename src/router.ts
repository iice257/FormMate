import { getState, setState } from './state';
import { getSession, isAuthenticated } from './auth/auth-service';
import { isOnboardingComplete } from './storage/local-store';
import { createSafeHtmlFragment } from './utils/safe-html';
import {
  applyNavigationTransition,
  captureScrollState,
  type NavigationDirection,
  type NavigationTransitionKind,
  type ScrollStrategy,
} from './navigation/transition-system';

type ScreenRenderResult = {
  html: string;
  init?: (wrapper: HTMLElement) => void | (() => void) | null;
};

type ScreenRenderer = () => ScreenRenderResult;

type RouterHistoryState = {
  screen: string;
  seq: number;
  previousScreen: string | null;
};

type NavigateOptions = {
  replace?: boolean;
  direction?: NavigationDirection | 'auto';
  source?: 'app' | 'sidebar' | 'shell' | 'browser';
  transition?: NavigationTransitionKind | 'auto';
  scroll?: ScrollStrategy | 'auto';
  historySync?: 'auto' | 'skip';
  incomingHistoryState?: RouterHistoryState | null;
};

declare global {
  interface Window {
    __fmOpenAccountModalTab?: (tab?: 'profile' | 'settings' | 'help') => void;
    __fmPreviousScreen?: string | null;
  }
}

const routes: Record<string, ScreenRenderer> = {};
let currentCleanup: null | (() => void) = null;
let historySequence = 0;

const PUBLIC_SCREENS = ['auth', 'landing', 'capture', 'docs', 'examples', 'privacy', 'terms'];
const APP_SHELL_SCREENS = new Set([
  'dashboard',
  'new',
  'workspace',
  'history',
  'ai-chat',
  'vault',
]);

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

function getActiveHistoryState() {
  const state = window.history.state as RouterHistoryState | null;

  if (!state || typeof state.seq !== 'number') {
    return null;
  }

  return state;
}

function isAppShellScreen(screen: string | null | undefined) {
  return Boolean(screen && APP_SHELL_SCREENS.has(screen));
}

function normalizeNavigateOptions(
  replaceOrOptions: boolean | NavigateOptions = false,
  legacyDirection?: NavigationDirection,
) {
  if (typeof replaceOrOptions === 'boolean') {
    return {
      replace: replaceOrOptions,
      direction: legacyDirection ?? (replaceOrOptions ? 'back' : 'forward'),
      source: 'app' as const,
      transition: 'auto' as const,
      scroll: 'auto' as const,
      historySync: 'auto' as const,
      incomingHistoryState: null,
    };
  }

  return {
    replace: replaceOrOptions.replace ?? false,
    direction: replaceOrOptions.direction ?? 'auto',
    source: replaceOrOptions.source ?? 'app',
    transition: replaceOrOptions.transition ?? 'auto',
    scroll: replaceOrOptions.scroll ?? 'auto',
    historySync: replaceOrOptions.historySync ?? 'auto',
    incomingHistoryState: replaceOrOptions.incomingHistoryState ?? null,
  };
}

function resolveNavigationDirection(
  screen: string,
  direction: NavigationDirection | 'auto',
) {
  if (direction === 'forward' || direction === 'back') {
    return direction;
  }

  const activeHistoryState = getActiveHistoryState();
  if (activeHistoryState?.previousScreen === screen) {
    return 'back';
  }

  return 'forward';
}

function resolveTransitionKind(
  currentScreen: string | null | undefined,
  nextScreen: string,
  options: ReturnType<typeof normalizeNavigateOptions>,
) {
  if (options.transition === 'page' || options.transition === 'shell') {
    return options.transition;
  }

  if (
    (options.source === 'sidebar' || options.source === 'shell' || options.source === 'browser')
    && isAppShellScreen(currentScreen)
    && isAppShellScreen(nextScreen)
  ) {
    return 'shell';
  }

  return 'page';
}

function resolveScrollStrategy(
  direction: NavigationDirection,
  options: ReturnType<typeof normalizeNavigateOptions>,
) {
  if (options.scroll === 'top' || options.scroll === 'restore' || options.scroll === 'preserve') {
    return options.scroll;
  }

  return direction === 'back' && options.source === 'browser' ? 'restore' : 'top';
}

function createRouteWrapper(screen: string, html: string) {
  const wrapper = document.createElement('div');
  wrapper.dataset.fmRouteRoot = 'true';
  wrapper.dataset.fmRouteScreen = screen;
  wrapper.appendChild(createSafeHtmlFragment(html));
  return wrapper;
}

function syncHistoryState(
  screen: string,
  path: string,
  replace: boolean,
  currentScreen: string | null,
  requestedHistoryMode: 'auto' | 'skip',
  incomingHistoryState: RouterHistoryState | null,
) {
  const activeHistoryState = getActiveHistoryState();
  let historyMode: 'push' | 'replace' | 'skip' = requestedHistoryMode === 'skip'
    ? 'skip'
    : replace
      ? 'replace'
      : 'push';

  const currentPath = window.location.pathname;
  const requestedStateMatchesCurrentHistory = incomingHistoryState?.screen === screen && currentPath === path;
  if (historyMode === 'skip' && !requestedStateMatchesCurrentHistory) {
    historyMode = 'replace';
  }

  if (historyMode === 'skip') {
    historySequence = incomingHistoryState?.seq ?? historySequence;
    window.__fmPreviousScreen = incomingHistoryState?.previousScreen ?? null;
    return incomingHistoryState ?? activeHistoryState;
  }

  const nextSeq = historyMode === 'push'
    ? (activeHistoryState?.seq ?? historySequence) + 1
    : activeHistoryState?.seq ?? historySequence;

  const nextHistoryState: RouterHistoryState = {
    screen,
    seq: nextSeq,
    previousScreen: historyMode === 'push'
      ? currentScreen
      : activeHistoryState?.previousScreen ?? currentScreen,
  };

  if (historyMode === 'push') {
    window.history.pushState(nextHistoryState, '', path);
  } else {
    window.history.replaceState(nextHistoryState, '', path);
  }

  historySequence = nextSeq;
  window.__fmPreviousScreen = nextHistoryState.previousScreen;
  return nextHistoryState;
}

export function navigateTo(
  screen: string,
  replaceOrOptions: boolean | NavigateOptions = false,
  legacyDirection?: NavigationDirection,
) {
  performNavigation(screen, normalizeNavigateOptions(replaceOrOptions, legacyDirection));
}

function performNavigation(screen: string, options: ReturnType<typeof normalizeNavigateOptions>) {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const requestedScreen = screen;
  const authed = isAuthenticated();
  const onboardingComplete = isOnboardingComplete();
  let replace = options.replace;
  let path = `/${screen === 'landing' ? '' : screen}`;
  if (screen === 'landing') path = '/';

  if (screen === 'settings') {
    screen = 'accounts';
    path = '/accounts';
  }

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

  const modalTab = authed && requestedScreen === 'settings'
    ? 'settings'
    : authed && screen === 'accounts'
    ? 'profile'
    : authed && requestedScreen === 'help'
      ? 'help'
      : null;

  if (modalTab && app.childElementCount && typeof window.__fmOpenAccountModalTab === 'function') {
    window.__fmOpenAccountModalTab(modalTab);
    return;
  }

  if (replace) {
    const currentPath = window.location.pathname;
    const currentScreen = currentPath.replace(/^\/+/, '') || 'landing';
    if (window.location.search && currentScreen === screen) {
      path = `${currentPath}${window.location.search}`;
    }
  }

  const currentWrapper = app.firstElementChild as HTMLElement | null;
  const departingHistoryState = getActiveHistoryState();
  const previousScreen = getState().currentScreen;
  const direction = resolveNavigationDirection(screen, options.direction);
  const transitionKind = resolveTransitionKind(previousScreen, screen, options);
  const scrollStrategy = resolveScrollStrategy(direction, options);

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
    'privacy': 'Privacy Policy | FormMate',
    'terms': 'Terms of Service | FormMate',
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

  const departingSeq = options.historySync === 'skip' && options.source === 'browser'
    ? historySequence
    : departingHistoryState?.seq;

  if (departingSeq != null) {
    captureScrollState(departingSeq, currentWrapper);
  }

  const { html, init } = routes[screen]();
  if (!html && !init) return;

  const nextHistoryState = syncHistoryState(
    screen,
    path,
    replace,
    previousScreen,
    options.historySync,
    options.incomingHistoryState,
  );

  setState({ currentScreen: screen });

  const mountScreen = (wrapper: HTMLElement | null) => {
    if (!wrapper) {
      return null;
    }

    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    if (init) {
      currentCleanup = init(wrapper) || null;
    }
    return wrapper;
  };

  const renderNextScreen = () => {
    const nextWrapper = createRouteWrapper(screen, html);
    app.replaceChildren(nextWrapper);
    return mountScreen(nextWrapper);
  };

  const shouldAnimate = Boolean(currentWrapper && previousScreen);

  if (!shouldAnimate) {
    const mountedWrapper = renderNextScreen();
    const strategy = transitionKind === 'shell' ? 'top' : scrollStrategy;
    const mainScrollRegion = mountedWrapper?.querySelector?.('[data-fm-scroll-region="main"]') as HTMLElement | null;
    if (strategy !== 'preserve') {
      window.scrollTo(0, 0);
      if (mainScrollRegion) {
        mainScrollRegion.scrollTop = 0;
      }
    }
    return;
  }

  applyNavigationTransition({
    kind: transitionKind,
    direction,
    scrollKey: nextHistoryState?.seq ?? historySequence,
    scrollStrategy: transitionKind === 'shell' ? 'top' : scrollStrategy,
    update: renderNextScreen,
  });
}

export function initRouter() {
  window.addEventListener('popstate', (e: PopStateEvent) => {
    const nextState = e.state as RouterHistoryState | null;
    const direction: NavigationDirection = nextState?.seq != null && nextState.seq < historySequence ? 'back' : 'forward';
    const currentScreen = getState().currentScreen;

    if (nextState?.screen) {
      navigateTo(nextState.screen, {
        replace: true,
        direction,
        source: 'browser',
        transition: 'auto',
        scroll: 'restore',
        historySync: 'skip',
        incomingHistoryState: nextState,
      });
    } else if (currentScreen === 'privacy' || currentScreen === 'terms') {
      navigateTo('docs', {
        replace: true,
        direction: 'back',
        source: 'browser',
        transition: 'page',
        scroll: 'top',
      });
    } else {
      const homeScreen = getHomeScreenForUser();
      navigateTo(homeScreen, {
        replace: true,
        direction: 'back',
        source: 'browser',
        transition: 'page',
        scroll: 'top',
      });
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
    navigateTo(PUBLIC_SCREENS.includes(initialScreen) ? initialScreen : 'auth', {
      replace: true,
      direction: 'forward',
      source: 'app',
      transition: 'page',
      scroll: 'top',
    });
  } else if (!onboarded) {
    navigateTo(initialScreen === 'capture' ? 'capture' : 'onboarding', {
      replace: true,
      direction: 'forward',
      source: 'app',
      transition: 'page',
      scroll: 'top',
    });
  } else if (initialScreen === 'landing' || initialScreen === 'auth') {
    navigateTo('dashboard', {
      replace: true,
      direction: 'forward',
      source: 'app',
      transition: 'page',
      scroll: 'top',
    });
  } else if (routes[initialScreen]) {
    navigateTo(initialScreen, {
      replace: true,
      direction: 'forward',
      source: 'app',
      transition: 'page',
      scroll: 'top',
    });
  } else {
    navigateTo('dashboard', {
      replace: true,
      direction: 'forward',
      source: 'app',
      transition: 'page',
      scroll: 'top',
    });
  }
}

export function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo(getHomeScreenForUser(), {
      replace: true,
      direction: 'back',
      source: 'browser',
      transition: 'page',
      scroll: 'restore',
    });
  }
}
