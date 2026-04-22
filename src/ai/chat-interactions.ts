// @ts-nocheck
import { AI_SURFACES } from './ai-service';

const FOLLOW_UP_TAG_PATTERN = /\[fm-suggest\]([\s\S]*?)\[\/fm-suggest\]/gi;
const MAX_FOLLOW_UPS = 2;
const MAX_UI_CONTEXT_EVENTS = 8;
const MAX_INTERACTIVE_PARTS = 8;
const MAX_SELECTIONS = 12;
const FM_UI_OPEN_TAG = '<fm-ui>';
const FM_UI_CLOSE_TAG = '</fm-ui>';

function createDiagnostic(code, level, message) {
  return {
    code: cleanLine(code, 64) || 'assistant_message_diagnostic',
    level: cleanLine(level, 24) || 'warning',
    message: cleanLine(message, 320) || 'Assistant message diagnostic.',
  };
}

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

function cleanOption(value, max = 180) {
  return cleanLine(value, max);
}

function quoteAttr(value) {
  return `"${cleanLine(value, 600)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')}"`;
}

function escapeXmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function stripFollowUpTags(text) {
  return String(text || '').replace(FOLLOW_UP_TAG_PATTERN, '').trim();
}

export function getFollowUpLimit(surface) {
  return surface === AI_SURFACES.WORKSPACE ? 1 : MAX_FOLLOW_UPS;
}

export function extractFollowUpSuggestions(text, max = MAX_FOLLOW_UPS) {
  const seen = new Set();
  const suggestions = [];
  const source = String(text || '');
  let match;
  FOLLOW_UP_TAG_PATTERN.lastIndex = 0;

  while ((match = FOLLOW_UP_TAG_PATTERN.exec(source)) !== null) {
    const value = cleanLine(match[1], 72);
    const normalized = value.toLowerCase();
    if (!value || seen.has(normalized)) continue;
    seen.add(normalized);
    suggestions.push(value);
    if (suggestions.length >= max) break;
  }

  return suggestions;
}

export function getDefaultFollowUps(surface, formTitle = '') {
  const title = cleanLine(formTitle, 48);
  if (surface === AI_SURFACES.DOCS) {
    return [
      'Where do I update my profile?',
      'How does Vault autofill work?',
    ];
  }
  if (surface === AI_SURFACES.WORKSPACE) {
    return [
      title
        ? `Audit ${title} for weak answers.`
        : 'Audit this form for weak answers.',
    ];
  }
  return [
    'Improve my latest form response.',
    title
      ? `What should I fix in ${title} form?`
      : 'What should I fix in this application form?',
  ];
}

function normalizeSelections(value) {
  const input = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [value];
  const seen = new Set();
  return input
    .map((entry) => cleanOption(entry, 120))
    .filter(Boolean)
    .filter((entry) => {
      const normalized = entry.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, MAX_SELECTIONS);
}

function parseUiNode(node) {
  const kind = String(node?.tagName || '').toLowerCase();
  const id = cleanLine(node?.getAttribute?.('id') || '', 80);
  const label = cleanLine(node?.getAttribute?.('label') || id || 'Suggested field', 160);
  const editable = !['false', '0', 'no', 'off'].includes(String(node?.getAttribute?.('editable') || 'true').trim().toLowerCase());

  if (kind === 'text' || kind === 'textarea') {
    return {
      kind,
      id,
      label,
      editable,
      value: cleanMultilineValue(node?.textContent || '', kind === 'text' ? 320 : 1800),
    };
  }

  if (!['radio', 'select', 'checkbox'].includes(kind)) return null;

  const selections = normalizeSelections(
    Array.from(node?.getElementsByTagName?.('selection') || []).map((entry) => entry?.textContent || ''),
  );
  const optionsNode = Array.from(node?.childNodes || []).find((entry) => String(entry?.nodeName || '').toLowerCase() === 'options');
  const options = normalizeSelections(
    Array.from(optionsNode?.childNodes || [])
      .filter((entry) => String(entry?.nodeName || '').toLowerCase() === 'option')
      .map((entry) => entry?.textContent || ''),
  );

  return {
    kind,
    id,
    label,
    editable: false,
    selections,
    options,
  };
}

function extractFmUiBlock(text) {
  const source = String(text || '');
  const diagnostics = [];
  const lower = source.toLowerCase();
  const openIndex = lower.indexOf(FM_UI_OPEN_TAG);
  const closeIndex = lower.indexOf(FM_UI_CLOSE_TAG);

  if (openIndex === -1 && closeIndex === -1) {
    return {
      text: source.trim(),
      uiSource: '',
      diagnostics,
    };
  }

  if (openIndex === -1 && closeIndex !== -1) {
    diagnostics.push(createDiagnostic('fm_ui_orphan_close', 'warning', 'Ignoring an orphan closing fm-ui tag.'));
    return {
      text: source.replace(/<\/fm-ui>/gi, '').trim(),
      uiSource: '',
      diagnostics,
    };
  }

  if (openIndex !== -1 && closeIndex === -1) {
    diagnostics.push(createDiagnostic('fm_ui_unclosed', 'warning', 'Ignoring an unclosed fm-ui block.'));
    return {
      text: source.replace(/<fm-ui>/gi, '').trim(),
      uiSource: '',
      diagnostics,
    };
  }

  if (closeIndex < openIndex) {
    diagnostics.push(createDiagnostic('fm_ui_misaligned', 'warning', 'Ignoring a misaligned fm-ui block.'));
    return {
      text: source.replace(/<\/?fm-ui>/gi, '').trim(),
      uiSource: '',
      diagnostics,
    };
  }

  const before = source.slice(0, openIndex);
  const innerStart = openIndex + FM_UI_OPEN_TAG.length;
  const uiSource = source.slice(innerStart, closeIndex).trim();
  const after = source.slice(closeIndex + FM_UI_CLOSE_TAG.length);
  const trailingFmTags = after.match(/<\/?fm-ui>/gi);
  if (trailingFmTags?.length) {
    diagnostics.push(createDiagnostic('fm_ui_extra_blocks', 'info', 'Ignoring additional fm-ui tags after the first block.'));
  }

  return {
    text: `${before}${after.replace(/<\/?fm-ui>/gi, '')}`.trim(),
    uiSource,
    diagnostics,
  };
}

function parseInteractiveParts(rawUi) {
  const source = String(rawUi || '').trim();
  const diagnostics = [];
  if (!source || typeof DOMParser === 'undefined') {
    return { parts: [], diagnostics };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<fm-ui>${source}</fm-ui>`, 'application/xml');
    if (doc.querySelector('parsererror')) {
      diagnostics.push(createDiagnostic('fm_ui_invalid_xml', 'warning', 'Ignoring malformed fm-ui content.'));
      return { parts: [], diagnostics };
    }

    const parts = Array.from(doc.documentElement?.childNodes || [])
      .filter((node) => node?.nodeType === 1)
      .map((node) => parseUiNode(node))
      .filter(Boolean)
      .slice(0, MAX_INTERACTIVE_PARTS);
    if (!parts.length) {
      diagnostics.push(createDiagnostic('fm_ui_empty', 'info', 'fm-ui block was present but did not contain supported interactive controls.'));
    }
    return { parts, diagnostics };
  } catch {
    diagnostics.push(createDiagnostic('fm_ui_parse_failed', 'warning', 'Ignoring fm-ui content because it could not be parsed.'));
    return { parts: [], diagnostics };
  }
}

export function parseAssistantResponse(text, { interactive = true } = {}) {
  const source = String(text || '');
  const followUps = extractFollowUpSuggestions(source, MAX_FOLLOW_UPS);
  const withoutFollowUps = stripFollowUpTags(source);
  const uiExtraction = extractFmUiBlock(withoutFollowUps);
  const interactiveResult = interactive && uiExtraction.uiSource
    ? parseInteractiveParts(uiExtraction.uiSource)
    : { parts: [], diagnostics: [] };

  return {
    text: uiExtraction.text,
    followUps,
    interactiveParts: interactiveResult.parts,
    diagnostics: [...uiExtraction.diagnostics, ...interactiveResult.diagnostics],
  };
}

export function buildNextFollowUps({ surface, responseText, formTitle = '' }) {
  const limit = getFollowUpLimit(surface);
  const extracted = extractFollowUpSuggestions(responseText, limit);
  if (extracted.length >= limit) return extracted.slice(0, limit);

  const defaults = getDefaultFollowUps(surface, formTitle);
  const merged = [...extracted];
  for (const suggestion of defaults) {
    if (merged.length >= limit) break;
    const normalized = suggestion.toLowerCase();
    if (merged.some((entry) => entry.toLowerCase() === normalized)) continue;
    merged.push(suggestion);
  }
  return merged.slice(0, limit);
}

export function createInteractiveEditEvent(payload = {}) {
  return {
    kind: 'interactive_text_edit',
    itemId: cleanLine(payload.itemId || payload.id, 80),
    label: cleanLine(payload.label, 180),
    value: cleanMultilineValue(payload.value, 1800),
  };
}

export function createInteractiveSelectionEvent(payload = {}) {
  return {
    kind: 'interactive_selection_change',
    itemId: cleanLine(payload.itemId || payload.id, 80),
    label: cleanLine(payload.label, 180),
    control: cleanLine(payload.control || payload.controlKind || payload.type || 'select', 24),
    selections: normalizeSelections(payload.selections || payload.selection || payload.value),
  };
}

export function createUiContextEvent(payload = {}) {
  if (payload?.kind === 'interactive_selection_change') {
    return createInteractiveSelectionEvent(payload);
  }
  return createInteractiveEditEvent(payload);
}

export function createFollowUpClickEvent(prompt) {
  return {
    kind: 'followup_click',
    prompt: cleanLine(prompt, 120),
  };
}

export function enqueueUiContextEvent(queue, event) {
  const list = Array.isArray(queue) ? [...queue] : [];
  if (!event || typeof event !== 'object') return list;
  list.push(event);
  return list.slice(-MAX_UI_CONTEXT_EVENTS);
}

function buildInteractionTag(event) {
  if (event?.kind === 'interactive_text_edit') {
    return [
      `<interaction kind="interactive_text_edit" item_id=${quoteAttr(event.itemId || '')} label=${quoteAttr(event.label || '')}>`,
      `<value>${escapeXmlText(cleanMultilineValue(event.value, 1800) || '(empty)')}</value>`,
      '</interaction>',
    ].join('\n');
  }

  if (event?.kind === 'interactive_selection_change') {
    return [
      `<interaction kind="interactive_selection_change" item_id=${quoteAttr(event.itemId || '')} label=${quoteAttr(event.label || '')} control=${quoteAttr(event.control || 'select')}>`,
      ...normalizeSelections(event.selections).map((entry) => `<selection>${escapeXmlText(entry)}</selection>`),
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
