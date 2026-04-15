// @ts-nocheck

import {
  BLOCKED_REASON,
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  PROVIDER_TYPE,
} from '../schema';
import { createParserMessage } from '../status';

const INTERACTIVE_FIRST_PROVIDERS = new Set([
  PROVIDER_TYPE.TYPEFORM,
  PROVIDER_TYPE.JOTFORM,
  PROVIDER_TYPE.SURVEYMONKEY,
  PROVIDER_TYPE.QUALTRICS,
  PROVIDER_TYPE.WORKDAY,
  PROVIDER_TYPE.TALLY,
]);

function countQuestions(legacyFormData) {
  return Array.isArray(legacyFormData?.questions) ? legacyFormData.questions.length : 0;
}

export function applyProviderAdapterOverrides({ provider, adapterResult }) {
  if (!adapterResult || !provider) return adapterResult;
  if (!INTERACTIVE_FIRST_PROVIDERS.has(provider)) return adapterResult;

  const questionCount = countQuestions(adapterResult.legacyFormData);
  if (questionCount >= 2 && (adapterResult.parseStatus === PARSE_STATUS.SUCCESS || adapterResult.parseStatus === PARSE_STATUS.PARTIAL)) {
    return adapterResult;
  }

  return {
    ...adapterResult,
    parseStatus: PARSE_STATUS.BLOCKED,
    completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
    blockedReason: BLOCKED_REASON.INTERACTION_REQUIRED,
    unsupportedReasons: [],
    nextAction: NEXT_ACTION.USE_CAPTURE,
    nextStepRequired: true,
    nextStepHint: 'This provider is usually interactive; open the form and import using Assisted Capture.',
    warnings: (adapterResult.warnings || []).concat(
      createParserMessage(
        'PROVIDER_INTERACTION_REQUIRED',
        'warning',
        'Provider-specific adapter flagged this form as interactive-first. URL-only parsing is likely incomplete.'
      )
    ),
    legacyFormData: null,
    canonicalForm: null,
    diagnostics: {
      ...(adapterResult.diagnostics || {}),
      renderSignal: true,
      extractionWarnings: (adapterResult.diagnostics?.extractionWarnings || []).concat(
        'Interactive provider fallback engaged.'
      ),
    },
    confidence: {
      overall: 0.28,
      fieldDetection: 0.28,
      uiClassification: 0.28,
      semanticClassification: 0.24,
      fillPolicy: 0.24,
      completeness: 0.22,
    },
    parseStrategy: `${adapterResult.parseStrategy || 'dom_parse'}_provider_guard`,
  };
}

