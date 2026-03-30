// @ts-nocheck
import { loadProfile, saveProfile, loadSettings, saveSettings, loadVault, saveVault, loadFormHistory, save } from './local-store';

let _remoteProvider = null;
let _remoteInitAttempted = false;

let _pendingByUser = new Map(); // userId -> patch
let _flushTimer = null;

function getEnv(key) {
  // Vite injects import.meta.env in the browser; in Node it may be undefined.
  return (import.meta?.env && key in import.meta.env) ? import.meta.env[key] : undefined;
}

export function getStorageMode() {
  const mode = String(getEnv('VITE_STORAGE_PROVIDER') || 'local').toLowerCase().trim();
  return mode === 'supabase' ? 'supabase' : 'local';
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
    _remoteProvider = new SupabaseStorageProvider({ supabaseUrl, supabaseAnonKey, table });
    return _remoteProvider;
  } catch (e) {
    console.warn('[StorageProvider] Failed to initialize Supabase provider. Falling back to local.', e);
    _remoteProvider = null;
    return null;
  }
}

export async function hydrateFromRemote(user) {
  const userId = user?.id;
  if (!userId) return null;
  const provider = await initRemoteProvider();
  if (!provider) return null;

  try {
    const remote = await provider.getUserData(userId);
    if (!remote) return null;

    if (remote.profile) saveProfile(remote.profile);
    if (remote.settings) saveSettings(remote.settings);
    if (remote.vault) saveVault(remote.vault);
    if (remote.formHistory) save('form_history', remote.formHistory);

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

export function queueRemoteSync(user, patch) {
  const userId = user?.id;
  if (!userId) return;
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

