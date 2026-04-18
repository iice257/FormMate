// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security.js';
import { AI_MODELS } from '../_shared/ai-policy.js';

export const config = {
  maxDuration: 10,
  api: {
    bodyParser: false,
  },
};

const RATE_LIMIT = { max: 10, windowMs: 60_000 };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const buckets = new Map();
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 9000;
const ALLOWED_SURFACES = new Set(['workspace', 'ai-chat']);

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
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  return res.send(JSON.stringify(payload));
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
      message: 'The AI provider rate-limited transcription.',
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
      message: 'The transcription request timed out.',
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      code: 'UPSTREAM_ERROR',
      message: 'The transcription provider is temporarily unavailable.',
      retryable: true,
    };
  }
  return {
    code: 'BAD_REQUEST',
    message: 'The transcription request was rejected.',
    retryable: false,
  };
}

async function readRequestBuffer(req, maxBytes) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('Upload too large'), { code: 'UPLOAD_TOO_LARGE' }));
        try {
          req.destroy();
        } catch {}
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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
        message: 'Too many transcription requests. Please wait and retry.',
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
        message: 'The AI transcription service is not configured on the server.',
        retryable: false,
      });
    }

    if (!req.headers['content-type']) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Missing content-type.',
        retryable: false,
      });
    }

    const surface = String(req.headers['x-formmate-surface'] || '').trim();
    const languageHint = String(req.headers['x-formmate-language'] || '').trim();
    if (!ALLOWED_SURFACES.has(surface)) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Voice transcription is only available from workspace and ai-chat surfaces.',
        retryable: false,
      });
    }
    if (languageHint && languageHint.length > 24) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Invalid language hint.',
        retryable: false,
      });
    }

    const buffer = await readRequestBuffer(req, MAX_UPLOAD_BYTES);
    const groqRes = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': req.headers['content-type'],
      },
      body: buffer,
      signal: getAbortSignal(REQUEST_TIMEOUT_MS),
    });

    const responseText = await groqRes.text();
    const payload = safeJsonParse(responseText);

    if (!groqRes.ok) {
      const retryAfter = Number.parseInt(groqRes.headers.get('retry-after') || '', 10);
      console.error('[Proxy] Transcribe upstream error:', groqRes.status, payload?.error?.message || responseText.slice(0, 200));
      const upstream = mapUpstreamError(groqRes.status);
      return sendError(res, groqRes.status, {
        ...upstream,
        retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      });
    }

    const transcript = String(payload?.text || payload?.message || responseText || '').trim();
    return sendJson(res, groqRes.status, {
      text: transcript,
      meta: {
        surface,
        language: languageHint || null,
        model: AI_MODELS.WHISPER,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Proxy] Transcribe error:', message);
    if (error?.code === 'UPLOAD_TOO_LARGE') {
      return sendError(res, 413, {
        code: 'BAD_REQUEST',
        message: 'Upload too large.',
        retryable: false,
      });
    }
    const isAbort = error?.name === 'AbortError' || String(message).toLowerCase().includes('aborted');
    return sendError(res, isAbort ? 504 : 500, {
      code: isAbort ? 'TIMEOUT_ERROR' : 'PROXY_ERROR',
      message: isAbort ? 'The transcription proxy timed out before the provider responded.' : 'The transcription proxy failed before completing the request.',
      retryable: true,
    });
  }
}
