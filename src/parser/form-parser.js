// ═══════════════════════════════════════════
// FormMate — Form Parser
// ═══════════════════════════════════════════

import { MOCK_FORMS } from './mock-forms.js';

/**
 * Parse a form URL and return structured form data.
 * Currently uses mock data; extensible for real parsing.
 */
export async function parseFormUrl(url) {
  // Simulate network delay
  await simulateProgress();

  // Determine which mock form to use based on URL keywords
  const urlLower = url.toLowerCase();

  if (urlLower.includes('job') || urlLower.includes('application') || urlLower.includes('lever') || urlLower.includes('career')) {
    return { ...MOCK_FORMS['job-application'] };
  }

  if (urlLower.includes('visa') || urlLower.includes('travel') || urlLower.includes('gov')) {
    return { ...MOCK_FORMS['travel-visa'] };
  }

  // Default to customer feedback
  return { ...MOCK_FORMS['customer-feedback'] };
}

function simulateProgress() {
  return new Promise(resolve => setTimeout(resolve, 100));
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
