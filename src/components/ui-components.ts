// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Reusable UI Components
// ═══════════════════════════════════════════
//
// HTML generators for common UI elements.
// Returns strings for template literals.
// ═══════════════════════════════════════════

/**
 * Render a primary button.
 */
export function renderButton(text, { id = '', icon = '', variant = 'primary', size = 'md', classes = '', disabled = false } = {}) {
  const variants = {
    primary: 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1 rounded-lg',
    md: 'h-10 px-5 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2 rounded-xl',
    xl: 'h-14 px-8 text-lg gap-2 rounded-xl',
  };

  const iconHtml = icon ? `<span class="material-symbols-outlined text-[1em]">${icon}</span>` : '';

  return `<button ${id ? `id="${id}"` : ''} class="flex items-center justify-center font-bold transition-all btn-press ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${classes}" ${disabled ? 'disabled aria-disabled="true"' : ''} aria-label="${text.replace(/"/g, '&quot;')}">
    ${iconHtml}${text}
  </button>`;
}

/**
 * Render a modal wrapper.
 */
export function renderModal(id, { title = '', content = '', size = 'md', showClose = true } = {}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-3xl',
  };

  return `
    <div id="${id}" class="fixed inset-0 z-[var(--fm-z-modal,50)] hidden" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" data-modal-overlay="${id}"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${sizes[size]} p-4">
        <div class="bg-[var(--fm-bg-elevated)] rounded-2xl shadow-2xl overflow-hidden" style="box-shadow: var(--fm-shadow-xl);">
          ${title || showClose ? `
            <div class="flex items-center justify-between p-6 pb-4">
              <h3 class="text-xl font-bold" style="color: var(--fm-text);">${title}</h3>
              ${showClose ? `<button data-modal-close="${id}" class="p-2 hover:bg-slate-100 rounded-lg transition-colors" style="color: var(--fm-text-secondary);">
                <span class="material-symbols-outlined">close</span>
              </button>` : ''}
            </div>
          ` : ''}
          <div class="px-6 pb-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            ${content}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show/hide a modal by ID.
 */
export function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.animation = 'screenFadeIn 0.25s ease-out forwards';
  }
}

export function hideModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.animation = 'screenFadeOut 0.15s ease-out forwards';
    setTimeout(() => modal.classList.add('hidden'), 150);
  }
}

/**
 * Attach close listeners to all modals in a wrapper.
 */
export function initModals(wrapper) {
  wrapper.querySelectorAll('[data-modal-overlay]').forEach(overlay => {
    overlay.addEventListener('click', () => hideModal(overlay.dataset.modalOverlay));
  });
  wrapper.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => hideModal(btn.dataset.modalClose));
  });
}

/**
 * Render a toggle switch.
 */
export function renderToggle(id, { label = '', checked = false, description = '' } = {}) {
  return `
    <label class="flex items-center justify-between gap-4 cursor-pointer group" for="${id}">
      <div class="flex flex-col">
        <span class="text-sm font-medium" style="color: var(--fm-text);">${label}</span>
        ${description ? `<span class="text-xs mt-0.5" style="color: var(--fm-text-tertiary);">${description}</span>` : ''}
      </div>
      <div class="relative">
        <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''} />
        <div class="w-10 h-6 rounded-full transition-colors peer-checked:bg-primary bg-slate-300"></div>
        <div class="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></div>
      </div>
    </label>
  `;
}

/**
 * Render tabs navigation.
 */
export function renderTabs(tabs, { activeTab = 0, id = 'tabs' } = {}) {
  return `
    <div id="${id}" class="flex gap-1 p-1 rounded-xl" style="background: var(--fm-bg-sunken);">
      ${tabs.map((tab, i) => `
        <button class="tab-btn flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${i === activeTab ? 'bg-white shadow-sm' : 'hover:bg-white/50'}"
                data-tab-index="${i}" data-tab-group="${id}"
                style="color: ${i === activeTab ? 'var(--fm-text)' : 'var(--fm-text-tertiary)'};">
          ${tab.icon ? `<span class="material-symbols-outlined text-sm mr-1.5">${tab.icon}</span>` : ''}${tab.label}
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Init tab switching behavior.
 */
export function initTabs(wrapper, id, onChange) {
  wrapper.querySelectorAll(`[data-tab-group="${id}"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.tabIndex);

      // Update active state
      wrapper.querySelectorAll(`[data-tab-group="${id}"]`).forEach(b => {
        b.classList.remove('bg-white', 'shadow-sm');
        b.classList.add('hover:bg-white/50');
        b.style.color = 'var(--fm-text-tertiary)';
      });
      btn.classList.add('bg-white', 'shadow-sm');
      btn.classList.remove('hover:bg-white/50');
      btn.style.color = 'var(--fm-text)';

      if (onChange) onChange(index);
    });
  });
}

/**
 * Render an accordion item.
 */
export function renderAccordion(items) {
  return `
    <div class="space-y-2">
      ${items.map((item, i) => `
        <div class="rounded-xl border overflow-hidden" style="border-color: var(--fm-border); background: var(--fm-bg-elevated);">
          <button class="accordion-trigger w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors" data-accordion-index="${i}">
            <span class="text-sm font-semibold" style="color: var(--fm-text);">${item.title}</span>
            <span class="material-symbols-outlined text-lg transition-transform" style="color: var(--fm-text-tertiary);">expand_more</span>
          </button>
          <div class="accordion-content hidden px-4 pb-4">
            <p class="text-sm leading-relaxed" style="color: var(--fm-text-secondary);">${item.content}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Init accordion behavior.
 */
export function initAccordion(wrapper) {
  wrapper.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const content = trigger.nextElementSibling;
      const icon = trigger.querySelector('.material-symbols-outlined');
      const isOpen = !content.classList.contains('hidden');

      content.classList.toggle('hidden');
      icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    });
  });
}

/**
 * Render an empty state.
 */
export function renderEmptyState({ icon = 'inbox', title = 'Nothing here yet', description = '', actionText = '', actionId = '' } = {}) {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="size-16 rounded-2xl flex items-center justify-center mb-4" style="background: var(--fm-primary-50);">
        <span class="material-symbols-outlined text-3xl" style="color: var(--fm-primary);">${icon}</span>
      </div>
      <h3 class="text-lg font-bold mb-1" style="color: var(--fm-text);">${title}</h3>
      <p class="text-sm max-w-xs" style="color: var(--fm-text-tertiary);">${description}</p>
      ${actionText ? `<button ${actionId ? `id="${actionId}"` : ''} class="mt-4 px-5 py-2 rounded-lg text-sm font-semibold transition-colors" style="background: var(--fm-primary-50); color: var(--fm-primary);">${actionText}</button>` : ''}
    </div>
  `;
}

/**
 * Render a tooltip wrapper.
 */
export function renderTooltip(content, tooltipText) {
  return `
    <div class="relative group inline-flex">
      ${content}
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" style="background: var(--fm-text); color: var(--fm-text-inverse);">
        ${tooltipText}
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent" style="border-top-color: var(--fm-text);"></div>
      </div>
    </div>
  `;
}

/**
 * Render a skeleton loading placeholder.
 */
export function renderSkeleton(lines = 3, { type = 'text' } = {}) {
  if (type === 'card') {
    return `
      <div class="rounded-xl p-6 animate-pulse" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
        <div class="h-4 w-1/3 rounded-full mb-4" style="background: var(--fm-bg-sunken);"></div>
        <div class="h-3 w-full rounded-full mb-2" style="background: var(--fm-bg-sunken);"></div>
        <div class="h-3 w-2/3 rounded-full mb-4" style="background: var(--fm-bg-sunken);"></div>
        <div class="h-10 w-full rounded-lg" style="background: var(--fm-bg-sunken);"></div>
      </div>
    `;
  }

  return `
    <div class="space-y-3 animate-pulse">
      ${Array.from({ length: lines }, (_, i) => `
        <div class="h-3 rounded-full" style="background: var(--fm-bg-sunken); width: ${i === lines - 1 ? '60%' : '100%'};"></div>
      `).join('')}
    </div>
  `;
}

/**
 * Render a badge.
 */
export function renderBadge(text, { variant = 'default', icon = '' } = {}) {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    error: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${variants[variant] || variants.default}">
    ${icon ? `<span class="material-symbols-outlined text-[12px]">${icon}</span>` : ''}${text}
  </span>`;
}
