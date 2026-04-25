// @ts-nocheck
import { load, save } from './local-store';

const ANONYMOUS_PREFS_KEY = 'anonymous_preferences';

const DEFAULT_ANONYMOUS_PREFS = {
  docs: {
    leftSidebarWidth: 256,
    rightSidebarWidth: 357,
  },
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergePrefs(base, next) {
  if (!isObject(next)) return { ...base };
  const merged = { ...base };
  Object.entries(next).forEach(([key, value]) => {
    merged[key] = isObject(base[key]) && isObject(value)
      ? mergePrefs(base[key], value)
      : value;
  });
  return merged;
}

export function loadAnonymousPrefs() {
  return mergePrefs(DEFAULT_ANONYMOUS_PREFS, load(ANONYMOUS_PREFS_KEY) || {});
}

export function saveAnonymousPrefs(prefs) {
  const nextPrefs = mergePrefs(DEFAULT_ANONYMOUS_PREFS, prefs);
  save(ANONYMOUS_PREFS_KEY, nextPrefs);
  return nextPrefs;
}

export function getAnonymousPref(path, fallbackValue = undefined) {
  const parts = String(path || '').split('.').filter(Boolean);
  let current = loadAnonymousPrefs();
  for (const part of parts) {
    if (!isObject(current) && typeof current !== 'object') return fallbackValue;
    current = current?.[part];
    if (current === undefined) return fallbackValue;
  }
  return current;
}

export function setAnonymousPref(path, value) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (!parts.length) return loadAnonymousPrefs();

  const prefs = loadAnonymousPrefs();
  let current = prefs;
  parts.slice(0, -1).forEach((part) => {
    if (!isObject(current[part])) current[part] = {};
    current = current[part];
  });
  current[parts[parts.length - 1]] = value;
  return saveAnonymousPrefs(prefs);
}
