// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security';

export const config = {
  maxDuration: 10,
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const RATE_LIMIT = { max: 8, windowMs: 60_000 };
const buckets = new Map();
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 14_000;
const MAX_IMAGES = 5;
const MAX_IMAGE_ARTIFACT_CHARS = 4_100_000;

const SYSTEM_PROMPT = [
  'You are FormMate image parser.',
  'Extract only visible form fields from screenshots and return strict JSON.',
  'Schema:',
  '{',
  '  "title": string,',
  '  "description": string,',
  '  "nextStepRequired": boolean,',
  '  "nextStepHint": string,',
  '  "warnings": string[],',
  '  "questions": [',
  '    {',
  '      "id": string,',
  '      "text": string,',
  '      "type": "short_text"|"long_text"|"email"|"phone"|"number"|"date"|"dropdown"|"radio"|"checkbox"|"file_upload"|"unknown_type",',
  '      "required": boolean,',
  '      "options": string[]',
  '    }',
  '  ]',
  '}',
  'Rules:',
  '- Keep visible order top-to-bottom, left-to-right.',
  '- Infer required=true only when clearly indicated.',
  '- Include options only for dropdown/radio/checkbox fields.',
  '- If a field type is unclear use unknown_type.',
  '- Include no text outside JSON.',
].join('\n');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

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

function createWarning(code, level, message) {
  return {
    code: String(code || 'IMAGE_PARSE_MESSAGE'),
    level: level || 'warning',
    message: String(message || ''),
  };
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
  if (raw.length > MAX_IMAGE_ARTIFACT_CHARS) return null;

  if (isImageDataUrl(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  const direct = safeJsonParse(text);
  if (direct) return direct;

  const cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const fromCleaned = safeJsonParse(cleaned);
  if (fromCleaned) return fromCleaned;

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return safeJsonParse(cleaned.slice(start, end + 1));
  }
  return null;
}

function mapQuestionType(rawType, options) {
  const normalized = String(rawType || '').trim().toLowerCase();
  const map = {
    text: 'short_text',
    short_text: 'short_text',
    textarea: 'long_text',
    long_text: 'long_text',
    email: 'email',
    tel: 'phone',
    phone: 'phone',
    number: 'number',
    date: 'date',
    datetime: 'date',
    select: 'dropdown',
    dropdown: 'dropdown',
    radio: 'radio',
    checkbox: 'checkbox',
    multi_select: 'checkbox',
    file: 'file_upload',
    file_upload: 'file_upload',
    unknown: 'unknown_type',
    unknown_type: 'unknown_type',
  };

  if (map[normalized]) return map[normalized];
  if (Array.isArray(options) && options.length > 0) return 'dropdown';
  return 'short_text';
}

function normalizeOption(option) {
  if (typeof option === 'string') return option.trim();
  if (typeof option?.label === 'string') return option.label.trim();
  if (typeof option?.value === 'string') return option.value.trim();
  return '';
}

function normalizeQuestions(rawQuestions) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  return questions
    .slice(0, 120)
    .map((question, index) => {
      if (!question || typeof question !== 'object') return null;

      const text = String(question.text || question.label || question.question || '').trim();
      if (!text) return null;

      const options = Array.isArray(question.options)
        ? question.options.map(normalizeOption).filter(Boolean).slice(0, 80)
        : [];

      return {
        id: String(question.id || index + 1),
        text: text.slice(0, 220),
        type: mapQuestionType(question.type, options),
        required: Boolean(question.required),
        options,
      };
    })
    .filter(Boolean);
}

function buildConfidence(questions, nextStepRequired) {
  const total = questions.length;
  const unknownCount = questions.filter((question) => question.type === 'unknown_type').length;
  const unknownRatio = total ? unknownCount / total : 1;

  const fieldDetection = clamp(0.45 + Math.min(0.32, total * 0.035), 0.15, 0.88);
  const uiClassification = clamp(fieldDetection - unknownRatio * 0.24, 0.2, 0.84);
  const semanticClassification = clamp(uiClassification - 0.12, 0.2, 0.78);
  const fillPolicy = clamp(semanticClassification + 0.05, 0.24, 0.82);
  const completeness = nextStepRequired ? 0.44 : 0.6;
  const overall = clamp(
    (fieldDetection + uiClassification + semanticClassification + fillPolicy + completeness) / 5,
    0,
    1,
  );

  return {
    overall,
    fieldDetection,
    uiClassification,
    semanticClassification,
    fillPolicy,
    completeness,
  };
}

function buildUnsupportedPayload({ message, nextStepHint, attemptedModels = [], imageCount = 0 }) {
  return {
    parseStatus: 'unsupported',
    completeness: 'partial_structure',
    unsupportedReasons: ['image_incomplete'],
    nextAction: 'upload_screenshots',
    nextStepRequired: true,
    nextStepHint: nextStepHint || 'Upload clearer screenshots, including any next pages or hidden sections.',
    warnings: [
      createWarning('IMAGE_EXTRACT_INSUFFICIENT', 'warning', message || 'Image extraction could not recover reliable fields.'),
    ],
    confidence: {
      overall: 0.22,
      fieldDetection: 0.24,
      uiClassification: 0.2,
      semanticClassification: 0.2,
      fillPolicy: 0.2,
      completeness: 0.24,
    },
    canonicalForm: null,
    legacyFormData: null,
    diagnostics: {
      authSignal: false,
      renderSignal: true,
      aiFallbackUsed: true,
      extractionWarnings: [message || 'Image extraction produced no fields.'],
      parseStrategy: 'image_llm_extract',
      attemptedModels,
      imageCount,
    },
    parseStrategy: 'image_llm_extract',
  };
}

function buildLegacyFormData({ sourceUrl, title, description, questions, supportState, diagnostics }) {
  return {
    title: title || 'Parsed Screenshot Form',
    description: description || '',
    url: sourceUrl || '',
    source: 'Image Upload',
    parseStrategy: 'image_llm_extract',
    authRequired: false,
    supportState,
    diagnostics,
    questions,
  };
}

function getVisionModelChain() {
  const configured = String(process.env.FORMMATE_IMAGE_MODELS || process.env.FORMMATE_IMAGE_MODEL || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  return [
    'meta-llama/llama-4-scout-17b-16e-instruct',
  ];
}

function getUpstreamErrorMessage(payload, fallbackText) {
  return payload?.error?.message || payload?.message || String(fallbackText || '').slice(0, 240) || 'Upstream error';
}

async function requestVisionExtraction({ model, images, sourceUrl }) {
  const userParts = [{
    type: 'text',
    text: [
      'Parse the provided form screenshots.',
      `Image count: ${images.length}`,
      sourceUrl ? `Source URL: ${sourceUrl}` : 'Source URL: unknown',
    ].join('\n'),
  }];
  images.forEach((url) => {
    userParts.push({
      type: 'image_url',
      image_url: { url },
    });
  });

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userParts },
      ],
    }),
    signal: getAbortSignal(REQUEST_TIMEOUT_MS),
  });

  const responseText = await response.text();
  const payload = safeJsonParse(responseText);
  if (!response.ok) {
    const error = new Error(getUpstreamErrorMessage(payload, responseText));
    error.status = response.status;
    error.model = model;
    error.payload = payload;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== 'object') {
    const error = new Error('Vision model returned unreadable JSON.');
    error.status = 502;
    error.model = model;
    error.payload = payload;
    throw error;
  }

  return parsed;
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-FormMate-Session, X-FormMate-Dev-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST is supported for image extraction.',
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
        message: 'Too many image parsing requests. Please wait and retry.',
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

    if (!process.env.GROQ_API_KEY) {
      return sendError(res, 500, {
        code: 'CONFIG_MISSING',
        message: 'Image extraction service is not configured.',
        retryable: false,
      });
    }

    const sourceUrl = String(req.body?.sourceUrl || '').trim();
    const rawImages = Array.isArray(req.body?.images) ? req.body.images : [];
    const images = rawImages.map(normalizeImageArtifact).filter(Boolean).slice(0, MAX_IMAGES);

    if (!images.length) {
      return sendError(res, 400, {
        code: 'BAD_REQUEST',
        message: 'images[] must include at least one valid image artifact.',
        retryable: false,
      });
    }

    const attemptedModels = [];
    let modelUsed = '';
    let parsed = null;
    let lastError = null;

    for (const model of getVisionModelChain()) {
      attemptedModels.push(model);
      try {
        parsed = await requestVisionExtraction({
          model,
          images,
          sourceUrl,
        });
        modelUsed = model;
        break;
      } catch (error) {
        lastError = error;
        if (error?.status === 401 || error?.status === 403) {
          break;
        }
      }
    }

    if (!parsed) {
      const fallbackMessage = lastError?.message || 'All vision models failed while extracting fields.';
      return sendJson(res, 200, buildUnsupportedPayload({
        message: fallbackMessage,
        attemptedModels,
        imageCount: images.length,
      }));
    }

    const questions = normalizeQuestions(parsed.questions || parsed.fields);
    if (!questions.length) {
      return sendJson(res, 200, buildUnsupportedPayload({
        message: 'No parseable fields were detected in the uploaded screenshots.',
        nextStepHint: 'Upload clearer screenshots and include all pages/steps of the form.',
        attemptedModels,
        imageCount: images.length,
      }));
    }

    const nextStepRequired = Boolean(parsed.nextStepRequired || parsed.hasMoreSteps || parsed.multiStep);
    const nextStepHint = String(parsed.nextStepHint || '').trim() || (
      nextStepRequired
        ? 'Additional form steps were inferred. Upload screenshots for remaining steps.'
        : 'Image parse reflects visible fields only.'
    );

    const unknownTypeCount = questions.filter((question) => question.type === 'unknown_type').length;
    const warningTexts = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((warning) => String(warning || '').trim()).filter(Boolean)
      : [];
    if (unknownTypeCount > 0) {
      warningTexts.push(`${unknownTypeCount} field(s) had unclear control type and were marked as unknown.`);
    }

    const warnings = warningTexts
      .slice(0, 12)
      .map((warning, index) => createWarning(`IMAGE_WARNING_${index + 1}`, 'warning', warning));

    const confidence = buildConfidence(questions, nextStepRequired);
    const parseStatus = 'partial';
    const completeness = 'visible_step_only';
    const supportState = 'partial';
    const diagnostics = {
      authSignal: false,
      renderSignal: true,
      aiFallbackUsed: true,
      extractionWarnings: warningTexts,
      parseStrategy: 'image_llm_extract',
      modelUsed,
      attemptedModels,
      imageCount: images.length,
    };
    const legacyFormData = buildLegacyFormData({
      sourceUrl,
      title: String(parsed.title || '').trim() || 'Parsed Screenshot Form',
      description: String(parsed.description || '').trim(),
      questions,
      supportState,
      diagnostics,
    });

    return sendJson(res, 200, {
      parseStatus,
      completeness,
      unsupportedReasons: [],
      nextAction: nextStepRequired ? 'upload_screenshots' : 'none',
      nextStepRequired,
      nextStepHint,
      warnings,
      confidence,
      canonicalForm: null,
      legacyFormData,
      diagnostics,
      parseStrategy: 'image_llm_extract',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ImageExtract] Error:', message);
    const isAbort = error?.name === 'AbortError' || message.toLowerCase().includes('aborted');
    return sendError(res, isAbort ? 504 : 500, {
      code: isAbort ? 'TIMEOUT_ERROR' : 'IMAGE_EXTRACT_ERROR',
      message: isAbort
        ? 'Image extraction timed out before completion.'
        : 'Unexpected image extraction failure.',
      retryable: true,
    });
  }
}
