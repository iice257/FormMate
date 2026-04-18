// @ts-nocheck
import { signOut, isAuthenticated, onAuthStateChange } from './auth-service';
import { navigateTo } from '../router';
import { setState } from '../state';
import { clearSensitiveSessionCache } from '../storage/local-store';
import { toast } from '../components/toast';

export const SESSION_CLOSED_EVENT = 'formmate:session-closed';
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const LAST_ACTIVITY_KEY = 'formmate_last_activity_at';
const LAST_TICK_MIN_WRITE_MS = 4000;

let lifecycleStarted = false;
let idleTimer = null;
let expiring = false;
let unlistenAuth = null;
let removeActivityHandlers = null;
let lastWriteAt = 0;

function getSessionStorageSafe() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLastActivity() {
  const storage = getSessionStorageSafe();
  if (!storage) return 0;
  const raw = storage.getItem(LAST_ACTIVITY_KEY);
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function setLastActivity(ts = Date.now()) {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  try {
    storage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch {
    // Ignore storage failures.
  }
}

function clearLastActivity() {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  try {
    storage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function emitSessionClosed(reason) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_CLOSED_EVENT, {
    detail: { reason: String(reason || 'session_closed') },
  }));
}

async function expireSession(reason = 'idle_timeout') {
  if (expiring) return;
  if (!isAuthenticated()) {
    clearSensitiveSessionCache();
    clearLastActivity();
    emitSessionClosed(reason);
    return;
  }

  expiring = true;
  clearTimeout(idleTimer);
  idleTimer = null;

  try {
    await signOut();
  } catch (error) {
    console.warn('[SessionLifecycle] Sign-out during expiry failed:', error);
  } finally {
    clearSensitiveSessionCache();
    clearLastActivity();
    setState({
      isAuthenticated: false,
      authUser: null,
      currentScreen: 'auth',
    });
    emitSessionClosed(reason);
    navigateTo('auth', true);
    toast.warning('Session ended after 15 minutes of inactivity. Sign in to continue.');
    expiring = false;
  }
}

function scheduleIdleTimer() {
  clearTimeout(idleTimer);
  if (!isAuthenticated()) return;

  const idleFor = Date.now() - getLastActivity();
  if (idleFor >= SESSION_IDLE_TIMEOUT_MS) {
    void expireSession('stale_reload');
    return;
  }

  const msLeft = Math.max(1000, SESSION_IDLE_TIMEOUT_MS - idleFor);
  idleTimer = window.setTimeout(() => {
    void expireSession('idle_timeout');
  }, msLeft);
}

function touchActivity() {
  if (!isAuthenticated()) return;
  const now = Date.now();
  if (now - lastWriteAt >= LAST_TICK_MIN_WRITE_MS) {
    setLastActivity(now);
    lastWriteAt = now;
  }
  scheduleIdleTimer();
}

function bindActivityHandlers() {
  if (typeof window === 'undefined') return () => {};
  const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'focus', 'mousemove'];
  const handler = () => touchActivity();

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, handler, { passive: true });
  });
  document.addEventListener('visibilitychange', handler, { passive: true });

  return () => {
    activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, handler);
    });
    document.removeEventListener('visibilitychange', handler);
  };
}

function handleAuthChange(session) {
  const authed = Boolean(session?.isAuthenticated && session?.user?.id);
  if (!authed) {
    clearTimeout(idleTimer);
    idleTimer = null;
    clearSensitiveSessionCache();
    clearLastActivity();
    return;
  }

  const now = Date.now();
  const lastActivity = getLastActivity();
  if (!lastActivity) {
    setLastActivity(now);
  } else if (now - lastActivity >= SESSION_IDLE_TIMEOUT_MS) {
    void expireSession('stale_reload');
    return;
  }

  scheduleIdleTimer();
}

export function initSessionLifecycle() {
  if (lifecycleStarted || typeof window === 'undefined') return () => {};
  lifecycleStarted = true;

  unlistenAuth = onAuthStateChange((session) => {
    handleAuthChange(session);
  });
  removeActivityHandlers = bindActivityHandlers();

  // If the app was re-opened after idle timeout and still has stale state,
  // expire immediately on boot.
  if (isAuthenticated() && Date.now() - getLastActivity() >= SESSION_IDLE_TIMEOUT_MS) {
    void expireSession('stale_reload');
  } else if (isAuthenticated()) {
    touchActivity();
  }

  return () => {
    clearTimeout(idleTimer);
    idleTimer = null;
    unlistenAuth?.();
    unlistenAuth = null;
    removeActivityHandlers?.();
    removeActivityHandlers = null;
    lifecycleStarted = false;
  };
}
