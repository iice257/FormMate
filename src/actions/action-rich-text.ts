// @ts-nocheck
import { executeAction, getActionById } from './action-index';
import { escapeAttr, escapeHtml } from '../utils/escape';

const ACTION_TAG_PATTERN = /\[fm-action\s+id=(?:"([^"]+)"|'([^']+)')\](.*?)\[\/fm-action\]/gis;

function renderTextChunk(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function renderAssistantRichText(text) {
  const source = String(text || '');
  let html = '';
  let lastIndex = 0;
  let match;
  ACTION_TAG_PATTERN.lastIndex = 0;

  while ((match = ACTION_TAG_PATTERN.exec(source)) !== null) {
    html += renderTextChunk(source.slice(lastIndex, match.index));

    const id = (match[1] || match[2] || '').trim().toLowerCase();
    const label = String(match[3] || '').trim();
    const action = getActionById(id);

    if (action && label) {
      html += `
        <button type="button" class="ai-inline-action" data-action-id="${escapeAttr(action.id)}" aria-label="${escapeAttr(label)}">
          <span class="material-symbols-outlined">${escapeHtml(action.icon || 'arrow_forward')}</span>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    } else {
      html += renderTextChunk(match[0]);
    }

    lastIndex = ACTION_TAG_PATTERN.lastIndex;
  }

  html += renderTextChunk(source.slice(lastIndex));
  return html;
}

export function bindRichActionClicks(root, options = {}) {
  if (!root) return () => {};

  const handleClick = (event) => {
    const target = event.target.closest('.ai-inline-action[data-action-id]');
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    executeAction(target.dataset.actionId, options);
  };

  root.addEventListener('click', handleClick);
  return () => root.removeEventListener('click', handleClick);
}
