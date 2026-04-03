// @ts-nocheck

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(String(value || ''));
}

export function normalizeSubmittedFormUrl(rawValue, options = {}) {
  const { allowDemo = false } = options;
  const trimmed = String(rawValue || '').trim();

  if (!trimmed) {
    throw new Error('Please paste a form link first.');
  }

  if (allowDemo && trimmed.toLowerCase().startsWith('demo://')) {
    return trimmed;
  }

  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https form links are supported.');
  }

  if (!parsed.hostname) {
    throw new Error('Invalid URL format.');
  }

  parsed.hash = '';
  return parsed.toString();
}
