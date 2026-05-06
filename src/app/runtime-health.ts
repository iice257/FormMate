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

export function isAiConfigured(health) {
  return Boolean(health?.groqConfigured);
}

export function isImageParserConfigured(health) {
  return Boolean(health?.imageParserConfigured);
}

export function runtimeReadinessItems(health) {
  const items = [];
  if (!health?.apiReachable) {
    items.push({
      code: 'api-unreachable',
      label: 'Local API is unavailable',
      detail: 'Start the local API or Vercel dev server before using server-backed flows.',
    });
  }
  if (!isAiConfigured(health)) {
    items.push({
      code: 'ai-key-missing',
      label: 'AI chat and transcription need GROQ_API_KEY',
      detail: 'Manual form intake, saved data, review, and non-AI screens still work.',
    });
  }
  if (!isImageParserConfigured(health)) {
    items.push({
      code: 'image-parser-missing',
      label: 'Image parsing is offline',
      detail: 'Screenshot/form image extraction needs a configured vision-capable AI key.',
    });
  }
  if (health?.storageMode === 'supabase' && !health?.syncAvailable) {
    items.push({
      code: 'sync-unavailable',
      label: 'Cloud sync is unavailable',
      detail: 'Switch to local storage mode or configure Supabase before relying on sync.',
    });
  }
  return items;
}

export function hasRuntimeLimitations(health) {
  return runtimeReadinessItems(health).length > 0;
}
