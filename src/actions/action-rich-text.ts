// @ts-nocheck
import MarkdownIt from 'markdown-it';
import { executeAction, getActionById } from './action-index';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { parseAssistantResponse } from '../ai/chat-interactions';
import { createSafeHtmlString } from '../utils/safe-html';

const ACTION_TAG_PATTERN = /\[fm-action\s+id=(?:"([^"]+)"|'([^']+)')\](.*?)\[\/fm-action\]/gi;
const INTERACTIVE_ITEM_PATTERN = /\[fm-item([^\]]*)\]([\s\S]*?)\[\/fm-item\]/gi;
const ATTR_PATTERN = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
const LEGACY_ITEM_LINE_PATTERN = /^\s*\[\s*([^\]\n]{1,32})\s*\]\s*([^|\n]{2,220}?)\s*\|\s*(.+?)\s*$/;

const RICH_ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'a',
]);

const RICH_ALLOWED_ATTRS = {
  a: new Set(['href', 'title', 'target', 'rel']),
  code: new Set(['class']),
  th: new Set(['colspan', 'rowspan', 'align']),
  td: new Set(['colspan', 'rowspan', 'align']),
};

const FENCED_CODE_PATTERN = /^\s*```/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const TABLE_ROW_PATTERN = /^\s*\|.+\|\s*$/;
const BLOCKQUOTE_PATTERN = /^\s*>/;
const LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+\.)\s+/;
const HEADING_PATTERN = /^\s*#{1,6}\s+/;
const HR_PATTERN = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
});

function sanitizeRichHtml(html) {
  return createSafeHtmlString(html, {
    allowedTags: RICH_ALLOWED_TAGS,
    allowedAttributes: RICH_ALLOWED_ATTRS,
  });
}

function underlineAliasPattern() {
  return /(^|[\s([{"'])-([^\n-](?:.*?[^\n-])?)-(?=($|[\s)\]}",.!?:;']))/gm;
}

function applyUnderlineAliasToTextNode(text) {
  return String(text || '').replace(
    /(^|[\s([{"'])-([^\n-](?:.*?[^\n-])?)-(?=($|[\s)\]}",.!?:;']))/gm,
    (_, prefix, inner) => `${prefix}<u>${inner}</u>`,
  );
}

function renderMarkdownLike(text) {
  const renderedHtml = markdownRenderer.render(String(text || ''));
  const template = document.createElement('template');
  template.innerHTML = renderedHtml;

  template.content.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((node) => {
    const parentTag = String(node?.parentElement?.tagName || '').toLowerCase();
    if (!node?.textContent || ['code', 'pre'].includes(parentTag)) return;
    if (!underlineAliasPattern().test(node.textContent)) return;
    underlineAliasPattern().lastIndex = 0;
    const wrapper = document.createElement('span');
    wrapper.innerHTML = applyUnderlineAliasToTextNode(escapeHtml(node.textContent));
    node.parentNode?.replaceChild(wrapper, node);
  });

  return sanitizeRichHtml(template.innerHTML);
}

function renderTextChunk(text, options = {}) {
  if (options?.markdown === false) {
    return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
  }
  return renderMarkdownLike(text);
}

function normalizeLegacyInteractiveLines(text) {
  const lines = String(text || '').split('\n');
  let inFence = false;

  return lines.map((line) => {
    if (FENCED_CODE_PATTERN.test(line)) {
      inFence = !inFence;
      return line;
    }

    if (inFence) return line;
    if (
      TABLE_ROW_PATTERN.test(line)
      || TABLE_SEPARATOR_PATTERN.test(line)
      || BLOCKQUOTE_PATTERN.test(line)
      || LIST_ITEM_PATTERN.test(line)
      || HEADING_PATTERN.test(line)
      || HR_PATTERN.test(line)
      || line.includes('[fm-item')
      || /<\/?fm-ui>/i.test(line)
    ) {
      return line;
    }

    const match = line.match(LEGACY_ITEM_LINE_PATTERN);
    if (!match) return line;

    const id = String(match[1] || '').trim();
    const label = String(match[2] || '').trim();
    const value = String(match[3] || '').trim();
    if (!label || !value) return line;
    return `[fm-item id="${id}" label="${label}" editable="true"]${value}[/fm-item]`;
  }).join('\n');
}

function parseTagAttrs(rawAttrs) {
  const attrs = {};
  const source = String(rawAttrs || '');
  let match;
  ATTR_PATTERN.lastIndex = 0;
  while ((match = ATTR_PATTERN.exec(source)) !== null) {
    attrs[String(match[1] || '').toLowerCase()] = String(match[2] || match[3] || match[4] || '').trim();
  }
  return attrs;
}

function isTruthy(value, defaultValue = true) {
  if (value == null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
}

function renderInteractiveItem(rawAttrs, rawBody) {
  const attrs = parseTagAttrs(rawAttrs);
  const itemId = String(attrs.id || attrs.item_id || attrs.field_id || '').trim();
  const label = String(attrs.label || attrs.title || attrs.name || itemId || 'Suggested Item').trim();
  const editable = isTruthy(attrs.editable, true);
  const placeholder = String(attrs.placeholder || 'Edit before using...').trim();
  const value = String(rawBody || '').trim();
  const displayId = itemId ? `#${itemId}` : '';

  if (editable) {
    return `
      <div class="ai-interactive-item" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-editable="true" data-item-value="${escapeAttr(value)}">
        <div class="ai-interactive-item-header">
          <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
          <span class="ai-interactive-item-badge">Editable</span>
        </div>
        <textarea class="ai-interactive-input" rows="3" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
        <button type="button" class="ai-interactive-commit" aria-label="Queue this edit for your next message">
          <span class="material-symbols-outlined">add_task</span>
          <span>Use in next message</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="ai-interactive-item" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-editable="false" data-item-value="${escapeAttr(value)}">
      <div class="ai-interactive-item-header">
        <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
      </div>
      <div class="ai-interactive-readonly">${renderTextChunk(value)}</div>
      <button type="button" class="ai-interactive-commit" aria-label="Queue this item for your next message">
        <span class="material-symbols-outlined">add_task</span>
        <span>Use in next message</span>
      </button>
    </div>
  `;
}

function renderStructuredInteractivePart(part) {
  if (!part || typeof part !== 'object') return '';
  const itemId = String(part.id || '').trim();
  const label = String(part.label || itemId || 'Suggested field').trim();
  const displayId = itemId ? `#${itemId}` : '';
  const kind = String(part.kind || '').trim().toLowerCase();

  if (kind === 'text') {
    return `
      <div class="ai-interactive-item" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-kind="interactive_text_edit">
        <div class="ai-interactive-item-header">
          <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
          <span class="ai-interactive-item-badge">Editable</span>
        </div>
        <input type="text" class="ai-interactive-input ai-interactive-input-single" aria-label="${escapeAttr(`Edit ${label}`)}" value="${escapeAttr(String(part.value || ''))}" />
        <button type="button" class="ai-interactive-commit" aria-label="Queue this edit for your next message">
          <span class="material-symbols-outlined">add_task</span>
          <span>Use in next message</span>
        </button>
      </div>
    `;
  }

  if (kind === 'textarea') {
    return `
      <div class="ai-interactive-item" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-kind="interactive_text_edit">
        <div class="ai-interactive-item-header">
          <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
          <span class="ai-interactive-item-badge">Editable</span>
        </div>
        <textarea class="ai-interactive-input" aria-label="${escapeAttr(`Edit ${label}`)}" rows="3">${escapeHtml(String(part.value || ''))}</textarea>
        <button type="button" class="ai-interactive-commit" aria-label="Queue this edit for your next message">
          <span class="material-symbols-outlined">add_task</span>
          <span>Use in next message</span>
        </button>
      </div>
    `;
  }

  if (kind === 'select') {
    const options = Array.isArray(part.options) ? part.options : [];
    const selected = Array.isArray(part.selections) ? String(part.selections[0] || '') : '';
    return `
      <div class="ai-interactive-item ai-interactive-selection" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-kind="interactive_selection_change" data-control-kind="select" data-selection-values="${escapeAttr(JSON.stringify(selected ? [selected] : []))}">
        <div class="ai-interactive-item-header">
          <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
          <span class="ai-interactive-item-badge">Select</span>
        </div>
        <select class="ai-interactive-select" aria-label="${escapeAttr(label)}">
          <option value="">Choose one</option>
          ${options.map((option) => `<option value="${escapeAttr(option)}"${option === selected ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}
        </select>
        <div class="ai-interactive-selection-note">${selected ? `Queued selection: ${escapeHtml(selected)}` : 'Choose an option to queue it for the next message.'}</div>
      </div>
    `;
  }

  if (!['radio', 'checkbox'].includes(kind)) return '';

  const options = Array.isArray(part.options) ? part.options : [];
  const selectedValues = Array.isArray(part.selections) ? part.selections.map((entry) => String(entry || '')) : [];
  return `
    <div class="ai-interactive-item ai-interactive-selection" data-item-id="${escapeAttr(itemId)}" data-item-label="${escapeAttr(label)}" data-item-kind="interactive_selection_change" data-control-kind="${escapeAttr(kind)}" data-selection-values="${escapeAttr(JSON.stringify(selectedValues))}">
      <div class="ai-interactive-item-header">
        <div class="ai-interactive-item-title">${displayId ? `<span class="ai-interactive-item-id">${escapeHtml(displayId)}</span>` : ''}${escapeHtml(label)}</div>
        <span class="ai-interactive-item-badge">${escapeHtml(kind)}</span>
      </div>
      <div class="ai-interactive-options" role="${kind === 'radio' ? 'radiogroup' : 'group'}" aria-label="${escapeAttr(label)}">
        ${options.map((option) => {
          const selected = selectedValues.includes(option);
          return `
            <button
              type="button"
              class="ai-interactive-option-btn ${selected ? 'is-selected' : ''}"
              data-option-value="${escapeAttr(option)}"
              aria-pressed="${selected ? 'true' : 'false'}"
            >
              ${escapeHtml(option)}
            </button>
          `;
        }).join('')}
      </div>
      <div class="ai-interactive-selection-note">${selectedValues.length ? `Queued selection: ${escapeHtml(selectedValues.join(', '))}` : 'Select option(s) to queue them for the next message.'}</div>
    </div>
  `;
}

function nextTagMatch(source, fromIndex, actionRegex, interactiveRegex) {
  actionRegex.lastIndex = fromIndex;
  interactiveRegex.lastIndex = fromIndex;

  const actionMatch = actionRegex.exec(source);
  const interactiveMatch = interactiveRegex.exec(source);

  if (!actionMatch && !interactiveMatch) return null;
  if (!actionMatch) {
    return { type: 'interactive', match: interactiveMatch, end: interactiveRegex.lastIndex };
  }
  if (!interactiveMatch) {
    return { type: 'action', match: actionMatch, end: actionRegex.lastIndex };
  }
  if (actionMatch.index <= interactiveMatch.index) {
    return { type: 'action', match: actionMatch, end: actionRegex.lastIndex };
  }
  return { type: 'interactive', match: interactiveMatch, end: interactiveRegex.lastIndex };
}

function readSelectionValues(card) {
  try {
    const parsed = JSON.parse(String(card?.dataset?.selectionValues || '[]'));
    return Array.isArray(parsed)
      ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function writeSelectionValues(card, values) {
  card.dataset.selectionValues = JSON.stringify(Array.isArray(values) ? values : []);
  const note = card.querySelector('.ai-interactive-selection-note');
  if (note) {
    note.textContent = values.length
      ? `Queued selection: ${values.join(', ')}`
      : 'Select option(s) to queue them for the next message.';
  }
}

function syncOptionButtons(card, values) {
  const controlKind = String(card?.dataset?.controlKind || '');
  card.querySelectorAll('.ai-interactive-option-btn[data-option-value]').forEach((button) => {
    const selected = values.includes(String(button.dataset.optionValue || ''));
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    if (controlKind === 'radio') {
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  });
}

export function renderAssistantRichText(text, options = {}) {
  const parsed = parseAssistantResponse(text, { interactive: options.interactive !== false });
  if (typeof options.onDiagnostics === 'function' && Array.isArray(parsed.diagnostics) && parsed.diagnostics.length) {
    options.onDiagnostics(parsed.diagnostics);
  }
  const source = normalizeLegacyInteractiveLines(parsed.text);
  let html = '';
  let lastIndex = 0;
  const actionRegex = new RegExp(ACTION_TAG_PATTERN.source, 'gi');
  const interactiveRegex = new RegExp(INTERACTIVE_ITEM_PATTERN.source, 'gi');

  while (lastIndex < source.length) {
    const next = nextTagMatch(source, lastIndex, actionRegex, interactiveRegex);
    if (!next) {
      html += renderTextChunk(source.slice(lastIndex), options);
      break;
    }

    html += renderTextChunk(source.slice(lastIndex, next.match.index), options);

    if (next.type === 'action') {
      const id = (next.match[1] || next.match[2] || '').trim().toLowerCase();
      const label = String(next.match[3] || '').trim();
      const action = getActionById(id);

      if (action && label) {
        html += `
          <button type="button" class="ai-inline-action" data-action-id="${escapeAttr(action.id)}" aria-label="${escapeAttr(label)}">
            <span class="material-symbols-outlined">${escapeHtml(action.icon || 'arrow_forward')}</span>
            <span>${escapeHtml(label)}</span>
          </button>
        `;
      } else {
        html += renderTextChunk(next.match[0]);
      }
    } else {
      html += renderInteractiveItem(next.match[1], next.match[2]);
    }

    lastIndex = next.end;
  }

  if (options.interactive !== false && Array.isArray(parsed.interactiveParts) && parsed.interactiveParts.length) {
    html += parsed.interactiveParts.map((part) => renderStructuredInteractivePart(part)).join('');
  }
  return html;
}

export function bindRichActionClicks(root, options = {}) {
  if (!root) return () => {};

  const handleClick = (event) => {
    const target = event.target?.closest?.('.ai-inline-action[data-action-id]');
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    executeAction(target.dataset.actionId, options);
  };

  const handleInteractiveClick = (event) => {
    const trigger = event.target?.closest?.('.ai-interactive-commit');
    if (!trigger || !root.contains(trigger)) return;
    event.preventDefault();

    const card = trigger.closest('.ai-interactive-item');
    if (!card) return;
    const input = card.querySelector('.ai-interactive-input');
    const payload = {
      kind: 'interactive_text_edit',
      id: String(card.dataset.itemId || '').trim(),
      label: String(card.dataset.itemLabel || '').trim(),
      value: String(input ? input.value : card.dataset.itemValue || '').trim(),
    };

    if (typeof options.onInteractiveCommit === 'function') {
      const accepted = options.onInteractiveCommit(payload);
      if (accepted !== false) {
        card.classList.add('is-queued');
      }
      return;
    }

    card.classList.add('is-queued');
  };

  const handleSelectionClick = (event) => {
    const trigger = event.target?.closest?.('.ai-interactive-option-btn[data-option-value]');
    if (!trigger || !root.contains(trigger)) return;
    event.preventDefault();

    const card = trigger.closest('.ai-interactive-item[data-item-kind="interactive_selection_change"]');
    if (!card) return;

    const controlKind = String(card.dataset.controlKind || 'radio');
    const optionValue = String(trigger.dataset.optionValue || '').trim();
    if (!optionValue) return;

    let values = readSelectionValues(card);
    if (controlKind === 'checkbox') {
      values = values.includes(optionValue)
        ? values.filter((entry) => entry !== optionValue)
        : [...values, optionValue];
    } else {
      values = [optionValue];
    }

    writeSelectionValues(card, values);
    syncOptionButtons(card, values);

    const payload = {
      kind: 'interactive_selection_change',
      id: String(card.dataset.itemId || '').trim(),
      label: String(card.dataset.itemLabel || '').trim(),
      controlKind,
      selections: values,
    };

    if (typeof options.onInteractiveCommit === 'function') {
      const accepted = options.onInteractiveCommit(payload);
      if (accepted !== false) {
        card.classList.add('is-queued');
      }
      return;
    }

    card.classList.add('is-queued');
  };

  const handleSelectionChange = (event) => {
    const select = event.target?.closest?.('.ai-interactive-select');
    if (!select || !root.contains(select)) return;

    const card = select.closest('.ai-interactive-item[data-item-kind="interactive_selection_change"]');
    if (!card) return;

    const value = String(select.value || '').trim();
    const values = value ? [value] : [];
    writeSelectionValues(card, values);

    const payload = {
      kind: 'interactive_selection_change',
      id: String(card.dataset.itemId || '').trim(),
      label: String(card.dataset.itemLabel || '').trim(),
      controlKind: String(card.dataset.controlKind || 'select'),
      selections: values,
    };

    if (typeof options.onInteractiveCommit === 'function') {
      const accepted = options.onInteractiveCommit(payload);
      if (accepted !== false) {
        card.classList.add('is-queued');
      }
      return;
    }

    card.classList.add('is-queued');
  };

  root.addEventListener('click', handleClick);
  root.addEventListener('click', handleInteractiveClick);
  root.addEventListener('click', handleSelectionClick);
  root.addEventListener('change', handleSelectionChange);
  return () => {
    root.removeEventListener('click', handleClick);
    root.removeEventListener('click', handleInteractiveClick);
    root.removeEventListener('click', handleSelectionClick);
    root.removeEventListener('change', handleSelectionChange);
  };
}
