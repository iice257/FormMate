// @ts-nocheck

import {
  EVIDENCE_SOURCE,
  FILL_MODE,
  FILL_SOURCE,
  PARSE_STATUS,
  SEMANTIC_CATEGORY,
  UI_TYPE,
} from './schema';
import { createEvidence } from './evidence';
import { buildStableFieldKey, normalizeLabel, normalizeOption, normalizeWhitespace, safeId } from './normalize';
import { deriveLegacySupportState } from './status';

const LEGACY_TO_UI_TYPE = Object.freeze({
  short_text: UI_TYPE.TEXT,
  long_text: UI_TYPE.TEXTAREA,
  email: UI_TYPE.EMAIL,
  phone: UI_TYPE.TEL,
  tel: UI_TYPE.TEL,
  number: UI_TYPE.NUMBER,
  date: UI_TYPE.DATE,
  dropdown: UI_TYPE.SELECT,
  select: UI_TYPE.SELECT,
  radio: UI_TYPE.RADIO,
  checkbox: UI_TYPE.CHECKBOX,
  multi_select: UI_TYPE.MULTI_SELECT,
  linear_scale: UI_TYPE.RATING,
  scale: UI_TYPE.RATING,
  rating: UI_TYPE.RATING,
  file_upload: UI_TYPE.FILE,
  file: UI_TYPE.FILE,
  url: UI_TYPE.TEXT,
  unknown_type: UI_TYPE.UNKNOWN,
});

const UI_TO_LEGACY_TYPE = Object.freeze({
  [UI_TYPE.TEXT]: 'short_text',
  [UI_TYPE.TEXTAREA]: 'long_text',
  [UI_TYPE.EMAIL]: 'email',
  [UI_TYPE.TEL]: 'phone',
  [UI_TYPE.NUMBER]: 'number',
  [UI_TYPE.DATE]: 'date',
  [UI_TYPE.DATETIME]: 'date',
  [UI_TYPE.SELECT]: 'dropdown',
  [UI_TYPE.RADIO]: 'radio',
  [UI_TYPE.CHECKBOX]: 'checkbox',
  [UI_TYPE.MULTI_SELECT]: 'checkbox',
  [UI_TYPE.FILE]: 'file_upload',
  [UI_TYPE.RATING]: 'scale',
  [UI_TYPE.MATRIX]: 'scale',
  [UI_TYPE.CUSTOM_WIDGET]: 'short_text',
  [UI_TYPE.UNKNOWN]: 'short_text',
});

export function legacyQuestionTypeToUiType(legacyType) {
  return LEGACY_TO_UI_TYPE[String(legacyType || '').toLowerCase()] || UI_TYPE.UNKNOWN;
}

export function uiTypeToLegacyType(uiType) {
  return UI_TO_LEGACY_TYPE[String(uiType || '').toLowerCase()] || 'short_text';
}

function inferSemanticCandidates(label, uiType) {
  const l = normalizeLabel(label);
  const candidates = [];

  if (!l) {
    return [{ category: SEMANTIC_CATEGORY.UNKNOWN, score: 1, evidenceIds: [] }];
  }

  const add = (category, score) => candidates.push({ category, score });

  if (/(^| )full name( |$)|applicant name/.test(l)) add(SEMANTIC_CATEGORY.FULL_NAME, 0.94);
  if (/(^| )first name( |$)/.test(l)) add(SEMANTIC_CATEGORY.FIRST_NAME, 0.94);
  if (/(^| )last name( |$)|surname/.test(l)) add(SEMANTIC_CATEGORY.LAST_NAME, 0.94);
  if (/(^| )email( |$)/.test(l)) add(SEMANTIC_CATEGORY.EMAIL, 0.98);
  if (/(^| )phone( |$)|mobile|telephone/.test(l)) add(SEMANTIC_CATEGORY.PHONE, 0.97);
  if (/date of birth|dob/.test(l)) add(SEMANTIC_CATEGORY.DATE_OF_BIRTH, 0.95);
  if (/(^| )gender( |$)|sex/.test(l)) add(SEMANTIC_CATEGORY.GENDER, 0.9);
  if (/address|street|city|state|zip|postal/.test(l)) add(SEMANTIC_CATEGORY.ADDRESS, 0.9);
  if (/(^| )country( |$)|nationality/.test(l)) add(SEMANTIC_CATEGORY.COUNTRY, 0.92);
  if (/company|organization|employer/.test(l)) add(SEMANTIC_CATEGORY.COMPANY, 0.9);
  if (/job title|role|position/.test(l)) add(SEMANTIC_CATEGORY.ROLE, 0.87);
  if (/salary|compensation|pay range/.test(l)) add(SEMANTIC_CATEGORY.SALARY_EXPECTATION, 0.88);
  if (/availability|when can you start|start date/.test(l)) add(SEMANTIC_CATEGORY.AVAILABILITY, 0.84);
  if (/years? of experience|experience years/.test(l)) add(SEMANTIC_CATEGORY.EXPERIENCE_YEARS, 0.9);
  if (/cover letter/.test(l)) add(SEMANTIC_CATEGORY.COVER_LETTER, 0.9);
  if (/resume|cv/.test(l)) add(SEMANTIC_CATEGORY.RESUME_UPLOAD, 0.96);
  if (/portfolio/.test(l)) add(SEMANTIC_CATEGORY.PORTFOLIO_URL, 0.95);
  if (/linkedin/.test(l)) add(SEMANTIC_CATEGORY.LINKEDIN_URL, 0.95);
  if (/bio|about you|about yourself|motivation|why/.test(l)) add(SEMANTIC_CATEGORY.FREE_TEXT_BIO, 0.8);
  if (/consent|agree|terms|privacy|authorize/.test(l)) add(SEMANTIC_CATEGORY.CONSENT, 0.88);

  if (uiType === UI_TYPE.FILE && candidates.every((entry) => entry.category !== SEMANTIC_CATEGORY.RESUME_UPLOAD)) {
    add(SEMANTIC_CATEGORY.RESUME_UPLOAD, 0.74);
  }

  if (candidates.length === 0) {
    add(SEMANTIC_CATEGORY.UNKNOWN, 0.65);
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3).map((entry) => ({
    category: entry.category,
    score: Math.max(0, Math.min(1, entry.score)),
    evidenceIds: [],
  }));
}

function deriveFillPolicy({ semanticCategory, uiType, required }) {
  if (uiType === UI_TYPE.FILE) {
    return {
      source: FILL_SOURCE.FILE,
      mode: FILL_MODE.MANUAL,
      requiresConfirmation: true,
      rationale: 'File uploads require an explicit file from the user.',
      confidence: { fillPolicy: 0.98 },
    };
  }

  if (semanticCategory === SEMANTIC_CATEGORY.CONSENT) {
    return {
      source: FILL_SOURCE.USER,
      mode: FILL_MODE.MANUAL,
      requiresConfirmation: true,
      rationale: 'Consent decisions must be explicit user actions.',
      confidence: { fillPolicy: 0.99 },
    };
  }

  const profileMappable = new Set([
    SEMANTIC_CATEGORY.FULL_NAME,
    SEMANTIC_CATEGORY.FIRST_NAME,
    SEMANTIC_CATEGORY.LAST_NAME,
    SEMANTIC_CATEGORY.EMAIL,
    SEMANTIC_CATEGORY.PHONE,
    SEMANTIC_CATEGORY.DATE_OF_BIRTH,
    SEMANTIC_CATEGORY.ADDRESS,
    SEMANTIC_CATEGORY.COUNTRY,
    SEMANTIC_CATEGORY.COMPANY,
    SEMANTIC_CATEGORY.ROLE,
    SEMANTIC_CATEGORY.PORTFOLIO_URL,
    SEMANTIC_CATEGORY.LINKEDIN_URL,
  ]);

  if (profileMappable.has(semanticCategory)) {
    return {
      source: FILL_SOURCE.PROFILE,
      mode: FILL_MODE.AUTO,
      requiresConfirmation: required || semanticCategory === SEMANTIC_CATEGORY.DATE_OF_BIRTH,
      rationale: 'Field is profile-like and can be auto-filled from user profile data.',
      confidence: { fillPolicy: 0.88 },
    };
  }

  const manualUi = new Set([UI_TYPE.SELECT, UI_TYPE.RADIO, UI_TYPE.CHECKBOX, UI_TYPE.MULTI_SELECT, UI_TYPE.RATING, UI_TYPE.MATRIX]);
  if (manualUi.has(uiType)) {
    return {
      source: FILL_SOURCE.USER,
      mode: FILL_MODE.MANUAL,
      requiresConfirmation: true,
      rationale: 'Choice-based fields are safest with explicit user confirmation.',
      confidence: { fillPolicy: 0.82 },
    };
  }

  return {
    source: FILL_SOURCE.AI,
    mode: FILL_MODE.SUGGEST,
    requiresConfirmation: true,
    rationale: 'Open-ended field is better handled with AI suggestions and user review.',
    confidence: { fillPolicy: 0.78 },
  };
}

function toFieldOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option, index) => ({
      value: normalizeOption(option),
      label: normalizeOption(option),
      order: index,
    }))
    .filter((entry) => entry.label);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function getLabelEvidenceSource(labelSource) {
  const normalized = String(labelSource || '').trim().toLowerCase();
  if (normalized === 'placeholder') return EVIDENCE_SOURCE.PLACEHOLDER;
  if (normalized === 'aria_label' || normalized === 'aria_labelledby') return EVIDENCE_SOURCE.ARIA;
  if (normalized === 'name_attr') return EVIDENCE_SOURCE.NAME_ATTR;
  return EVIDENCE_SOURCE.LABEL_TEXT;
}

function convertLegacyQuestionToCanonicalField(question, context = {}) {
  const uiType = legacyQuestionTypeToUiType(question?.type);
  const label = normalizeWhitespace(question?.text || `Question ${context.order + 1}`);
  const normalized = normalizeLabel(label);
  const options = toFieldOptions(question?.options);
  const parserHints = question?.parserHints || {};
  const labelEvidenceSource = getLabelEvidenceSource(parserHints.labelSource);
  const labelConfidence = parserHints.generatedLabel
    ? 0.52
    : parserHints.placeholderLabel
      ? 0.68
      : parserHints.ariaLabelUsed
        ? 0.82
        : 0.92;

  const provenance = [
    createEvidence(labelEvidenceSource, label, normalized ? labelConfidence : 0.4),
    createEvidence(EVIDENCE_SOURCE.INPUT_TYPE, String(question?.type || ''), uiType === UI_TYPE.UNKNOWN ? 0.4 : 0.9),
  ];
  if (options.length > 0) {
    provenance.push(createEvidence(EVIDENCE_SOURCE.OPTION_TEXT, options.map((entry) => entry.label).join(' | '), 0.8));
  }

  const semanticCandidates = inferSemanticCandidates(label, uiType);
  semanticCandidates.forEach((entry, idx) => {
    if (provenance[idx]) {
      entry.evidenceIds = [provenance[idx].id];
    }
  });
  const semanticCategory = semanticCandidates[0]?.category || SEMANTIC_CATEGORY.UNKNOWN;
  const semanticConfidence = clamp(semanticCandidates[0]?.score ?? 0.5, 0, 1);
  const fillPolicy = deriveFillPolicy({
    semanticCategory,
    uiType,
    required: Boolean(question?.required),
  });

  const fieldId = String(question?.id || safeId('field', context.order));
  const stableKey = buildStableFieldKey({
    normalizedLabel: normalized,
    uiType,
    sectionTitle: context.sectionTitle || '',
    optionSignature: options.map((entry) => entry.label).join('|'),
    provider: context.provider || '',
    locatorName: '',
    locatorId: '',
  });

  return {
    id: fieldId,
    stableKey,
    order: context.order,
    label,
    normalizedLabel: normalized,
    rawTexts: [label],
    observed: {
      uiType,
      required: Boolean(question?.required),
      placeholder: '',
      helpText: '',
      defaultValue: '',
      options,
      validationRules: Boolean(question?.required)
        ? [{ type: 'required', value: true, source: EVIDENCE_SOURCE.INPUT_TYPE }]
        : [],
      locatorHints: {
        css: [],
        xpath: [],
        labelPath: [label],
        framePath: [],
      },
      provenance,
      confidence: {
        detected: clamp(
          parserHints.generatedLabel
            ? 0.56
            : parserHints.placeholderLabel
              ? 0.7
              : normalized && !/^question \d+$/i.test(label)
                ? 0.9
                : 0.66,
          0,
          1,
        ),
        uiType: uiType === UI_TYPE.UNKNOWN ? 0.52 : 0.9,
      },
    },
    inferred: {
      semanticCategory,
      semanticCandidates,
      confidence: {
        semanticCategory: semanticConfidence,
      },
    },
    fillPolicy,
    visibilityRules: [],
    warnings: [],
    unsupportedReason: undefined,
  };
}

export function legacyFormDataToCanonical(legacyFormData, context = {}) {
  const questions = Array.isArray(legacyFormData?.questions) ? legacyFormData.questions : [];
  const sectionTitle = context.sectionTitle || 'Main';
  const fields = questions.map((question, order) =>
    convertLegacyQuestionToCanonicalField(question, {
      order,
      sectionTitle,
      provider: context.provider,
    })
  );

  return {
    id: context.formId || `form_${Date.now().toString(36)}`,
    title: normalizeWhitespace(legacyFormData?.title || 'Untitled Form') || 'Untitled Form',
    description: normalizeWhitespace(legacyFormData?.description || ''),
    sections: [{
      id: 'section_1',
      title: sectionTitle,
      description: '',
      order: 0,
      fields,
      visibilityRules: [],
      confidence: fields.length ? 0.84 : 0.3,
    }],
    visibilityRules: [],
    locator: {
      css: [],
      framePath: [],
    },
    metrics: {
      detectedFieldCount: fields.length,
      actionableFieldCount: fields.filter((field) => field.fillPolicy.source !== FILL_SOURCE.UNSUPPORTED).length,
      visibleFieldCount: fields.length,
      hiddenFieldCount: 0,
      sectionCount: 1,
    },
  };
}

function flattenCanonicalFields(form) {
  if (!form || !Array.isArray(form.sections)) return [];
  return form.sections
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .flatMap((section) => Array.isArray(section.fields) ? section.fields : [])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function legacyQuestionFromCanonicalField(field, fallbackIndex) {
  const options = Array.isArray(field?.observed?.options)
    ? field.observed.options.map((entry) => normalizeOption(entry?.label || entry?.value || '')).filter(Boolean)
    : [];

  return {
    id: String(field?.id || safeId('q', fallbackIndex)),
    text: normalizeWhitespace(field?.label || `Question ${fallbackIndex + 1}`),
    type: uiTypeToLegacyType(field?.observed?.uiType),
    required: Boolean(field?.observed?.required),
    options,
    parserHints: {
      semanticCategory: field?.inferred?.semanticCategory || SEMANTIC_CATEGORY.UNKNOWN,
      semanticConfidence: clamp(field?.inferred?.confidence?.semanticCategory ?? 0.5, 0, 1),
      fillSource: field?.fillPolicy?.source || FILL_SOURCE.AI,
      fillMode: field?.fillPolicy?.mode || FILL_MODE.SUGGEST,
      requiresConfirmation: Boolean(field?.fillPolicy?.requiresConfirmation),
      evidenceSummary: Array.isArray(field?.observed?.provenance)
        ? field.observed.provenance.slice(0, 3).map((entry) => `${entry.source}:${entry.value}`).join(' | ')
        : '',
    },
  };
}

export function toLegacyFormData(parseEnvelope) {
  if (!parseEnvelope || typeof parseEnvelope !== 'object') return null;
  if (parseEnvelope.compatibility && Array.isArray(parseEnvelope.compatibility.questions)) {
    return parseEnvelope.compatibility;
  }

  const form = parseEnvelope.form;
  const fields = flattenCanonicalFields(form);
  const parseStatus = parseEnvelope?.outcome?.status || PARSE_STATUS.ERROR;
  const diagnostics = parseEnvelope?.diagnostics || {};
  const acquisition = parseEnvelope?.acquisition || {};

  return {
    title: normalizeWhitespace(form?.title || 'Untitled Form'),
    description: normalizeWhitespace(form?.description || ''),
    url: acquisition.sourceUrl || acquisition.normalizedUrl || '',
    source: acquisition.provider || '',
    parseStrategy: diagnostics.parseStrategy || acquisition.adapterKey || 'unknown',
    authRequired: parseEnvelope?.outcome?.blockedReason === 'auth_required',
    supportState: deriveLegacySupportState(parseEnvelope?.outcome || {}),
    diagnostics: {
      ...diagnostics,
      parseStatus,
    },
    questions: fields.map((field, index) => legacyQuestionFromCanonicalField(field, index)),
  };
}
