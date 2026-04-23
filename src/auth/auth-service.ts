// @ts-nocheck
import { load, remove, clearSensitiveSessionCache } from '../storage/local-store';
import { ensureAccountData, deleteRemoteUserData, hydrateFromRemote, isSupabaseStorageConfigured } from '../storage/storage-provider';
import { getAuthRedirectUrl, getSupabaseClient, isSupabaseConfigured } from './supabase-client';

const AUTH_KEY = 'auth_session';
const DEV_TEST_USERS = [
  {
    id: 'dev-admin',
    email: 'dev@formmate.test',
    password: 'password',
    name: 'Dev Admin',
  },
];
const DEV_SESSION = {
  user: {
    id: 'dev_user_admin',
    email: DEV_TEST_USERS[0].email,
    name: DEV_TEST_USERS[0].name,
    provider: 'email',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(DEV_TEST_USERS[0].name)}&background=2298da&color=fff&bold=true`,
  },
  isAuthenticated: true,
  provider: 'email',
  access_token: 'dev-access-token',
  refresh_token: 'dev-refresh-token',
  expires_at: null,
  expires_in: null,
  token_type: 'bearer',
  createdAt: Date.now(),
  devOnly: true,
};

const authListeners = new Set();
let authBootstrapStarted = false;
let authBootstrapPromise = null;
let inMemorySession = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getSessionStorage() {
  if (!isBrowser() || typeof window.sessionStorage === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredSession() {
  if (!isBrowser()) return inMemorySession;

  const sessionStorageRef = getSessionStorage();
  const sessionStorageKey = `formmate_${AUTH_KEY}`;

  if (sessionStorageRef) {
    try {
      const raw = sessionStorageRef.getItem(sessionStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemorySession = parsed?.value ?? parsed ?? null;
        return inMemorySession;
      }
    } catch (error) {
      console.warn('[Auth] Failed to parse session storage cache:', error);
      sessionStorageRef.removeItem(sessionStorageKey);
    }
  }

  const legacySession = load(AUTH_KEY);
  if (legacySession) {
    writeStoredSession(legacySession);
    remove(AUTH_KEY);
    return legacySession;
  }

  return inMemorySession;
}

function writeStoredSession(session) {
  inMemorySession = session || null;

  if (!isBrowser()) return;

  const sessionStorageRef = getSessionStorage();
  const sessionStorageKey = `formmate_${AUTH_KEY}`;

  if (sessionStorageRef) {
    try {
      if (!session) {
        sessionStorageRef.removeItem(sessionStorageKey);
        remove(AUTH_KEY);
      } else {
        sessionStorageRef.setItem(sessionStorageKey, JSON.stringify({
          value: session,
          timestamp: Date.now(),
          ttl: null,
        }));
      }
      return;
    } catch (error) {
      console.warn('[Auth] Failed to write session storage cache:', error);
    }
  }

  remove(AUTH_KEY);
}

export function isDevAuthEnabled() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return Boolean(import.meta.env.DEV) || host === 'localhost' || host === '127.0.0.1';
}

export function getDevTestUsers() {
  if (!isDevAuthEnabled()) return [];
  return DEV_TEST_USERS.map(({ id, email, name }) => ({
    id,
    email,
    name,
  }));
}

export function getSession() {
  return readStoredSession();
}

export function isAuthenticated() {
  const session = getSession();
  return Boolean(session?.isAuthenticated && session?.user?.id);
}

export function getCurrentUser() {
  return getSession()?.user || null;
}

export function getRequestAuthHeaders() {
  const session = getSession();
  const headers = {};

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (session?.devOnly && isDevAuthEnabled()) {
    headers['X-FormMate-Dev-Auth'] = '1';
  }

  return headers;
}

export function onAuthStateChange(fn) {
  authListeners.add(fn);
  fn(getSession());
  return () => authListeners.delete(fn);
}

function notifyListeners(session) {
  authListeners.forEach((fn) => fn(session));
}

function clearLocalAccountCache() {
  clearSensitiveSessionCache();
  const sessionStorageRef = getSessionStorage();
  if (sessionStorageRef) {
    try {
      sessionStorageRef.removeItem('fm_chat_sessions');
      sessionStorageRef.removeItem('formmate_docs_chat_state');
    } catch {
      // Ignore storage failures while clearing cache.
    }
  }
}

function normalizeSession(session) {
  const user = session?.user || {};
  const metadata = user.user_metadata || {};
  const name = String(metadata.name || metadata.full_name || metadata.fullName || user.name || user.email || 'User').trim();
  const avatar = metadata.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2298da&color=fff&bold=true`;

  return {
    ...session,
    isAuthenticated: true,
    user: {
      ...user,
      name,
      email: user.email || '',
      avatar,
      provider: user.app_metadata?.provider || user.app_metadata?.providers?.[0] || session?.provider || 'email',
    },
    createdAt: session?.createdAt || Date.now(),
  };
}

function authError(message, code = 'AUTH_UNAVAILABLE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) {
    throw authError(
      'Cloud sign-in is temporarily unavailable. Please try again shortly.',
      'SUPABASE_NOT_CONFIGURED',
    );
  }
  return client;
}

async function hydrateAccountData(session, { seedIfMissing = true } = {}) {
  if (!session?.user?.id || !isSupabaseStorageConfigured()) return null;

  try {
    const remote = await hydrateFromRemote(session.user, { seedIfMissing, session });
    if (remote) return remote;

    if (!seedIfMissing) return null;

    return ensureAccountData(session, { seedIfMissing: true });
  } catch (error) {
    console.warn('[Auth] Failed to hydrate account data:', error);
    return null;
  }
}

function storeSession(session) {
  if (!session) {
    writeStoredSession(null);
    notifyListeners(null);
    return null;
  }

  const normalized = normalizeSession(session);
  writeStoredSession(normalized);
  notifyListeners(normalized);
  return normalized;
}

function clearOAuthUrlArtifacts() {
  if (!isBrowser()) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('code') || url.searchParams.has('error_description') || url.searchParams.has('error')) {
      url.searchParams.delete('code');
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
    }
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  } catch (error) {
    console.warn('[Auth] Failed to clear OAuth artifacts:', error);
  }
}

function parseHashSession() {
  if (!isBrowser() || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get('expires_in') || '0') || null,
    expires_at: params.get('expires_at') ? Number(params.get('expires_at')) : null,
    token_type: params.get('token_type') || 'bearer',
  };
}

async function restoreSessionFromUrl() {
  if (!isBrowser()) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (error) {
    throw authError(error, 'OAUTH_ERROR');
  }

  if (code) {
    const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code, getAuthRedirectUrl());
    if (exchangeError) throw exchangeError;
    const session = data?.session || null;
    if (session) {
      clearOAuthUrlArtifacts();
      return normalizeSession(session);
    }
  }

  const fragmentSession = parseHashSession();
  if (fragmentSession) {
    const user = await client.auth.getUser(fragmentSession.access_token);
    const session = normalizeSession({
      ...fragmentSession,
      user: user?.user || user || {},
    });
    clearOAuthUrlArtifacts();
    return session;
  }

  return null;
}

async function bootstrapSession() {
  if (authBootstrapPromise) return authBootstrapPromise;
  authBootstrapPromise = bootstrapSessionInternal();
  return authBootstrapPromise;
}

async function bootstrapSessionInternal() {
  if (authBootstrapStarted || !isBrowser()) return getSession();
  authBootstrapStarted = true;

  try {
    const sessionFromUrl = await restoreSessionFromUrl();
    if (sessionFromUrl) {
      storeSession(sessionFromUrl);
      await hydrateAccountData(sessionFromUrl, { seedIfMissing: true });
      return sessionFromUrl;
    }

    const cachedSession = getSession();
    if (cachedSession?.user?.id) {
      storeSession(cachedSession);
      await hydrateAccountData(cachedSession, { seedIfMissing: true });
      return cachedSession;
    }
  } catch (error) {
    console.warn('[Auth] Supabase session bootstrap failed:', error);
  }

  return getSession();
}

void bootstrapSession();

export function ensureAuthBootstrapped() {
  return bootstrapSession();
}

export async function signUp(email, password, name = '') {
  if (!email || !password) {
    throw authError('Email and password are required.', 'INVALID_CREDENTIALS');
  }

  await delay(250);

  const client = getClientOrThrow();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: String(name || '').trim() || undefined,
      },
    },
  });

  if (error) throw error;
  if (!data?.session) {
    throw authError('Check your email to confirm your account, then sign in again.', 'EMAIL_CONFIRMATION_REQUIRED');
  }

  const session = normalizeSession(data.session);
  storeSession(session);
  await hydrateAccountData(session, { seedIfMissing: true });

  if (String(name || '').trim()) {
    try {
      await client.auth.updateUser({ accessToken: session.access_token, data: { name: String(name || '').trim() } });
    } catch (updateError) {
      console.warn('[Auth] Could not persist display name metadata:', updateError);
    }
  }

  return session;
}

export async function startOtpSignUp(email, password, name = '') {
  if (!email || !password) {
    throw authError('Email and password are required.', 'INVALID_CREDENTIALS');
  }

  if (password.length < 6) {
    throw authError('Password must be at least 6 characters.', 'INVALID_CREDENTIALS');
  }

  await delay(250);

  const client = getClientOrThrow();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        name: String(name || '').trim() || undefined,
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;

  return {
    email,
    name: String(name || '').trim(),
  };
}

export async function verifyOtpSignUp(email, token, { password = '', name = '' } = {}) {
  if (!email || !token) {
    throw authError('Email and verification code are required.', 'INVALID_OTP');
  }

  await delay(150);

  const client = getClientOrThrow();
  const normalizedToken = String(token || '').replace(/\D/g, '');
  const { data, error } = await client.auth.verifyOtp({
    email,
    token: normalizedToken,
    type: 'email',
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
  if (!data?.session) {
    throw authError('The verification code was accepted, but no session was returned.', 'AUTH_SESSION_MISSING');
  }

  const session = normalizeSession(data.session);
  storeSession(session);

  if (password || String(name || '').trim()) {
    try {
      const updatePayload = {};
      if (password) updatePayload.password = password;
      if (String(name || '').trim()) updatePayload.data = { name: String(name || '').trim() };
      await client.auth.updateUser({ accessToken: session.access_token, ...updatePayload });
    } catch (updateError) {
      console.warn('[Auth] Could not finalize OTP account metadata/password:', updateError);
    }
  }

  await hydrateAccountData(session, { seedIfMissing: true });
  return session;
}

export async function resendOtpSignUp(email, name = '') {
  if (!email) {
    throw authError('Email is required.', 'INVALID_CREDENTIALS');
  }

  const client = getClientOrThrow();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        name: String(name || '').trim() || undefined,
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
  return { email };
}

export async function signIn(email, password) {
  if (!email || !password) {
    throw authError('Email and password are required.', 'INVALID_CREDENTIALS');
  }

  await delay(200);

  const devUser = resolveDevTestUser(email, password);
  if (devUser) {
    return signInWithDevTestUser(devUser.id);
  }

  const client = getClientOrThrow();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data?.session) {
    throw authError('Unable to establish an authenticated session.', 'AUTH_SESSION_MISSING');
  }

  const session = normalizeSession(data.session);
  storeSession(session);
  await hydrateAccountData(session, { seedIfMissing: true });
  return session;
}

export async function signInWithGoogle() {
  const client = getClientOrThrow();
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data?.url) throw authError('Google sign-in could not start.', 'OAUTH_URL_MISSING');

  window.location.assign(data.url);
  return new Promise(() => {});
}

export async function signInWithDevTestUser(userId = DEV_TEST_USERS[0]?.id) {
  if (!isDevAuthEnabled()) {
    throw authError('Dev test access is only available in local development.', 'DEV_AUTH_DISABLED');
  }

  const devUser = DEV_TEST_USERS.find((user) => user.id === userId);
  if (!devUser) {
    throw authError('The selected dev test user is unavailable.', 'DEV_TEST_USER_MISSING');
  }

  await delay(150);

  const session = normalizeSession({
    ...DEV_SESSION,
    createdAt: Date.now(),
    user: {
      ...DEV_SESSION.user,
      email: devUser.email,
      name: devUser.name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(devUser.name)}&background=2298da&color=fff&bold=true`,
    },
  });

  storeSession(session);
  await hydrateAccountData(session, { seedIfMissing: true });
  return session;
}

export async function signInWithApple() {
  throw authError('Apple sign-in is not supported in this release.', 'APPLE_UNSUPPORTED');
}

export async function signOut() {
  const session = getSession();
  writeStoredSession(null);
  clearSensitiveSessionCache();
  clearLocalAccountCache();
  notifyListeners(null);

  const client = getSupabaseClient();
  if (client && session?.access_token) {
    await client.auth.signOut(session.access_token).catch((error) => {
      console.warn('[Auth] Supabase sign-out failed:', error);
    });
  }
}

export async function resetPassword(email) {
  if (!email) {
    throw authError('Email is required.', 'INVALID_CREDENTIALS');
  }

  const client = getClientOrThrow();
  const redirectTo = getAuthRedirectUrl();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;
  return { message: 'Password reset link sent to your email.' };
}

export async function updatePassword(email, newPassword) {
  if (!newPassword) {
    throw authError('A new password is required.', 'INVALID_CREDENTIALS');
  }

  const session = getSession();
  if (!session?.user?.id) {
    throw authError('You must be signed in to update your password.', 'AUTH_REQUIRED');
  }

  if (email && session.user.email && email !== session.user.email) {
    throw authError('Password updates must target the signed-in account.', 'ACCOUNT_MISMATCH');
  }

  const client = getClientOrThrow();
  const { error } = await client.auth.updateUser({ accessToken: session.access_token, password: newPassword });
  if (error) throw error;
  return { message: 'Password updated.' };
}

export async function deleteAccount() {
  const session = getSession();
  if (!session?.user?.id) return;

  try {
    await deleteRemoteUserData(session.user.id);
  } catch (error) {
    console.warn('[Auth] Failed to delete remote app data:', error);
  }

  const client = getSupabaseClient();
  if (client && session?.access_token) {
    await client.auth.signOut(session.access_token).catch((error) => {
      console.warn('[Auth] Supabase sign-out during deleteAccount failed:', error);
    });
  }

  writeStoredSession(null);
  clearSensitiveSessionCache();
  clearLocalAccountCache();
  notifyListeners(null);
}

export async function refreshSupabaseSession() {
  const session = getSession();
  const client = getSupabaseClient();
  if (!client || !session?.refresh_token) return null;

  const { data, error } = await client.auth.refreshSession(session.refresh_token);
  if (error) throw error;

  const nextSession = data?.session || null;
  if (nextSession) {
    const normalized = storeSession(nextSession);
    await hydrateAccountData(normalized, { seedIfMissing: true });
    return normalized;
  }

  writeStoredSession(null);
  notifyListeners(null);
  return null;
}

export async function ensureSignedInAccountData() {
  const session = getSession();
  if (!session?.user?.id) return null;
  return hydrateAccountData(session, { seedIfMissing: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDevTestUser(email, password) {
  if (!isDevAuthEnabled()) return null;

  return DEV_TEST_USERS.find((user) => {
    return user.email.toLowerCase() === String(email || '').trim().toLowerCase() && user.password === password;
  }) || null;
}
