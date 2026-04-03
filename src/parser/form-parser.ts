// @ts-nocheck
import { MOCK_FORMS } from './mock-forms';
import { parseDOM } from './dom-parser';
import { parseFormHtml } from '../ai/ai-actions';

const RENDER_REQUIRED_PLATFORMS = new Set([
  'Typeform',
  'JotForm',
  'SurveyMonkey',
  'Workday',
  'Qualtrics',
  'Airtable Forms',
  'Tally',
  'Feathery'
]);

const MIN_CONFIDENT_FIELDS = 2;

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

export function extractGoogleFormId(url) {
  const normalized = String(url || '');
  const embedMatch = normalized.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  const longMatch = normalized.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];

  return null;
}

export function isGoogleFormUrl(url) {
  const lower = String(url || '').toLowerCase();
  return lower.includes('docs.google.com/forms')
    || lower.includes('google.com/forms')
    || lower.includes('forms.gle/');
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
        10: 'short_text'
      };

      let options = [];
      try {
        const optionData = q[4]?.[0]?.[1];
        if (Array.isArray(optionData)) {
          options = optionData.map((opt) => opt[0]).filter(Boolean);
        }
      } catch (_) {
        // no-op
      }

      questions.push({
        id: String(index + 1),
        text,
        type: typeMap[questionType] || 'short_text',
        required: q[4]?.[0]?.[2] === 1,
        options
      });
    });

    if (questions.length === 0) return null;
    return { title, description, questions };
  } catch (err) {
    console.warn('[FormParser] FB_PUBLIC_LOAD_DATA_ parse failed:', err.message);
    return null;
  }
}

function createDiagnostics(url, platform) {
  return {
    inputUrl: url,
    normalizedUrl: url,
    platform,
    fetchStrategy: null,
    parseStrategy: null,
    httpStatus: null,
    finalUrl: null,
    authSignal: false,
    renderSignal: false,
    aiFallbackUsed: false,
    questionCount: 0,
  };
}

function finalizeFormResult(formData, metadata) {
  const questions = Array.isArray(formData?.questions) ? formData.questions : [];
  return {
    ...formData,
    url: metadata.url,
    source: metadata.source,
    authRequired: Boolean(metadata.authRequired),
    parseStrategy: metadata.parseStrategy,
    supportState: metadata.supportState || 'supported',
    diagnostics: {
      ...(metadata.diagnostics || {}),
      parseStrategy: metadata.parseStrategy,
      questionCount: questions.length,
      authSignal: Boolean(metadata.diagnostics?.authSignal),
      renderSignal: Boolean(metadata.diagnostics?.renderSignal),
      aiFallbackUsed: Boolean(metadata.diagnostics?.aiFallbackUsed),
    }
  };
}

export async function parseFormUrl(url) {
  if (isDemoUrl(url)) {
    const demoId = getDemoId(url);
    const demo = MOCK_FORMS[demoId];
    if (!demo) {
      throw createParseError('PARSE_FAILED', 'Unknown demo form.', { demoId });
    }

    return finalizeFormResult(demo, {
      url,
      source: 'Demo',
      authRequired: false,
      parseStrategy: 'demo',
      diagnostics: {
        inputUrl: url,
        normalizedUrl: url,
        platform: 'Demo',
        fetchStrategy: 'demo',
        parseStrategy: 'demo',
        httpStatus: 200,
        finalUrl: url,
        authSignal: false,
        renderSignal: false,
        aiFallbackUsed: false,
        questionCount: demo.questions.length,
      }
    });
  }

  if (isGoogleFormUrl(url)) {
    return parseGoogleForm(url);
  }

  return parseGenericForm(url);
}

async function parseGoogleForm(url) {
  const diagnostics = createDiagnostics(url, 'Google Forms');
  diagnostics.fetchStrategy = 'google_proxy';

  try {
    const response = await fetch(`/api/proxy/google-form?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw createParseError('NETWORK', `Google Form fetch failed: ${response.statusText}`, { platform: 'Google Forms', url });
    }

    const result = await response.json();
    diagnostics.httpStatus = result.httpStatus || response.status;
    diagnostics.normalizedUrl = result.normalizedUrl || url;
    diagnostics.finalUrl = result.finalUrl || result.normalizedUrl || url;
    diagnostics.fetchStrategy = result.strategy || diagnostics.fetchStrategy;

    if (result.fbPublicLoadData) {
      const fbParsed = parseFbPublicLoadData(result.fbPublicLoadData);
      if (fbParsed?.questions?.length) {
        return finalizeFormResult(fbParsed, {
          url,
          source: 'Google Forms',
          authRequired: false,
          parseStrategy: 'fb_public_load_data',
          diagnostics: {
            ...diagnostics,
            parseStrategy: 'fb_public_load_data',
          }
        });
      }
    }

    if (!result.html) {
      diagnostics.authSignal = Boolean(result.authRequired);
      throw createParseError(
        result.authRequired ? 'AUTH_REQUIRED' : 'PARSE_FAILED',
        result.authRequired
          ? 'This Google Form requires sign-in or permission to view. Use Assisted Capture (bookmarklet) while you are signed in.'
          : 'Could not fetch a parseable Google Form response.',
        { platform: 'Google Forms', url }
      );
    }

    let formData = parseDOM(result.html);
    diagnostics.authSignal = Boolean(formData.requiresAuth || result.authRequired);
    diagnostics.renderSignal = Boolean(formData.requiresRender);

    if (formData.requiresAuth && formData.questions.length === 0) {
      throw createParseError(
        'AUTH_REQUIRED',
        'This Google Form requires sign-in or permission to view. Use Assisted Capture (bookmarklet) while you are signed in.',
        { platform: 'Google Forms', url }
      );
    }

    if (formData.requiresRender && formData.questions.length < MIN_CONFIDENT_FIELDS) {
      throw createParseError(
        'RENDER_REQUIRED',
        "This form is rendered in your browser and can't be reliably scanned from a URL. Use Assisted Capture (bookmarklet) to import it.",
        { platform: 'Google Forms', url }
      );
    }

    if (!formData.questions?.length) {
      diagnostics.aiFallbackUsed = true;
      formData = await parseFormHtml(result.html, url);
    }

    if (!formData?.questions?.length) {
      throw createParseError(
        'PARSE_FAILED',
        'Could not extract form fields from this Google Form. The form may be restricted or use an unsupported layout.',
        { platform: 'Google Forms', url }
      );
    }

    return finalizeFormResult(formData, {
      url,
      source: 'Google Forms',
      authRequired: false,
      parseStrategy: diagnostics.aiFallbackUsed ? 'ai_html_parse' : 'dom_parse',
      diagnostics,
    });
  } catch (err) {
    console.error('[FormParser] Google Forms pipeline error:', err);
    throw err;
  }
}

async function parseGenericForm(url) {
  const platform = detectFormPlatform(url);
  const diagnostics = createDiagnostics(url, platform);
  diagnostics.fetchStrategy = 'scrape_proxy';

  try {
    const response = await fetch(`/api/proxy/scrape?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw createParseError('NETWORK', `Proxy fetch failed: ${response.statusText}`, { platform, url });
    }

    const contentType = response.headers.get('content-type') || '';
    let html = '';
    if (contentType.includes('application/json')) {
      const result = await response.json();
      html = result.html || '';
      diagnostics.httpStatus = result.httpStatus || response.status;
      diagnostics.normalizedUrl = result.normalizedUrl || url;
      diagnostics.finalUrl = result.finalUrl || url;
      diagnostics.fetchStrategy = result.fetchStrategy || diagnostics.fetchStrategy;
    } else {
      html = await response.text();
      diagnostics.httpStatus = response.status;
      diagnostics.finalUrl = url;
    }

    let formData = parseDOM(html);
    diagnostics.authSignal = Boolean(formData.requiresAuth);
    diagnostics.renderSignal = Boolean(formData.requiresRender);

    if (formData.requiresAuth && formData.questions.length === 0) {
      throw createParseError(
        'AUTH_REQUIRED',
        'This form requires sign-in or permission to view. Use Assisted Capture (bookmarklet) while you are signed in.',
        { platform, url }
      );
    }

    if (formData.requiresRender && formData.questions.length < MIN_CONFIDENT_FIELDS) {
      throw createParseError(
        'RENDER_REQUIRED',
        "This form is rendered in your browser and can't be reliably scanned from a URL. Use Assisted Capture (bookmarklet) to import it.",
        { platform, url }
      );
    }

    if (!formData.questions?.length) {
      if (RENDER_REQUIRED_PLATFORMS.has(platform)) {
        throw createParseError(
          'RENDER_REQUIRED',
          "This form is rendered in your browser and can't be reliably scanned from a URL. Use Assisted Capture (bookmarklet) to import it.",
          { platform, url }
        );
      }

      diagnostics.aiFallbackUsed = true;
      formData = await parseFormHtml(html, url);
    }

    if (!formData?.questions?.length) {
      throw createParseError('PARSE_FAILED', 'No form fields detected on this page.', { platform, url });
    }

    return finalizeFormResult(formData, {
      url,
      source: platform,
      authRequired: false,
      parseStrategy: diagnostics.aiFallbackUsed ? 'ai_html_parse' : 'dom_parse',
      diagnostics,
    });
  } catch (err) {
    console.error('[FormParser] Scrape/Parse failed:', err);
    throw err;
  }
}

export function detectFormPlatform(url) {
  const normalized = String(url || '').toLowerCase();
  if (isDemoUrl(url)) return 'Demo';
  if (normalized.includes('google.com/forms') || normalized.includes('docs.google.com') || normalized.includes('forms.gle')) return 'Google Forms';
  if (normalized.includes('typeform.com')) return 'Typeform';
  if (normalized.includes('jotform.com')) return 'JotForm';
  if (normalized.includes('lever.co') || normalized.includes('greenhouse.io')) return 'Job Board';
  if (normalized.includes('surveymonkey.com')) return 'SurveyMonkey';
  if (normalized.includes('workday.com') || normalized.includes('myworkdayjobs.com')) return 'Workday';
  if (normalized.includes('tally.so')) return 'Tally';
  if (normalized.includes('qualtrics.com')) return 'Qualtrics';
  if (normalized.includes('airtable.com')) return 'Airtable Forms';
  if (normalized.includes('feathery.io')) return 'Feathery';
  return 'Web Form';
}
