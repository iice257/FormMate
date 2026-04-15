// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security';

export const config = {
  maxDuration: 10,
};

const RATE_LIMIT = { max: 30, windowMs: 60_000 };
const buckets = new Map();
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 9000;
const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'llama3-8b-8192',
]);

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || now >= entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT.max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

function getAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  return isAllowedOrigin(origin) ? origin : null;
}

function sendJson(res, status, payload) {
  return res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(payload));
}

function sendError(res, status, { code, message, retryable, retryAfter, details }) {
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
  }

  const error = {
    code,
    message,
    retryable: typeof retryable === 'boolean' ? retryable : status >= 500 || status === 408 || status === 429,
    status,
    retryAfter: retryAfter || undefined,
  };

  if (details && Object.keys(details).length > 0) {
    error.details = details;
  }

  return sendJson(res, status, { error });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getAbortSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function mapUpstreamError(status) {
  if (status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: 'The AI provider rate-limited this request.',
      retryable: true,
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: 'UPSTREAM_AUTH_ERROR',
      message: 'The AI provider rejected the server credentials.',
      retryable: false,
    };
  }
  if (status === 408 || status === 504) {
    return {
      code: 'TIMEOUT_ERROR',
      message: 'The AI provider timed out.',
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      code: 'UPSTREAM_ERROR',
      message: 'The AI provider is temporarily unavailable.',
      retryable: true,
    };
  }
  return {
    code: 'BAD_REQUEST',
    message: 'The AI request was rejected.',
    retryable: false,
  };
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-FormMate-Session, X-FormMate-Dev-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed.',
      retryable: false,
    });
  }

  try {
    if (!(await assertTrustedAppSignal(req, res, 'Access denied.'))) {
      return;
    }

    const rl = rateLimit(req);
    if (!rl.allowed) {
      return sendError(res, 429, {
        code: 'RATE_LIMITED',
        message: 'Too many AI requests. Please wait and retry.',
        retryAfter: rl.retryAfterSec || 2,
        retryable: true,
      });
    }

    if (req.headers.origin && !allowedOrigin) {
      return sendError(res, 403, {
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Origin not allowed.',
        retryable: false,
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return sendError(res, 500, {
        code: 'CONFIG_MISSING',
        message: 'The AI service is not configured on the server.',
        retryable: false,
      });
    }

    const { model, messages, temperature, max_tokens, response_format } = req.body || {};

    if (!model || !messages) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'model and messages are required.',
        retryable: false,
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'messages must be a non-empty array.',
        retryable: false,
      });
    }

    if (messages.length > 64) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Too many messages.',
        retryable: false,
      });
    }

    if (!ALLOWED_MODELS.has(model)) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Model not allowed.',
        retryable: false,
      });
    }

    const totalChars = messages.reduce((sum, message) => sum + (typeof message?.content === 'string' ? message.content.length : 0), 0);
    if (totalChars > 20_000) {
      return sendError(res, 400, {
        code: 'INPUT_TOO_LONG',
        message: 'Input too long.',
        retryable: false,
        details: { totalChars, maxChars: 20_000 },
      });
    }

    const temp = typeof temperature === 'number' ? temperature : 0.7;
    const body = { model, messages, temperature: Math.max(0, Math.min(temp, 2)), max_tokens: max_tokens || 1024 };
    if (response_format) body.response_format = response_format;

    const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: getAbortSignal(REQUEST_TIMEOUT_MS),
    });

    const responseText = await groqRes.text();
    const payload = safeJsonParse(responseText);

    if (!groqRes.ok) {
      const retryAfter = Number.parseInt(groqRes.headers.get('retry-after') || '', 10);
      console.error('[Proxy] Chat upstream error:', groqRes.status, payload?.error?.message || responseText.slice(0, 200));
      const upstream = mapUpstreamError(groqRes.status);
      return sendError(res, groqRes.status, {
        ...upstream,
        retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      });
    }

    return sendJson(res, groqRes.status, payload || { message: responseText });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Proxy] Chat error:', message);
    const isAbort = error?.name === 'AbortError' || String(message).toLowerCase().includes('aborted');
    return sendError(res, isAbort ? 504 : 500, {
      code: isAbort ? 'TIMEOUT_ERROR' : 'PROXY_ERROR',
      message: isAbort ? 'The AI proxy timed out before the provider responded.' : 'The AI proxy failed before completing the request.',
      retryable: true,
    });
  }
}
