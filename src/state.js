// ═══════════════════════════════════════════
// FormMate — State Management (Enhanced)
// ═══════════════════════════════════════════
//
// Central reactive state with persistence,
// user profiles, settings, and event bus.
// ═══════════════════════════════════════════

import {
  loadProfile, saveProfile,
  loadSettings, saveSettings,
  loadVault, saveVault,
  loadFormHistory,
  isOnboardingComplete,
  load, save
} from './storage/local-store.js';

import { queueRemoteSync } from './storage/storage-provider.js';

// ─── Event Bus ───────────────────────────

const listeners = new Set();
const eventListeners = new Map(); // event-name → Set<fn>

// ─── State ───────────────────────────────

const state = {
  currentScreen: 'landing',
  formUrl: '',

  // Assisted Capture payload (bookmarklet import)
  capturePayload: null,

  // Form data from parser
  formData: load('form_data_state') || null,

  // AI-generated answers: { [questionId]: { text, source, confidence } }
  answers: load('answers_state') || {},

  // Answer history for undo/redo: { [questionId]: [{ text, source, confidence }] }
  answerHistory: load('answer_history') || {},
  answerHistoryIndex: load('answer_history_index') || {},

  // Analysis progress
  analysisProgress: {
    step: 0,
    percent: 0,
    message: '',
  },

  // Chat messages: [{ role, text, timestamp, action? }]
  chatMessages: [],

  // removed groqApiKey property

  // UI state
  activeQuestionId: null,
  sidebarOpen: true,
  chatPanelOpen: true,

  // Current AI personality
  personality: 'professional',

  // User profile (loaded from localStorage)
  userProfile: loadProfile(),

  // Settings (loaded from localStorage)
  settings: loadSettings(),

  // User vault (reusable personal data)
  vault: loadVault(),

  // Form history (loaded from localStorage)
  formHistory: loadFormHistory(),

  // Auth state
  isAuthenticated: false,
  authUser: null,

  // Onboarding
  onboardingComplete: isOnboardingComplete(),

  // Subscription tier
  tier: 'free',
};

// ─── State Access ────────────────────────

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);

  // Auto-persist certain keys
  if (updates.userProfile) {
    saveProfile(updates.userProfile);
    queueRemoteSync(state.authUser, { profile: updates.userProfile });
  }
  if (updates.settings) {
    saveSettings(updates.settings);
    queueRemoteSync(state.authUser, { settings: updates.settings });
  }
  if (updates.vault) {
    saveVault(updates.vault);
    queueRemoteSync(state.authUser, { vault: updates.vault });
  }
  if (updates.formHistory) {
    save('form_history', updates.formHistory);
    queueRemoteSync(state.authUser, { form_history: updates.formHistory });
  }
  if (updates.formData) save('form_data_state', updates.formData);

  listeners.forEach(fn => fn(state));
}

// ─── Answer Management ──────────────────

export function updateAnswer(questionId, text, source = 'user') {
  const answer = { text, source, confidence: source === 'ai' ? 0.9 : 1 };

  // Push to history for undo
  if (!state.answerHistory[questionId]) {
    state.answerHistory[questionId] = [];
    state.answerHistoryIndex[questionId] = -1;
  }
  const history = state.answerHistory[questionId];
  const idx = state.answerHistoryIndex[questionId];

  // Truncate forward history if we're not at the end
  if (idx < history.length - 1) {
    history.splice(idx + 1);
  }

  history.push({ ...answer });
  state.answerHistoryIndex[questionId] = history.length - 1;

  // Keep max 20 entries per field
  if (history.length > 20) {
    history.shift();
    state.answerHistoryIndex[questionId]--;
  }

  state.answers = {
    ...state.answers,
    [questionId]: answer,
  };

  save('answers_state', state.answers);
  save('answer_history', state.answerHistory);
  save('answer_history_index', state.answerHistoryIndex);

  listeners.forEach(fn => fn(state));
}

export function undoAnswer(questionId) {
  const history = state.answerHistory[questionId];
  const idx = state.answerHistoryIndex[questionId];
  if (!history || idx <= 0) return null;

  state.answerHistoryIndex[questionId] = idx - 1;
  const prev = history[idx - 1];
  state.answers = { ...state.answers, [questionId]: { ...prev } };

  save('answers_state', state.answers);
  save('answer_history_index', state.answerHistoryIndex);

  listeners.forEach(fn => fn(state));
  return prev;
}

export function redoAnswer(questionId) {
  const history = state.answerHistory[questionId];
  const idx = state.answerHistoryIndex[questionId];
  if (!history || idx >= history.length - 1) return null;

  state.answerHistoryIndex[questionId] = idx + 1;
  const next = history[idx + 1];
  state.answers = { ...state.answers, [questionId]: { ...next } };

  save('answers_state', state.answers);
  save('answer_history_index', state.answerHistoryIndex);

  listeners.forEach(fn => fn(state));
  return next;
}

export function canUndo(questionId) {
  return (state.answerHistoryIndex[questionId] || 0) > 0;
}

export function canRedo(questionId) {
  const history = state.answerHistory[questionId];
  const idx = state.answerHistoryIndex[questionId] ?? -1;
  return history && idx < history.length - 1;
}

// ─── Chat Messages ──────────────────────

export function addChatMessage(role, text, action = null) {
  state.chatMessages = [
    ...state.chatMessages,
    { role, text, timestamp: new Date(), action },
  ];
  listeners.forEach(fn => fn(state));
}

// ─── Subscription ────────────────────────

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Event Bus ───────────────────────────

export function emit(event, data) {
  const fns = eventListeners.get(event);
  if (fns) fns.forEach(fn => fn(data));
}

export function on(event, fn) {
  if (!eventListeners.has(event)) eventListeners.set(event, new Set());
  eventListeners.get(event).add(fn);
  return () => eventListeners.get(event).delete(fn);
}

// ─── Settings Helpers ────────────────────

export function updateSettings(path, value) {
  const keys = path.split('.');
  const settings = { ...state.settings };
  let obj = settings;

  for (let i = 0; i < keys.length - 1; i++) {
    obj[keys[i]] = { ...obj[keys[i]] };
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;

  setState({ settings });
}

export function getSetting(path) {
  const keys = path.split('.');
  let obj = state.settings;
  for (const key of keys) {
    if (!obj) return undefined;
    obj = obj[key];
  }
  return obj;
}

// ─── Profile Helpers ─────────────────────

export function updateProfile(updates) {
  setState({ userProfile: { ...state.userProfile, ...updates } });
}

export function updateVault(key, value) {
  setState({ vault: { ...state.vault, [key]: value } });
}
