// @ts-nocheck

import { capturedPayloadToFormData } from '../capture-parser';
import { legacyFormDataToCanonical } from '../compat';
import {
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  SOURCE_TYPE,
  UNSUPPORTED_REASON,
} from '../schema';
import { createParserMessage } from '../status';

export function runCaptureAdapter(payload) {
  const legacyFormData = capturedPayloadToFormData(payload);
  const questionCount = Array.isArray(legacyFormData?.questions) ? legacyFormData.questions.length : 0;

  if (!questionCount) {
    return {
      sourceType: SOURCE_TYPE.CAPTURE,
      parseStatus: PARSE_STATUS.UNSUPPORTED,
      completeness: COMPLETENESS_STATUS.PARTIAL_STRUCTURE,
      blockedReason: undefined,
      unsupportedReasons: [UNSUPPORTED_REASON.INSUFFICIENT_STRUCTURE],
      nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
      nextStepRequired: false,
      nextStepHint: 'Capture payload did not include visible fields.',
      warnings: [
        createParserMessage('CAPTURE_EMPTY', 'warning', 'Capture payload did not provide any parseable fields.'),
      ],
      legacyFormData: null,
      canonicalForm: null,
      diagnostics: {
        authSignal: false,
        renderSignal: false,
        aiFallbackUsed: false,
        extractionWarnings: ['Capture payload had zero fields.'],
      },
      confidence: {
        overall: 0.2,
        fieldDetection: 0.2,
        uiClassification: 0.2,
        semanticClassification: 0.2,
        fillPolicy: 0.2,
        completeness: 0.2,
      },
      parseStrategy: 'capture_v1',
    };
  }

  const canonicalForm = legacyFormDataToCanonical(legacyFormData, {
    provider: 'plain_html',
  });

  return {
    sourceType: SOURCE_TYPE.CAPTURE,
    parseStatus: PARSE_STATUS.SUCCESS,
    completeness: COMPLETENESS_STATUS.COMPLETE,
    blockedReason: undefined,
    unsupportedReasons: [],
    nextAction: NEXT_ACTION.NONE,
    nextStepRequired: false,
    nextStepHint: '',
    warnings: [],
    legacyFormData,
    canonicalForm,
    diagnostics: {
      authSignal: false,
      renderSignal: false,
      aiFallbackUsed: false,
      extractionWarnings: [],
    },
    confidence: {
      fieldDetection: 0.9,
      uiClassification: 0.85,
      semanticClassification: 0.75,
      fillPolicy: 0.78,
      completeness: 0.9,
    },
    parseStrategy: 'capture_v1',
  };
}

