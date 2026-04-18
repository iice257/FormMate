// @ts-nocheck
// FormMate - Browser Storage Layer

const STORAGE_PREFIX = 'formmate_';

export const STORAGE_CLASS = Object.freeze({
  PERSISTENT_LOCAL: 'persistent_local',
  SESSION_SENSITIVE: 'session_sensitive',
  MEMORY_ONLY: 'memory_only',
});

const memoryStore = new Map();

const KEY_CLASSIFICATIONS = Object.freeze({
  // Session-sensitive data
  activity_log: STORAGE_CLASS.SESSION_SENSITIVE,
  answer_history: STORAGE_CLASS.SESSION_SENSITIVE,
  answer_history_index: STORAGE_CLASS.SESSION_SENSITIVE,
  answers_state: STORAGE_CLASS.SESSION_SENSITIVE,
  auth_session: STORAGE_CLASS.SESSION_SENSITIVE,
  form_data_state: STORAGE_CLASS.SESSION_SENSITIVE,
  form_history: STORAGE_CLASS.SESSION_SENSITIVE,
  image_artifacts_state: STORAGE_CLASS.SESSION_SENSITIVE,
  parse_result_state: STORAGE_CLASS.SESSION_SENSITIVE,
  user_profile: STORAGE_CLASS.SESSION_SENSITIVE,
  user_vault: STORAGE_CLASS.SESSION_SENSITIVE,

  // Persistent local preferences/app chrome
  onboarding_complete: STORAGE_CLASS.PERSISTENT_LOCAL,
  user_settings: STORAGE_CLASS.PERSISTENT_LOCAL,
});

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorageArea(type) {
  if (!isBrowser()) return null;
  if (type === 'session' && typeof window.sessionStorage !== 'undefined') return window.sessionStorage;
  if (typeof window.localStorage !== 'undefined') return window.localStorage;
  return null;
}

function getStorageKey(key) {
  return STORAGE_PREFIX + key;
}

function listStorageKeys(storageArea) {
  if (!storageArea || typeof storageArea.length !== 'number' || typeof storageArea.key !== 'function') {
    return [];
  }

  const keys = [];
  for (let index = 0; index < storageArea.length; index += 1) {
    const key = storageArea.key(index);
    if (typeof key === 'string') keys.push(key);
  }
  return keys;
}

function safeParseEntry(raw, storageArea, storageKey) {
  try {
    return JSON.parse(raw);
  } catch (parseError) {
    console.warn('[Storage] Failed to parse JSON for key:', storageKey, parseError);
    storageArea?.removeItem(storageKey);
    return null;
  }
}

function readEntry(key, type) {
  const storageArea = getStorageArea(type);
  if (!storageArea) return null;

  const storageKey = getStorageKey(key);
  const raw = storageArea.getItem(storageKey);
  if (!raw) return null;

  const entry = safeParseEntry(raw, storageArea, storageKey);
  if (!entry) return null;

  if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
    storageArea.removeItem(storageKey);
    return null;
  }

  return { entry, storageArea, storageKey };
}

function getFallbackStorageType(type) {
  return type === 'session' ? 'local' : 'session';
}

function migrateEntryIfNeeded(key, primaryType) {
  const fallbackType = getFallbackStorageType(primaryType);
  const fallbackResult = readEntry(key, fallbackType);
  if (!fallbackResult) return null;

  const primaryStorage = getStorageArea(primaryType);
  if (primaryStorage) {
    primaryStorage.setItem(getStorageKey(key), JSON.stringify(fallbackResult.entry));
    fallbackResult.storageArea?.removeItem(fallbackResult.storageKey);
  }
  return fallbackResult.entry;
}

export function getStorageClass(key) {
  const normalized = String(key || '').trim();
  if (!normalized) return STORAGE_CLASS.PERSISTENT_LOCAL;
  if (normalized.startsWith('usage_')) return STORAGE_CLASS.PERSISTENT_LOCAL;
  return KEY_CLASSIFICATIONS[normalized] || STORAGE_CLASS.PERSISTENT_LOCAL;
}

export function getStorageModeForKey(key) {
  const storageClass = getStorageClass(key);
  if (storageClass === STORAGE_CLASS.SESSION_SENSITIVE) return 'session';
  if (storageClass === STORAGE_CLASS.PERSISTENT_LOCAL) return 'local';
  return 'memory';
}

export function save(key, value, ttlMs = null, options = {}) {
  try {
    const storageClass = options?.storageClass || getStorageClass(key);
    if (storageClass === STORAGE_CLASS.MEMORY_ONLY) {
      memoryStore.set(String(key), {
        value,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
      return;
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    const targetType = storageClass === STORAGE_CLASS.SESSION_SENSITIVE ? 'session' : 'local';
    const targetStorage = getStorageArea(targetType);
    const fallbackStorage = getStorageArea(getFallbackStorageType(targetType));
    const storageKey = getStorageKey(key);

    targetStorage?.setItem(storageKey, JSON.stringify(entry));
    fallbackStorage?.removeItem(storageKey);
    memoryStore.delete(String(key));
  } catch (error) {
    console.warn('[Storage] Failed to save:', key, error);
  }
}

export function load(key, options = {}) {
  try {
    const storageClass = options?.storageClass || getStorageClass(key);
    if (storageClass === STORAGE_CLASS.MEMORY_ONLY) {
      const entry = memoryStore.get(String(key));
      if (!entry) return null;
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        memoryStore.delete(String(key));
        return null;
      }
      return entry.value;
    }

    const primaryType = storageClass === STORAGE_CLASS.SESSION_SENSITIVE ? 'session' : 'local';
    const primaryResult = readEntry(key, primaryType);
    if (primaryResult) return primaryResult.entry.value;

    const migrated = migrateEntryIfNeeded(key, primaryType);
    return migrated ? migrated.value : null;
  } catch (error) {
    console.warn('[Storage] Failed to load:', key, error);
    return null;
  }
}

export function remove(key) {
  const storageKey = getStorageKey(key);
  getStorageArea('local')?.removeItem(storageKey);
  getStorageArea('session')?.removeItem(storageKey);
  memoryStore.delete(String(key));
}

export function clearSensitiveSessionCache() {
  const removeIfSensitive = (rawKey) => {
    if (!rawKey.startsWith(STORAGE_PREFIX)) return;
    const key = rawKey.slice(STORAGE_PREFIX.length);
    if (getStorageClass(key) !== STORAGE_CLASS.SESSION_SENSITIVE) return;
    getStorageArea('local')?.removeItem(rawKey);
    getStorageArea('session')?.removeItem(rawKey);
    memoryStore.delete(key);
  };

  ['local', 'session'].forEach((type) => {
    const storage = getStorageArea(type);
    listStorageKeys(storage).forEach(removeIfSensitive);
  });
}

export function clearAll() {
  ['local', 'session'].forEach((type) => {
    const storage = getStorageArea(type);
    if (!storage) return;
    const keys = listStorageKeys(storage).filter((key) => key.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => storage.removeItem(key));
  });
  memoryStore.clear();
}

export function getAllKeys() {
  const localKeys = listStorageKeys(getStorageArea('local'))
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .map((key) => key.slice(STORAGE_PREFIX.length));
  const sessionKeys = listStorageKeys(getStorageArea('session'))
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .map((key) => key.slice(STORAGE_PREFIX.length));
  const memoryKeys = Array.from(memoryStore.keys());
  return Array.from(new Set([...localKeys, ...sessionKeys, ...memoryKeys]));
}

export function saveProfile(profile) {
  save('user_profile', profile);
}

export function loadProfile() {
  return load('user_profile') || {
    name: '',
    email: '',
    phone: '',
    occupation: '',
    bio: '',
    experience: '',
    avatar: '',
    preferredTone: 'professional',
    commonInfo: {},
  };
}

export function saveSettings(settings) {
  save('user_settings', settings);
}

export function loadSettings() {
  return load('user_settings') || getDefaultSettings();
}

export function getDefaultSettings() {
  return {
    ai: {
      temperature: 0.7,
      verbosity: 'balanced',
      defaultPersonality: 'professional',
      modelPreferences: {},
    },
    ui: {
      theme: 'light',
      compactMode: false,
      sidebarDefault: true,
      chatPanelDefault: true,
    },
    personalization: {
      defaultTone: 'professional',
      language: 'en',
      autoSave: true,
      autoFillPersonal: true,
    },
    notifications: {
      toasts: true,
      sounds: false,
    },
    privacy: {
      dataRetentionDays: 90,
      analyticsOptOut: false,
    },
    formatting: {
      responseLength: 'medium',
      preferBullets: false,
      paragraphStyle: 'standard',
    },
  };
}

export function appendActivity(entry) {
  const log = load('activity_log') || [];
  log.push({
    ...entry,
    timestamp: Date.now(),
  });
  if (log.length > 500) log.splice(0, log.length - 500);
  save('activity_log', log);
}

export function loadActivityLog() {
  return load('activity_log') || [];
}

export function saveFormHistory(formEntry) {
  const history = load('form_history') || [];
  history.unshift({
    ...formEntry,
    timestamp: Date.now(),
  });
  if (history.length > 50) history.pop();
  save('form_history', history);
}

export function loadFormHistory() {
  return load('form_history') || [];
}

export function saveVault(vault) {
  save('user_vault', vault);
}

function normalizeVault(vault) {
  const normalized = { ...(vault || {}) };
  const legacyMap = {
    'Full Name': 'fullName',
    'Email Address': 'email',
    'Phone Number': 'phone',
  };

  Object.entries(legacyMap).forEach(([legacyKey, nextKey]) => {
    if (normalized[legacyKey] !== undefined && normalized[nextKey] === undefined) {
      normalized[nextKey] = normalized[legacyKey];
    }
    delete normalized[legacyKey];
  });

  return normalized;
}

export function loadVault() {
  const vault = load('user_vault') || {};
  const normalized = normalizeVault(vault);
  if (JSON.stringify(normalized) !== JSON.stringify(vault)) {
    saveVault(normalized);
  }
  return normalized;
}

export function setOnboardingComplete(complete) {
  save('onboarding_complete', complete);
}

export function isOnboardingComplete() {
  return load('onboarding_complete') === true;
}

export function getMonthlyUsage() {
  const now = new Date();
  const monthKey = `usage_${now.getFullYear()}_${now.getMonth()}`;
  return load(monthKey) || { formsAnalyzed: 0, aiCalls: 0, edits: 0 };
}

export function incrementUsage(field) {
  const now = new Date();
  const monthKey = `usage_${now.getFullYear()}_${now.getMonth()}`;
  const usage = getMonthlyUsage();
  usage[field] = (usage[field] || 0) + 1;
  save(monthKey, usage);
  return usage;
}
