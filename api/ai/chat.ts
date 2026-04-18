// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security.js';
import {
  buildServerSystemPrompt,
  getSurfaceRateLimit,
  getTaskPolicy,
  isBalancedAdjacentScopeAllowed,
  isTaskAllowedForSurface,
  sanitizeMessages,
} from '../_shared/ai-policy.js';

export const config = {
  maxDuration: 10,
};

const buckets = new Map();
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 9000;
const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_CHARS = 10_000;

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req, surface) {
  const limit = getSurfaceRateLimit(surface);
  const ip = getClientIp(req);
  const key = `${ip}:${surface || 'unknown'}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true };
  }
  if (entry.count >= limit.max) {
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

function normalizeAttachmentSummaries(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .slice(0, MAX_ATTACHMENTS)
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const type = String(entry.type || 'attachment').toLowerCase();
      const name = String(entry.name || '').trim();
      const text = String(entry.text || entry.summary || '').trim();
      const summary = [name ? `${name}:` : `Attachment ${index + 1}:`, text]
        .filter(Boolean)
        .join(' ')
        .slice(0, MAX_ATTACHMENT_CHARS);
      return summary || `${type} attachment provided.`;
    })
    .filter(Boolean);
}

function normalizeContext(formContext, activeFieldId, attachments) {
  const context = (formContext && typeof formContext === 'object') ? formContext : {};
  const output = {
    formTitle: String(context.formTitle || context.title || '').trim().slice(0, 220),
    activeFieldId: String(activeFieldId || context.activeFieldId || '').trim().slice(0, 80),
    activeFieldText: String(context.activeFieldText || '').trim().slice(0, 900),
    formQuestions: Array.isArray(context.formQuestions)
      ? context.formQuestions.slice(0, 50).map((entry) => ({
        id: String(entry?.id || '').slice(0, 40),
        text: String(entry?.text || '').slice(0, 240),
        type: String(entry?.type || '').slice(0, 48),
      }))
      : [],
    attachmentSummaries: normalizeAttachmentSummaries(attachments),
  };
  return output;
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

    const {
      task,
      surface,
      messages,
      formContext,
      activeFieldId,
      attachments,
      temperature,
      max_tokens,
      response_format,
      expectJson,
    } = req.body || {};

    const normalizedTask = String(task || '').trim();
    const normalizedSurface = String(surface || '').trim();
    const policy = getTaskPolicy(normalizedTask);

    if (!normalizedTask || !normalizedSurface) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'task and surface are required.',
        retryable: false,
      });
    }

    if (!policy) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: `Unknown task "${normalizedTask}".`,
        retryable: false,
      });
    }

    if (!isTaskAllowedForSurface(normalizedTask, normalizedSurface)) {
      return sendError(res, 403, {
        code: 'TASK_SURFACE_MISMATCH',
        message: 'This AI task is not allowed from the current surface.',
        retryable: false,
      });
    }

    const rl = rateLimit(req, normalizedSurface);
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

    if (!Array.isArray(messages) || messages.length === 0) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'messages must be a non-empty array.',
        retryable: false,
      });
    }

    const sanitizedMessages = sanitizeMessages(messages, 42);
    if (!sanitizedMessages.length) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'messages must include user or assistant content.',
        retryable: false,
      });
    }

    if (sanitizedMessages.length > 42) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'Too many messages.',
        retryable: false,
      });
    }

    const context = normalizeContext(formContext, activeFieldId, attachments);
    if (!isBalancedAdjacentScopeAllowed(normalizedTask, sanitizedMessages, context)) {
      return sendError(res, 403, {
        code: 'SCOPE_NOT_ALLOWED',
        message: 'This request is outside FormMate assistant scope.',
        retryable: false,
      });
    }

    const totalChars = sanitizedMessages.reduce((sum, message) => sum + (typeof message?.content === 'string' ? message.content.length : 0), 0);
    if (totalChars > policy.maxMessageChars) {
      return sendError(res, 400, {
        code: 'INPUT_TOO_LONG',
        message: 'Input too long.',
        retryable: false,
        details: { totalChars, maxChars: policy.maxMessageChars },
      });
    }

    const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
    if (attachmentCount > MAX_ATTACHMENTS) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: `Too many attachments. Maximum ${MAX_ATTACHMENTS}.`,
        retryable: false,
      });
    }

    const temp = typeof temperature === 'number' ? temperature : policy.defaultTemperature;
    const maxTokens = Math.max(128, Math.min(4096, Number(max_tokens) || policy.maxTokens));
    const systemPrompt = buildServerSystemPrompt(normalizedTask, context);
    const modelChain = [policy.model, ...(Array.isArray(policy.fallback) ? policy.fallback : [])];
    let lastStatus = 500;
    let lastMessage = 'The AI request failed across all providers.';

    for (const model of modelChain) {
      const requestBody = {
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...sanitizedMessages],
        temperature: Math.max(0, Math.min(temp, 1.5)),
        max_tokens: maxTokens,
      };

      if (expectJson === true || response_format?.type === 'json_object') {
        requestBody.response_format = { type: 'json_object' };
      }

      const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: getAbortSignal(REQUEST_TIMEOUT_MS),
      });

      const responseText = await groqRes.text();
      const payload = safeJsonParse(responseText);

      if (groqRes.ok) {
        return sendJson(res, groqRes.status, payload || { message: responseText });
      }

      lastStatus = groqRes.status;
      lastMessage = payload?.error?.message || responseText.slice(0, 240) || lastMessage;
      const isRetryable = groqRes.status === 429 || groqRes.status >= 500 || groqRes.status === 408 || groqRes.status === 504;
      if (!isRetryable) {
        const retryAfter = Number.parseInt(groqRes.headers.get('retry-after') || '', 10);
        const upstream = mapUpstreamError(groqRes.status);
        return sendError(res, groqRes.status, {
          ...upstream,
          retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          details: { model },
        });
      }
    }

    const upstream = mapUpstreamError(lastStatus);
    return sendError(res, lastStatus, {
      ...upstream,
      details: { message: lastMessage },
    });
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
