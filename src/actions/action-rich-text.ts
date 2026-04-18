// @ts-nocheck
import { executeAction, getActionById } from './action-index';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { stripFollowUpTags } from '../ai/chat-interactions';

const ACTION_TAG_PATTERN = /\[fm-action\s+id=(?:"([^"]+)"|'([^']+)')\](.*?)\[\/fm-action\]/gi;
const INTERACTIVE_ITEM_PATTERN = /\[fm-item([^\]]*)\]([\s\S]*?)\[\/fm-item\]/gi;
const ATTR_PATTERN = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
const LEGACY_ITEM_LINE_PATTERN = /^\s*\[\s*([^\]\n]{1,32})\s*\]\s*([^|\n]{2,220}?)\s*\|\s*(.+?)\s*$/;

function renderTextChunk(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function normalizeLegacyInteractiveLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const match = line.match(LEGACY_ITEM_LINE_PATTERN);
      if (!match) return line;
      const id = String(match[1] || '').trim();
      const label = String(match[2] || '').trim();
      const value = String(match[3] || '').trim();
      if (!label || !value) return line;
      return `[fm-item id="${id}" label="${label}" editable="true"]${value}[/fm-item]`;
    })
    .join('\n');
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

export function renderAssistantRichText(text) {
  const source = normalizeLegacyInteractiveLines(stripFollowUpTags(String(text || '')));
  let html = '';
  let lastIndex = 0;
  const actionRegex = new RegExp(ACTION_TAG_PATTERN.source, 'gi');
  const interactiveRegex = new RegExp(INTERACTIVE_ITEM_PATTERN.source, 'gi');

  while (lastIndex < source.length) {
    const next = nextTagMatch(source, lastIndex, actionRegex, interactiveRegex);
    if (!next) {
      html += renderTextChunk(source.slice(lastIndex));
      break;
    }

    html += renderTextChunk(source.slice(lastIndex, next.match.index));

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

  root.addEventListener('click', handleClick);
  root.addEventListener('click', handleInteractiveClick);
  return () => {
    root.removeEventListener('click', handleClick);
    root.removeEventListener('click', handleInteractiveClick);
  };
}
