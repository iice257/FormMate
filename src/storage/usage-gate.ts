// @ts-nocheck
// FormMate — Usage Gate (single free-mode limits)

import { getMonthlyUsage, incrementUsage } from './local-store';

const USAGE_LIMITS = {
  formsPerMonth: 5,
  aiCallsPerMonth: 50,
  editsPerMonth: 100,
  features: {
    vault: false,
    advancedModels: false,
    export: false,
    analytics: false,
    customPersonality: false,
  },
};

/**
 * Limits used for the current free offering.
 */
export function getUsageLimits() {
  return USAGE_LIMITS;
}

/**
 * Check if a feature is available in the current offering.
 */
export function canUseFeature(feature) {
  const limits = getUsageLimits();
  return limits.features[feature] !== false;
}

/**
 * Check if the user can perform an action (within monthly limits).
 * @param {'formsAnalyzed'|'aiCalls'|'edits'} action
 * @returns {{ allowed: boolean, current: number, limit: number, remaining: number }}
 */
export function checkLimit(action) {
  const usage = getMonthlyUsage();
  const limits = getUsageLimits();

  const limitMap = {
    formsAnalyzed: 'formsPerMonth',
    aiCalls: 'aiCallsPerMonth',
    edits: 'editsPerMonth',
  };

  const limitKey = limitMap[action];
  const limit = limits[limitKey] || Infinity;
  const current = usage[action] || 0;

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Use a resource (increment usage and check limit).
 * @returns {{ allowed: boolean, current: number, limit: number }}
 */
export function useResource(action) {
  const check = checkLimit(action);
  if (!check.allowed) return check;

  incrementUsage(action);
  return { ...check, current: check.current + 1, remaining: check.remaining - 1 };
}

/**
 * Get overall usage summary.
 */
export function getUsageSummary() {
  const usage = getMonthlyUsage();
  const limits = getUsageLimits();

  return {
    forms: {
      used: usage.formsAnalyzed || 0,
      limit: limits.formsPerMonth,
      percent: limits.formsPerMonth === Infinity ? 0 : Math.round(((usage.formsAnalyzed || 0) / limits.formsPerMonth) * 100),
    },
    aiCalls: {
      used: usage.aiCalls || 0,
      limit: limits.aiCallsPerMonth,
      percent: limits.aiCallsPerMonth === Infinity ? 0 : Math.round(((usage.aiCalls || 0) / limits.aiCallsPerMonth) * 100),
    },
    edits: {
      used: usage.edits || 0,
      limit: limits.editsPerMonth,
      percent: limits.editsPerMonth === Infinity ? 0 : Math.round(((usage.edits || 0) / limits.editsPerMonth) * 100),
    },
  };
}
