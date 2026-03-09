// ═══════════════════════════════════════════
// FormMate — Form Parser
// ═══════════════════════════════════════════

import { MOCK_FORMS } from './mock-forms.js';
import { parseDOM } from './dom-parser.js';
import { parseFormHtml } from '../ai/ai-actions.js';

/**
 * Parse a form URL and return structured form data.
 * Uses mock data for demo URLs, and deterministic DOM parsing for others.
 */
export async function parseFormUrl(url) {
  const urlLower = url.toLowerCase();

  // 1. Check if it's a known demo URL
  if (urlLower.includes('lever.co/creativesync')) return { ...MOCK_FORMS['job-application'] };
  if (urlLower.includes('forms.google.com/feedback')) return { ...MOCK_FORMS['customer-feedback'] };
  if (urlLower.includes('gov.travel/visa')) return { ...MOCK_FORMS['travel-visa'] };

  // 2. Real Scraping & Deterministic Parsing for other URLs
  try {
    console.log(`[FormParser] Initiating real scan for: ${url}`);

    // Fetch HTML via backend proxy
    const proxyUrl = `/api/proxy/scrape?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML into structured data deterministically
    let formData = parseDOM(html);

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
    throw err; // Propegate error instead of swallowing silently
  }
}

/**
 * Detect the type of form platform from a URL
 */
export function detectFormPlatform(url) {
  if (url.includes('google.com/forms') || url.includes('docs.google.com')) return 'Google Forms';
  if (url.includes('typeform.com')) return 'Typeform';
  if (url.includes('jotform.com')) return 'JotForm';
  if (url.includes('lever.co') || url.includes('greenhouse.io')) return 'Job Board';
  if (url.includes('surveymonkey.com')) return 'SurveyMonkey';
  return 'Web Form';
}
