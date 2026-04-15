// @ts-nocheck

import {
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  SOURCE_TYPE,
  UNSUPPORTED_REASON,
} from '../schema';
import { createParserMessage } from '../status';

/**
 * Lightweight boundary for image parsing.
 * The parser core does not perform OCR directly; it delegates to this boundary.
 */
export async function requestImageParse({ imageArtifacts, imageServiceUrl = '/api/parser/image-extract' } = {}) {
  const artifacts = Array.isArray(imageArtifacts) ? imageArtifacts.filter(Boolean) : [];
  if (!artifacts.length) {
    return buildImageUnsupportedResult({
      reason: UNSUPPORTED_REASON.IMAGE_INCOMPLETE,
      message: 'No screenshots were provided.',
    });
  }

  try {
    const response = await fetch(imageServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: artifacts }),
    });

    if (!response.ok) {
      return buildImageUnsupportedResult({
        reason: UNSUPPORTED_REASON.IMAGE_INCOMPLETE,
        message: `Image parser returned HTTP ${response.status}.`,
      });
    }

    const payload = await response.json();
    return {
      sourceType: SOURCE_TYPE.IMAGE,
      parseStatus: PARSE_STATUS.PARTIAL,
      completeness: COMPLETENESS_STATUS.VISIBLE_STEP_ONLY,
      blockedReason: undefined,
      unsupportedReasons: [],
      nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
      nextStepRequired: Boolean(payload?.nextStepRequired),
      nextStepHint: payload?.nextStepHint || 'Additional screenshots may be required for hidden sections.',
      warnings: [
        createParserMessage('IMAGE_PARSE_USED', 'info', 'Image parsing path was used because structural parsing was unavailable.'),
      ],
      canonicalForm: payload?.canonicalForm || null,
      legacyFormData: payload?.legacyFormData || null,
      diagnostics: {
        authSignal: false,
        renderSignal: true,
        aiFallbackUsed: false,
        extractionWarnings: [],
      },
      confidence: payload?.confidence || {
        overall: 0.58,
        fieldDetection: 0.6,
        uiClassification: 0.52,
        semanticClassification: 0.5,
        fillPolicy: 0.5,
        completeness: 0.54,
      },
      parseStrategy: 'image_service',
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

