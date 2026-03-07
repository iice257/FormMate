// ═══════════════════════════════════════════
// FormMate — AI Service Layer (Multi-Model Router)
// ═══════════════════════════════════════════
//
// Central router for all AI operations.
// Routes requests to the optimal Groq model based on task type,
// with automatic fallback chains, caching, and retry logic.
//
// Model Assignment:
//   gpt-oss-120b      → heavy reasoning (form understanding, intent)
//   gpt-oss-20b       → standard generation (answers, regeneration)
//   qwen-2.5-32b      → conversational copilot (chat, editing)
//   qwen-2.5-7b       → fast lightweight (quick edits, formatting)
//   whisper-large-v3   → speech-to-text
// ═══════════════════════════════════════════

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ─── Model Registry ──────────────────────────

const MODELS = {
  HEAVY: 'gpt-oss-120b',
  STANDARD: 'gpt-oss-20b',
  COPILOT: 'qwen-2.5-32b',
  FAST: 'qwen-2.5-7b',
  WHISPER: 'whisper-large-v3',
};

// ─── Task → Model Routing Table ──────────────

const TASK_ROUTES = {
  'form_understanding': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'question_intent': { model: MODELS.HEAVY, fallback: [MODELS.STANDARD, MODELS.COPILOT] },
  'answer_generation': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'regeneration': { model: MODELS.STANDARD, fallback: [MODELS.COPILOT, MODELS.FAST] },
  'copilot_chat': { model: MODELS.COPILOT, fallback: [MODELS.FAST, MODELS.STANDARD] },
  'quick_edit': { model: MODELS.FAST, fallback: [MODELS.COPILOT] },
  'voice_transcription': { model: MODELS.WHISPER, fallback: [] },
};

// ─── Response Cache (LRU) ────────────────────

const CACHE_MAX = 100;
const cache = new Map();

function getCacheKey(task, prompt) {
  // Simple hash: task + first 200 chars of prompt
  return `${task}::${prompt.substring(0, 200)}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  // TTL: 10 minutes
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    cache.delete(key);
    return null;
  }
  // LRU: move to end
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= CACHE_MAX) {
    // Delete oldest entry
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Core API Request ────────────────────────

/**
 * Make a request to the Groq API with a specific model.
 * @param {Object} options
 * @param {string} options.model - Groq model ID
 * @param {Array} options.messages - Chat messages
 * @param {string} options.apiKey - Groq API key
 * @param {number} [options.temperature=0.7] - Sampling temperature
 * @param {number} [options.maxTokens=1024] - Max response tokens
 * @param {boolean} [options.jsonMode=false] - Request JSON response format
 * @returns {Promise<string>} Raw response text
 */
async function groqRequest({ model, messages, apiKey, temperature = 0.7, maxTokens = 1024, jsonMode = false }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    // Rate limited — extract retry-after if available
    const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
    throw { type: 'RATE_LIMITED', retryAfter, status: 429 };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw { type: 'API_ERROR', status: response.status, body: errorBody };
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Public API: AIService.generate() ────────

/**
 * Central AI service entry point.
 * Routes to the correct model based on task type,
 * handles retries, fallbacks, and caching.
 *
 * @param {Object} options
 * @param {string} options.task - Task type (key from TASK_ROUTES)
 * @param {Array} options.messages - Chat messages for the model
 * @param {string} options.apiKey - Groq API key
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.maxTokens=1024]
 * @param {boolean} [options.jsonMode=false] - Force JSON response
 * @param {boolean} [options.useCache=true] - Whether to use response caching
 * @returns {Promise<string>} Model response text
 */
export async function generate({
  task,
  messages,
  apiKey,
  temperature = 0.7,
  maxTokens = 1024,
  jsonMode = false,
  useCache = true,
}) {
  const route = TASK_ROUTES[task];
  if (!route) {
    throw new Error(`[AIService] Unknown task: "${task}"`);
  }

  // Check cache
  const promptKey = messages.map(m => m.content).join('|');
  const cacheKey = getCacheKey(task, promptKey);

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[AIService] Cache hit for ${task}`);
      return cached;
    }
  }

  // Build model chain: primary + fallbacks
  const modelChain = [route.model, ...route.fallback];

  let lastError = null;

  for (const model of modelChain) {
    try {
      console.log(`[AIService] ${task} → ${model}`);

      const result = await groqRequest({
        model,
        messages,
        apiKey,
        temperature,
        maxTokens,
        jsonMode,
      });

      // Cache successful result
      if (useCache) {
        setCache(cacheKey, result);
      }

      return result;

    } catch (err) {
      lastError = err;

      if (err.type === 'RATE_LIMITED') {
        console.warn(`[AIService] Rate limited on ${model}, waiting ${err.retryAfter}s...`);
        await delay(err.retryAfter * 1000);

        // Retry same model once after waiting
        try {
          const retryResult = await groqRequest({
            model, messages, apiKey, temperature, maxTokens, jsonMode,
          });
          if (useCache) setCache(cacheKey, retryResult);
          return retryResult;
        } catch (retryErr) {
          console.warn(`[AIService] Retry failed on ${model}, trying fallback...`);
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

/**
 * Parse a structured JSON response from an AI model.
 * Handles markdown code fences, trailing text, etc.
 */
export function parseJsonResponse(text) {
  // Strip markdown code fences
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Try to find JSON object/array in the text
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned);
}

// ─── Voice Transcription ─────────────────────

/**
 * Transcribe audio using Whisper via Groq API.
 * @param {Blob} audioBlob - Audio data (webm, wav, mp3, etc.)
 * @param {string} apiKey - Groq API key
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBlob, apiKey) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', MODELS.WHISPER);
  formData.append('response_format', 'json');

  const response = await fetch(GROQ_AUDIO_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

// ─── Utilities ───────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export model names for reference
export { MODELS, TASK_ROUTES };
