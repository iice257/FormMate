// ═══════════════════════════════════════════
// FormMate — Toast Notification System
// ═══════════════════════════════════════════

let toastContainer = null;

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'fm-toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: var(--fm-space-6, 1.5rem);
    right: var(--fm-space-6, 1.5rem);
    z-index: var(--fm-z-toast, 60);
    display: flex;
    flex-direction: column;
    gap: var(--fm-space-3, 0.75rem);
    pointer-events: none;
    max-width: 380px;
    width: 100%;
  `;
  document.body.appendChild(toastContainer);
}

const TOAST_ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const TOAST_COLORS = {
  success: { bg: 'var(--fm-success-light)', text: 'var(--fm-success)', border: 'var(--fm-success)' },
  error: { bg: 'var(--fm-error-light)', text: 'var(--fm-error)', border: 'var(--fm-error)' },
  warning: { bg: 'var(--fm-warning-light)', text: 'var(--fm-warning)', border: 'var(--fm-warning)' },
  info: { bg: 'var(--fm-info-light)', text: 'var(--fm-info)', border: 'var(--fm-info)' },
};

/**
 * Show a toast notification.
 * @param {string} message - Toast message
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Toast type
 * @param {number} [duration=3500] - Duration in ms
 */
export function showToast(message, type = 'info', duration = 3500) {
  ensureContainer();

  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;
  const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-radius: var(--fm-radius-xl, 1rem);
    background: var(--fm-bg-elevated, #fff);
    border: 1px solid var(--fm-border, #e2e8f0);
    border-left: 4px solid ${colors.border};
    box-shadow: var(--fm-shadow-lg);
    pointer-events: auto;
    transform: translateX(120%);
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: var(--fm-font-sans);
    max-width: 100%;
  `;

  const safeMessage = escapeHtml(message);
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: ${colors.text}; font-size: 1.25rem; flex-shrink: 0;">${icon}</span>
    <span style="color: var(--fm-text, #0f172a); font-size: 0.8125rem; font-weight: 500; line-height: 1.4; flex: 1;">${safeMessage}</span>
    <button style="color: var(--fm-text-tertiary); cursor: pointer; background: none; border: none; padding: 0.25rem; flex-shrink: 0; display: flex; border-radius: 0.375rem;" class="toast-close">
      <span class="material-symbols-outlined" style="font-size: 1rem;">close</span>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);

  // Pause on hover
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => {
    setTimeout(() => dismissToast(toast), 1500);
  });
}

function dismissToast(toast) {
  if (!toast.parentNode) return;

  toast.style.transform = 'translateX(120%)';
  toast.style.opacity = '0';

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 350);
}

// Convenience methods
export const toast = {
  success: (msg, duration) => showToast(msg, 'success', duration),
  error: (msg, duration) => showToast(msg, 'error', duration),
  warning: (msg, duration) => showToast(msg, 'warning', duration),
  info: (msg, duration) => showToast(msg, 'info', duration),
};
