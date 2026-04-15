// @ts-nocheck
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FormMate â€” Browser Storage Persistence Layer
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const STORAGE_PREFIX = 'formmate_';
const SESSION_KEYS = new Set([
  'activity_log',
  'answer_history',
  'answer_history_index',
  'answers_state',
  'form_data_state',
  'form_history',
  'user_profile',
  'user_vault',
]);

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

function getPreferredStorageType(key) {
  return key.startsWith('usage_') || !SESSION_KEYS.has(key) ? 'local' : 'session';
}

function getFallbackStorageType(type) {
  return type === 'session' ? 'local' : 'session';
}

function listStorageKeys(storageArea) {
  if (!storageArea || typeof storageArea.length !== 'number' || typeof storageArea.key !== 'function') {
    return [];
  }

  const keys = [];
  for (let index = 0; index < storageArea.length; index += 1) {
    const key = storageArea.key(index);
    if (typeof key === 'string') {
      keys.push(key);
    }
  }
  return keys;
}

function safeParseEntry(raw, storageArea, storageKey) {
  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    console.warn('[Storage] Failed to parse JSON for key:', storageKey, parseErr);
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

function migrateEntryIfNeeded(key, primaryType) {
  const fallbackResult = readEntry(key, getFallbackStorageType(primaryType));
  if (!fallbackResult) return null;

  const primaryStorage = getStorageArea(primaryType);
  if (primaryStorage) {
    primaryStorage.setItem(getStorageKey(key), JSON.stringify(fallbackResult.entry));
    fallbackResult.storageArea?.removeItem(fallbackResult.storageKey);
  }

  return fallbackResult.entry;
}

/**
 * Save a value to browser storage with optional TTL.
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON-serialized)
 * @param {number} [ttlMs] - Optional time-to-live in milliseconds
 */
export function save(key, value, ttlMs = null) {
  try {
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    const primaryType = getPreferredStorageType(key);
    const primaryStorage = getStorageArea(primaryType);
    const fallbackStorage = getStorageArea(getFallbackStorageType(primaryType));
    const storageKey = getStorageKey(key);

    primaryStorage?.setItem(storageKey, JSON.stringify(entry));
    fallbackStorage?.removeItem(storageKey);
  } catch (err) {
    console.warn('[Storage] Failed to save:', key, err);
  }
}

/**
 * Load a value from browser storage.
 * Returns null if not found or expired.
 */
export function load(key) {
  try {
    const primaryType = getPreferredStorageType(key);
    const primaryResult = readEntry(key, primaryType);
    if (primaryResult) return primaryResult.entry.value;

    const migrated = migrateEntryIfNeeded(key, primaryType);
    return migrated ? migrated.value : null;
  } catch (err) {
    console.warn('[Storage] Failed to load:', key, err);
    return null;
  }
}

/**
 * Remove a value from browser storage.
 */
export function remove(key) {
  const storageKey = getStorageKey(key);
  getStorageArea('local')?.removeItem(storageKey);
  getStorageArea('session')?.removeItem(storageKey);
}

/**
 * Clear all FormMate data from browser storage.
 */
export function clearAll() {
  ['local', 'session'].forEach((type) => {
    const storageArea = getStorageArea(type);
    if (!storageArea) return;
    const keys = listStorageKeys(storageArea).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => storageArea.removeItem(k));
  });
}

/**
 * Get all stored keys (without prefix).
 */
export function getAllKeys() {
  const localKeys = listStorageKeys(getStorageArea('local'))
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .map(k => k.slice(STORAGE_PREFIX.length));
  const sessionKeys = listStorageKeys(getStorageArea('session'))
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .map(k => k.slice(STORAGE_PREFIX.length));
  return Array.from(new Set([...localKeys, ...sessionKeys]));
}

// â”€â”€â”€ Typed helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Save user profile data.
 */
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

/**
 * Save user settings.
 */
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

/**
 * Save and load activity log.
 */
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

/**
 * Save and load form history.
 */
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

/**
 * Save/load user vault (reusable info for autofill).
 */
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

/**
 * Save/load onboarding status.
 */
export function setOnboardingComplete(complete) {
  save('onboarding_complete', complete);
}

export function isOnboardingComplete() {
  return load('onboarding_complete') === true;
}

/**
 * Usage tracking for free tier limits.
 */
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
