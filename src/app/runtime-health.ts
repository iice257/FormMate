// @ts-nocheck
import { getRequestAuthHeaders } from '../auth/auth-service';
import { isSupabaseStorageConfigured } from '../storage/storage-provider';

function fallbackHealth() {
  const supabaseConfigured = isSupabaseStorageConfigured();
  const storageMode = supabaseConfigured ? 'supabase' : 'local';
  const authAvailable = supabaseConfigured;
  const syncAvailable = storageMode === 'supabase' && supabaseConfigured;
  return {
    loaded: true,
    apiReachable: false,
    groqConfigured: false,
    supabaseConfigured,
    authAvailable,
    syncAvailable,
    storageMode,
    imageParserConfigured: false,
    degradedMode: false,
  };
}

export async function loadRuntimeHealth() {
  const fallback = fallbackHealth();

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        ...getRequestAuthHeaders(),
      },
      cache: 'no-store',
    });

    if (!response.ok) return fallback;
    const payload = await response.json().catch(() => null);
    const config = payload?.config || {};

    return {
      loaded: true,
      apiReachable: Boolean(payload?.apiReachable ?? config.apiReachable ?? true),
      groqConfigured: Boolean(payload?.groqConfigured ?? config.groqConfigured),
      supabaseConfigured: Boolean(payload?.supabaseConfigured ?? config.supabaseConfigured),
      authAvailable: Boolean(payload?.authAvailable ?? config.authAvailable),
      syncAvailable: Boolean(payload?.syncAvailable ?? config.syncAvailable),
      storageMode: String(config.storageMode || fallback.storageMode),
      imageParserConfigured: Boolean(payload?.imageParserConfigured ?? config.imageParserConfigured),
      degradedMode: Boolean(payload?.degradedMode ?? config.degradedMode),
    };
  } catch {
    return fallback;
  }
}
