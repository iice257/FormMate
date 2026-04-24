// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security.js';
import { AI_MODELS } from '../_shared/ai-policy.js';

export const config = {
  maxDuration: 10,
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 13_000;
const MAX_IMAGES = 5;
const MAX_IMAGE_CHARS = 4_100_000;
const RATE_LIMIT = { max: 10, windowMs: 60_000 };
const buckets = new Map();
const ALLOWED_SURFACES = new Set(['workspace', 'ai-chat']);

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req, surface) {
  const ip = getClientIp(req);
  const key = `${ip}:${surface || 'unknown'}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT.max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
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

function sendError(res, status, code, message, details = undefined) {
  return sendJson(res, status, {
    error: {
      code,
      message,
      status,
      retryable: status >= 500 || status === 429 || status === 408,
      details,
    },
  });
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

function isImageDataUrl(value) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function normalizeImageArtifact(item) {
  const raw = typeof item === 'string'
    ? item.trim()
    : typeof item?.url === 'string'
      ? item.url.trim()
      : '';
  if (!raw) return null;
  if (raw.length > MAX_IMAGE_CHARS) return null;
  if (isImageDataUrl(raw)) return raw;

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getVisionModelChain() {
  const configured = String(process.env.FORMMATE_CHAT_VISION_MODELS || process.env.FORMMATE_CHAT_VISION_MODEL || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (configured.length) return configured;
  return [AI_MODELS.VISION_LIGHT];
}

function buildPrompt({ prompt, formTitle, activeFieldText }) {
  const lines = [
    'You are FormMate visual context assistant.',
    'Summarize only visible form-relevant content from provided screenshots.',
    'Return strict JSON only with this schema:',
    '{',
    '  "summary": string,',
    '  "detectedFields": [{ "label": string, "typeHint": string, "valueHint": string }],',
    '  "warnings": string[]',
    '}',
    'Rules:',
    '- Keep summary under 180 words.',
    '- Focus on fields, labels, options, and constraints relevant for form completion.',
    '- Ignore decorative content.',
  ];

  if (formTitle) lines.push(`Form title hint: ${String(formTitle).slice(0, 220)}`);
  if (activeFieldText) lines.push(`Active field hint: ${String(activeFieldText).slice(0, 420)}`);
  if (prompt) lines.push(`User request: ${String(prompt).slice(0, 900)}`);

  return lines.join('\n');
}

function normalizePayload(parsed) {
  const fields = Array.isArray(parsed?.detectedFields)
    ? parsed.detectedFields.slice(0, 25).map((entry) => ({
      label: String(entry?.label || '').trim().slice(0, 220),
      typeHint: String(entry?.typeHint || entry?.type || '').trim().slice(0, 80),
      valueHint: String(entry?.valueHint || '').trim().slice(0, 260),
    })).filter((entry) => entry.label)
    : [];

  return {
    summary: String(parsed?.summary || '').trim().slice(0, 1600),
    detectedFields: fields,
    warnings: Array.isArray(parsed?.warnings)
      ? parsed.warnings.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 8)
      : [],
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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');

  try {
    if (!(await assertTrustedAppSignal(req, res, 'Access denied.'))) return;
    if (req.headers.origin && !allowedOrigin) {
      return sendError(res, 403, 'ORIGIN_NOT_ALLOWED', 'Origin not allowed.');
    }
    if (!process.env.GROQ_API_KEY) {
      return sendError(res, 500, 'CONFIG_MISSING', 'Vision context service is not configured.');
    }

    const surface = String(req.body?.surface || '').trim();
    if (!ALLOWED_SURFACES.has(surface)) {
      return sendError(res, 400, 'BAD_REQUEST', 'surface must be one of workspace or ai-chat.');
    }

    const rl = rateLimit(req, surface);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 2));
      return sendError(res, 429, 'RATE_LIMITED', 'Too many vision context requests.');
    }

    const rawImages = Array.isArray(req.body?.images) ? req.body.images : [];
    const images = rawImages.map(normalizeImageArtifact).filter(Boolean).slice(0, MAX_IMAGES);
    if (!images.length) {
      return sendError(res, 400, 'BAD_REQUEST', 'images[] must include at least one valid image artifact.');
    }

    const systemPrompt = buildPrompt({
      prompt: req.body?.prompt,
      formTitle: req.body?.formTitle,
      activeFieldText: req.body?.activeFieldText,
    });

    const userContent = [{
      type: 'text',
      text: `Surface: ${surface}\nImage count: ${images.length}`,
    }];
    images.forEach((url) => userContent.push({ type: 'image_url', image_url: { url } }));

    let lastError = null;
    const attemptedModels = [];
    for (const model of getVisionModelChain()) {
      attemptedModels.push(model);
      const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
        signal: getAbortSignal(REQUEST_TIMEOUT_MS),
      });

      const responseText = await response.text();
      const payload = safeJsonParse(responseText);
      if (!response.ok) {
        lastError = payload?.error?.message || responseText.slice(0, 240) || `HTTP ${response.status}`;
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
        continue;
      }

      const modelContent = payload?.choices?.[0]?.message?.content || '';
      const parsed = safeJsonParse(modelContent) || safeJsonParse(String(modelContent).replace(/```json/gi, '').replace(/```/g, '').trim());
      if (!parsed || typeof parsed !== 'object') {
        lastError = 'Vision model returned unreadable JSON.';
        continue;
      }

      return sendJson(res, 200, {
        summary: normalizePayload(parsed).summary,
        detectedFields: normalizePayload(parsed).detectedFields,
        warnings: normalizePayload(parsed).warnings,
        diagnostics: {
          surface,
          attemptedModels,
          imageCount: images.length,
        },
      });
    }

    return sendError(res, 502, 'VISION_CONTEXT_FAILED', 'Could not extract image context.', {
      message: lastError || 'All models failed.',
      attemptedModels,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isAbort = error?.name === 'AbortError' || message.toLowerCase().includes('aborted');
    return sendError(
      res,
      isAbort ? 504 : 500,
      isAbort ? 'TIMEOUT_ERROR' : 'VISION_CONTEXT_ERROR',
      isAbort ? 'Vision context request timed out.' : 'Unexpected vision context failure.',
    );
  }
}

