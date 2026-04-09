// @ts-nocheck
import { save, load, remove } from '../storage/local-store';
import { ensureAccountData, deleteRemoteUserData, hydrateFromRemote, isSupabaseStorageConfigured } from '../storage/storage-provider';
import { getAuthRedirectUrl, getSupabaseClient, isSupabaseConfigured } from './supabase-client';

const AUTH_KEY = 'auth_session';
const DEV_TEST_PASSWORD = 'password';
const DEV_SESSION = {
  user: {
    id: 'dev_user_admin',
    email: 'dev@formmate.ai',
    name: 'Dev Admin',
    provider: 'email',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Dev Admin')}&background=2298da&color=fff&bold=true`,
    tier: 'monthly',
  },
  isAuthenticated: true,
  tier: 'monthly',
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

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function isDevAuthEnabled() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return Boolean(import.meta.env.DEV) || host === 'localhost' || host === '127.0.0.1';
}

export function getDevTestUsers() {
  if (!isDevAuthEnabled()) return [];
  return [
    { email: 'dev', name: 'Dev Admin', tier: 'monthly' }
  ];
}

export function getSession() {
  if (!isBrowser()) return null;
  return load(AUTH_KEY);
}

export function isAuthenticated() {
  const session = getSession();
  return Boolean(session?.isAuthenticated && session?.user?.id);
}

export function getCurrentUser() {
  return getSession()?.user || null;
}

export function onAuthStateChange(fn) {
  authListeners.add(fn);
  fn(getSession());
  return () => authListeners.delete(fn);
}

function notifyListeners(session) {
  authListeners.forEach((fn) => fn(session));
}

function normalizeSession(session) {
  const user = session?.user || {};
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const name = String(metadata.name || metadata.full_name || metadata.fullName || user.name || user.email || 'User').trim();
  const tier = appMetadata.tier || metadata.tier || session?.tier || 'free';
  const avatar = metadata.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2298da&color=fff&bold=true`;

  return {
    ...session,
    isAuthenticated: true,
    tier,
    user: {
      ...user,
      name,
      email: user.email || '',
      avatar,
      tier,
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
    throw authError('Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
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
  if (!isBrowser()) return session;
  if (!session) {
    remove(AUTH_KEY);
    notifyListeners(null);
    return null;
  }

  const normalized = normalizeSession(session);
  save(AUTH_KEY, normalized);
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
  if (authBootstrapStarted || !isBrowser()) return;
  authBootstrapStarted = true;

  try {
    const sessionFromUrl = await restoreSessionFromUrl();
    if (sessionFromUrl) {
      storeSession(sessionFromUrl);
      await hydrateAccountData(sessionFromUrl, { seedIfMissing: true });
      return;
    }

    const cachedSession = getSession();
    if (cachedSession?.user?.id) {
      storeSession(cachedSession);
      await hydrateAccountData(cachedSession, { seedIfMissing: true });
    }
  } catch (error) {
    console.warn('[Auth] Supabase session bootstrap failed:', error);
  }
}

void bootstrapSession();

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

export async function signIn(email, password) {
  if (!email || !password) {
    throw authError('Email and password are required.', 'INVALID_CREDENTIALS');
  }

  await delay(200);

  if (isDevAuthEnabled() && email === 'dev' && password === 'dev') {
    const session = { ...DEV_SESSION, createdAt: Date.now() };
    storeSession(session);
    await hydrateAccountData(session, { seedIfMissing: true });
    return session;
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

export async function signInWithApple() {
  throw authError('Apple sign-in is not supported in this release.', 'APPLE_UNSUPPORTED');
}

export async function signOut() {
  const session = getSession();
  remove(AUTH_KEY);
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

  remove(AUTH_KEY);
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

  remove(AUTH_KEY);
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
