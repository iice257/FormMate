// @ts-nocheck

const DEFAULT_LIMITS = Object.freeze({
  aiCalls: 50,
});

const usageBuckets = new Map();

function getMonthlyKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getLimit(action) {
  if (action === 'aiCalls') {
    const configured = Number.parseInt(String(process.env.FORMMATE_AI_CALLS_MONTHLY_LIMIT || ''), 10);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LIMITS.aiCalls;
  }
  return Infinity;
}

function getSubject(req) {
  const auth = req?.formmateAuth || {};
  return String(auth.authKey || auth.userId || '').trim();
}

export function enforceMonthlyUsage(req, action) {
  const subject = getSubject(req);
  if (!subject) {
    return {
      allowed: false,
      current: 0,
      limit: getLimit(action),
      remaining: 0,
      reason: 'Missing authenticated usage subject.',
    };
  }

  const limit = getLimit(action);
  if (!Number.isFinite(limit)) {
    return { allowed: true, current: 0, limit, remaining: Infinity };
  }

  const key = `${getMonthlyKey()}:${action}:${subject}`;
  const current = usageBuckets.get(key) || 0;
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      remaining: 0,
      reason: 'Monthly usage limit reached.',
    };
  }

  const next = current + 1;
  usageBuckets.set(key, next);
  return {
    allowed: true,
    current: next,
    limit,
    remaining: Math.max(0, limit - next),
  };
}
