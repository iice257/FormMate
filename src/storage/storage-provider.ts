// @ts-nocheck
import { loadProfile, saveProfile, loadSettings, saveSettings, loadVault, saveVault, loadFormHistory, save, load, getDefaultSettings } from './local-store';

let _remoteProvider = null;
let _remoteInitAttempted = false;

let _pendingByUser = new Map(); // userId -> patch
let _flushTimer = null;

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
  return Boolean(String(getEnv('VITE_SUPABASE_URL') || '').trim() && String(getEnv('VITE_SUPABASE_ANON_KEY') || '').trim());
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
  const supabaseAnonKey = String(getEnv('VITE_SUPABASE_ANON_KEY') || '').trim();
  const table = String(getEnv('VITE_SUPABASE_TABLE') || 'formmate_user_data').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[StorageProvider] Supabase mode selected but missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY. Falling back to local.');
    return null;
  }

  try {
    const { SupabaseStorageProvider } = await import('./providers/supabase-storage-provider');
    _remoteProvider = new SupabaseStorageProvider({
      supabaseUrl,
      supabaseAnonKey,
      table,
      getAccessToken: () => load('auth_session')?.access_token || null,
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
  const session = options.session || load('auth_session') || null;

  try {
    const remote = await provider.getUserData(userId);
    if (!remote) {
      if (!seedIfMissing) return null;
      const seeded = buildInitialRemoteData(session);
      await provider.upsertUserData(userId, seeded);
      return {
        userProfile: seeded.profile,
        settings: seeded.settings,
        vault: seeded.vault,
        formHistory: seeded.formHistory,
      };
    }

    if (remote.profile !== null && remote.profile !== undefined) saveProfile(remote.profile);
    if (remote.settings !== null && remote.settings !== undefined) saveSettings(remote.settings);
    if (remote.vault !== null && remote.vault !== undefined) saveVault(remote.vault);
    if (remote.formHistory !== null && remote.formHistory !== undefined) save('form_history', remote.formHistory);

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

  if (_flushTimer) return;
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    const provider = await initRemoteProvider();
    if (!provider) {
      _pendingByUser.clear();
      return;
    }

    const entries = Array.from(_pendingByUser.entries());
    _pendingByUser.clear();

    await Promise.allSettled(entries.map(([id, p]) => provider.upsertUserData(id, p)));
  }, 800);
}

