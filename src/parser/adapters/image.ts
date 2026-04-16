// @ts-nocheck

import { legacyFormDataToCanonical } from '../compat';
import { getRequestAuthHeaders } from '../../auth/auth-service';
import {
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  SOURCE_TYPE,
  UNSUPPORTED_REASON,
} from '../schema';
import { createParserMessage } from '../status';

const PARSE_STATUSES = new Set([
  PARSE_STATUS.SUCCESS,
  PARSE_STATUS.PARTIAL,
  PARSE_STATUS.BLOCKED,
  PARSE_STATUS.UNSUPPORTED,
  PARSE_STATUS.NO_FORM,
  PARSE_STATUS.ERROR,
]);

const LOW_CONFIDENCE = {
  overall: 0.25,
  fieldDetection: 0.25,
  uiClassification: 0.25,
  semanticClassification: 0.2,
  fillPolicy: 0.2,
  completeness: 0.24,
};

function normalizeParseStatus(status, hasFields) {
  const normalized = String(status || '').trim().toLowerCase();
  if (PARSE_STATUSES.has(normalized)) return normalized;
  return hasFields ? PARSE_STATUS.PARTIAL : PARSE_STATUS.UNSUPPORTED;
}

function normalizeCompleteness(completeness, parseStatus) {
  const normalized = String(completeness || '').trim().toLowerCase();
  if (Object.values(COMPLETENESS_STATUS).includes(normalized)) return normalized;
  if (parseStatus === PARSE_STATUS.SUCCESS) return COMPLETENESS_STATUS.COMPLETE;
  if (parseStatus === PARSE_STATUS.UNSUPPORTED) return COMPLETENESS_STATUS.PARTIAL_STRUCTURE;
  return COMPLETENESS_STATUS.VISIBLE_STEP_ONLY;
}

function normalizeUnsupportedReasons(reasons) {
  const normalized = Array.isArray(reasons) ? reasons.map((reason) => String(reason || '').trim()).filter(Boolean) : [];
  return normalized.length ? normalized : [];
}

function normalizeWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return [];
  return warnings
    .map((warning, index) => {
      if (!warning) return null;
      if (typeof warning === 'string') {
        return createParserMessage(`IMAGE_WARNING_${index + 1}`, 'warning', warning);
      }
      const message = String(warning.message || warning.text || '').trim();
      if (!message) return null;
      return createParserMessage(
        String(warning.code || `IMAGE_WARNING_${index + 1}`),
        String(warning.level || 'warning').toLowerCase(),
        message,
      );
    })
    .filter(Boolean);
}

function normalizeConfidence(confidence, parseStatus) {
  if (!confidence || typeof confidence !== 'object') {
    return parseStatus === PARSE_STATUS.UNSUPPORTED
      ? { ...LOW_CONFIDENCE }
      : {
          overall: 0.58,
          fieldDetection: 0.6,
          uiClassification: 0.52,
          semanticClassification: 0.5,
          fillPolicy: 0.5,
          completeness: 0.54,
        };
  }
  return {
    overall: Number(confidence.overall ?? 0.56) || 0.56,
    fieldDetection: Number(confidence.fieldDetection ?? 0.58) || 0.58,
    uiClassification: Number(confidence.uiClassification ?? 0.5) || 0.5,
    semanticClassification: Number(confidence.semanticClassification ?? 0.48) || 0.48,
    fillPolicy: Number(confidence.fillPolicy ?? 0.48) || 0.48,
    completeness: Number(confidence.completeness ?? 0.52) || 0.52,
  };
}

/**
 * Lightweight boundary for image parsing.
 * The parser core does not perform OCR directly; it delegates to this boundary.
 */
export async function requestImageParse({ imageArtifacts, imageServiceUrl = '/api/parser/image-extract', sourceUrl = '' } = {}) {
  const artifacts = Array.isArray(imageArtifacts) ? imageArtifacts.filter(Boolean) : [];
  if (!artifacts.length) {
    return buildImageUnsupportedResult({
      reason: UNSUPPORTED_REASON.IMAGE_INCOMPLETE,
      message: 'No screenshots were provided.',
    });
  }

  try {
    const authHeaders = getRequestAuthHeaders();
    const response = await fetch(imageServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ images: artifacts, sourceUrl }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errorMessage = payload?.error?.message || `Image parser returned HTTP ${response.status}.`;
      return buildImageUnsupportedResult({
        reason: UNSUPPORTED_REASON.IMAGE_INCOMPLETE,
        message: errorMessage,
        imageCount: artifacts.length,
      });
    }

    const legacyFormData = payload?.legacyFormData || null;
    let canonicalForm = payload?.canonicalForm || null;
    if (!canonicalForm && legacyFormData?.questions?.length) {
      try {
        canonicalForm = legacyFormDataToCanonical(legacyFormData, {
          provider: 'custom_unknown',
        });
      } catch {
        canonicalForm = null;
      }
    }

    const hasFields = Array.isArray(legacyFormData?.questions) && legacyFormData.questions.length > 0;
    const parseStatus = normalizeParseStatus(payload?.parseStatus, hasFields);
    const completeness = normalizeCompleteness(payload?.completeness, parseStatus);
    const unsupportedReasons = normalizeUnsupportedReasons(payload?.unsupportedReasons);
    const warnings = normalizeWarnings(payload?.warnings);
    const nextAction = payload?.nextAction
      || (parseStatus === PARSE_STATUS.UNSUPPORTED ? NEXT_ACTION.UPLOAD_SCREENSHOTS : NEXT_ACTION.NONE);
    const diagnostics = {
      authSignal: false,
      renderSignal: true,
      aiFallbackUsed: true,
      extractionWarnings: Array.isArray(payload?.diagnostics?.extractionWarnings) ? payload.diagnostics.extractionWarnings : [],
      ...(payload?.diagnostics || {}),
    };

    if (parseStatus !== PARSE_STATUS.UNSUPPORTED) {
      warnings.unshift(
        createParserMessage(
          'IMAGE_PARSE_USED',
          'info',
          'Image parsing path was used because structural parsing was unavailable.',
        ),
      );
    }

    return {
      sourceType: SOURCE_TYPE.IMAGE,
      parseStatus,
      completeness,
      blockedReason: undefined,
      unsupportedReasons,
      nextAction,
      nextStepRequired: Boolean(payload?.nextStepRequired),
      nextStepHint: payload?.nextStepHint || 'Additional screenshots may be required for hidden sections.',
      warnings,
      canonicalForm,
      legacyFormData,
      diagnostics,
      confidence: normalizeConfidence(payload?.confidence, parseStatus),
      parseStrategy: payload?.parseStrategy || payload?.diagnostics?.parseStrategy || 'image_service',
      imageCount: artifacts.length,
    };
  } catch (error) {
    return buildImageUnsupportedResult({
      reason: UNSUPPORTED_REASON.IMAGE_INCOMPLETE,
      message: `Image parser boundary failed: ${error?.message || 'unknown error'}`,
      imageCount: artifacts.length,
    });
  }
}

export function buildImageUnsupportedResult({ reason, message, imageCount = 0 }) {
  return {
    sourceType: SOURCE_TYPE.IMAGE,
    parseStatus: PARSE_STATUS.UNSUPPORTED,
    completeness: COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
    blockedReason: undefined,
    unsupportedReasons: [reason || UNSUPPORTED_REASON.IMAGE_INCOMPLETE],
    nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
    nextStepRequired: true,
    nextStepHint: 'Provide clearer screenshots for missing sections or later pages.',
    warnings: [
      createParserMessage('IMAGE_PARSE_UNAVAILABLE', 'warning', message || 'Image parsing service is unavailable.'),
    ],
    canonicalForm: null,
    legacyFormData: null,
    diagnostics: {
      authSignal: false,
      renderSignal: true,
      aiFallbackUsed: false,
      extractionWarnings: [message || 'Image parsing unavailable.'],
    },
    confidence: {
      overall: 0.25,
      fieldDetection: 0.25,
      uiClassification: 0.25,
      semanticClassification: 0.2,
      fillPolicy: 0.2,
      completeness: 0.24,
    },
    parseStrategy: 'image_service_unavailable',
    imageCount,
  };
}
