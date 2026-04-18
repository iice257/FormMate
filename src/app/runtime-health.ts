// @ts-nocheck
import { getRequestAuthHeaders } from '../auth/auth-service';
import { isSupabaseStorageConfigured } from '../storage/storage-provider';

function fallbackHealth() {
  const supabaseConfigured = isSupabaseStorageConfigured();
  return {
    loaded: false,
    groqConfigured: false,
    supabaseConfigured,
    storageMode: supabaseConfigured ? 'supabase' : 'local',
    imageParserConfigured: false,
    degradedMode: !supabaseConfigured,
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
      groqConfigured: Boolean(config.groqConfigured),
      supabaseConfigured: Boolean(config.supabaseConfigured),
      storageMode: String(config.storageMode || fallback.storageMode),
      imageParserConfigured: Boolean(config.imageParserConfigured),
      degradedMode: Boolean(config.degradedMode),
    };
  } catch {
    return fallback;
  }
}
