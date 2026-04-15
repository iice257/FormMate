// @ts-nocheck
// FormMate AI Service Layer (Multi-Model Router)
import { getRequestAuthHeaders } from '../auth/auth-service';

export const MODELS = {
  HEAVY: 'llama-3.3-70b-versatile',
  STANDARD: 'llama-3.1-8b-instant',
  COPILOT: 'mixtral-8x7b-32768',
  FAST: 'llama3-8b-8192',
  WHISPER: 'whisper-large-v3',
};

export const TASK_ROUTES = {
  form_parsing: { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  question_intent: { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  answer_generation: { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  regeneration: { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  copilot_chat: { model: MODELS.COPILOT, fallback: [MODELS.FAST, MODELS.STANDARD] },
  quick_edit: { model: MODELS.FAST, fallback: [MODELS.COPILOT] },
  docs_chat: { model: MODELS.FAST, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  voice_transcription: { model: MODELS.WHISPER, fallback: [] },
};

export const AI_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  BAD_REQUEST: 'BAD_REQUEST',
  CLIENT_RATE_LIMITED: 'CLIENT_RATE_LIMITED',
  CONFIG_MISSING: 'CONFIG_MISSING',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INPUT_TOO_LONG: 'INPUT_TOO_LONG',
  INVALID_JSON: 'INVALID_JSON',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  UNKNOWN_AI_ERROR: 'UNKNOWN_AI_ERROR',
  UPSTREAM_AUTH_ERROR: 'UPSTREAM_AUTH_ERROR',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
};

const NON_FALLBACK_ERROR_CODES = new Set([
  AI_ERROR_CODES.BAD_REQUEST,
  AI_ERROR_CODES.CONFIG_MISSING,
  AI_ERROR_CODES.INPUT_TOO_LONG,
  AI_ERROR_CODES.UPSTREAM_AUTH_ERROR,
]);

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_INPUT_LENGTH = 15_000;
const CACHE_MAX = 100;

const requestTimestamps = [];
const cache = new Map();

function createAiError({
  code,
  message,
  retryable = false,
  status,
  retryAfter,
  details,
  cause,
}) {
  const error = new Error(message);
  error.name = 'AIError';
  error.code = code || AI_ERROR_CODES.UNKNOWN_AI_ERROR;
  error.retryable = Boolean(retryable);
  if (typeof status === 'number') error.status = status;
  if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) error.retryAfter = retryAfter;
  if (details !== undefined) error.details = details;
  if (cause) error.cause = cause;
  return error;
}

function parseRetryAfter(value, fallback = 2) {
  const numeric = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function inferRetryable(code, status) {
  if ([AI_ERROR_CODES.RATE_LIMITED, AI_ERROR_CODES.CLIENT_RATE_LIMITED, AI_ERROR_CODES.NETWORK_ERROR, AI_ERROR_CODES.TIMEOUT_ERROR, AI_ERROR_CODES.INVALID_JSON, AI_ERROR_CODES.EMPTY_RESPONSE].includes(code)) {
    return true;
  }
  if (typeof status === 'number') {
    return status >= 500 || status === 408 || status === 429;
  }
  return false;
}

function mapLegacyCode(code, status) {
  const value = String(code || '').toUpperCase();
  if (!value) {
    if (status === 429) return AI_ERROR_CODES.RATE_LIMITED;
    if (status === 408 || status === 504) return AI_ERROR_CODES.TIMEOUT_ERROR;
    if (status === 401 || status === 403) return AI_ERROR_CODES.UPSTREAM_AUTH_ERROR;
    if (typeof status === 'number' && status >= 500) return AI_ERROR_CODES.UPSTREAM_ERROR;
    if (typeof status === 'number' && status >= 400) return AI_ERROR_CODES.BAD_REQUEST;
    return AI_ERROR_CODES.UNKNOWN_AI_ERROR;
  }

  const mapped = {
    AUTH_REQUIRED: AI_ERROR_CODES.AUTH_REQUIRED,
    API_ERROR: status === 401 || status === 403 ? AI_ERROR_CODES.UPSTREAM_AUTH_ERROR : AI_ERROR_CODES.UPSTREAM_ERROR,
    CLIENT_RATE_LIMIT_EXCEEDED: AI_ERROR_CODES.CLIENT_RATE_LIMITED,
    NETWORK: AI_ERROR_CODES.NETWORK_ERROR,
    NETWORK_ERROR: AI_ERROR_CODES.NETWORK_ERROR,
    RATE_LIMIT: AI_ERROR_CODES.RATE_LIMITED,
    RATE_LIMITED: AI_ERROR_CODES.RATE_LIMITED,
    TIMEOUT: AI_ERROR_CODES.TIMEOUT_ERROR,
    TIMEOUT_ERROR: AI_ERROR_CODES.TIMEOUT_ERROR,
  };

  return mapped[value] || value;
}

export function normalizeAiError(error, fallback = {}) {
  if (error?.name === 'AIError' && error?.code) {
    return error;
  }

  const status = typeof error?.status === 'number' ? error.status : fallback.status;
  const code = mapLegacyCode(error?.code || error?.type || fallback.code, status);
  const retryAfter = typeof error?.retryAfter === 'number'
    ? error.retryAfter
    : typeof fallback.retryAfter === 'number'
      ? fallback.retryAfter
      : undefined;

  return createAiError({
    code,
    status,
    retryAfter,
    retryable: typeof error?.retryable === 'boolean' ? error.retryable : inferRetryable(code, status),
    message: error?.message || fallback.message || 'AI service is unavailable right now.',
    details: error?.details ?? fallback.details,
    cause: error,
  });
}

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - RATE_LIMIT.windowMs) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT.maxRequests) {
    const retryAfterMs = Math.max(1000, (requestTimestamps[0] + RATE_LIMIT.windowMs) - now);
    throw createAiError({
      code: AI_ERROR_CODES.CLIENT_RATE_LIMITED,
      message: 'Too many AI requests were sent from this browser. Please wait a moment and retry.',
      retryAfter: Math.ceil(retryAfterMs / 1000),
      retryable: true,
      status: 429,
    });
  }

  requestTimestamps.push(now);
}

function validateInput(messages) {
  const totalLength = messages.reduce((sum, message) => sum + (message?.content?.length || 0), 0);
  if (totalLength > MAX_INPUT_LENGTH) {
    throw createAiError({
      code: AI_ERROR_CODES.INPUT_TOO_LONG,
      message: `This AI request is too large (${totalLength} chars, max ${MAX_INPUT_LENGTH}). Shorten it and try again.`,
      status: 400,
      retryable: false,
      details: { totalLength, maxLength: MAX_INPUT_LENGTH },
    });
  }
}

function getCacheKey(task, prompt) {
  return `${task}::${prompt}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractProxyError(response, parsedBody, responseText) {
  const payloadError = typeof parsedBody?.error === 'object'
    ? parsedBody.error
    : null;
  const message = payloadError?.message
    || (typeof parsedBody?.error === 'string' ? parsedBody.error : '')
    || parsedBody?.message
    || `AI request failed with status ${response.status}.`;
  const code = mapLegacyCode(payloadError?.code, response.status);
  const retryAfter = payloadError?.retryAfter ?? parseRetryAfter(response.headers.get('retry-after'), undefined);

  return createAiError({
    code,
    message,
    status: payloadError?.status || response.status,
    retryAfter,
    retryable: typeof payloadError?.retryable === 'boolean' ? payloadError.retryable : inferRetryable(code, response.status),
    details: payloadError?.details ?? { responseText: String(responseText || '').slice(0, 1000) },
  });
}

async function fetchProxy(endpoint, init = {}, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const authHeaders = getRequestAuthHeaders();
    const response = await fetch(endpoint, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...authHeaders,
      },
      signal: controller?.signal,
    });
    const responseText = await response.text().catch(() => '');
    const parsedBody = tryParseJson(responseText);

    if (!response.ok) {
      throw extractProxyError(response, parsedBody, responseText);
    }

    return { response, responseText, parsedBody };
  } catch (error) {
    if (error?.name === 'AIError') {
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw createAiError({
        code: AI_ERROR_CODES.TIMEOUT_ERROR,
        message: 'The AI service took too long to respond.',
        retryable: true,
        status: 504,
      });
    }
    throw createAiError({
      code: AI_ERROR_CODES.NETWORK_ERROR,
      message: 'Unable to reach the AI API. Run `npm run dev:stack` so Vite can proxy `/api/*` to `vercel dev`.',
      retryable: true,
      details: { originalMessage: error?.message || 'Unknown network error' },
      cause: error,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function proxyRequest({ model, messages, temperature = 0.7, maxTokens = 1024, jsonMode = false }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const { parsedBody, responseText } = await fetchProxy('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  try {
    const { incrementUsage } = await import('../storage/local-store');
    incrementUsage('aiCalls');
  } catch (_) {}

  const content = parsedBody?.choices?.[0]?.message?.content
    ?? parsedBody?.text
    ?? parsedBody?.message
    ?? responseText;

  if (!String(content || '').trim()) {
    throw createAiError({
      code: AI_ERROR_CODES.EMPTY_RESPONSE,
      message: 'The AI returned an empty response.',
      retryable: true,
    });
  }

  return String(content);
}

export async function generate({
  task,
  messages,
  temperature = 0.7,
  maxTokens = 1024,
  jsonMode = false,
  useCache = true,
}) {
  const route = TASK_ROUTES[task];
  if (!route) {
    throw createAiError({
      code: AI_ERROR_CODES.BAD_REQUEST,
      message: `Unknown AI task: "${task}".`,
      status: 400,
    });
  }

  checkRateLimit();
  validateInput(messages);

  const promptKey = messages.map((message) => message.content).join('|');
  const cacheKey = getCacheKey(task, promptKey);

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const modelChain = [route.model, ...route.fallback];
  let lastError = null;

  for (const model of modelChain) {
    try {
      const result = await proxyRequest({ model, messages, temperature, maxTokens, jsonMode });
      if (useCache) setCache(cacheKey, result);
      return result;
    } catch (error) {
      const normalized = normalizeAiError(error);
      lastError = normalized;

      if (normalized.code === AI_ERROR_CODES.RATE_LIMITED && (normalized.retryAfter || 0) <= 5) {
        await delay((normalized.retryAfter || 2) * 1000);
        try {
          const retryResult = await proxyRequest({ model, messages, temperature, maxTokens, jsonMode });
          if (useCache) setCache(cacheKey, retryResult);
          return retryResult;
        } catch (retryError) {
          lastError = normalizeAiError(retryError);
        }
      }

      if (NON_FALLBACK_ERROR_CODES.has(lastError.code)) {
        break;
      }
    }
  }

  throw normalizeAiError(lastError, {
    code: AI_ERROR_CODES.UNKNOWN_AI_ERROR,
    message: 'The AI request failed across all available models.',
  });
}

export function parseJsonResponse(text) {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return JSON.parse(cleaned);
}

export async function generateText(options) {
  try {
    const text = await generate({ ...options, jsonMode: false });
    const normalized = String(text || '').trim();
    if (!normalized) {
      throw createAiError({
        code: AI_ERROR_CODES.EMPTY_RESPONSE,
        message: 'The AI returned an empty response.',
        retryable: true,
      });
    }
    return normalized;
  } catch (error) {
    throw normalizeAiError(error);
  }
}

export async function generateJson(options) {
  try {
    const raw = await generate({ ...options, jsonMode: true });
    return parseJsonResponse(String(raw || ''));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createAiError({
        code: AI_ERROR_CODES.INVALID_JSON,
        message: 'The AI returned unreadable JSON.',
        retryable: true,
        cause: error,
      });
    }
    if (error?.code === AI_ERROR_CODES.INVALID_JSON) {
      throw error;
    }
    if (error?.message?.includes?.('JSON')) {
      throw createAiError({
        code: AI_ERROR_CODES.INVALID_JSON,
        message: 'The AI returned unreadable JSON.',
        retryable: true,
        cause: error,
      });
    }
    throw normalizeAiError(error);
  }
}

export async function transcribeAudio(audioBlob) {
  checkRateLimit();

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', MODELS.WHISPER);
  formData.append('response_format', 'json');

  try {
    const { parsedBody, responseText } = await fetchProxy('/api/ai/transcribe', {
      method: 'POST',
      body: formData,
    });
    const text = parsedBody?.text || parsedBody?.message || responseText;
    if (!String(text || '').trim()) {
      throw createAiError({
        code: AI_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: 'Audio transcription returned no text.',
        retryable: true,
      });
    }
    return String(text).trim();
  } catch (error) {
    throw normalizeAiError(error, {
      code: AI_ERROR_CODES.TRANSCRIPTION_FAILED,
      message: 'Audio transcription failed.',
    });
  }
}

export function isRetryableAiError(error) {
  return Boolean(normalizeAiError(error).retryable);
}

export function getAiErrorMessage(error, fallback = 'AI service is unavailable right now.') {
  const normalized = normalizeAiError(error, { message: fallback });

  if (normalized.code === AI_ERROR_CODES.CONFIG_MISSING) {
    return 'AI is not configured on the server. Pull Vercel envs with `npm run env:pull`, then restart `npm run dev:stack`.';
  }
  if (normalized.code === AI_ERROR_CODES.AUTH_REQUIRED) {
    return 'Your session expired or you are signed out. Sign in again, then retry the AI action.';
  }
  if ([AI_ERROR_CODES.RATE_LIMITED, AI_ERROR_CODES.CLIENT_RATE_LIMITED].includes(normalized.code)) {
    return `The AI is busy right now. Wait ${normalized.retryAfter || 2}s and try again.`;
  }
  if (normalized.code === AI_ERROR_CODES.NETWORK_ERROR) {
    return 'Unable to reach the AI API. Start the full local stack with `npm run dev:stack` and try again.';
  }
  if (normalized.code === AI_ERROR_CODES.TIMEOUT_ERROR) {
    return 'The AI service timed out. Please try again.';
  }
  if (normalized.code === AI_ERROR_CODES.UPSTREAM_AUTH_ERROR) {
    return 'The server-side AI credentials were rejected. Update `GROQ_API_KEY` in Vercel and re-pull envs locally.';
  }
  if (normalized.code === AI_ERROR_CODES.UPSTREAM_ERROR) {
    return 'The AI provider is temporarily unavailable. Please retry shortly.';
  }
  if (normalized.code === AI_ERROR_CODES.INPUT_TOO_LONG) {
    return normalized.message;
  }
  if (normalized.code === AI_ERROR_CODES.INVALID_JSON) {
    return 'The AI returned an unreadable response. Please try again.';
  }
  if (normalized.code === AI_ERROR_CODES.EMPTY_RESPONSE) {
    return 'The AI returned an empty response. Please try again.';
  }
  return normalized.message || fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
