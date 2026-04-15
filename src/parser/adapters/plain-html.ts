// @ts-nocheck

import { parseDOM } from '../dom-parser';
import { legacyFormDataToCanonical } from '../compat';
import {
  BLOCKED_REASON,
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  UNSUPPORTED_REASON,
} from '../schema';
import { createParserMessage } from '../status';
import { normalizeWhitespace } from '../normalize';

export const MIN_CONFIDENT_FIELDS = 2;

function parseHtmlDocument(html) {
  try {
    const parser = new DOMParser();
    return parser.parseFromString(String(html || ''), 'text/html');
  } catch {
    return null;
  }
}

function detectGuardSignals(html, doc) {
  const pageText = normalizeWhitespace((doc?.body?.textContent || String(html || '')).toLowerCase());

  const hasAuth = [
    "can't access your google account",
    'sign in to continue',
    'sign in',
    'permission',
    'access denied',
    'log in',
    'login required',
  ].some((signal) => pageText.includes(signal));

  const hasPaywall = [
    'subscribe to continue',
    'this content is for subscribers',
    'membership required',
    'unlock access',
    'paywall',
  ].some((signal) => pageText.includes(signal));

  const hasCaptcha = pageText.includes('captcha')
    || pageText.includes('recaptcha')
    || pageText.includes('hcaptcha')
    || Boolean(doc?.querySelector?.('[data-sitekey], .g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'));

  return {
    hasAuth,
    hasPaywall,
    hasCaptcha,
  };
}

function detectStepSignals(doc) {
  if (!doc) {
    return {
      nextStepRequired: false,
      nextStepHint: '',
      hasHiddenSegments: false,
    };
  }

  const text = normalizeWhitespace(doc.body?.textContent || '').toLowerCase();
  const nextButton = doc.querySelector('button, [role="button"], input[type="button"], input[type="submit"]');
  const hasNextKeyword = /(next|continue|step\s+\d+\s+of\s+\d+|page\s+\d+\s+of\s+\d+)/i.test(text);
  const hasHiddenSegments = Boolean(doc.querySelector('[hidden], [aria-hidden="true"], [data-hidden="true"], [style*="display:none"]'));

  if (hasNextKeyword || hasHiddenSegments || nextButton) {
    return {
      nextStepRequired: hasNextKeyword || hasHiddenSegments,
      nextStepHint: hasNextKeyword
        ? 'This form appears to have additional steps that are not fully visible yet.'
        : (hasHiddenSegments ? 'Some sections appear hidden or conditional.' : ''),
      hasHiddenSegments,
    };
  }

  return {
    nextStepRequired: false,
    nextStepHint: '',
    hasHiddenSegments: false,
  };
}

function toLegacyFormData(parsed, { url, provider, parseStrategy }) {
  return {
    title: parsed?.title || 'Untitled Form',
    description: parsed?.description || '',
    url,
    source: provider,
    parseStrategy,
    authRequired: false,
    supportState: 'supported',
    diagnostics: {},
    questions: Array.isArray(parsed?.questions) ? parsed.questions : [],
  };
}

function computeFieldConfidence(legacyFormData) {
  const questions = Array.isArray(legacyFormData?.questions) ? legacyFormData.questions : [];
  if (!questions.length) return 0;
  const qualityScore = questions.reduce((total, question) => {
    const labelQuality = String(question?.text || '').trim().match(/^question\s+\d+$/i) ? 0.4 : 0.95;
    const typeQuality = String(question?.type || '').toLowerCase() === 'unknown_type' ? 0.5 : 0.9;
    return total + ((labelQuality + typeQuality) / 2);
  }, 0);
  return Math.max(0, Math.min(1, qualityScore / questions.length));
}

export async function runPlainHtmlAdapter({
  html,
  url,
  provider,
  parseStrategy = 'dom_parse',
  parseWithAiHtml,
}) {
  const doc = parseHtmlDocument(html);
  const guardSignals = detectGuardSignals(html, doc);
  const stepSignals = detectStepSignals(doc);
  const warnings = [];
  let workingStrategy = parseStrategy;

  if (guardSignals.hasAuth) {
    return {
      parseStatus: PARSE_STATUS.BLOCKED,
      completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
      blockedReason: BLOCKED_REASON.AUTH_REQUIRED,
      unsupportedReasons: [],
      nextAction: NEXT_ACTION.USE_CAPTURE,
      nextStepRequired: false,
      nextStepHint: 'Sign-in is required to access this form.',
      warnings: [createParserMessage('AUTH_REQUIRED', 'warning', 'Form access appears to require authentication.')],
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: true,
        renderSignal: false,
        aiFallbackUsed: false,
        extractionWarnings: [],
      },
      confidence: {
        overall: 0.15,
        fieldDetection: 0.1,
        uiClassification: 0.1,
        semanticClassification: 0.1,
        fillPolicy: 0.1,
        completeness: 0.1,
      },
    };
  }

  if (guardSignals.hasPaywall) {
    return {
      parseStatus: PARSE_STATUS.BLOCKED,
      completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
      blockedReason: BLOCKED_REASON.PAYWALL,
      unsupportedReasons: [],
      nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
      nextStepRequired: false,
      nextStepHint: 'This page appears paywalled. Upload screenshots if you can view the form content.',
      warnings: [createParserMessage('PAYWALL_DETECTED', 'warning', 'Paywall detected while parsing the target page.')],
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: false,
        aiFallbackUsed: false,
        extractionWarnings: [],
      },
      confidence: {
        overall: 0.1,
        fieldDetection: 0.08,
        uiClassification: 0.08,
        semanticClassification: 0.08,
        fillPolicy: 0.08,
        completeness: 0.1,
      },
    };
  }

  if (guardSignals.hasCaptcha) {
    return {
      parseStatus: PARSE_STATUS.BLOCKED,
      completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
      blockedReason: BLOCKED_REASON.CAPTCHA,
      unsupportedReasons: [],
      nextAction: NEXT_ACTION.USE_CAPTURE,
      nextStepRequired: false,
      nextStepHint: 'CAPTCHA was detected. Use Assisted Capture after solving it in your browser.',
      warnings: [createParserMessage('CAPTCHA_DETECTED', 'warning', 'CAPTCHA detected on page.')],
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: true,
        aiFallbackUsed: false,
        extractionWarnings: [],
      },
      confidence: {
        overall: 0.1,
        fieldDetection: 0.08,
        uiClassification: 0.08,
        semanticClassification: 0.08,
        fillPolicy: 0.08,
        completeness: 0.1,
      },
    };
  }

  let parsed = parseDOM(html || '');
  const renderRequired = Boolean(parsed?.requiresRender);
  if (renderRequired && (!Array.isArray(parsed?.questions) || parsed.questions.length < MIN_CONFIDENT_FIELDS)) {
    return {
      parseStatus: PARSE_STATUS.BLOCKED,
      completeness: COMPLETENESS_STATUS.VISIBLE_STEP_ONLY,
      blockedReason: BLOCKED_REASON.INTERACTION_REQUIRED,
      unsupportedReasons: [],
      nextAction: NEXT_ACTION.USE_CAPTURE,
      nextStepRequired: true,
      nextStepHint: 'This form appears client-rendered. Open it in-browser and use Assisted Capture.',
      warnings: [createParserMessage('INTERACTION_REQUIRED', 'warning', 'Client-side rendering limits read-only parsing coverage.')],
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: true,
        aiFallbackUsed: false,
        extractionWarnings: [],
      },
      confidence: {
        overall: 0.2,
        fieldDetection: 0.2,
        uiClassification: 0.2,
        semanticClassification: 0.2,
        fillPolicy: 0.2,
        completeness: 0.2,
      },
    };
  }

  let aiFallbackUsed = false;
  if ((!parsed?.questions || parsed.questions.length === 0) && typeof parseWithAiHtml === 'function') {
    try {
      parsed = await parseWithAiHtml(html, url);
      aiFallbackUsed = true;
      warnings.push(createParserMessage('AI_HTML_FALLBACK', 'info', 'AI-based HTML parsing fallback was used.'));
      workingStrategy = 'ai_html_parse';
    } catch (error) {
      warnings.push(createParserMessage('AI_HTML_FALLBACK_FAILED', 'warning', `AI fallback failed: ${error?.message || 'unknown error'}`));
    }
  }

  const questionCount = Array.isArray(parsed?.questions) ? parsed.questions.length : 0;
  if (!questionCount) {
    return {
      parseStatus: PARSE_STATUS.UNSUPPORTED,
      completeness: COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
      blockedReason: undefined,
      unsupportedReasons: [UNSUPPORTED_REASON.INSUFFICIENT_STRUCTURE],
      nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
      nextStepRequired: false,
      nextStepHint: 'No form fields were extracted from page structure.',
      warnings: warnings.concat(createParserMessage('NO_FIELDS_DETECTED', 'warning', 'No form fields were detected from URL parsing.')),
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: renderRequired,
        aiFallbackUsed,
        extractionWarnings: ['No fields detected after deterministic and fallback parsing.'],
      },
      confidence: {
        overall: 0.15,
        fieldDetection: 0.12,
        uiClassification: 0.12,
        semanticClassification: 0.12,
        fillPolicy: 0.12,
        completeness: 0.2,
      },
    };
  }

  const legacyFormData = toLegacyFormData(parsed, {
    url,
    provider,
    parseStrategy: workingStrategy,
  });
  const canonicalForm = legacyFormDataToCanonical(legacyFormData, {
    provider,
  });

  const fieldConfidence = computeFieldConfidence(legacyFormData);
  const parseStatus = stepSignals.nextStepRequired ? PARSE_STATUS.PARTIAL : PARSE_STATUS.SUCCESS;
  const completeness = stepSignals.nextStepRequired
    ? COMPLETENESS_STATUS.VISIBLE_STEP_ONLY
    : COMPLETENESS_STATUS.COMPLETE;
  const nextAction = stepSignals.nextStepRequired ? NEXT_ACTION.CONTINUE_TO_NEXT_STEP : NEXT_ACTION.NONE;
  if (stepSignals.hasHiddenSegments) {
    warnings.push(createParserMessage('HIDDEN_SECTIONS_DETECTED', 'info', 'Conditional or hidden segments were detected.'));
  }

  return {
    parseStatus,
    completeness,
    blockedReason: undefined,
    unsupportedReasons: [],
    nextAction,
    nextStepRequired: stepSignals.nextStepRequired,
    nextStepHint: stepSignals.nextStepHint,
    warnings,
    legacyFormData,
    canonicalForm,
    diagnostics: {
      authSignal: false,
      renderSignal: renderRequired,
      aiFallbackUsed,
      extractionWarnings: warnings.map((warning) => warning.message),
    },
    confidence: {
      fieldDetection: fieldConfidence,
      uiClassification: Math.min(1, fieldConfidence + 0.03),
      semanticClassification: Math.max(0.5, fieldConfidence - 0.08),
      fillPolicy: Math.max(0.55, fieldConfidence - 0.05),
      completeness: parseStatus === PARSE_STATUS.PARTIAL ? 0.62 : 0.88,
    },
    parseStrategy: workingStrategy,
  };
}

