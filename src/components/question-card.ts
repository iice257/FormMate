// @ts-nocheck
// FormMate - Question Card Component

import { categorizeField } from '../ai/field-classifier';

export function renderQuestionCard(question, answer, index) {
  const { id, text, type, options = [], required } = question;
  const answerText = answer?.text || '';
  const source = answer?.source || 'empty';
  const confidence = answer?.confidence || 0;
  const isActive = index === 0;

  const typeLabels = {
    short_text: { icon: 'short_text', label: 'Short Text' },
    long_text: { icon: 'notes', label: 'Long Text' },
    radio: { icon: 'radio_button_checked', label: 'Multiple Choice' },
    checkbox: { icon: 'check_box', label: 'Checkboxes' },
    dropdown: { icon: 'arrow_drop_down_circle', label: 'Dropdown' },
    date: { icon: 'calendar_today', label: 'Date' },
    scale: { icon: 'linear_scale', label: 'Scale Rating' },
    file_upload: { icon: 'upload_file', label: 'File Upload' }
  };

  const typeInfo = typeLabels[type] || typeLabels.short_text;
  const { category } = categorizeField(question);

  const getBadgeHtml = () => {
    if (source === 'autofill') {
      return getBadge('bolt', 'Autofilled', 'rgba(var(--fm-success-rgb), 0.12)', 'var(--fm-success)', 'rgba(var(--fm-success-rgb), 0.18)');
    }
    if (source === 'ai') {
      return getBadge('auto_awesome', 'AI Generated', 'rgba(var(--fm-primary-rgb), 0.12)', 'var(--fm-primary)', 'rgba(var(--fm-primary-rgb), 0.18)');
    }
    if (source === 'user' || source === 'edited') {
      return getBadge('edit', 'User Edited', 'rgba(226, 232, 240, 0.68)', 'var(--fm-text-secondary)', 'rgba(203, 213, 225, 0.92)');
    }
    if (category === 'manual_only' && !answerText) {
      return getBadge('edit_document', 'Manual Input Required', 'rgba(var(--fm-error-rgb), 0.11)', 'var(--fm-error)', 'rgba(var(--fm-error-rgb), 0.16)');
    }
    return getBadge('warning', 'Missing Data', 'rgba(var(--fm-warning-rgb), 0.12)', 'var(--fm-warning)', 'rgba(var(--fm-warning-rgb), 0.18)');
  };

  const confidenceHtml = (source === 'ai' || source === 'autofill') && confidence > 0
    ? `
      <div class="question-card-confidence" style="display: flex; align-items: center; gap: 0.65rem; margin-top: 1rem; padding-top: 0.95rem; border-top: 1px solid var(--fm-border-light);">
        <div style="flex: 1; max-width: 130px; height: 0.45rem; border-radius: 999px; overflow: hidden; background: var(--fm-bg-sunken);">
          <div style="height: 100%; width: ${confidence * 100}%; border-radius: 999px; background: ${confidence > 0.85 ? 'var(--fm-success)' : confidence > 0.7 ? 'var(--fm-warning)' : 'var(--fm-error)'};"></div>
        </div>
        <span style="font-size: 0.67rem; font-weight: 700; color: #94a3b8;">${Math.round(confidence * 100)}% Match</span>
      </div>
    `
    : '';

  const inputHtml = renderInput(question, answerText);

  return `
    <article class="question-card ${isActive ? 'question-card-active' : ''}" data-card-id="${id}" data-category="${category}">
      <div class="drag-handle question-card-drag-handle" aria-hidden="true">
        <span class="material-symbols-outlined">drag_indicator</span>
      </div>

      <div class="question-card-header">
        <div class="question-card-headline">
          <div class="question-card-badges">
            <span class="question-card-index">${index + 1}.</span>
            ${getBadgeHtml()}
            ${required ? '<span class="question-card-required">Required</span>' : ''}
          </div>
          <h3 class="question-card-title">${escapeHtml(text)}</h3>
          <p class="question-card-meta">
            <span class="material-symbols-outlined">${typeInfo.icon}</span>
            <span>${typeInfo.label}</span>
          </p>
        </div>
      </div>

      <div class="question-card-input">
        ${inputHtml}
        ${confidenceHtml}
      </div>

      <div class="question-card-actions">
        <button class="btn-undo question-card-icon-btn" data-question-id="${id}" title="Undo">
          <span class="material-symbols-outlined">undo</span>
        </button>
        <button class="btn-redo question-card-icon-btn" data-question-id="${id}" title="Redo">
          <span class="material-symbols-outlined">redo</span>
        </button>
        <div class="question-card-actions-spacer"></div>
        ${category !== 'manual_only'
          ? `
            <button class="btn-regenerate question-card-regenerate" data-question-id="${id}">
              <span class="material-symbols-outlined">refresh</span>
              <span>Regenerate</span>
            </button>
          `
          : ''
        }
      </div>
    </article>
  `;
}

function renderInput(question, answerText) {
  const { id, text, type, options = [] } = question;

  switch (type) {
    case 'short_text':
      return `
        <input
          aria-label="${escapeAttr(`Answer: ${text}`)}"
          type="text"
          class="answer-textarea question-card-text-input"
          data-question-id="${id}"
          value="${escapeAttr(answerText)}"
          placeholder="Type your answer..."
        />
      `;

    case 'long_text':
      return `
        <textarea
          class="answer-textarea question-card-textarea"
          data-question-id="${id}"
          placeholder="Type your answer..."
          aria-label="${escapeAttr(`Answer: ${text}`)}"
        >${escapeHtml(answerText)}</textarea>
      `;

    case 'radio':
      return `
        <div class="question-card-option-list">
          ${options.map((option) => {
            const selected = answerText === option;
            return `
              <div
                class="option-select question-card-option ${selected ? 'is-selected' : ''}"
                role="button"
                tabindex="0"
                aria-label="${escapeAttr(`Select option: ${option}`)}"
                data-question-id="${id}"
                data-value="${escapeAttr(option)}"
                data-type="radio"
              >
                <div class="question-card-option-indicator question-card-option-indicator-radio ${selected ? 'is-selected' : ''}">
                  <div class="radio-dot ${selected ? '' : 'hidden'}"></div>
                </div>
                <span>${escapeHtml(option)}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

    case 'checkbox': {
      const selectedItems = answerText ? answerText.split(', ') : [];
      return `
        <div class="question-card-option-list">
          ${options.map((option) => {
            const checked = selectedItems.includes(option);
            return `
              <div
                class="option-select question-card-option ${checked ? 'is-selected' : ''}"
                role="button"
                tabindex="0"
                aria-label="${escapeAttr(`Toggle option: ${option}`)}"
                data-question-id="${id}"
                data-value="${escapeAttr(option)}"
                data-type="checkbox"
              >
                <div class="question-card-option-indicator question-card-option-indicator-checkbox ${checked ? 'is-selected' : ''}">
                  <span class="check-mark material-symbols-outlined ${checked ? '' : 'hidden'}">check</span>
                </div>
                <span>${escapeHtml(option)}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    case 'dropdown':
      return `
        <select
          class="answer-textarea question-card-text-input"
          data-question-id="${id}"
          aria-label="${escapeAttr(`Answer: ${text}`)}"
        >
          <option value="">Select an option...</option>
          ${options.map((option) => `<option value="${escapeAttr(option)}" ${answerText === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
        </select>
      `;

    case 'date':
      return `
        <input
          aria-label="${escapeAttr(`Answer: ${text}`)}"
          type="date"
          class="answer-textarea question-card-text-input"
          data-question-id="${id}"
          value="${escapeAttr(answerText)}"
        />
      `;

    case 'scale': {
      const selectedValue = parseInt(answerText, 10) || 0;
      return `
        <div class="question-card-scale-row">
          ${Array.from({ length: 10 }, (_, index) => index + 1).map((value) => `
            <button
              type="button"
              class="scale-btn question-card-scale-btn ${value === selectedValue ? 'is-selected' : ''}"
              data-question-id="${id}"
              data-value="${value}"
              aria-label="${escapeAttr(`Answer: ${text} - ${value}`)}"
            >${value}</button>
          `).join('')}
        </div>
      `;
    }

    case 'file_upload':
      return `
        <div class="question-card-upload" role="button" tabindex="0" aria-label="${escapeAttr(`Upload file for: ${text}`)}">
          <span class="material-symbols-outlined">cloud_upload</span>
          <p>Click to upload or drag and drop</p>
        </div>
      `;

    default:
      return `
        <input
          type="text"
          aria-label="${escapeAttr(`Answer: ${text}`)}"
          class="answer-textarea question-card-text-input"
          data-question-id="${id}"
          value="${escapeAttr(answerText)}"
          placeholder="Type your answer..."
        />
      `;
  }
}

function getBadge(icon, label, background, color, borderColor) {
  return `
    <span class="question-card-badge" style="background: ${background}; color: ${color}; border-color: ${borderColor};">
      <span class="material-symbols-outlined">${icon}</span>
      <span>${label}</span>
    </span>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('`', '&#96;');
}
