// @ts-nocheck

import { PROVIDER_TYPE } from '../schema';

function toLower(value) {
  return String(value || '').toLowerCase();
}

export function detectProviderFromUrl(url) {
  const normalized = toLower(url);
  if (!normalized) return PROVIDER_TYPE.CUSTOM_UNKNOWN;
  if (normalized.startsWith('demo://')) return PROVIDER_TYPE.DEMO;
  if (normalized.includes('docs.google.com/forms') || normalized.includes('forms.gle/')) return PROVIDER_TYPE.GOOGLE_FORMS;
  if (normalized.includes('typeform.com')) return PROVIDER_TYPE.TYPEFORM;
  if (normalized.includes('jotform.com')) return PROVIDER_TYPE.JOTFORM;
  if (normalized.includes('tally.so')) return PROVIDER_TYPE.TALLY;
  if (normalized.includes('surveymonkey.com')) return PROVIDER_TYPE.SURVEYMONKEY;
  if (normalized.includes('qualtrics.com')) return PROVIDER_TYPE.QUALTRICS;
  if (normalized.includes('workday.com') || normalized.includes('myworkdayjobs.com')) return PROVIDER_TYPE.WORKDAY;
  return PROVIDER_TYPE.PLAIN_HTML;
}

export function detectProviderFromDomSignature(html) {
  const source = toLower(html);
  if (!source) return PROVIDER_TYPE.CUSTOM_UNKNOWN;

  const signatures = [
    { provider: PROVIDER_TYPE.GOOGLE_FORMS, markers: ['fb_public_load_data_', 'freebirdformviewer', 'docs.google.com/forms'] },
    { provider: PROVIDER_TYPE.TYPEFORM, markers: ['typeform', 'data-tf-widget', 'tf-v1-widget'] },
    { provider: PROVIDER_TYPE.JOTFORM, markers: ['jotform', 'jf-form', 'formid='] },
    { provider: PROVIDER_TYPE.TALLY, markers: ['tally.so', 'tally-form', 'data-tally-'] },
    { provider: PROVIDER_TYPE.SURVEYMONKEY, markers: ['surveymonkey', 'smcx-widget', 'collector.surveymonkey.com'] },
    { provider: PROVIDER_TYPE.QUALTRICS, markers: ['qualtrics', 'qid', 'surveyengine'] },
    { provider: PROVIDER_TYPE.WORKDAY, markers: ['workday', 'myworkdayjobs', 'wd5.myworkdayjobs.com'] },
  ];

  for (const signature of signatures) {
    if (signature.markers.some((marker) => source.includes(marker))) {
      return signature.provider;
    }
  }

  if (source.includes('<form') || source.includes('input') || source.includes('textarea') || source.includes('select')) {
    return PROVIDER_TYPE.PLAIN_HTML;
  }

  return PROVIDER_TYPE.CUSTOM_UNKNOWN;
}

export function chooseProvider({ urlProvider, domProvider }) {
  const normalizedUrlProvider = urlProvider || PROVIDER_TYPE.CUSTOM_UNKNOWN;
  const normalizedDomProvider = domProvider || PROVIDER_TYPE.CUSTOM_UNKNOWN;

  if (normalizedUrlProvider && normalizedUrlProvider !== PROVIDER_TYPE.PLAIN_HTML && normalizedUrlProvider !== PROVIDER_TYPE.CUSTOM_UNKNOWN) {
    return {
      provider: normalizedUrlProvider,
      source: 'url',
      fallbackApplied: normalizedDomProvider !== normalizedUrlProvider && normalizedDomProvider !== PROVIDER_TYPE.CUSTOM_UNKNOWN,
      domProvider: normalizedDomProvider,
    };
  }

  if (normalizedDomProvider && normalizedDomProvider !== PROVIDER_TYPE.CUSTOM_UNKNOWN) {
    return {
      provider: normalizedDomProvider,
      source: 'dom_signature',
      fallbackApplied: true,
      domProvider: normalizedDomProvider,
    };
  }

  return {
    provider: normalizedUrlProvider || PROVIDER_TYPE.PLAIN_HTML,
    source: 'url',
    fallbackApplied: false,
    domProvider: normalizedDomProvider,
  };
}

