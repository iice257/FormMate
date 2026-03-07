// ═══════════════════════════════════════════
// FormMate — Question Card Component
// ═══════════════════════════════════════════

/**
 * Render a single question card.
 * Returns HTML string.
 */
export function renderQuestionCard(question, answer, index) {
  const { id, text, type, options, required } = question;
  const answerText = answer?.text || '';
  const source = answer?.source || 'empty';
  const confidence = answer?.confidence || 0;

  const isActive = index === 0; // First card is active by default

  const typeLabels = {
    'short_text': { icon: 'short_text', label: 'Short Text' },
    'long_text': { icon: 'notes', label: 'Long Text' },
    'radio': { icon: 'radio_button_checked', label: 'Multiple Choice' },
    'checkbox': { icon: 'check_box', label: 'Checkboxes' },
    'dropdown': { icon: 'arrow_drop_down_circle', label: 'Dropdown' },
    'date': { icon: 'calendar_today', label: 'Date' },
    'scale': { icon: 'linear_scale', label: 'Scale Rating' },
    'file_upload': { icon: 'upload_file', label: 'File Upload' },
  };

  const typeInfo = typeLabels[type] || typeLabels['short_text'];

  const getBadgeHtml = () => {
    if (source === 'autofill') {
      return `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-success-light); color: var(--fm-success); border: 1px solid rgba(var(--fm-success-rgb), 0.2);" data-question-id="${id}"><span class="material-symbols-outlined text-[14px]">bolt</span> Autofilled</span>`;
    }
    if (source === 'ai') {
      return `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-primary-50); color: var(--fm-primary); border: 1px solid rgba(var(--fm-primary-rgb), 0.2);" data-question-id="${id}"><span class="material-symbols-outlined text-[14px]">auto_awesome</span> AI Generated</span>`;
    }
    if (source === 'user' || source === 'edited') {
      return `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-bg-sunken); color: var(--fm-text-secondary); border: 1px solid var(--fm-border);" data-question-id="${id}"><span class="material-symbols-outlined text-[14px]">edit</span> User Edited</span>`;
    }
    return `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-warning-light); color: var(--fm-warning); border: 1px solid rgba(var(--fm-warning-rgb), 0.2);" data-question-id="${id}"><span class="material-symbols-outlined text-[14px]">warning</span> Missing Data</span>`;
  };

  const badgeHtml = getBadgeHtml();

  // Confidence meter (if AI generated)
  const confidenceHtml = (source === 'ai' || source === 'autofill') && confidence > 0 ? `
    <div class="flex items-center gap-2 mt-4 pt-3 border-t" style="border-color: var(--fm-border);">
      <div class="flex-1 max-w-[100px] h-1.5 rounded-full overflow-hidden" style="background: var(--fm-bg-sunken);">
        <div class="h-full rounded-full" style="width: ${confidence * 100}%; background: ${confidence > 0.85 ? 'var(--fm-success)' : confidence > 0.7 ? 'var(--fm-warning)' : 'var(--fm-error)'};"></div>
      </div>
      <span class="text-[10px] font-semibold" style="color: var(--fm-text-tertiary);">
        ${Math.round(confidence * 100)}% Match
      </span>
    </div>
  ` : '';

  let inputHtml = '';

  switch (type) {
    case 'short_text':
      inputHtml = `
        <input
          type="text"
          class="answer-textarea w-full rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-base py-3 px-4"
          data-question-id="${id}"
          value="${escapeAttr(answerText)}"
          placeholder="Type your answer..."
        />
      `;
      break;

    case 'long_text':
      inputHtml = `
        <textarea
          class="answer-textarea w-full min-h-[120px] rounded-xl border-2 border-primary/20 bg-primary/5 text-slate-800 text-base leading-relaxed p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
          data-question-id="${id}"
          placeholder="Type your answer..."
        >${escapeHtml(answerText)}</textarea>
      `;
      break;

    case 'radio':
      inputHtml = `<div class="space-y-2">
        ${options.map(opt => {
        const selected = answerText === opt;
        return `
            <div class="option-select flex items-center gap-3 p-3 rounded-lg border ${selected ? 'border-primary bg-primary/5' : 'border-slate-100'} bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                 data-question-id="${id}" data-value="${escapeAttr(opt)}" data-type="radio">
              <div class="size-4 border-2 ${selected ? 'border-primary' : 'border-slate-300'} rounded-full flex items-center justify-center">
                <div class="radio-dot size-2 bg-primary rounded-full ${selected ? '' : 'hidden'}"></div>
              </div>
              <span class="text-sm">${escapeHtml(opt)}</span>
            </div>
          `;
      }).join('')}
      </div>`;
      break;

    case 'checkbox':
      const selectedItems = answerText ? answerText.split(', ') : [];
      inputHtml = `<div class="space-y-2">
        ${options.map(opt => {
        const checked = selectedItems.includes(opt);
        return `
            <div class="option-select flex items-center gap-3 p-3 rounded-lg border ${checked ? 'border-primary bg-primary/5' : 'border-slate-100'} bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                 data-question-id="${id}" data-value="${escapeAttr(opt)}" data-type="checkbox">
              <div class="size-4 border-2 ${checked ? 'border-primary bg-primary' : 'border-slate-300'} rounded flex items-center justify-center">
                <span class="check-mark material-symbols-outlined text-white text-xs ${checked ? '' : 'hidden'}">check</span>
              </div>
              <span class="text-sm">${escapeHtml(opt)}</span>
            </div>
          `;
      }).join('')}
      </div>`;
      break;

    case 'dropdown':
      inputHtml = `
        <select
          class="answer-textarea w-full rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-base py-3 px-4"
          data-question-id="${id}"
        >
          <option value="">Select an option...</option>
          ${options.map(opt => `<option value="${escapeAttr(opt)}" ${answerText === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
        </select>
      `;
      break;

    case 'date':
      inputHtml = `
        <input
          type="date"
          class="answer-textarea w-full rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-base py-3 px-4"
          data-question-id="${id}"
          value="${escapeAttr(answerText)}"
        />
      `;
      break;

    case 'scale':
      const selectedVal = parseInt(answerText) || 0;
      inputHtml = `<div class="flex gap-1">
        ${Array.from({ length: 10 }, (_, i) => i + 1).map(num => `
          <button class="scale-btn flex-1 h-10 flex items-center justify-center border rounded-lg text-xs font-bold transition-colors
            ${num === selectedVal ? 'bg-primary text-white' : 'border-slate-200 hover:bg-slate-50'}"
            data-question-id="${id}" data-value="${num}">${num}</button>
        `).join('')}
      </div>`;
      break;

    case 'file_upload':
      inputHtml = `
        <div class="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/40 transition-colors cursor-pointer">
          <div class="text-center">
            <span class="material-symbols-outlined text-slate-400 text-2xl">cloud_upload</span>
            <p class="text-xs text-slate-400 mt-1">Click to upload or drag & drop</p>
          </div>
        </div>
      `;
      break;

    default:
      inputHtml = `
        <input type="text" class="answer-textarea w-full rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-base py-3 px-4"
          data-question-id="${id}" value="${escapeAttr(answerText)}" placeholder="Type your answer..." />
      `;
  }

  return `
    <div class="group relative card-premium ${isActive ? 'border-primary ring-2 ring-primary/10 shadow-xl shadow-primary/20' : 'shadow-sm'} rounded-xl p-6 transition-all" data-card-id="${id}">

      <!-- Drag handle -->
      <div class="drag-handle absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 -ml-2">
        <span class="material-symbols-outlined text-slate-300 cursor-grab">drag_indicator</span>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-start mb-4">
        <div class="space-y-1 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-slate-400">${index + 1}.</span>
            ${badgeHtml}
            ${required ? '<span class="text-red-400 text-xs font-bold">Required</span>' : ''}
          </div>
          <h3 class="text-lg md:text-xl font-bold text-slate-900">${escapeHtml(text)}</h3>
          <p class="text-xs text-slate-400 flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">${typeInfo.icon}</span> ${typeInfo.label}
          </p>
        </div>
      </div>

      <!-- Input Area -->
      <div class="mb-4">
        ${inputHtml}
        ${confidenceHtml}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1.5 pt-3 border-t border-slate-100 flex-wrap">
        <button class="btn-undo flex items-center justify-center size-7 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all" data-question-id="${id}" title="Undo">
          <span class="material-symbols-outlined text-[16px]">undo</span>
        </button>
        <button class="btn-redo flex items-center justify-center size-7 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all" data-question-id="${id}" title="Redo">
          <span class="material-symbols-outlined text-[16px]">redo</span>
        </button>
        <div class="w-px h-4 bg-slate-200 mx-1"></div>
        ${type === 'long_text' || type === 'short_text' ? `
          <button class="quick-action flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-all"
                  data-question-id="${id}" data-action="shorten">
            <span class="material-symbols-outlined text-sm">compress</span> Shorten
          </button>
          <button class="quick-action flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-all"
                  data-question-id="${id}" data-action="professional">
            <span class="material-symbols-outlined text-sm">work</span> Professional
          </button>
          <button class="quick-action flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-all"
                  data-question-id="${id}" data-action="friendly">
            <span class="material-symbols-outlined text-sm">sentiment_satisfied</span> Friendly
          </button>
        ` : ''}
        <div class="flex-1"></div>
        <button class="btn-regenerate flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                data-question-id="${id}">
          <span class="material-symbols-outlined text-sm">refresh</span> Regenerate
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
