// @ts-nocheck

export function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeLabel(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\w\s/]+/g, '')
    .trim();
}

export function normalizeOption(value) {
  return normalizeWhitespace(value).replace(/\s*[-–—]\s*/g, ' - ');
}

export function simpleStableHash(value) {
  const input = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

export function buildStableFieldKey({
  normalizedLabel,
  uiType,
  sectionTitle,
  optionSignature,
  provider,
  locatorName,
  locatorId,
}) {
  const payload = [
    normalizeLabel(normalizedLabel || ''),
    String(uiType || ''),
    normalizeLabel(sectionTitle || ''),
    normalizeLabel(optionSignature || ''),
    String(provider || ''),
    normalizeLabel(locatorName || ''),
    normalizeLabel(locatorId || ''),
  ].join('|');

  return `fld_${simpleStableHash(payload)}`;
}

export function safeId(prefix, index) {
  return `${prefix}_${index + 1}`;
}

