// @ts-nocheck
import { loadProfile, saveProfile, loadSettings, saveSettings, loadVault, saveVault, loadFormHistory, save, remove, getDefaultSettings } from './local-store';

let _remoteProvider = null;
let _remoteInitAttempted = false;

let _pendingByUser = new Map(); // userId -> patch
let _flushTimer = null;

function persistCachedUserData(data, user) {
  if (!data) return;
  if (data.profile !== undefined) {
    if (shouldPersistLocalAccountCache(user)) saveProfile(data.profile);
    else remove('user_profile');
  }
  if (data.settings !== undefined) saveSettings(data.settings);
  if (data.vault !== undefined) {
    if (shouldPersistLocalAccountCache(user)) saveVault(data.vault);
    else remove('user_vault');
  }
  if (data.formHistory !== undefined) {
    if (shouldPersistLocalAccountCache(user)) save('form_history', data.formHistory);
    else remove('form_history');
  }
}

function scheduleRemoteFlush(delayMs = 800) {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    void flushRemoteSyncQueue();
  }, delayMs);
}

async function flushRemoteSyncQueue() {
  _flushTimer = null;
  const provider = await initRemoteProvider();
  const entries = Array.from(_pendingByUser.entries());
  if (!entries.length) return;

  _pendingByUser.clear();

  if (!provider) {
    entries.forEach(([id, patch]) => {
      const existing = _pendingByUser.get(id) || {};
      _pendingByUser.set(id, { ...existing, ...patch });
    });
    scheduleRemoteFlush(2000);
    return;
  }

  const results = await Promise.allSettled(entries.map(([id, patch]) => provider.upsertUserData(id, patch)));
  const failures = [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      failures.push({
        userId: entries[index][0],
        patch: entries[index][1],
        error: result.reason,
      });
    }
  });

  if (!failures.length) return;

  failures.forEach(({ userId, patch }) => {
    const existing = _pendingByUser.get(userId) || {};
    _pendingByUser.set(userId, { ...existing, ...patch });
  });
  console.warn('[StorageProvider] Remote sync failed, queued for retry:', failures.map(({ userId, error }) => ({ userId, error })));
  scheduleRemoteFlush(2000);
}

function getEnv(key) {
  // Vite injects import.meta.env in the browser; in Node it may be undefined.
  return (import.meta?.env && key in import.meta.env) ? import.meta.env[key] : undefined;
}

export function getStorageMode() {
  const configured = isSupabaseStorageConfigured();
  const raw = String(getEnv('VITE_STORAGE_PROVIDER') || '').toLowerCase().trim();
  if (raw === 'supabase') return 'supabase';
  if (!raw && configured) return 'supabase';
  return 'local';
}

export function isSupabaseStorageConfigured() {
  return Boolean(
    String(getEnv('VITE_SUPABASE_URL') || '').trim() &&
    String(getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || '').trim()
  );
}

export function shouldPersistLocalAccountCache(user = null) {
  void user;
  // Sensitive account data is cached in sessionStorage for responsive UX,
  // even when remote Supabase sync is active.
  return true;
}

export function getCachedUserData() {
  return {
    profile: loadProfile(),
    settings: loadSettings(),
    vault: loadVault(),
    formHistory: loadFormHistory(),
  };
}

export async function initRemoteProvider() {
  if (_remoteInitAttempted) return _remoteProvider;
  _remoteInitAttempted = true;

  if (getStorageMode() !== 'supabase') return null;

  const supabaseUrl = String(getEnv('VITE_SUPABASE_URL') || '').trim();
  const supabaseAnonKey = String(getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || '').trim();
  const table = String(getEnv('VITE_SUPABASE_TABLE') || 'formmate_user_data').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[StorageProvider] Supabase mode selected but missing VITE_SUPABASE_URL and publishable key. Falling back to local.');
    return null;
  }

  try {
    const { SupabaseStorageProvider } = await import('./providers/supabase-storage-provider');
    _remoteProvider = new SupabaseStorageProvider({
      supabaseUrl,
      supabaseAnonKey,
      table,
      getAccessToken: async () => {
        try {
          const { getSession } = await import('../auth/auth-service');
          return getSession()?.access_token || null;
        } catch {
          return null;
        }
      },
    });
    return _remoteProvider;
  } catch (e) {
    console.warn('[StorageProvider] Failed to initialize Supabase provider. Falling back to local.', e);
    _remoteProvider = null;
    return null;
  }
}

function buildInitialRemoteData(session) {
  const user = session?.user || {};
  const name = String(
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.name ||
    user.email ||
    'User'
  ).trim();

  return {
    profile: {
      name,
      email: String(user.email || '').trim(),
      phone: '',
      occupation: '',
      bio: '',
      experience: '',
      commonInfo: {},
      avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2298da&color=fff&bold=true`,
      preferredTone: 'professional',
    },
    settings: getDefaultSettings(),
    vault: {},
    formHistory: [],
  };
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export async function hydrateFromRemote(user, options = {}) {
  const userId = user?.id;
  if (!isUuid(userId)) return null;
  const provider = await initRemoteProvider();
  if (!provider) return null;
  const seedIfMissing = options.seedIfMissing !== false;
  const session = options.session || null;

  try {
    const remote = await provider.getUserData(userId);
    if (!remote) {
      if (!seedIfMissing) return null;
      const seeded = buildInitialRemoteData(session);
      await provider.upsertUserData(userId, seeded);
      persistCachedUserData(seeded, user);
      return {
        userProfile: seeded.profile,
        settings: seeded.settings,
        vault: seeded.vault,
        formHistory: seeded.formHistory,
      };
    }

    if (remote.profile !== null && remote.profile !== undefined) {
      if (shouldPersistLocalAccountCache(user)) saveProfile(remote.profile);
      else remove('user_profile');
    }
    if (remote.settings !== null && remote.settings !== undefined) saveSettings(remote.settings);
    if (remote.vault !== null && remote.vault !== undefined) {
      if (shouldPersistLocalAccountCache(user)) saveVault(remote.vault);
      else remove('user_vault');
    }
    if (remote.formHistory !== null && remote.formHistory !== undefined) {
      if (shouldPersistLocalAccountCache(user)) save('form_history', remote.formHistory);
      else remove('form_history');
    }

    return {
      userProfile: remote.profile || loadProfile(),
      settings: remote.settings || loadSettings(),
      vault: remote.vault || loadVault(),
      formHistory: remote.formHistory || loadFormHistory(),
    };
  } catch (e) {
    console.warn('[StorageProvider] Remote hydration failed:', e);
    return null;
  }
}

export async function ensureAccountData(session, options = {}) {
  const user = session?.user || session;
  const userId = user?.id;
  if (!isUuid(userId)) return null;

  const provider = await initRemoteProvider();
  if (!provider) return null;

  try {
    const existing = await provider.getUserData(userId);
    if (existing) return existing;

    if (options.seedIfMissing === false) return null;

    const seeded = buildInitialRemoteData(session);
    await provider.upsertUserData(userId, seeded);
    persistCachedUserData(seeded, user);
    return seeded;
  } catch (error) {
    console.warn('[StorageProvider] Failed to ensure account data:', error);
    return null;
  }
}

export async function deleteRemoteUserData(userId) {
  if (!isUuid(userId)) return;
  const provider = await initRemoteProvider();
  if (!provider) return;

  try {
    await provider.deleteUserData(userId);
  } catch (error) {
    console.warn('[StorageProvider] Failed to delete remote user data:', error);
  }
}

export function queueRemoteSync(user, patch) {
  const userId = user?.id;
  if (!isUuid(userId)) return;
  if (getStorageMode() !== 'supabase') return;

  const existing = _pendingByUser.get(userId) || {};
  _pendingByUser.set(userId, { ...existing, ...patch });
  scheduleRemoteFlush();
}

