// ═══════════════════════════════════════════
// FormMate — Form Parser
// ═══════════════════════════════════════════

import { MOCK_FORMS } from './mock-forms.js';
import { parseDOM } from './dom-parser.js';
import { parseFormHtml } from '../ai/ai-actions.js';

// ─── Google Forms URL Normalization ──────────

/**
 * Extract a Google Forms ID from any Google Forms URL variant.
 * Handles: /viewform, /edit, /formResponse, /closedform, forms.gle/ shortlinks
 * Returns null if not a Google Forms URL.
 */
export function extractGoogleFormId(url) {
  // Standard long URL: docs.google.com/forms/d/FORM_ID/...
  const longMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];

  // Alternate: docs.google.com/forms/d/e/FORM_ID/...
  const embedMatch = url.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  // Short link: forms.gle/XXXXX — we can't resolve these server-side without following redirects
  // But we try anyway, returning the short code
  const shortMatch = url.match(/forms\.gle\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * Check if a URL is a Google Forms URL
 */
export function isGoogleFormUrl(url) {
  const lower = url.toLowerCase();
  return lower.includes('docs.google.com/forms')
    || lower.includes('google.com/forms')
    || lower.includes('forms.gle/');
}

// ─── FB_PUBLIC_LOAD_DATA_ Parser ─────────────

/**
 * Parse form questions from the FB_PUBLIC_LOAD_DATA_ JSON blob
 * that Google Forms embeds in some pages.
 * This is a best-effort nested-array parser for Google's internal format.
 */
function parseFbPublicLoadData(dataString) {
  try {
    const data = JSON.parse(dataString);

    // Google's FB_PUBLIC_LOAD_DATA_ is a deeply nested array.
    // data[1][1] typically contains [formTitle, formDescription, ...]
    // data[1][1] structure contains the questions array

    const formInfo = data?.[1];
    const title = formInfo?.[8] || formInfo?.[0] || 'Google Form';
    const description = formInfo?.[1] || '';

    // Questions are typically at data[1][1] as an array of arrays
    const rawQuestions = formInfo?.[1];
    if (!Array.isArray(rawQuestions)) {
      return null;
    }

    const questions = [];
    rawQuestions.forEach((q, index) => {
      if (!Array.isArray(q)) return;

      const text = q[1] || `Question ${index + 1}`;
      const questionType = q[3]; // Numeric type indicator

      // Google type mapping:
      // 0 = short_text, 1 = long_text, 2 = radio, 3 = dropdown, 4 = checkbox
      // 5 = linear_scale, 7 = grid, 9 = date, 10 = time
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

      const type = typeMap[questionType] || 'short_text';

      // Options are typically at q[4][0][1] as an array of [optionText] arrays
      let options = [];
      try {
        const optionData = q[4]?.[0]?.[1];
        if (Array.isArray(optionData)) {
          options = optionData.map(opt => opt[0]).filter(Boolean);
        }
      } catch (_) { /* No options */ }

      // Required flag is at q[4][0][2]
      const required = q[4]?.[0]?.[2] === 1;

      questions.push({
        id: String(index + 1),
        text: text,
        type,
        required,
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

// ─── Main Parser ─────────────────────────────

/**
 * Parse a form URL and return structured form data.
 * Uses mock data for demo URLs, dedicated Google Forms pipeline for Google,
 * and generic scraping + DOM parsing for everything else.
 */
export async function parseFormUrl(url) {
  const urlLower = url.toLowerCase();

  // 1. Check if it's a known demo URL
  if (urlLower.includes('lever.co/creativesync')) return { ...MOCK_FORMS['job-application'] };
  if (urlLower.includes('forms.google.com/feedback')) return { ...MOCK_FORMS['customer-feedback'] };
  if (urlLower.includes('gov.travel/visa')) return { ...MOCK_FORMS['travel-visa'] };

  // 2. Google Forms — use dedicated multi-strategy pipeline
  if (isGoogleFormUrl(url)) {
    return await parseGoogleForm(url);
  }

  // 3. Generic web form — original scrape + parse pipeline
  return await parseGenericForm(url);
}

// ─── Google Forms Pipeline ───────────────────

async function parseGoogleForm(url) {
  const formId = extractGoogleFormId(url);

  if (!formId) {
    // Couldn't extract an ID — fall back to generic scraping
    console.log('[FormParser] Could not extract Google Form ID, falling back to generic scraper');
    return await parseGenericForm(url);
  }

  console.log(`[FormParser] Google Form detected. ID: ${formId}`);

  try {
    // Call dedicated Google Forms proxy
    const proxyUrl = `/api/proxy/google-form?formId=${encodeURIComponent(formId)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Google Form proxy failed: ${response.statusText}`);
    }

    const result = await response.json();

    // ── Handle FB_PUBLIC_LOAD_DATA_ strategy ──
    if (result.fbPublicLoadData) {
      console.log('[FormParser] Attempting FB_PUBLIC_LOAD_DATA_ parse...');
      const fbParsed = parseFbPublicLoadData(result.fbPublicLoadData);
      if (fbParsed && fbParsed.questions.length > 0) {
        fbParsed.url = url;
        fbParsed.source = 'Google Forms';
        fbParsed.authRequired = true;
        fbParsed.parseStrategy = 'fb_public_load_data';
        return fbParsed;
      }
    }

    // ── Parse HTML from whichever strategy succeeded ──
    if (result.html) {
      let formData = parseDOM(result.html);

      // If DOM parser detected auth wall, it returns { requiresAuth: true }
      if (formData.requiresAuth && formData.questions.length === 0) {
        // Try AI fallback on whatever HTML we got
        console.log('[FormParser] DOM parser hit auth wall. Trying AI fallback on partial HTML...');
        try {
          formData = await parseFormHtml(result.html, url);
        } catch (_) {
          // AI also failed — throw a user-friendly error
          throw new Error(
            'This Google Form requires sign-in to access. ' +
            'FormMate cannot parse forms that are restricted to specific users or organizations. ' +
            'Try making the form public, or paste the form questions manually.'
          );
        }
      }

      // If still no questions, try AI fallback
      if (!formData.questions || formData.questions.length === 0) {
        console.log('[FormParser] DOM parser found 0 questions. Trying AI fallback...');
        formData = await parseFormHtml(result.html, url);
      }

      if (formData && formData.questions && formData.questions.length > 0) {
        formData.url = url;
        formData.source = 'Google Forms';
        formData.authRequired = result.authRequired || false;
        formData.parseStrategy = result.strategy;
        return formData;
      }
    }

    // Nothing worked
    throw new Error(
      'Could not extract form fields from this Google Form. ' +
      'The form may require sign-in or be restricted to specific users.'
    );

  } catch (err) {
    console.error('[FormParser] Google Forms pipeline error:', err);
    throw err;
  }
}

// ─── Generic Form Pipeline ───────────────────

async function parseGenericForm(url) {
  try {
    console.log(`[FormParser] Initiating generic scan for: ${url}`);

    // Fetch HTML via backend proxy
    const proxyUrl = `/api/proxy/scrape?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML into structured data deterministically
    let formData = parseDOM(html);

    // If DOM parser returned auth wall result, try AI fallback
    if (formData.requiresAuth && formData.questions.length === 0) {
      console.log('[FormParser] Auth wall detected. Trying AI fallback...');
      formData = await parseFormHtml(html, url);
    }

    // Fallback lightweight AI parser if deterministic fails completely
    if (!formData.questions || formData.questions.length === 0) {
      console.log('[FormParser] Deterministic parser found 0 questions. Trying AI fallback...');
      formData = await parseFormHtml(html, url);
    }

    // Final explicit check
    if (!formData || !formData.questions || formData.questions.length === 0) {
      throw new Error("No form fields detected on this page.");
    }

    // Add metadata
    formData.url = url;
    formData.source = detectFormPlatform(url);

    return formData;

  } catch (err) {
    console.error('[FormParser] Scrape/Parse failed:', err);
    throw err;
  }
}

// ─── Platform Detection ──────────────────────

/**
 * Detect the type of form platform from a URL
 */
export function detectFormPlatform(url) {
  if (url.includes('google.com/forms') || url.includes('docs.google.com') || url.includes('forms.gle')) return 'Google Forms';
  if (url.includes('typeform.com')) return 'Typeform';
  if (url.includes('jotform.com')) return 'JotForm';
  if (url.includes('lever.co') || url.includes('greenhouse.io')) return 'Job Board';
  if (url.includes('surveymonkey.com')) return 'SurveyMonkey';
  return 'Web Form';
}
