// @ts-nocheck

export const PARSER_SCHEMA_VERSION = 'parser.v1';

export const PARSE_STATUS = Object.freeze({
  SUCCESS: 'success',
  PARTIAL: 'partial',
  BLOCKED: 'blocked',
  UNSUPPORTED: 'unsupported',
  NO_FORM: 'no_form',
  ERROR: 'error',
});

export const COMPLETENESS_STATUS = Object.freeze({
  COMPLETE: 'complete',
  VISIBLE_STEP_ONLY: 'visible_step_only',
  FUTURE_STEPS_UNKNOWN: 'future_steps_unknown',
  BLOCKED_BEFORE_FORM: 'blocked_before_form',
  PARTIAL_STRUCTURE: 'partial_structure',
  EMPTY: 'empty',
});

export const SOURCE_TYPE = Object.freeze({
  HTML: 'html',
  CAPTURE: 'capture',
  IMAGE: 'image',
  ADAPTER: 'adapter',
  DEMO: 'demo',
});

export const PROVIDER_TYPE = Object.freeze({
  GOOGLE_FORMS: 'google_forms',
  TYPEFORM: 'typeform',
  JOTFORM: 'jotform',
  MICROSOFT_FORMS: 'microsoft_forms',
  TALLY: 'tally',
  SURVEYMONKEY: 'surveymonkey',
  QUALTRICS: 'qualtrics',
  WORKDAY: 'workday',
  PLAIN_HTML: 'plain_html',
  CUSTOM_UNKNOWN: 'custom_unknown',
  DEMO: 'demo',
});

export const BLOCKED_REASON = Object.freeze({
  AUTH_REQUIRED: 'auth_required',
  PAYWALL: 'paywall',
  CAPTCHA: 'captcha',
  NETWORK_BLOCK: 'network_block',
  CROSS_ORIGIN_IFRAME: 'cross_origin_iframe',
  INTERACTION_REQUIRED: 'interaction_required',
  ACCESS_DENIED: 'access_denied',
  UNKNOWN: 'unknown',
});

export const UNSUPPORTED_REASON = Object.freeze({
  UNSUPPORTED_WIDGET: 'unsupported_widget',
  INSUFFICIENT_STRUCTURE: 'insufficient_structure',
  UNPARSEABLE_MARKUP: 'unparseable_markup',
  PROVIDER_NOT_SUPPORTED: 'provider_not_supported',
  IMAGE_INCOMPLETE: 'image_incomplete',
  FUTURE_STEPS_NOT_VISIBLE: 'future_steps_not_visible',
  AMBIGUOUS_FIELDS: 'ambiguous_fields',
  UNKNOWN: 'unknown',
});

export const NEXT_ACTION = Object.freeze({
  NONE: 'none',
  USE_CAPTURE: 'use_capture',
  UPLOAD_SCREENSHOTS: 'upload_screenshots',
  CONTINUE_TO_NEXT_STEP: 'continue_to_next_step',
  MANUAL_REVIEW: 'manual_review',
  PROVIDE_FILE: 'provide_file',
  RETRY: 'retry',
});

export const UI_TYPE = Object.freeze({
  TEXT: 'text',
  TEXTAREA: 'textarea',
  EMAIL: 'email',
  TEL: 'tel',
  NUMBER: 'number',
  DATE: 'date',
  DATETIME: 'datetime',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  MULTI_SELECT: 'multi_select',
  FILE: 'file',
  RATING: 'rating',
  MATRIX: 'matrix',
  CUSTOM_WIDGET: 'custom_widget',
  UNKNOWN: 'unknown',
});

export const SEMANTIC_CATEGORY = Object.freeze({
  FULL_NAME: 'full_name',
  FIRST_NAME: 'first_name',
  LAST_NAME: 'last_name',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE_OF_BIRTH: 'date_of_birth',
  GENDER: 'gender',
  ADDRESS: 'address',
  COUNTRY: 'country',
  COMPANY: 'company',
  ROLE: 'role',
  SALARY_EXPECTATION: 'salary_expectation',
  AVAILABILITY: 'availability',
  EXPERIENCE_YEARS: 'experience_years',
  COVER_LETTER: 'cover_letter',
  RESUME_UPLOAD: 'resume_upload',
  PORTFOLIO_URL: 'portfolio_url',
  LINKEDIN_URL: 'linkedin_url',
  FREE_TEXT_BIO: 'free_text_bio',
  CONSENT: 'consent',
  UNKNOWN: 'unknown',
});

export const FILL_SOURCE = Object.freeze({
  PROFILE: 'profile',
  VAULT: 'vault',
  AI: 'ai',
  USER: 'user',
  FILE: 'file',
  UNSUPPORTED: 'unsupported',
});

export const FILL_MODE = Object.freeze({
  AUTO: 'auto',
  SUGGEST: 'suggest',
  MANUAL: 'manual',
});

export const EVIDENCE_SOURCE = Object.freeze({
  INPUT_TYPE: 'input_type',
  AUTOCOMPLETE: 'autocomplete',
  NAME_ATTR: 'name_attr',
  ID_ATTR: 'id_attr',
  LABEL_TEXT: 'label_text',
  PLACEHOLDER: 'placeholder',
  NEARBY_TEXT: 'nearby_text',
  SECTION_CONTEXT: 'section_context',
  OPTION_TEXT: 'option_text',
  ARIA: 'aria',
  ADAPTER: 'adapter',
  MODEL: 'model',
});

const PROVIDER_LABEL_MAP = Object.freeze({
  [PROVIDER_TYPE.GOOGLE_FORMS]: 'Google Forms',
  [PROVIDER_TYPE.TYPEFORM]: 'Typeform',
  [PROVIDER_TYPE.JOTFORM]: 'JotForm',
  [PROVIDER_TYPE.MICROSOFT_FORMS]: 'Microsoft Forms',
  [PROVIDER_TYPE.TALLY]: 'Tally',
  [PROVIDER_TYPE.SURVEYMONKEY]: 'SurveyMonkey',
  [PROVIDER_TYPE.QUALTRICS]: 'Qualtrics',
  [PROVIDER_TYPE.WORKDAY]: 'Workday',
  [PROVIDER_TYPE.PLAIN_HTML]: 'Web Form',
  [PROVIDER_TYPE.CUSTOM_UNKNOWN]: 'Web Form',
  [PROVIDER_TYPE.DEMO]: 'Demo',
});

export function getProviderLabel(provider) {
  return PROVIDER_LABEL_MAP[provider] || 'Web Form';
}

export function isParseTerminalFailure(status) {
  return status === PARSE_STATUS.ERROR || status === PARSE_STATUS.UNSUPPORTED || status === PARSE_STATUS.BLOCKED;
}

