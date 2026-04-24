// @ts-nocheck

import {
  BLOCKED_REASON,
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  PROVIDER_TYPE,
  UNSUPPORTED_REASON,
} from '../schema';
import { createParserMessage } from '../status';

const HARD_GATE_PROVIDERS = new Set([
  PROVIDER_TYPE.WORKDAY,
]);

const BEST_EFFORT_PROVIDERS = new Set([
  PROVIDER_TYPE.TYPEFORM,
  PROVIDER_TYPE.JOTFORM,
  PROVIDER_TYPE.SURVEYMONKEY,
  PROVIDER_TYPE.QUALTRICS,
  PROVIDER_TYPE.TALLY,
]);

function countQuestions(legacyFormData) {
  return Array.isArray(legacyFormData?.questions) ? legacyFormData.questions.length : 0;
}

export function applyProviderAdapterOverrides({ provider, adapterResult }) {
  if (!adapterResult || !provider) return adapterResult;
  if (!HARD_GATE_PROVIDERS.has(provider) && !BEST_EFFORT_PROVIDERS.has(provider)) return adapterResult;

  const questionCount = countQuestions(adapterResult.legacyFormData);
  if (questionCount >= 2 && (adapterResult.parseStatus === PARSE_STATUS.SUCCESS || adapterResult.parseStatus === PARSE_STATUS.PARTIAL)) {
    return adapterResult;
  }

  if (BEST_EFFORT_PROVIDERS.has(provider)) {
    const hasAnyFields = questionCount > 0;
    return {
      ...adapterResult,
      parseStatus: hasAnyFields ? PARSE_STATUS.PARTIAL : PARSE_STATUS.UNSUPPORTED,
      completeness: hasAnyFields ? COMPLETENESS_STATUS.VISIBLE_STEP_ONLY : COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
      blockedReason: undefined,
      unsupportedReasons: hasAnyFields ? [] : [UNSUPPORTED_REASON.INSUFFICIENT_STRUCTURE],
      nextAction: NEXT_ACTION.USE_CAPTURE,
      nextStepRequired: true,
      nextStepHint: 'This provider is interactive-first. URL parsing stayed in best-effort mode and should be reviewed before use.',
      warnings: (adapterResult.warnings || []).concat(
        createParserMessage(
          'PROVIDER_BEST_EFFORT_DOWNGRADE',
          'warning',
          'Provider-specific policy downgraded this URL parse because the extracted structure is too weak to trust as complete.',
        ),
      ),
      diagnostics: {
        ...(adapterResult.diagnostics || {}),
        renderSignal: true,
        extractionWarnings: (adapterResult.diagnostics?.extractionWarnings || []).concat(
          'Best-effort interactive provider downgrade applied.',
        ),
      },
      confidence: {
        overall: hasAnyFields ? 0.46 : 0.24,
        fieldDetection: hasAnyFields ? 0.48 : 0.24,
        uiClassification: hasAnyFields ? 0.46 : 0.24,
        semanticClassification: hasAnyFields ? 0.42 : 0.2,
        fillPolicy: hasAnyFields ? 0.42 : 0.2,
        completeness: hasAnyFields ? 0.4 : 0.22,
      },
      parseStrategy: `${adapterResult.parseStrategy || 'dom_parse'}_best_effort_guard`,
    };
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
