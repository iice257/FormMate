// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Usage Gate (Free Tier Limits)
// ═══════════════════════════════════════════

import { getMonthlyUsage, incrementUsage, load } from './local-store';

const TIER_LIMITS = {
  free: {
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
  },
  pro: {
    formsPerMonth: Infinity,
    aiCallsPerMonth: Infinity,
    editsPerMonth: Infinity,
    features: {
      vault: true,
      advancedModels: true,
      export: true,
      analytics: true,
      customPersonality: true,
    },
  },
  enterprise: {
    formsPerMonth: Infinity,
    aiCallsPerMonth: Infinity,
    editsPerMonth: Infinity,
    features: {
      vault: true,
      advancedModels: true,
      export: true,
      analytics: true,
      customPersonality: true,
    },
  },
};

/**
 * Get the user's current tier.
 */
export function getCurrentTier() {
  return load('subscription_tier') || 'free';
}

/**
 * Get limits for the current tier.
 */
export function getTierLimits() {
  return TIER_LIMITS[getCurrentTier()] || TIER_LIMITS.free;
}

/**
 * Check if a feature is available on the current tier.
 */
export function canUseFeature(feature) {
  const limits = getTierLimits();
  return limits.features[feature] !== false;
}

/**
 * Check if the user can perform an action (within monthly limits).
 * @param {'formsAnalyzed'|'aiCalls'|'edits'} action
 * @returns {{ allowed: boolean, current: number, limit: number, remaining: number }}
 */
export function checkLimit(action) {
  const usage = getMonthlyUsage();
  const limits = getTierLimits();

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
  const limits = getTierLimits();
  const tier = getCurrentTier();

  return {
    tier,
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
