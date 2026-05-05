// @ts-nocheck

import { parseDOM } from '../dom-parser';
import { legacyFormDataToCanonical } from '../compat';
import { enrichLegacyFormDataWithFillPlan } from '../fill-plan';
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

function detectStepSignals(doc, parsed) {
  const meta = parsed?.meta || {};
  if (!doc) {
    return {
      nextStepRequired: Boolean(meta.nextStepRequired),
      nextStepHint: meta.nextStepHint || '',
      hasHiddenSegments: Boolean(meta.hiddenControlCount || meta.hiddenSectionCount),
    };
  }

  const text = normalizeWhitespace(doc.body?.textContent || '').toLowerCase();
  const buttonTexts = Array.from(doc.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
    .map((element) => normalizeWhitespace(element.textContent || element.getAttribute?.('value') || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
  const hasNextKeyword = /(next|continue|step\s+\d+\s+of\s+\d+|page\s+\d+\s+of\s+\d+|save and continue)/i.test(`${text} ${buttonTexts}`);
  const hasHiddenSegments = Boolean(meta.hiddenControlCount || meta.hiddenSectionCount || doc.querySelector('[hidden], [aria-hidden="true"], [data-hidden="true"], [style*="display:none"]'));

  if (hasNextKeyword || hasHiddenSegments || meta.nextStepRequired) {
    return {
      nextStepRequired: true,
      nextStepHint: meta.nextStepHint || (hasNextKeyword
        ? 'This form appears to have additional steps that are not fully visible yet.'
        : (hasHiddenSegments ? 'Some sections appear hidden or conditional.' : '')),
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

function getMeta(parsed) {
  return parsed?.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
}

function assessStructuralQuality(parsed) {
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const meta = getMeta(parsed);
  const questionCount = questions.length;
  const visibleControlCount = Math.max(Number(meta.visibleControlCount || 0), questionCount);
  const groupedChoiceCount = Math.max(Number(meta.groupedChoiceCount || 0), 0);
  const effectiveControlCount = Math.max(1, visibleControlCount - groupedChoiceCount);
  const generatedLabelCount = questions.filter((question) => question?.parserHints?.generatedLabel || /^question \d+$/i.test(String(question?.text || '').trim())).length;
  const placeholderLabelCount = questions.filter((question) => question?.parserHints?.placeholderLabel).length;
  const unknownTypeCount = questions.filter((question) => String(question?.type || '').toLowerCase() === 'unknown_type').length;
  const fileUploadCount = questions.filter((question) => String(question?.type || '').toLowerCase() === 'file_upload').length;

  const coverage = questionCount ? Math.min(1, questionCount / effectiveControlCount) : 0;
  const labelQuality = questionCount
    ? Math.max(0, 1 - ((generatedLabelCount + (placeholderLabelCount * 0.45)) / questionCount))
    : 0;
  const typeQuality = questionCount
    ? Math.max(0, 1 - (unknownTypeCount / questionCount))
    : 0;
  const overall = questionCount
    ? Math.min(1, ((coverage * 0.4) + (labelQuality * 0.35) + (typeQuality * 0.25)))
    : 0;

  return {
    questionCount,
    visibleControlCount,
    groupedChoiceCount,
    generatedLabelCount,
    placeholderLabelCount,
    unknownTypeCount,
    fileUploadCount,
    coverage,
    labelQuality,
    typeQuality,
    overall,
  };
}

function shouldUseAiFallback(parsed) {
  const quality = assessStructuralQuality(parsed);
  if (!quality.questionCount) return true;
  if (quality.overall < 0.72) return true;
  if (quality.coverage < 0.68) return true;
  if (quality.labelQuality < 0.72) return true;
  if (quality.typeQuality < 0.72) return true;
  return false;
}

function choosePreferredParse(primary, fallback) {
  const primaryQuality = assessStructuralQuality(primary);
  const fallbackQuality = assessStructuralQuality(fallback);
  if (!fallbackQuality.questionCount) {
    return { parsed: primary, usedFallback: false };
  }

  const fallbackWins = (
    fallbackQuality.overall > (primaryQuality.overall + 0.08)
    || (fallbackQuality.questionCount > primaryQuality.questionCount && fallbackQuality.overall >= (primaryQuality.overall - 0.03))
  );

  return fallbackWins
    ? { parsed: fallback, usedFallback: true }
    : { parsed: primary, usedFallback: false };
}

export async function runPlainHtmlAdapter({
  html,
  url,
  provider,
  parseStrategy = 'dom_parse',
  classifyAmbiguousFields,
}) {
  const doc = parseHtmlDocument(html);
  const guardSignals = detectGuardSignals(html, doc);
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
  const initialQuality = assessStructuralQuality(parsed);
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

  const questionCount = Array.isArray(parsed?.questions) ? parsed.questions.length : 0;
  const stepSignals = detectStepSignals(doc, parsed);
  const structuralQuality = assessStructuralQuality(parsed);
  const meta = getMeta(parsed);
  if (!questionCount) {
    const noFormDetected = Number(meta.visibleControlCount || 0) === 0 && Number(meta.formElementCount || 0) === 0;
    return {
      parseStatus: noFormDetected ? PARSE_STATUS.NO_FORM : PARSE_STATUS.UNSUPPORTED,
      completeness: noFormDetected ? COMPLETENESS_STATUS.EMPTY : COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
      blockedReason: undefined,
      unsupportedReasons: noFormDetected ? [] : [UNSUPPORTED_REASON.INSUFFICIENT_STRUCTURE],
      nextAction: noFormDetected ? NEXT_ACTION.MANUAL_REVIEW : NEXT_ACTION.UPLOAD_SCREENSHOTS,
      nextStepRequired: false,
      nextStepHint: noFormDetected ? 'No form structure was detected on this page.' : 'No form fields were extracted from page structure.',
      warnings: warnings.concat(createParserMessage(noFormDetected ? 'NO_FORM_DETECTED' : 'NO_FIELDS_DETECTED', 'warning', noFormDetected ? 'No form structure was detected on the page.' : 'No form fields were detected from URL parsing.')),
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: renderRequired,
        aiFallbackUsed,
        extractionWarnings: [noFormDetected ? 'No form structure detected.' : 'No fields detected after deterministic and fallback parsing.'],
      },
      confidence: {
        overall: noFormDetected ? 0.08 : 0.15,
        fieldDetection: noFormDetected ? 0.06 : 0.12,
        uiClassification: noFormDetected ? 0.06 : 0.12,
        semanticClassification: noFormDetected ? 0.06 : 0.12,
        fillPolicy: noFormDetected ? 0.06 : 0.12,
        completeness: noFormDetected ? 0.08 : 0.2,
      },
    };
  }

  let legacyFormData = toLegacyFormData(parsed, {
    url,
    provider,
    parseStrategy: workingStrategy,
  });
  legacyFormData = enrichLegacyFormDataWithFillPlan(legacyFormData, warnings);

  if (typeof classifyAmbiguousFields === 'function') {
    try {
      const judged = await classifyAmbiguousFields(legacyFormData.questions, { title: legacyFormData.title, url });
      if (Array.isArray(judged) && judged.length === legacyFormData.questions.length) {
        legacyFormData = enrichLegacyFormDataWithFillPlan({
          ...legacyFormData,
          questions: judged,
        }, warnings);
        aiFallbackUsed = judged.some((question) => question?.parserHints?.bucketJudgedBy === 'ai') || aiFallbackUsed;
      }
    } catch (error) {
      warnings.push(createParserMessage('AI_BUCKET_JUDGE_FAILED', 'warning', `AI ambiguity judge failed: ${error?.message || 'unknown error'}`));
    }
  }

  const canonicalForm = legacyFormDataToCanonical(legacyFormData, {
    provider,
  });

  const fieldConfidence = computeFieldConfidence(legacyFormData);
  const hasWeakCoverage = structuralQuality.overall < 0.68 || structuralQuality.coverage < 0.68 || structuralQuality.labelQuality < 0.72 || structuralQuality.typeQuality < 0.72;
  const parseStatus = (stepSignals.nextStepRequired || hasWeakCoverage) ? PARSE_STATUS.PARTIAL : PARSE_STATUS.SUCCESS;
  const completeness = stepSignals.nextStepRequired || hasWeakCoverage
    ? COMPLETENESS_STATUS.VISIBLE_STEP_ONLY
    : COMPLETENESS_STATUS.COMPLETE;
  const nextAction = stepSignals.nextStepRequired
    ? NEXT_ACTION.CONTINUE_TO_NEXT_STEP
    : hasWeakCoverage
      ? NEXT_ACTION.USE_CAPTURE
      : NEXT_ACTION.NONE;
  if (stepSignals.hasHiddenSegments) {
    warnings.push(createParserMessage('HIDDEN_SECTIONS_DETECTED', 'info', 'Conditional or hidden segments were detected.'));
  }
  if (hasWeakCoverage) {
    warnings.push(createParserMessage('LOW_CONFIDENCE_STRUCTURE', 'warning', 'URL parsing found fields, but structural confidence is too weak to treat this as a complete parse.'));
  }
  if (structuralQuality.fileUploadCount > 0) {
    warnings.push(createParserMessage('FILE_UPLOAD_DETECTED', 'info', 'File upload fields were detected and will require explicit user files.'));
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
      extractionWarnings: warnings.map((warning) => warning.message).concat(
        `quality=${structuralQuality.overall.toFixed(2)}`,
        `coverage=${structuralQuality.coverage.toFixed(2)}`,
      ),
      fillPlanSummary: legacyFormData.fillPlanSummary,
    },
    confidence: {
      fieldDetection: Math.min(1, ((fieldConfidence * 0.7) + (structuralQuality.coverage * 0.3))),
      uiClassification: Math.min(1, ((fieldConfidence * 0.65) + (structuralQuality.typeQuality * 0.35))),
      semanticClassification: Math.max(0.42, Math.min(1, structuralQuality.labelQuality - 0.04)),
      fillPolicy: Math.max(0.46, Math.min(1, structuralQuality.overall - 0.02)),
      completeness: parseStatus === PARSE_STATUS.PARTIAL
        ? Math.max(0.48, Math.min(0.74, structuralQuality.overall))
        : Math.max(0.82, Math.min(0.94, structuralQuality.overall + 0.12)),
    },
    parseStrategy: workingStrategy,
  };
}
