// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Activity Logger
// ═══════════════════════════════════════════
//
// Logs user actions for the analytics dashboard.
// All data stored in localStorage via local-store.
// ═══════════════════════════════════════════

import { appendActivity, loadActivityLog } from './local-store';

/**
 * Log an activity event.
 * @param {string} type - Event type
 * @param {Object} [data] - Additional event data
 */
export function logActivity(type, data = {}) {
  appendActivity({ type, ...data });
}

// ─── Convenience loggers ─────────────────

export function logFormAnalyzed(formTitle, questionCount) {
  logActivity('form_analyzed', { formTitle, questionCount });
}

export function logAnswerGenerated(questionId, source) {
  logActivity('answer_generated', { questionId, source });
}

export function logAnswerEdited(questionId, editType) {
  logActivity('answer_edited', { questionId, editType });
}

export function logFormSubmitted(formTitle, answeredCount, totalCount) {
  logActivity('form_submitted', { formTitle, answeredCount, totalCount });
}

export function logChatMessage(role) {
  logActivity('chat_message', { role });
}

export function logQuickEdit(action) {
  logActivity('quick_edit', { action });
}

export function logVoiceInput() {
  logActivity('voice_input', {});
}

export function logSettingsChanged(section) {
  logActivity('settings_changed', { section });
}

// ─── Query helpers ───────────────────────

/**
 * Get all activities, optionally filtered by type.
 */
export function getActivities(type = null) {
  const log = loadActivityLog();
  if (!type) return log;
  return log.filter(e => e.type === type);
}

/**
 * Get activity count for a specific type.
 */
export function getActivityCount(type) {
  return getActivities(type).length;
}

/**
 * Get activities from the last N days.
 */
export function getRecentActivities(days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return loadActivityLog().filter(e => e.timestamp >= cutoff);
}

/**
 * Calculate time saved estimate (rough: 2 min per AI-answered field).
 */
export function estimateTimeSaved() {
  const generated = getActivityCount('answer_generated');
  return Math.round(generated * 2); // minutes
}

/**
 * Get daily activity counts for the last N days (for charts).
 */
export function getDailyActivity(days = 30) {
  const now = Date.now();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayLog = loadActivityLog().filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);

    result.push({
      date: new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: dayLog.length,
    });
  }

  return result;
}

/**
 * Get current streak (consecutive days with activity).
 */
export function getStreak() {
  const log = loadActivityLog();
  if (!log.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  while (true) {
    const dayStart = checkDate.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const hasActivity = log.some(e => e.timestamp >= dayStart && e.timestamp < dayEnd);

    if (hasActivity) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
