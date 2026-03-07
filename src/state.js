// ═══════════════════════════════════════════
// FormMate — State Management
// ═══════════════════════════════════════════

const listeners = new Set();

const state = {
  currentScreen: 'landing',
  formUrl: '',

  // Form data from parser
  formData: null,

  // AI-generated answers: { [questionId]: { text, source, confidence } }
  answers: {},

  // Analysis progress
  analysisProgress: { step: 0, percent: 0, message: '' },

  // Chat messages
  chatMessages: [],

  // UI state
  activeQuestionId: null,
  sidebarOpen: true,
  chatPanelOpen: true,
};

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  listeners.forEach(fn => fn(state));
}

export function updateAnswer(questionId, text, source = 'user') {
  state.answers = {
    ...state.answers,
    [questionId]: { text, source, confidence: source === 'ai' ? 0.9 : 1 }
  };
  listeners.forEach(fn => fn(state));
}

export function addChatMessage(role, text, action = null) {
  state.chatMessages = [
    ...state.chatMessages,
    { role, text, timestamp: new Date(), action }
  ];
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
