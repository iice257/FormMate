// @ts-nocheck

import {
  BLOCKED_REASON,
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  PARSER_SCHEMA_VERSION,
  SOURCE_TYPE,
  UNSUPPORTED_REASON,
} from './schema';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function createConfidenceSummary(overrides = {}) {
  const summary = {
    fieldDetection: clamp(overrides.fieldDetection ?? 0.65, 0, 1),
    uiClassification: clamp(overrides.uiClassification ?? 0.65, 0, 1),
    semanticClassification: clamp(overrides.semanticClassification ?? 0.55, 0, 1),
    fillPolicy: clamp(overrides.fillPolicy ?? 0.55, 0, 1),
    completeness: clamp(overrides.completeness ?? 0.6, 0, 1),
  };

  if (typeof overrides.overall === 'number') {
    summary.overall = clamp(overrides.overall, 0, 1);
  } else {
    summary.overall = clamp(
      (summary.fieldDetection + summary.uiClassification + summary.semanticClassification + summary.fillPolicy + summary.completeness) / 5,
      0,
      1
    );
  }

  return summary;
}

export function createParserMessage(code, level, message, extras = {}) {
  return {
    code: String(code || 'PARSER_MESSAGE'),
    level: level || 'info',
    message: String(message || ''),
    fieldId: extras.fieldId || undefined,
    sectionId: extras.sectionId || undefined,
  };
}

export function createBaseParseEnvelope({
  parseId,
  createdAt,
  sourceType = SOURCE_TYPE.HTML,
  sourceUrl,
  normalizedUrl,
  finalUrl,
  provider,
  adapterKey = 'plain-html',
  fetchStrategy = '',
  artifactIds = [],
  pageHash = '',
  imageCount = 0,
  parseStatus = PARSE_STATUS.ERROR,
  completeness = COMPLETENESS_STATUS.EMPTY,
  blockedReason,
  unsupportedReasons = [],
  warnings = [],
  nextAction = NEXT_ACTION.RETRY,
  nextStepRequired = false,
  nextStepHint = '',
  confidence = {},
  diagnostics = {},
  form = null,
  compatibility = null,
} = {}) {
  return {
    schemaVersion: PARSER_SCHEMA_VERSION,
    parseId: parseId || `parse_${Date.now().toString(36)}`,
    createdAt: createdAt || new Date().toISOString(),
    acquisition: {
      sourceType,
      sourceUrl: sourceUrl || undefined,
      normalizedUrl: normalizedUrl || sourceUrl || undefined,
      finalUrl: finalUrl || normalizedUrl || sourceUrl || undefined,
      provider,
      adapterKey,
      fetchStrategy: fetchStrategy || undefined,
      artifactIds: Array.isArray(artifactIds) ? artifactIds : [],
      pageHash: pageHash || undefined,
      imageCount: Number(imageCount || 0) || undefined,
    },
    outcome: {
      status: parseStatus,
      completeness,
      blockedReason: blockedReason || undefined,
      unsupportedReasons: Array.isArray(unsupportedReasons) ? unsupportedReasons.filter(Boolean) : [],
      warnings: Array.isArray(warnings) ? warnings : [],
      nextAction: nextAction || NEXT_ACTION.RETRY,
      nextStepRequired: Boolean(nextStepRequired),
      nextStepHint: nextStepHint || undefined,
      confidence: createConfidenceSummary(confidence),
    },
    form: form || null,
    compatibility: compatibility || null,
    diagnostics: {
      httpStatus: diagnostics.httpStatus || undefined,
      authSignal: Boolean(diagnostics.authSignal),
      renderSignal: Boolean(diagnostics.renderSignal),
      aiFallbackUsed: Boolean(diagnostics.aiFallbackUsed),
      extractionWarnings: Array.isArray(diagnostics.extractionWarnings) ? diagnostics.extractionWarnings : [],
      timingsMs: diagnostics.timingsMs || undefined,
      parseStrategy: diagnostics.parseStrategy || undefined,
      domSignatureProvider: diagnostics.domSignatureProvider || undefined,
      fillPlanSummary: diagnostics.fillPlanSummary || undefined,
    },
  };
}

export function deriveLegacySupportState(outcome = {}) {
  if (outcome.status === PARSE_STATUS.SUCCESS) return 'supported';
  if (outcome.status === PARSE_STATUS.PARTIAL) return 'partial';
  if (outcome.status === PARSE_STATUS.BLOCKED) return 'blocked';
  if (outcome.status === PARSE_STATUS.UNSUPPORTED) return 'unsupported';
  if (outcome.status === PARSE_STATUS.NO_FORM) return 'no_form';
  return 'error';
}

export function blockedEnvelopeDefaults(reason) {
  if (reason === BLOCKED_REASON.AUTH_REQUIRED) {
    return {
      nextAction: NEXT_ACTION.USE_CAPTURE,
      completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
    };
  }
  if (reason === BLOCKED_REASON.INTERACTION_REQUIRED) {
    return {
      nextAction: NEXT_ACTION.USE_CAPTURE,
      completeness: COMPLETENESS_STATUS.VISIBLE_STEP_ONLY,
    };
  }
  return {
    nextAction: NEXT_ACTION.MANUAL_REVIEW,
    completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
  };
}

export function unsupportedEnvelopeDefaults(reason) {
  if (reason === UNSUPPORTED_REASON.INSUFFICIENT_STRUCTURE || reason === UNSUPPORTED_REASON.UNPARSEABLE_MARKUP) {
    return {
      nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
      completeness: COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
    };
  }
  return {
    nextAction: NEXT_ACTION.MANUAL_REVIEW,
    completeness: COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
  };
}

