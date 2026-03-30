// @ts-nocheck
// FormMate AI Service Layer (Multi-Model Router)
//
// Central router for all AI operations.
// Routes through the backend proxy (/api/ai/*) to keep
// the API key server-side. Includes fallback chains,
// caching, rate limiting, and input validation.
//
// Model Assignment (Groq vendor-prefixed IDs):
//   openai/gpt-oss-120b   -> heavy reasoning
//   openai/gpt-oss-20b    -> standard generation
//   qwen/qwen3-32b        -> conversational copilot
//   llama-3.1-8b-instant  -> fast lightweight
//   whisper-large-v3      -> speech-to-text

// Model registry (vendor-prefixed for Groq)

// Model Assignment
export const MODELS = {
  HEAVY: 'llama-3.3-70b-versatile',
  STANDARD: 'llama-3.1-8b-instant',
  COPILOT: 'mixtral-8x7b-32768',
  FAST: 'llama3-8b-8192',
  WHISPER: 'whisper-large-v3',
};

// Task -> model routing table

export const TASK_ROUTES = {
  'form_parsing': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'question_intent': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'answer_generation': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'regeneration': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'copilot_chat': { model: MODELS.COPILOT, fallback: [MODELS.FAST, MODELS.STANDARD] },
  'quick_edit': { model: MODELS.FAST, fallback: [MODELS.COPILOT] },
  'docs_chat': { model: MODELS.FAST, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'voice_transcription': { model: MODELS.WHISPER, fallback: [] },
};

// Client-side rate limiter

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };
const requestTimestamps = [];
const REQUEST_TIMEOUT_MS = 20_000;

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - RATE_LIMIT.windowMs) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT.maxRequests) {
    throw new Error('[AIService] Client rate limit exceeded - please wait a moment');
  }
  requestTimestamps.push(now);
}

// Input validation

const MAX_INPUT_LENGTH = 15_000;

function validateInput(messages) {
  const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  if (totalLength > MAX_INPUT_LENGTH) {
    throw new Error(`[AIService] Input too long (${totalLength} chars, max ${MAX_INPUT_LENGTH})`);
  }
}

// Response cache (LRU)

const CACHE_MAX = 100;
const cache = new Map();

function getCacheKey(task, prompt) {
  // Use a simple hash or the full string to avoid collisions on long system prompts
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

// Core API request (via proxy)

async function proxyRequest({ model, messages, temperature = 0.7, maxTokens = 1024, jsonMode = false }) {
  const body = { model, messages, temperature, max_tokens: maxTokens };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let response;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    response = await fetch(`/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw { type: 'TIMEOUT_ERROR', message: 'Request timed out' };
    }
    throw { type: 'NETWORK_ERROR', message: error?.message || 'Network request failed' };
  }
  if (timeoutId) clearTimeout(timeoutId);

  const responseText = await response.text().catch(() => '');
  const parsedBody = tryParseJson(responseText);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
    throw { type: 'RATE_LIMITED', retryAfter, status: 429 };
  }

  if (!response.ok) {
    throw {
      type: 'API_ERROR',
      status: response.status,
      body: responseText,
      message: parsedBody?.error || parsedBody?.message || `Request failed with status ${response.status}`
    };
  }

  // Best-effort usage tracking (local). Avoid failing the request on storage errors.
  try {
    const { incrementUsage } = await import('../storage/local-store');
    incrementUsage('aiCalls');
  } catch (_) { /* no-op */ }

  const content = parsedBody?.choices?.[0]?.message?.content
    ?? parsedBody?.text
    ?? parsedBody?.message
    ?? responseText;

  if (!String(content || '').trim()) {
    throw { type: 'EMPTY_RESPONSE', message: 'The model returned an empty response' };
  }

  return String(content);
}

// Public API: generate()

export async function generate({
  task,
  messages,
  temperature = 0.7,
  maxTokens = 1024,
  jsonMode = false,
  useCache = true,
}) {
  const route = TASK_ROUTES[task];
  if (!route) throw new Error(`[AIService] Unknown task: "${task}"`);

  checkRateLimit();
  validateInput(messages);

  const promptKey = messages.map(m => m.content).join('|');
  const cacheKey = getCacheKey(task, promptKey);

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[AIService] Cache hit for ${task}`);
      return cached;
    }
  }

  const modelChain = [route.model, ...route.fallback];
  let lastError = null;

  for (const model of modelChain) {
    try {
      console.log(`[AIService] ${task} -> ${model}`);
      const result = await proxyRequest({ model, messages, temperature, maxTokens, jsonMode });
      if (useCache) setCache(cacheKey, result);
      return result;
    } catch (err) {
      lastError = err;
      if (err.type === 'RATE_LIMITED') {
        console.warn(`[AIService] Rate limited on ${model}, waiting ${err.retryAfter}s...`);
        await delay(err.retryAfter * 1000);
        try {
          const retryResult = await proxyRequest({ model, messages, temperature, maxTokens, jsonMode });
          if (useCache) setCache(cacheKey, retryResult);
          return retryResult;
        } catch (retryErr) {
          lastError = retryErr;
        }
      } else {
        console.warn(`[AIService] ${model} failed:`, err.body || err.message || err);
      }
    }
  }

  if (isDevAiFallbackEnabled()) {
    const fallbackResult = getDevFallbackResponse(task, messages, jsonMode);
    if (fallbackResult !== null) {
      console.warn(`[AIService] Falling back to dev mock response for ${task}`);
      return fallbackResult;
    }
  }

  if (lastError?.type === 'RATE_LIMITED') {
    const e = new Error(`[AIService] Rate limited. Try again in ${lastError.retryAfter || 2}s.`);
    e.code = 'RATE_LIMITED';
    e.retryAfter = lastError.retryAfter || 2;
    throw e;
  }

  if (lastError?.type === 'API_ERROR') {
    const e = new Error(`[AIService] Upstream error (${lastError.status}). Please retry.`);
    e.code = 'UPSTREAM_ERROR';
    e.status = lastError.status;
    e.body = lastError.body;
    e.retryable = lastError.status >= 500 || lastError.status === 408;
    throw e;
  }

  if (lastError?.type === 'NETWORK_ERROR') {
    const e = new Error('[AIService] Unable to reach the AI service. Start the API server or try again.');
    e.code = 'NETWORK_ERROR';
    e.retryable = true;
    throw e;
  }

  if (lastError?.type === 'TIMEOUT_ERROR') {
    const e = new Error('[AIService] The AI service took too long to respond. Please try again.');
    e.code = 'TIMEOUT_ERROR';
    e.retryable = true;
    throw e;
  }

  if (lastError?.type === 'EMPTY_RESPONSE') {
    const e = new Error('[AIService] The AI returned an empty response. Please try again.');
    e.code = 'EMPTY_RESPONSE';
    e.retryable = true;
    throw e;
  }

  throw new Error(`[AIService] All models failed for task "${task}". Last error: ${lastError?.body || lastError?.message || 'Unknown'}`);
}

// JSON response parser

export function parseJsonResponse(text) {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return JSON.parse(cleaned);
}

// Task-safe wrappers

export async function generateText(options) {
  const text = await generate({ ...options, jsonMode: false });
  const normalized = String(text || '').trim();
  if (!normalized) {
    const err = new Error('[AIService] The AI returned an empty response. Please try again.');
    err.code = 'EMPTY_RESPONSE';
    err.retryable = true;
    throw err;
  }
  return normalized;
}

export async function generateJson(options) {
  const raw = await generate({ ...options, jsonMode: true });
  try {
    return parseJsonResponse(String(raw || ''));
  } catch (e) {
    const err = new Error('[AIService] Model returned invalid JSON.');
    err.code = 'INVALID_JSON';
    err.cause = e;
    err.raw = String(raw || '').slice(0, 5000);
    throw err;
  }
}

// Voice transcription (via proxy)

export async function transcribeAudio(audioBlob) {
  checkRateLimit();

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', MODELS.WHISPER);
  formData.append('response_format', 'json');

  const response = await fetch(`/api/ai/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(`Whisper API error: ${response.status}`);
  const data = await response.json();
  return data.text || '';
}

// Utilities

function isDevAiFallbackEnabled() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return Boolean(import.meta.env.DEV) || host === 'localhost' || host === '127.0.0.1';
}

function getDevFallbackResponse(task, messages, jsonMode) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';

  if (jsonMode && task === 'form_parsing') {
    return JSON.stringify({
      title: 'Dev Parsed Form',
      description: 'Fallback response generated in local development.',
      questions: [
        { id: '1', text: 'Full name', type: 'short_text', options: [], required: true },
        { id: '2', text: 'Why are you interested?', type: 'long_text', options: [], required: false }
      ]
    });
  }

  const taskResponses = {
    answer_generation: 'Drafted a concise, professional answer based on your saved profile.',
    regeneration: 'Here is a fresh alternative with a slightly different emphasis and tone.',
    quick_edit: 'Updated the answer to better match your instruction while keeping the same meaning.',
    copilot_chat: `Dev Copilot fallback: I could not reach the live AI service, but I understood your request: "${truncate(lastUserMessage, 120)}".`,
    docs_chat: 'Dev Docs fallback: the live AI service is unavailable, but the Accounts, Vault, and Workspace guides cover the main flows.'
  };

  return taskResponses[task] || (jsonMode ? null : 'Dev fallback response');
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isRetryableAiError(error) {
  return Boolean(
    error?.retryable ||
    ['RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT_ERROR', 'UPSTREAM_ERROR', 'INVALID_JSON', 'EMPTY_RESPONSE'].includes(error?.code)
  );
}

export function getAiErrorMessage(error, fallback = 'AI service is unavailable right now.') {
  if (!error) return fallback;
  if (error.code === 'RATE_LIMITED') {
    return `The AI is busy right now. Please wait ${error.retryAfter || 2}s and try again.`;
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Unable to reach the AI service right now. Please check your connection and try again.';
  }
  if (error.code === 'TIMEOUT_ERROR') {
    return 'The AI took too long to respond. Please try again.';
  }
  if (error.code === 'UPSTREAM_ERROR') {
    return 'The AI service is temporarily unavailable. Please try again shortly.';
  }
  if (error.code === 'INVALID_JSON') {
    return 'The AI returned an unreadable response. Please try again.';
  }
  if (error.code === 'EMPTY_RESPONSE') {
    return 'The AI returned an empty response. Please try again.';
  }
  return error.message || fallback;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
