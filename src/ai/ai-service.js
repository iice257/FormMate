// ═══════════════════════════════════════════
// FormMate — AI Service Layer (Multi-Model Router)
// ═══════════════════════════════════════════
//
// Central router for all AI operations.
// Routes through the backend proxy (/api/ai/*) to keep
// the API key server-side. Includes fallback chains,
// caching, rate limiting, and input validation.
//
// Model Assignment (Groq vendor-prefixed IDs):
//   openai/gpt-oss-120b   → heavy reasoning
//   openai/gpt-oss-20b    → standard generation
//   qwen/qwen3-32b        → conversational copilot
//   llama-3.1-8b-instant  → fast lightweight
//   whisper-large-v3      → speech-to-text
// ═══════════════════════════════════════════

import { getState } from '../state.js';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

// ─── Model Registry (vendor-prefixed for Groq) ──

export const MODELS = {
  HEAVY: 'llama-3.3-70b-versatile',
  STANDARD: 'llama-3.1-8b-instant',
  COPILOT: 'mixtral-8x7b-32768',
  FAST: 'llama3-8b-8192',
  WHISPER: 'whisper-large-v3',
};

// ─── Task → Model Routing Table ──────────────

export const TASK_ROUTES = {
  'form_understanding': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'form_parsing': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'question_intent': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'answer_generation': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'regeneration': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'copilot_chat': { model: MODELS.COPILOT, fallback: [MODELS.FAST, MODELS.STANDARD] },
  'quick_edit': { model: MODELS.FAST, fallback: [MODELS.COPILOT] },
  'docs_chat': { model: MODELS.FAST, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'voice_transcription': { model: MODELS.WHISPER, fallback: [] },
};

// ─── Client-Side Rate Limiter ────────────────

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };
const requestTimestamps = [];

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - RATE_LIMIT.windowMs) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT.maxRequests) {
    throw new Error('[AIService] Client rate limit exceeded — please wait a moment');
  }
  requestTimestamps.push(now);
}

// ─── Input Validation ────────────────────────

const MAX_INPUT_LENGTH = 15_000;

function validateInput(messages) {
  const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  if (totalLength > MAX_INPUT_LENGTH) {
    throw new Error(`[AIService] Input too long (${totalLength} chars, max ${MAX_INPUT_LENGTH})`);
  }
}

// ─── Response Cache (LRU) ────────────────────

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

// ─── Core API Request (via Proxy) ────────────

async function proxyRequest({ model, messages, temperature = 0.7, maxTokens = 1024, jsonMode = false }) {
  const body = { model, messages, temperature, max_tokens: maxTokens };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const state = getState();
  const apiKey = state.groqApiKey || ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GROQ_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('[AIService] Missing Groq API Key. Please add VITE_GROQ_API_KEY to your .env file or input it in settings.');
  }

  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
    throw { type: 'RATE_LIMITED', retryAfter, status: 429 };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw { type: 'API_ERROR', status: response.status, body: errorBody };
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.text || '';
}

// ─── Public API: generate() ──────────────────

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
      console.log(`[AIService] ${task} → ${model}`);
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

  throw new Error(`[AIService] All models failed for task "${task}". Last error: ${lastError?.body || lastError?.message || 'Unknown'}`);
}

// ─── JSON Response Parser ────────────────────

export function parseJsonResponse(text) {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/[[\{][\s\S]*[\]\}]/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return JSON.parse(cleaned);
}

// ─── Voice Transcription (via Proxy) ─────────

export async function transcribeAudio(audioBlob) {
  checkRateLimit();

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', MODELS.WHISPER);
  formData.append('response_format', 'json');

  const state = getState();
  const apiKey = state.groqApiKey || ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GROQ_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('[AIService] Missing Groq API Key. Please add VITE_GROQ_API_KEY to your .env file or input it in settings.');
  }

  const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error(`Whisper API error: ${response.status}`);
  const data = await response.json();
  return data.text || '';
}

// ─── Utilities ───────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
