// @ts-nocheck
import { AI_SURFACES } from './ai-service';

const FOLLOW_UP_TAG_PATTERN = /\[fm-suggest\]([\s\S]*?)\[\/fm-suggest\]/gi;
const MAX_FOLLOW_UPS = 2;
const MAX_UI_CONTEXT_EVENTS = 8;

function cleanLine(value, max = 260) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function cleanMultilineValue(value, max = 1800) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function quoteAttr(value) {
  return `"${cleanLine(value, 600)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')}"`;
}

export function stripFollowUpTags(text) {
  return String(text || '').replace(FOLLOW_UP_TAG_PATTERN, '').trim();
}

export function extractFollowUpSuggestions(text, max = MAX_FOLLOW_UPS) {
  const seen = new Set();
  const suggestions = [];
  const source = String(text || '');
  let match;
  FOLLOW_UP_TAG_PATTERN.lastIndex = 0;

  while ((match = FOLLOW_UP_TAG_PATTERN.exec(source)) !== null) {
    const value = cleanLine(match[1], 180);
    const normalized = value.toLowerCase();
    if (!value || seen.has(normalized)) continue;
    seen.add(normalized);
    suggestions.push(value);
    if (suggestions.length >= max) break;
  }

  return suggestions;
}

export function getDefaultFollowUps(surface, formTitle = '') {
  const title = cleanLine(formTitle, 90);
  if (surface === AI_SURFACES.DOCS) {
    return [
      'Show me where to update my profile and preferences.',
      'How does FormMate use my Vault data while filling forms?',
    ];
  }
  if (surface === AI_SURFACES.WORKSPACE) {
    return [
      'Refine my latest answers to sound more professional.',
      title
        ? `Check ${title} for weak answers I should improve.`
        : 'Check this form for weak answers I should improve.',
    ];
  }
  return [
    'Improve the latest draft so it is concise and confident.',
    title
      ? `Suggest the next best step for ${title}.`
      : 'Suggest the next best step for this form.',
  ];
}

export function buildNextFollowUps({ surface, responseText, formTitle = '' }) {
  const extracted = extractFollowUpSuggestions(responseText);
  if (extracted.length >= MAX_FOLLOW_UPS) return extracted.slice(0, MAX_FOLLOW_UPS);

  const defaults = getDefaultFollowUps(surface, formTitle);
  const merged = [...extracted];
  for (const suggestion of defaults) {
    if (merged.length >= MAX_FOLLOW_UPS) break;
    const normalized = suggestion.toLowerCase();
    if (merged.some((entry) => entry.toLowerCase() === normalized)) continue;
    merged.push(suggestion);
  }
  return merged.slice(0, MAX_FOLLOW_UPS);
}

export function createInteractiveEditEvent(payload = {}) {
  return {
    kind: 'interactive_edit',
    itemId: cleanLine(payload.itemId || payload.id, 80),
    label: cleanLine(payload.label, 180),
    value: cleanMultilineValue(payload.value, 1800),
  };
}

export function createFollowUpClickEvent(prompt) {
  return {
    kind: 'followup_click',
    prompt: cleanLine(prompt, 220),
  };
}

export function enqueueUiContextEvent(queue, event) {
  const list = Array.isArray(queue) ? [...queue] : [];
  if (!event || typeof event !== 'object') return list;
  list.push(event);
  return list.slice(-MAX_UI_CONTEXT_EVENTS);
}

function buildInteractionTag(event) {
  if (event?.kind === 'interactive_edit') {
    return [
      `<interaction kind="interactive_edit" item_id=${quoteAttr(event.itemId || '')} label=${quoteAttr(event.label || '')}>`,
      cleanMultilineValue(event.value, 1800) || '(empty)',
      '</interaction>',
    ].join('\n');
  }

  if (event?.kind === 'followup_click') {
    return `<interaction kind="followup_click" prompt=${quoteAttr(event.prompt || '')} />`;
  }

  return '';
}

export function buildMessageWithUiContext(text, queue = []) {
  const baseText = String(text || '').trim();
  const tags = (Array.isArray(queue) ? queue : [])
    .map((event) => buildInteractionTag(event))
    .filter(Boolean)
    .slice(-MAX_UI_CONTEXT_EVENTS);

  if (!tags.length) return baseText;

  const contextBlock = ['[fm-ui-context]', ...tags, '[/fm-ui-context]'].join('\n');
  if (!baseText) {
    return `${contextBlock}\n\nApply this queued UI context to the active FormMate task.`;
  }
  return `${contextBlock}\n\n${baseText}`;
}
