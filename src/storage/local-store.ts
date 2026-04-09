// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Local Storage Persistence Layer
// ═══════════════════════════════════════════

const STORAGE_PREFIX = 'formmate_';

/**
 * Save a value to localStorage with optional TTL.
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
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch (err) {
    console.warn('[Storage] Failed to save:', key, err);
  }
}

/**
 * Load a value from localStorage.
 * Returns null if not found or expired.
 */
export function load(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;

    let entry;
    try {
      entry = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('[Storage] Failed to parse JSON for key:', key, parseErr);
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }

    // Check TTL expiration
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }

    return entry.value;
  } catch (err) {
    console.warn('[Storage] Failed to load:', key, err);
    return null;
  }
}

/**
 * Remove a value from localStorage.
 */
export function remove(key) {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Clear all FormMate data from localStorage.
 */
export function clearAll() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

/**
 * Get all stored keys (without prefix).
 */
export function getAllKeys() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .map(k => k.slice(STORAGE_PREFIX.length));
}

// ─── Typed helpers ───────────────────────

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
    // AI Behavior
    ai: {
      temperature: 0.7,
      verbosity: 'balanced', // concise | balanced | detailed
      defaultPersonality: 'professional',
      modelPreferences: {},
    },
    // UI Preferences
    ui: {
      theme: 'light',
      compactMode: false,
      sidebarDefault: true,
      animationsEnabled: true,
      chatPanelDefault: true,
    },
    // Personalization
    personalization: {
      defaultTone: 'professional',
      language: 'en',
      autoSave: true,
      autoFillPersonal: true,
    },
    // Notifications
    notifications: {
      toasts: true,
      sounds: false,
    },
    // Privacy
    privacy: {
      dataRetentionDays: 90,
      analyticsOptOut: false,
    },
    // Formatting
    formatting: {
      responseLength: 'medium', // short | medium | long
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
  // Keep last 500 entries
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
  // Keep last 50 forms
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

export function loadVault() {
  return load('user_vault') || {};
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
