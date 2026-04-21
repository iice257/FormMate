export type NavigationDirection = 'forward' | 'back';
export type NavigationTransitionKind = 'page' | 'shell';
export type ScrollStrategy = 'top' | 'restore' | 'preserve';

type ScrollSnapshot = {
  windowY: number;
  mainTop: number;
};

type TransitionHandle = {
  finished?: Promise<unknown>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => TransitionHandle;
};

type ApplyNavigationTransitionOptions = {
  kind: NavigationTransitionKind;
  direction: NavigationDirection;
  scrollKey: number;
  scrollStrategy: ScrollStrategy;
  update: () => HTMLElement | null;
};

const scrollMemory = new Map<number, ScrollSnapshot>();
let activeTransitionToken = 0;

const PAGE_TRANSITION_MS = 280;
const SHELL_TRANSITION_MS = 220;
const PANEL_TRANSITION_MS = 200;
const PREMIUM_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getHtmlRoot() {
  return document.documentElement;
}

function getWindowScrollTop() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

function getPrimaryScrollRegion(scope: ParentNode | null) {
  return scope?.querySelector?.('[data-fm-scroll-region="main"]') as HTMLElement | null;
}

function setTransitionDataset(kind: NavigationTransitionKind, direction: NavigationDirection) {
  activeTransitionToken += 1;
  const html = getHtmlRoot();
  html.dataset.fmNavTransition = kind === 'shell' ? 'shell' : `page-${direction}`;
  return activeTransitionToken;
}

function clearTransitionDataset(token?: number) {
  if (typeof token === 'number' && token !== activeTransitionToken) {
    return;
  }

  delete getHtmlRoot().dataset.fmNavTransition;
}

function shouldUseViewTransitions() {
  return !prefersReducedMotion() && typeof (document as DocumentWithViewTransition).startViewTransition === 'function';
}

function animateElement(
  element: Element | null | undefined,
  keyframes: Keyframe[],
  duration: number,
  easing = PREMIUM_EASING,
) {
  if (!element || prefersReducedMotion() || typeof (element as HTMLElement).animate !== 'function') {
    return;
  }

  (element as HTMLElement).animate(keyframes, {
    duration,
    easing,
    fill: 'both',
  });
}

function playFallbackAnimation(
  root: HTMLElement | null,
  kind: NavigationTransitionKind,
  direction: NavigationDirection,
) {
  if (!root || prefersReducedMotion()) {
    return;
  }

  if (kind === 'page') {
    const xOffset = direction === 'back' ? -28 : 28;
    animateElement(
      root,
      [
        {
          opacity: 0,
          filter: 'blur(10px)',
          transform: `translate3d(${xOffset}px, 0, 0)`,
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          transform: 'translate3d(0, 0, 0)',
        },
      ],
      PAGE_TRANSITION_MS,
    );
    return;
  }

  const main = root.querySelector('[data-fm-transition-main="true"]');
  const panel = root.querySelector('[data-fm-transition-panel="true"]');

  animateElement(
    main,
    [
      {
        opacity: 0,
        filter: 'blur(8px)',
        transform: 'translate3d(0, 14px, 0)',
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        transform: 'translate3d(0, 0, 0)',
      },
    ],
    SHELL_TRANSITION_MS,
  );

  animateElement(
    panel,
    [
      {
        opacity: 0,
        filter: 'blur(8px)',
        transform: 'translate3d(0, 0, 0)',
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        transform: 'translate3d(0, 0, 0)',
      },
    ],
    PANEL_TRANSITION_MS,
  );
}

function applyScrollPosition(windowY: number, mainTop: number, root: ParentNode | null) {
  const primaryScrollRegion = getPrimaryScrollRegion(root);

  if (primaryScrollRegion) {
    primaryScrollRegion.scrollTop = mainTop;
  }

  window.scrollTo(0, windowY);
}

function restoreScrollState(scrollKey: number, strategy: ScrollStrategy, root: ParentNode | null) {
  if (strategy === 'preserve') {
    return;
  }

  const snapshot = strategy === 'restore' ? scrollMemory.get(scrollKey) : null;
  const windowY = snapshot?.windowY ?? 0;
  const mainTop = snapshot?.mainTop ?? 0;

  applyScrollPosition(windowY, mainTop, root);
  requestAnimationFrame(() => {
    applyScrollPosition(windowY, mainTop, root);
  });
}

export function captureScrollState(scrollKey: number, root: ParentNode | null) {
  if (scrollKey < 0) {
    return;
  }

  const primaryScrollRegion = getPrimaryScrollRegion(root);

  scrollMemory.set(scrollKey, {
    windowY: getWindowScrollTop(),
    mainTop: primaryScrollRegion?.scrollTop ?? 0,
  });
}

export function applyNavigationTransition({
  kind,
  direction,
  scrollKey,
  scrollStrategy,
  update,
}: ApplyNavigationTransitionOptions) {
  const performUpdate = () => {
    const mountedRoot = update();
    restoreScrollState(scrollKey, scrollStrategy, mountedRoot);
    return mountedRoot;
  };

  if (!shouldUseViewTransitions()) {
    activeTransitionToken += 1;
    clearTransitionDataset();
    const mountedRoot = performUpdate();
    playFallbackAnimation(mountedRoot, kind, direction);
    return;
  }

  const transitionToken = setTransitionDataset(kind, direction);

  const transition = (document as DocumentWithViewTransition).startViewTransition?.(() => {
    performUpdate();
  });

  transition?.finished?.finally(() => {
    clearTransitionDataset(transitionToken);
  });
}
