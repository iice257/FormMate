// @ts-nocheck
import { MOCK_FORMS } from './mock-forms';
import { classifyAmbiguousFieldBuckets } from '../ai/ai-actions';
import { getRequestAuthHeaders } from '../auth/auth-service';
import { legacyFormDataToCanonical, toLegacyFormData } from './compat';
import { enrichLegacyFormDataWithFillPlan } from './fill-plan';
import { createBaseParseEnvelope, createParserMessage } from './status';
import {
  BLOCKED_REASON,
  COMPLETENESS_STATUS,
  NEXT_ACTION,
  PARSE_STATUS,
  PROVIDER_TYPE,
  SOURCE_TYPE,
  UNSUPPORTED_REASON,
  getProviderLabel,
} from './schema';
import { runPlainHtmlAdapter } from './adapters/plain-html';
import { runCaptureAdapter } from './adapters/capture';
import { requestImageParse } from './adapters/image';
import { chooseProvider, detectProviderFromDomSignature, detectProviderFromUrl } from './adapters/provider-detection';
import { applyProviderAdapterOverrides } from './adapters/provider-guard';

const HARD_CAPTURE_PROVIDERS = new Set([
  PROVIDER_TYPE.GOOGLE_FORMS,
  PROVIDER_TYPE.MICROSOFT_FORMS,
  PROVIDER_TYPE.WORKDAY,
]);

const DOCUMENT_URL_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(?:[?#].*)?$/i;
const DOCUMENT_ROUTE_PATTERN = /\/(documentcenter\/view|documents?\/download|download\/documents?)(?:\/|$)/i;

function createParseError(code, message, details = {}) {
  const err = new Error(message);
  err.code = code;
  err.details = details;
  return err;
}

function isDemoUrl(url) {
  return String(url || '').toLowerCase().startsWith('demo://');
}

function getDemoId(url) {
  return String(url || '').slice('demo://'.length).trim();
}

function isDocumentUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    return DOCUMENT_URL_PATTERN.test(parsed.pathname) || DOCUMENT_ROUTE_PATTERN.test(parsed.pathname);
  } catch {
    return DOCUMENT_URL_PATTERN.test(String(url || '')) || DOCUMENT_ROUTE_PATTERN.test(String(url || ''));
  }
}

export function extractGoogleFormId(url) {
  const normalized = String(url || '');
  const embedMatch = normalized.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  const longMatch = normalized.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];

  return null;
}

export function isGoogleFormUrl(url) {
  return detectProviderFromUrl(url) === PROVIDER_TYPE.GOOGLE_FORMS;
}

function parseFbPublicLoadData(dataString) {
  try {
    const data = JSON.parse(dataString);
    const formInfo = data?.[1];
    const title = formInfo?.[8] || formInfo?.[0] || 'Google Form';
    const description = formInfo?.[1] || '';
    const rawQuestions = formInfo?.[1];
    if (!Array.isArray(rawQuestions)) return null;

    const questions = [];
    rawQuestions.forEach((q, index) => {
      if (!Array.isArray(q)) return;
      const text = q[1] || `Question ${index + 1}`;
      const questionType = q[3];
      const typeMap = {
        0: 'short_text',
        1: 'long_text',
        2: 'radio',
        3: 'dropdown',
        4: 'checkbox',
        5: 'linear_scale',
        7: 'radio',
        9: 'date',
        10: 'short_text',
      };

      let options = [];
      try {
        const optionData = q[4]?.[0]?.[1];
        if (Array.isArray(optionData)) {
          options = optionData.map((opt) => opt[0]).filter(Boolean);
        }
      } catch {
        options = [];
      }

      questions.push({
        id: String(index + 1),
        text,
        type: typeMap[questionType] || 'short_text',
        required: q[4]?.[0]?.[2] === 1,
        options,
      });
    });

    if (questions.length === 0) return null;
    return { title, description, questions };
  } catch {
    return null;
  }
}

function attachLegacyMetadata(legacyFormData, { sourceUrl, provider, parseStrategy, outcome, diagnostics }) {
  if (!legacyFormData) return null;
  return enrichLegacyFormDataWithFillPlan({
    ...legacyFormData,
    url: legacyFormData.url || sourceUrl,
    source: legacyFormData.source || getProviderLabel(provider),
    parseStrategy: parseStrategy || legacyFormData.parseStrategy || diagnostics?.parseStrategy || 'unknown',
    supportState: legacyFormData.supportState || (
      outcome?.status === PARSE_STATUS.SUCCESS
        ? 'supported'
        : outcome?.status === PARSE_STATUS.PARTIAL
          ? 'partial'
          : outcome?.status === PARSE_STATUS.BLOCKED
            ? 'blocked'
            : outcome?.status === PARSE_STATUS.UNSUPPORTED
              ? 'unsupported'
              : outcome?.status === PARSE_STATUS.NO_FORM
                ? 'no_form'
                : 'error'
    ),
    authRequired: legacyFormData.authRequired || outcome?.blockedReason === BLOCKED_REASON.AUTH_REQUIRED,
    diagnostics: {
      ...(legacyFormData.diagnostics || {}),
      ...(diagnostics || {}),
      parseStatus: outcome?.status,
    },
  });
}

function buildEnvelopeFromAdapter({
  sourceUrl,
  normalizedUrl,
  finalUrl,
  provider,
  adapterKey,
  sourceType = SOURCE_TYPE.HTML,
  fetchStrategy = '',
  httpStatus,
  domSignatureProvider = '',
  parseStrategy = '',
  adapterResult,
}) {
  const canonicalForm = adapterResult?.canonicalForm
    || (adapterResult?.legacyFormData ? legacyFormDataToCanonical(adapterResult.legacyFormData, { provider }) : null);
  const fallbackLegacy = canonicalForm
    ? toLegacyFormData({
      form: canonicalForm,
      compatibility: null,
      acquisition: {
        sourceUrl,
        normalizedUrl,
        finalUrl,
        provider,
        adapterKey,
      },
      diagnostics: {
        ...(adapterResult?.diagnostics || {}),
        parseStrategy: parseStrategy || adapterResult?.parseStrategy || '',
      },
      outcome: {
        status: adapterResult?.parseStatus,
        blockedReason: adapterResult?.blockedReason,
      },
    })
    : adapterResult?.legacyFormData || null;

  const parseEnvelope = createBaseParseEnvelope({
    sourceType,
    sourceUrl,
    normalizedUrl,
    finalUrl,
    provider,
    adapterKey,
    fetchStrategy,
    parseStatus: adapterResult?.parseStatus || PARSE_STATUS.ERROR,
    completeness: adapterResult?.completeness || COMPLETENESS_STATUS.EMPTY,
    blockedReason: adapterResult?.blockedReason,
    unsupportedReasons: adapterResult?.unsupportedReasons || [],
    warnings: adapterResult?.warnings || [],
    nextAction: adapterResult?.nextAction || NEXT_ACTION.RETRY,
    nextStepRequired: Boolean(adapterResult?.nextStepRequired),
    nextStepHint: adapterResult?.nextStepHint || '',
    confidence: adapterResult?.confidence || {},
    diagnostics: {
      ...(adapterResult?.diagnostics || {}),
      httpStatus,
      parseStrategy: parseStrategy || adapterResult?.parseStrategy || '',
      domSignatureProvider: domSignatureProvider || undefined,
      fillPlanSummary: fallbackLegacy?.fillPlanSummary || adapterResult?.legacyFormData?.fillPlanSummary,
    },
    form: canonicalForm,
    compatibility: attachLegacyMetadata(fallbackLegacy, {
      sourceUrl,
      provider,
      parseStrategy: parseStrategy || adapterResult?.parseStrategy,
      outcome: {
        status: adapterResult?.parseStatus,
        blockedReason: adapterResult?.blockedReason,
      },
      diagnostics: {
        ...(adapterResult?.diagnostics || {}),
        httpStatus,
      },
    }),
  });

  if (!parseEnvelope.form && parseEnvelope.compatibility?.questions?.length) {
    parseEnvelope.form = legacyFormDataToCanonical(parseEnvelope.compatibility, {
      provider,
    });
  }

  return parseEnvelope;
}

function buildProviderCaptureGateEnvelope(url, provider) {
  const providerLabel = getProviderLabel(provider);
  const useScreenshotUpload = provider === PROVIDER_TYPE.GOOGLE_FORMS;
  return createBaseParseEnvelope({
    sourceType: SOURCE_TYPE.HTML,
    sourceUrl: url,
    normalizedUrl: url,
    finalUrl: url,
    provider,
    adapterKey: `${provider}_capture_gate`,
    fetchStrategy: 'provider_gate',
    parseStatus: PARSE_STATUS.BLOCKED,
    completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
    blockedReason: BLOCKED_REASON.INTERACTION_REQUIRED,
    nextAction: useScreenshotUpload ? NEXT_ACTION.UPLOAD_SCREENSHOTS : NEXT_ACTION.USE_CAPTURE,
    nextStepRequired: true,
    nextStepHint: provider === PROVIDER_TYPE.GOOGLE_FORMS
      ? 'Google Forms are screenshot-first in FormMate because structural access is frequently blocked by active-session requirements.'
      : provider === PROVIDER_TYPE.MICROSOFT_FORMS
        ? 'Microsoft Forms usually requires interactive rendering. Use Assisted Capture from a browser session instead of URL-only parsing.'
      : `${providerLabel} usually requires an active browser session or interactive rendering. Use Assisted Capture instead of URL-only parsing.`,
    warnings: [
      createParserMessage(
        'PROVIDER_CAPTURE_GATE',
        'warning',
        provider === PROVIDER_TYPE.GOOGLE_FORMS
          ? 'Google Forms are routed to screenshot parsing by default.'
          : provider === PROVIDER_TYPE.MICROSOFT_FORMS
            ? 'Microsoft Forms is routed to Assisted Capture by default.'
          : `${providerLabel} is routed to Assisted Capture by default.`,
      ),
    ],
    confidence: {
      overall: 0.18,
      fieldDetection: 0.16,
      uiClassification: 0.16,
      semanticClassification: 0.16,
      fillPolicy: 0.16,
      completeness: 0.18,
    },
    diagnostics: {
      authSignal: false,
      renderSignal: true,
      aiFallbackUsed: false,
      extractionWarnings: [`${providerLabel} was blocked by provider policy before URL parsing.`],
      parseStrategy: 'provider_capture_gate',
    },
  });
}

function buildFallbackErrorEnvelope(url, provider, err, parseStrategy = 'error') {
  return createBaseParseEnvelope({
    sourceType: SOURCE_TYPE.HTML,
    sourceUrl: url,
    normalizedUrl: url,
    finalUrl: url,
    provider,
    adapterKey: 'error',
    fetchStrategy: 'error',
    parseStatus: PARSE_STATUS.ERROR,
    completeness: COMPLETENESS_STATUS.EMPTY,
    unsupportedReasons: [UNSUPPORTED_REASON.UNKNOWN],
    warnings: [
      createParserMessage(
        err?.code || 'PARSER_ERROR',
        'error',
        err?.message || 'Unknown parser failure.'
      ),
    ],
    nextAction: NEXT_ACTION.RETRY,
    nextStepRequired: false,
    confidence: {
      overall: 0.05,
      fieldDetection: 0.05,
      uiClassification: 0.05,
      semanticClassification: 0.05,
      fillPolicy: 0.05,
      completeness: 0.05,
    },
    diagnostics: {
      authSignal: false,
      renderSignal: false,
      aiFallbackUsed: false,
      extractionWarnings: [err?.message || 'Unknown parser failure.'],
      parseStrategy,
    },
  });
}

function buildDocumentUnsupportedEnvelope(url, provider = PROVIDER_TYPE.PLAIN_HTML) {
  return createBaseParseEnvelope({
    sourceType: SOURCE_TYPE.HTML,
    sourceUrl: url,
    normalizedUrl: url,
    finalUrl: url,
    provider,
    adapterKey: 'document-url',
    fetchStrategy: 'document_url_gate',
    parseStatus: PARSE_STATUS.UNSUPPORTED,
    completeness: COMPLETENESS_STATUS.EMPTY,
    unsupportedReasons: [UNSUPPORTED_REASON.PROVIDER_NOT_SUPPORTED],
    warnings: [
      createParserMessage(
        'DOCUMENT_URL_UNSUPPORTED',
        'warning',
        'Document links are not parsed from URL in this version. Use screenshots or manual review for visible fields.'
      ),
    ],
    nextAction: NEXT_ACTION.UPLOAD_SCREENSHOTS,
    nextStepRequired: false,
    nextStepHint: 'Upload screenshots of the visible document form fields, or review this document manually.',
    confidence: {
      overall: 0.9,
      fieldDetection: 0,
      uiClassification: 0,
      semanticClassification: 0,
      fillPolicy: 0,
      completeness: 0.9,
    },
    diagnostics: {
      authSignal: false,
      renderSignal: false,
      aiFallbackUsed: false,
      extractionWarnings: ['Document URL detected before HTML acquisition.'],
      parseStrategy: 'document_url_gate',
    },
  });
}

async function readProxyErrorMessage(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return fallbackMessage;

  try {
    const payload = await response.json();
    return payload?.message || payload?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function parseGoogleForm(url) {
  const authHeaders = getRequestAuthHeaders();
  const provider = PROVIDER_TYPE.GOOGLE_FORMS;

  try {
    const response = await fetch(`/api/proxy/google-form?url=${encodeURIComponent(url)}`, {
      headers: authHeaders,
    });

    if (!response.ok) {
      throw createParseError('NETWORK', `Google Form fetch failed: ${response.statusText}`, { platform: provider, url });
    }

    const result = await response.json();
    const httpStatus = result.httpStatus || response.status;
    const normalizedUrl = result.normalizedUrl || url;
    const finalUrl = result.finalUrl || normalizedUrl || url;

    if (result.fbPublicLoadData) {
      const fbParsed = parseFbPublicLoadData(result.fbPublicLoadData);
      if (fbParsed?.questions?.length) {
        const legacyFormData = {
          ...fbParsed,
          url,
          source: getProviderLabel(provider),
          parseStrategy: 'fb_public_load_data',
          authRequired: false,
          supportState: 'supported',
          diagnostics: {
            parseStrategy: 'fb_public_load_data',
            httpStatus,
            authSignal: false,
            renderSignal: false,
            aiFallbackUsed: false,
          },
        };

        const canonical = legacyFormDataToCanonical(legacyFormData, { provider });
        return buildEnvelopeFromAdapter({
          sourceUrl: url,
          normalizedUrl,
          finalUrl,
          provider,
          adapterKey: 'google-forms',
          fetchStrategy: result.strategy || 'google_proxy',
          httpStatus,
          parseStrategy: 'fb_public_load_data',
          adapterResult: {
            parseStatus: PARSE_STATUS.SUCCESS,
            completeness: COMPLETENESS_STATUS.COMPLETE,
            warnings: [],
            nextAction: NEXT_ACTION.NONE,
            nextStepRequired: false,
            nextStepHint: '',
            unsupportedReasons: [],
            legacyFormData,
            canonicalForm: canonical,
            diagnostics: {
              authSignal: false,
              renderSignal: false,
              aiFallbackUsed: false,
              extractionWarnings: [],
            },
            confidence: {
              fieldDetection: 0.92,
              uiClassification: 0.9,
              semanticClassification: 0.78,
              fillPolicy: 0.8,
              completeness: 0.92,
            },
            parseStrategy: 'fb_public_load_data',
          },
        });
      }
    }

    if (!result.html) {
      return buildEnvelopeFromAdapter({
        sourceUrl: url,
        normalizedUrl,
        finalUrl,
        provider,
        adapterKey: 'google-forms',
        fetchStrategy: result.strategy || 'google_proxy',
        httpStatus,
        parseStrategy: 'google_proxy_blocked',
        adapterResult: {
          parseStatus: PARSE_STATUS.BLOCKED,
          completeness: COMPLETENESS_STATUS.BLOCKED_BEFORE_FORM,
          blockedReason: result.authRequired ? BLOCKED_REASON.AUTH_REQUIRED : BLOCKED_REASON.UNKNOWN,
          unsupportedReasons: [],
          nextAction: result.authRequired ? NEXT_ACTION.USE_CAPTURE : NEXT_ACTION.MANUAL_REVIEW,
          nextStepRequired: false,
          nextStepHint: result.authRequired
            ? 'Google Form requires sign-in or permission.'
            : 'Google Form content was unavailable.',
          warnings: [
            createParserMessage(
              result.authRequired ? 'AUTH_REQUIRED' : 'GOOGLE_HTML_MISSING',
              'warning',
              result.authRequired
                ? 'This Google Form requires sign-in or permission to view.'
                : 'Google Form HTML was unavailable.'
            ),
          ],
          legacyFormData: null,
          canonicalForm: null,
          diagnostics: {
            authSignal: Boolean(result.authRequired),
            renderSignal: false,
            aiFallbackUsed: false,
            extractionWarnings: [],
          },
          confidence: {
            overall: 0.2,
            fieldDetection: 0.18,
            uiClassification: 0.18,
            semanticClassification: 0.18,
            fillPolicy: 0.18,
            completeness: 0.2,
          },
          parseStrategy: 'google_proxy_blocked',
        },
      });
    }

    const domProvider = detectProviderFromDomSignature(result.html);
    const providerSelection = chooseProvider({
      urlProvider: provider,
      domProvider,
    });
    const selectedProvider = providerSelection.provider || provider;
    const selectedProviderLabel = getProviderLabel(selectedProvider);

    const adapterResult = await runPlainHtmlAdapter({
      html: result.html,
      url,
      provider: selectedProviderLabel,
      parseStrategy: result.strategy === 'formResponse' ? 'google_form_response_dom' : 'google_viewform_dom',
      classifyAmbiguousFields: classifyAmbiguousFieldBuckets,
    });

    return buildEnvelopeFromAdapter({
      sourceUrl: url,
      normalizedUrl,
      finalUrl,
      provider: selectedProvider,
      adapterKey: 'google-forms',
      fetchStrategy: result.strategy || 'google_proxy',
      httpStatus,
      domSignatureProvider: domProvider,
      parseStrategy: adapterResult.parseStrategy || 'google_dom_parse',
      adapterResult,
    });
  } catch (err) {
    return buildFallbackErrorEnvelope(url, provider, err, 'google_error');
  }
}

async function parseGenericForm(url) {
  const authHeaders = getRequestAuthHeaders();
  const urlProvider = detectProviderFromUrl(url);
  const initialProvider = urlProvider || PROVIDER_TYPE.PLAIN_HTML;

  try {
    const response = await fetch(`/api/proxy/scrape?url=${encodeURIComponent(url)}`, {
      headers: authHeaders,
    });
    if (!response.ok) {
      const message = await readProxyErrorMessage(
        response,
        'The public page could not be fetched for URL parsing.'
      );
      throw createParseError('NETWORK', message, { platform: initialProvider, url, httpStatus: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    let html = '';
    let httpStatus = response.status;
    let normalizedUrl = url;
    let finalUrl = url;
    let fetchStrategy = 'scrape_proxy';

    if (contentType.includes('application/json')) {
      const result = await response.json();
      html = result.html || '';
      httpStatus = result.httpStatus || response.status;
      normalizedUrl = result.normalizedUrl || url;
      finalUrl = result.finalUrl || url;
      fetchStrategy = result.fetchStrategy || fetchStrategy;
    } else {
      html = await response.text();
    }

    return parseHtmlSnapshot({
      sourceUrl: url,
      normalizedUrl,
      finalUrl,
      html,
      fetchStrategy,
      httpStatus,
    });
  } catch (err) {
    return buildFallbackErrorEnvelope(url, initialProvider, err, 'generic_error');
  }
}

export async function parseHtmlSnapshot({
  sourceUrl,
  normalizedUrl,
  finalUrl,
  html,
  fetchStrategy = 'direct_html',
  httpStatus = 200,
}) {
  const urlProvider = detectProviderFromUrl(sourceUrl);
  const domProvider = detectProviderFromDomSignature(html);
  const providerSelection = chooseProvider({
    urlProvider,
    domProvider,
  });
  const selectedProvider = providerSelection.provider || urlProvider || PROVIDER_TYPE.PLAIN_HTML;
  if (HARD_CAPTURE_PROVIDERS.has(selectedProvider)) {
    return buildProviderCaptureGateEnvelope(sourceUrl, selectedProvider);
  }

  const selectedProviderLabel = getProviderLabel(selectedProvider);
  let adapterResult = await runPlainHtmlAdapter({
    html,
    url: sourceUrl,
    provider: selectedProviderLabel,
    parseStrategy: 'dom_parse',
    classifyAmbiguousFields: classifyAmbiguousFieldBuckets,
  });
  adapterResult = applyProviderAdapterOverrides({
    provider: selectedProvider,
    adapterResult,
  });

  return buildEnvelopeFromAdapter({
    sourceUrl,
    normalizedUrl: normalizedUrl || sourceUrl,
    finalUrl: finalUrl || normalizedUrl || sourceUrl,
    provider: selectedProvider,
    adapterKey: selectedProvider === PROVIDER_TYPE.PLAIN_HTML ? 'plain-html' : `provider-${selectedProvider}`,
    fetchStrategy,
    httpStatus,
    domSignatureProvider: domProvider,
    parseStrategy: adapterResult.parseStrategy || 'dom_parse',
    adapterResult,
  });
}

export async function parseImageArtifacts({
  sourceUrl = '',
  imageArtifacts = [],
  imageServiceUrl,
}) {
  const provider = detectProviderFromUrl(sourceUrl) || PROVIDER_TYPE.PLAIN_HTML;
  const adapterResult = await requestImageParse({
    imageArtifacts,
    imageServiceUrl,
    sourceUrl,
  });

  return buildEnvelopeFromAdapter({
    sourceUrl,
    normalizedUrl: sourceUrl,
    finalUrl: sourceUrl,
    provider,
    adapterKey: provider === PROVIDER_TYPE.PLAIN_HTML ? 'image' : `provider-${provider}-image`,
    sourceType: SOURCE_TYPE.IMAGE,
    fetchStrategy: 'image_boundary',
    httpStatus: 200,
    parseStrategy: adapterResult?.parseStrategy || 'image_service',
    adapterResult,
  });
}

function buildDemoEnvelope(url) {
  const demoId = getDemoId(url);
  const demo = MOCK_FORMS[demoId];
  if (!demo) {
    return createBaseParseEnvelope({
      sourceType: SOURCE_TYPE.DEMO,
      sourceUrl: url,
      normalizedUrl: url,
      finalUrl: url,
      provider: PROVIDER_TYPE.DEMO,
      adapterKey: 'demo',
      fetchStrategy: 'demo',
      parseStatus: PARSE_STATUS.UNSUPPORTED,
      completeness: COMPLETENESS_STATUS.EMPTY,
      unsupportedReasons: [UNSUPPORTED_REASON.UNKNOWN],
      warnings: [
        createParserMessage('DEMO_NOT_FOUND', 'warning', 'Unknown demo form reference.'),
      ],
      nextAction: NEXT_ACTION.MANUAL_REVIEW,
      confidence: {
        overall: 0.1,
        fieldDetection: 0.1,
        uiClassification: 0.1,
        semanticClassification: 0.1,
        fillPolicy: 0.1,
        completeness: 0.1,
      },
      diagnostics: {
        authSignal: false,
        renderSignal: false,
        aiFallbackUsed: false,
        extractionWarnings: ['Unknown demo reference.'],
        parseStrategy: 'demo',
      },
    });
  }

  const legacyFormData = enrichLegacyFormDataWithFillPlan({
    ...demo,
    url,
    source: 'Demo',
    parseStrategy: 'demo',
    demoId,
    authRequired: false,
    supportState: 'supported',
    diagnostics: {
      inputUrl: url,
      normalizedUrl: url,
      finalUrl: url,
      parseStrategy: 'demo',
      authSignal: false,
      renderSignal: false,
      aiFallbackUsed: false,
      questionCount: Array.isArray(demo.questions) ? demo.questions.length : 0,
      httpStatus: 200,
    },
  });

  const canonicalForm = legacyFormDataToCanonical(legacyFormData, { provider: PROVIDER_TYPE.DEMO });
  return createBaseParseEnvelope({
    sourceType: SOURCE_TYPE.DEMO,
    sourceUrl: url,
    normalizedUrl: url,
    finalUrl: url,
    provider: PROVIDER_TYPE.DEMO,
    adapterKey: 'demo',
    fetchStrategy: 'demo',
    parseStatus: PARSE_STATUS.SUCCESS,
    completeness: COMPLETENESS_STATUS.COMPLETE,
    nextAction: NEXT_ACTION.NONE,
    warnings: [],
    confidence: {
      fieldDetection: 0.96,
      uiClassification: 0.95,
      semanticClassification: 0.82,
      fillPolicy: 0.84,
      completeness: 0.96,
    },
    diagnostics: {
      authSignal: false,
      renderSignal: false,
      aiFallbackUsed: false,
      extractionWarnings: [],
      parseStrategy: 'demo',
      httpStatus: 200,
    },
    form: canonicalForm,
    compatibility: legacyFormData,
  });
}

export async function parseFormUrl(url) {
  if (isDemoUrl(url)) {
    return buildDemoEnvelope(url);
  }

  const urlProvider = detectProviderFromUrl(url);
  if (isDocumentUrl(url)) {
    return buildDocumentUnsupportedEnvelope(url, urlProvider || PROVIDER_TYPE.PLAIN_HTML);
  }

  if (HARD_CAPTURE_PROVIDERS.has(urlProvider)) {
    return buildProviderCaptureGateEnvelope(url, urlProvider);
  }

  return parseGenericForm(url);
}

export function parseCapturePayload(payload) {
  try {
    const adapterResult = runCaptureAdapter(payload);
    return buildEnvelopeFromAdapter({
      sourceUrl: payload?.pageUrl || '',
      normalizedUrl: payload?.pageUrl || '',
      finalUrl: payload?.pageUrl || '',
      provider: PROVIDER_TYPE.PLAIN_HTML,
      adapterKey: 'capture',
      sourceType: SOURCE_TYPE.CAPTURE,
      fetchStrategy: 'capture_payload',
      httpStatus: 200,
      parseStrategy: adapterResult.parseStrategy || 'capture_v1',
      adapterResult,
    });
  } catch (err) {
    return buildFallbackErrorEnvelope(payload?.pageUrl || '', PROVIDER_TYPE.PLAIN_HTML, err, 'capture_error');
  }
}

export function detectFormPlatform(url) {
  return getProviderLabel(detectProviderFromUrl(url));
}
