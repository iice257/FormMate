// @ts-nocheck
import { getState } from '../state';

const PARSER_BUCKET_TO_CATEGORY = Object.freeze({
  profile_fillable: 'autofillable',
  ai_draftable: 'generatable',
  manual: 'manual_only',
  uncertain: 'manual_only',
});

const SEMANTIC_KEYWORDS = Object.freeze([
  { category: 'full_name', score: 0.95, pattern: /(^| )full name( |$)|applicant name/i },
  { category: 'full_name', score: 0.82, pattern: /(^| )name( |$)/i },
  { category: 'first_name', score: 0.95, pattern: /(^| )first name( |$)/i },
  { category: 'last_name', score: 0.95, pattern: /(^| )last name( |$)|surname/i },
  { category: 'email', score: 0.98, pattern: /(^| )email( |$)/i },
  { category: 'phone', score: 0.97, pattern: /(^| )phone( |$)|mobile|telephone/i },
  { category: 'date_of_birth', score: 0.95, pattern: /date of birth|dob/i },
  { category: 'address', score: 0.9, pattern: /address|street|city|zip|postal|location/i },
  { category: 'country', score: 0.9, pattern: /country|nationality/i },
  { category: 'company', score: 0.88, pattern: /company|organization|employer/i },
  { category: 'role', score: 0.88, pattern: /role|position|job title|occupation/i },
  { category: 'salary_expectation', score: 0.88, pattern: /salary|compensation|pay range|expectation/i },
  { category: 'availability', score: 0.84, pattern: /availability|when can you start|start date/i },
  { category: 'experience_years', score: 0.9, pattern: /years? of experience|experience years/i },
  { category: 'cover_letter', score: 0.9, pattern: /cover letter/i },
  { category: 'portfolio_url', score: 0.93, pattern: /portfolio|github/i },
  { category: 'linkedin_url', score: 0.95, pattern: /linkedin/i },
  { category: 'free_text_bio', score: 0.78, pattern: /bio|about (you|yourself)|motivation|why/i },
  { category: 'consent', score: 0.9, pattern: /consent|agree|terms|privacy|authorize/i },
]);

const MANUAL_TYPES = new Set(['radio', 'checkbox', 'dropdown', 'select', 'scale', 'linear_scale', 'rating', 'file_upload', 'date', 'time', 'multi_select']);

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function deriveInterpretationTag(semanticCategory, questionText) {
  const lowerText = normalizeText(questionText);
  if (semanticCategory === 'unknown') {
    if (lowerText.includes('why do you want') || lowerText.includes('why are you interested') || lowerText.includes('motivation')) return 'motivation_answer';
    if (lowerText.includes('describe your experience') || lowerText.includes('background') || lowerText.includes('past work')) return 'experience_summary';
    if (lowerText.includes('expectations') || lowerText.includes('salary')) return 'expectation_answer';
    if (lowerText.includes('challenge') || lowerText.includes('overcome') || lowerText.includes('difficult')) return 'challenge_solution';
    return 'general';
  }

  const map = {
    full_name: 'name_identifier',
    first_name: 'name_identifier',
    last_name: 'name_identifier',
    email: 'email_identifier',
    phone: 'phone_identifier',
    address: 'location_identifier',
    country: 'location_identifier',
    company: 'organization_identifier',
    role: 'occupation_identifier',
    portfolio_url: 'portfolio_link',
    linkedin_url: 'profile_link',
    free_text_bio: 'experience_summary',
    salary_expectation: 'expectation_answer',
  };
  return map[semanticCategory] || 'general';
}

export function inferSemanticCategory(question) {
  const parserHints = question?.parserHints || {};
  if (parserHints.semanticCategory && parserHints.semanticCategory !== 'unknown') {
    return {
      semanticCategory: parserHints.semanticCategory,
      confidence: Number(parserHints.semanticConfidence || 0.75),
      source: 'parser_hints',
    };
  }

  const text = String(question?.text || '').trim();
  for (const entry of SEMANTIC_KEYWORDS) {
    if (entry.pattern.test(text)) {
      return {
        semanticCategory: entry.category,
        confidence: entry.score,
        source: 'keyword',
      };
    }
  }

  if (String(question?.type || '').toLowerCase() === 'file_upload') {
    return {
      semanticCategory: /resume|cv/i.test(text) ? 'resume_upload' : 'unknown',
      confidence: /resume|cv/i.test(text) ? 0.82 : 0.52,
      source: 'type_heuristic',
    };
  }

  return {
    semanticCategory: 'unknown',
    confidence: 0.5,
    source: 'fallback',
  };
}

export function deriveFillPolicy(question, semanticResult, stateContext = null) {
  const state = stateContext || getState();
  const { settings } = state;
  const parserHints = question?.parserHints || {};
  const lowerText = normalizeText(question?.text);
  const type = String(question?.type || 'short_text').toLowerCase();

  if (parserHints.fillSource && parserHints.fillMode) {
    const isAuto = parserHints.fillMode === 'auto' && parserHints.fillSource === 'profile';
    if (isAuto && settings?.personalization?.autoFillPersonal === false) {
      return {
        source: 'ai',
        mode: 'suggest',
        requiresConfirmation: true,
        confidence: 0.55,
      };
    }
    return {
      source: parserHints.fillSource,
      mode: parserHints.fillMode,
      requiresConfirmation: Boolean(parserHints.requiresConfirmation),
      confidence: Number(parserHints.semanticConfidence || 0.75),
    };
  }

  if (type === 'file_upload') {
    return { source: 'file', mode: 'manual', requiresConfirmation: true, confidence: 0.98 };
  }

  if (MANUAL_TYPES.has(type) || lowerText.includes('password') || lowerText.includes('ssn') || lowerText.includes('credit card') || semanticResult.semanticCategory === 'consent') {
    return { source: 'user', mode: 'manual', requiresConfirmation: true, confidence: 0.9 };
  }

  const profileMappable = new Set([
    'full_name',
    'first_name',
    'last_name',
    'email',
    'phone',
    'date_of_birth',
    'address',
    'country',
    'company',
    'role',
    'portfolio_url',
    'linkedin_url',
  ]);

  if (profileMappable.has(semanticResult.semanticCategory)) {
    if (settings?.personalization?.autoFillPersonal === false) {
      return { source: 'ai', mode: 'suggest', requiresConfirmation: true, confidence: 0.6 };
    }
    return { source: 'profile', mode: 'auto', requiresConfirmation: semanticResult.semanticCategory === 'date_of_birth', confidence: 0.88 };
  }

  return { source: 'ai', mode: 'suggest', requiresConfirmation: true, confidence: 0.74 };
}

/**
 * Legacy compatibility output:
 *  - category: autofillable | generatable | manual_only
 *  - match: concrete profile/vault value when available
 *  - interpretationTag: hint for AI prompting
 */
export function categorizeField(question) {
  const state = getState();
  const { userProfile, vault } = state;
  const parserHints = question?.parserHints || {};
  const semanticResult = inferSemanticCategory(question);
  const fillPolicy = deriveFillPolicy(question, semanticResult, state);
  const lowerText = normalizeText(question?.text);

  let category = PARSER_BUCKET_TO_CATEGORY[parserHints.fillBucket] || 'generatable';
  if (!parserHints.fillBucket) {
    if (fillPolicy.mode === 'manual' || fillPolicy.source === 'user' || fillPolicy.source === 'file') {
      category = 'manual_only';
    } else if (fillPolicy.mode === 'auto' && fillPolicy.source === 'profile') {
      category = 'autofillable';
    }
  }

  let match = null;
  if (category === 'autofillable') {
    const categoryToProfileAccessor = {
      full_name: userProfile?.name || null,
      first_name: userProfile?.name ? String(userProfile.name).split(' ')[0] : null,
      last_name: userProfile?.name ? String(userProfile.name).split(' ').slice(1).join(' ') : null,
      email: userProfile?.email || null,
      phone: userProfile?.phone || null,
      linkedin_url: userProfile?.commonInfo?.linkedin || null,
      portfolio_url: userProfile?.commonInfo?.portfolio || null,
      address: userProfile?.commonInfo?.location || null,
      country: userProfile?.commonInfo?.country || null,
      company: userProfile?.commonInfo?.company || null,
      role: userProfile?.occupation || null,
      date_of_birth: userProfile?.commonInfo?.dateOfBirth || null,
    };

    match = categoryToProfileAccessor[semanticResult.semanticCategory] || null;

    if (!match && vault) {
      for (const [key, value] of Object.entries(vault)) {
        if (lowerText.includes(String(key || '').toLowerCase())) {
          match = value;
          break;
        }
      }
    }

    if (!match && parserHints.fillBucket === 'profile_fillable') {
      category = 'manual_only';
    } else if (!match) {
      category = 'generatable';
    }
  }

  return {
    category,
    match,
    interpretationTag: deriveInterpretationTag(semanticResult.semanticCategory, question?.text),
    semanticCategory: semanticResult.semanticCategory,
    semanticConfidence: semanticResult.confidence,
    fillPolicy,
    fillBucket: parserHints.fillBucket || null,
    bucketReason: parserHints.bucketReason || '',
    bucketConfidence: Number(parserHints.bucketConfidence || 0),
  };
}
