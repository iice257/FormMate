// @ts-nocheck
export function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttr(input) {
  // Safe for double-quoted HTML attributes.
  return escapeHtml(input).replaceAll('`', '&#96;');
}

export function escapeHtmlWithLineBreaks(input) {
  return escapeHtml(input).replaceAll('\n', '<br />');
}

export function safeHttpUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';

  if (value.startsWith('/')) return value;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    return '';
  } catch {
    return '';
  }
}

