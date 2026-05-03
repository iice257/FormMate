// @ts-nocheck

export const FILL_BUCKET = Object.freeze({
  PROFILE: 'profile_fillable',
  AI: 'ai_draftable',
  MANUAL: 'manual',
  UNCERTAIN: 'uncertain',
});

const PROFILE_PATTERNS = [
  { pattern: /(^| )(full )?name( |$)|applicant name|your name/i, reason: 'Looks like a profile identity field.' },
  { pattern: /(^| )first name( |$)/i, reason: 'Looks like a profile first-name field.' },
  { pattern: /(^| )last name( |$)|surname/i, reason: 'Looks like a profile last-name field.' },
  { pattern: /(^| )email( address)?( |$)/i, reason: 'Looks like a profile email field.' },
  { pattern: /phone|mobile|telephone/i, reason: 'Looks like a profile phone field.' },
  { pattern: /linkedin|portfolio|github|website|personal site/i, reason: 'Looks like a reusable profile link.' },
  { pattern: /address|street|city|state|zip|postal|location|country|nationality/i, reason: 'Looks like reusable location/profile data.' },
  { pattern: /company|organization|employer|job title|current role|occupation/i, reason: 'Looks like reusable work/profile data.' },
];

const AI_PATTERNS = [
  { pattern: /why|describe|explain|tell us|motivation|statement|essay|cover letter|bio|about (you|yourself)/i, reason: 'Open-ended wording is useful for AI drafting.' },
  { pattern: /experience|background|skills|strengths|goals|challenge|project|accomplishment|interest/i, reason: 'Narrative answer is useful for AI drafting.' },
];

const MANUAL_PATTERNS = [
  { pattern: /salary|compensation|pay range|expected pay/i, reason: 'Compensation choices need explicit user input.' },
  { pattern: /availability|start date|when can you start|schedule/i, reason: 'Availability needs a current user decision.' },
  { pattern: /visa|sponsor|authorized to work|work authorization|eligibility/i, reason: 'Eligibility/legal answers need explicit user confirmation.' },
  { pattern: /consent|agree|terms|privacy|authorize|certify|signature/i, reason: 'Consent decisions must be made by the user.' },
  { pattern: /password|ssn|social security|credit card|payment/i, reason: 'Sensitive fields should not be drafted or autofilled by the parser.' },
];

const MANUAL_TYPES = new Set([
  'radio',
  'checkbox',
  'dropdown',
  'select',
  'scale',
  'linear_scale',
  'rating',
  'file_upload',
  'file',
  'date',
  'time',
  'multi_select',
]);

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clamp(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function findPatternMatch(text, entries) {
  for (const entry of entries) {
    if (entry.pattern.test(text)) return entry;
  }
  return null;
}

function isWeaklyLabeled(question) {
  const text = normalizeText(question?.text);
  const hints = question?.parserHints || {};
  if (!text) return true;
  if (/^question \d+$/i.test(text)) return true;
  if (hints.generatedLabel) return true;
  if (hints.placeholderLabel && text.length < 4) return true;
  return false;
}

export function classifyFillBucket(question) {
  const text = normalizeText([
    question?.text,
    question?.placeholder,
    question?.name,
    question?.id,
    Array.isArray(question?.options) ? question.options.join(' ') : '',
  ].filter(Boolean).join(' '));
  const type = String(question?.type || 'short_text').toLowerCase();

  if (isWeaklyLabeled(question) || type === 'unknown_type') {
    return {
      fillBucket: FILL_BUCKET.UNCERTAIN,
      bucketReason: 'Field label or type is too weak to classify safely.',
      bucketConfidence: 0.48,
    };
  }

  const manualMatch = findPatternMatch(text, MANUAL_PATTERNS);
  if (manualMatch) {
    return {
      fillBucket: FILL_BUCKET.MANUAL,
      bucketReason: manualMatch.reason,
      bucketConfidence: 0.9,
    };
  }

  if (MANUAL_TYPES.has(type)) {
    return {
      fillBucket: FILL_BUCKET.MANUAL,
      bucketReason: type === 'file_upload' || type === 'file'
        ? 'File uploads require an explicit user-provided file.'
        : 'Choice/date fields need an explicit user decision.',
      bucketConfidence: 0.86,
    };
  }

  const profileMatch = findPatternMatch(text, PROFILE_PATTERNS);
  if (profileMatch) {
    return {
      fillBucket: FILL_BUCKET.PROFILE,
      bucketReason: profileMatch.reason,
      bucketConfidence: 0.9,
    };
  }

  const aiMatch = findPatternMatch(text, AI_PATTERNS);
  if (aiMatch || type === 'long_text') {
    return {
      fillBucket: FILL_BUCKET.AI,
      bucketReason: aiMatch?.reason || 'Long text fields are useful for AI drafting.',
      bucketConfidence: aiMatch ? 0.86 : 0.78,
    };
  }

  return {
    fillBucket: FILL_BUCKET.UNCERTAIN,
    bucketReason: 'No reliable profile, AI, or manual rule matched this field.',
    bucketConfidence: 0.55,
  };
}

export function enrichQuestionWithFillBucket(question) {
  const existing = question?.parserHints || {};
  if (existing.fillBucket && existing.bucketReason) {
    return {
      ...question,
      parserHints: {
        ...existing,
        bucketConfidence: clamp(existing.bucketConfidence, 0.6),
      },
    };
  }

  const bucket = classifyFillBucket(question);
  return {
    ...question,
    parserHints: {
      ...existing,
      ...bucket,
    },
  };
}

export function summarizeFillBuckets(questions, warnings = []) {
  const summary = {
    total: Array.isArray(questions) ? questions.length : 0,
    profileFillable: 0,
    aiDraftable: 0,
    manual: 0,
    uncertain: 0,
    warnings: Array.isArray(warnings) ? warnings.map((warning) => warning?.message || warning).filter(Boolean) : [],
  };

  (Array.isArray(questions) ? questions : []).forEach((question) => {
    const bucket = question?.parserHints?.fillBucket || FILL_BUCKET.UNCERTAIN;
    if (bucket === FILL_BUCKET.PROFILE) summary.profileFillable += 1;
    else if (bucket === FILL_BUCKET.AI) summary.aiDraftable += 1;
    else if (bucket === FILL_BUCKET.MANUAL) summary.manual += 1;
    else summary.uncertain += 1;
  });

  return summary;
}

export function enrichLegacyFormDataWithFillPlan(legacyFormData, warnings = []) {
  if (!legacyFormData || typeof legacyFormData !== 'object') return legacyFormData;
  const questions = Array.isArray(legacyFormData.questions)
    ? legacyFormData.questions.map(enrichQuestionWithFillBucket)
    : [];
  const fillPlanSummary = summarizeFillBuckets(questions, warnings);

  return {
    ...legacyFormData,
    questions,
    fillPlanSummary,
    diagnostics: {
      ...(legacyFormData.diagnostics || {}),
      fillPlanSummary,
    },
  };
}
