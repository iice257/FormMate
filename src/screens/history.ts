// @ts-nocheck
// FormMate - History Screen

import { getState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { renderButtonMarkup, renderInputMarkup } from '../components/ui-markup';

export function historyScreen() {
  const { formHistory } = getState();

  const totalAnalyzed = formHistory.length || 0;
  const avgTime = '—';
  const accuracyRate = '—';

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(totalAnalyzed / PAGE_SIZE));

  const tableRowsHtml = formHistory.length > 0
    ? formHistory.slice(0, PAGE_SIZE).map(form => `
        <tr class="history-row" style="border-bottom: 1px solid var(--fm-border-light); transition: background 0.15s;" data-form-url="${escapeAttr(form.url || '')}">
          <td style="padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: var(--fm-radius-md); background: var(--fm-bg-sunken); display: flex; align-items: center; justify-content: center; color: var(--fm-text-tertiary); flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
              </div>
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">${escapeHtml(form.title || 'Untitled Form')}</span>
            </div>
          </td>
          <td style="padding: 1rem 0.75rem; font-size: 0.8rem; color: var(--fm-text-secondary); font-family: var(--fm-font-mono);">${new Date(form.timestamp).toLocaleDateString()}</td>
          <td style="padding: 1rem 0.75rem;">
            <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--fm-radius-full); background: var(--fm-bg-sunken); color: var(--fm-text-secondary); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;">${escapeHtml(form.provider || 'Google Forms')}</span>
          </td>
          <td style="padding: 1rem 0.75rem; text-align: right;">
            ${renderButtonMarkup({
      className: 'btn-open-history ml-auto flex items-center gap-1 bg-transparent px-0 text-[0.8rem] font-bold text-[var(--fm-text-tertiary)] shadow-none hover:bg-transparent',
      contentHtml: 'Saved <span class="material-symbols-outlined" style="font-size: 16px;">inventory_2</span>',
      disabled: true,
      variant: 'ghost',
    }).replace('<button', `<button data-form-url="${escapeAttr(form.url || '')}"`)}
          </td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 3rem 1rem; text-align: center; color: var(--fm-text-tertiary); font-style: italic; font-size: 0.85rem;">No history found. Try analyzing a new form.</td>
      </tr>
    `;

  const historyContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter zen-history-shell">
      <div class="zen-history-inner" style="max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem;">
        <div class="zen-history-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em; margin-bottom: 0.35rem;">Form History</h1>
            <p style="font-size: 0.85rem; color: var(--fm-text-secondary);">Review your analyzed forms and the metadata captured for each run.</p>
          </div>
          ${renderButtonMarkup({
    className: 'btn-press flex items-center gap-1.5 px-4 py-2 text-[0.8rem] font-semibold',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 17px;">info</span> Export Deferred',
    id: 'btn-export-all',
    variant: 'outline',
  })}
        </div>

        <div class="history-zen-hide" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
          <div style="padding: 1.25rem; background: var(--fm-bg-elevated); border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fm-text-tertiary); margin-bottom: 0.5rem;">Total Analyzed</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${totalAnalyzed}</div>
            <div style="font-size: 0.7rem; color: var(--fm-text-secondary); font-weight: 600; margin-top: 0.2rem;">Observed history entries</div>
          </div>
          <div style="padding: 1.25rem; background: var(--fm-bg-elevated); border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fm-text-tertiary); margin-bottom: 0.5rem;">Avg. Time</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${avgTime}</div>
            <div style="font-size: 0.7rem; color: var(--fm-text-secondary); font-weight: 500; margin-top: 0.2rem;">Telemetry not collected yet</div>
          </div>
          <div style="padding: 1.25rem; background: var(--fm-bg-elevated); border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fm-text-tertiary); margin-bottom: 0.5rem;">Accuracy Rate</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${accuracyRate}</div>
            <div style="font-size: 0.7rem; color: var(--fm-text-secondary); font-weight: 600; margin-top: 0.2rem;">No production metric yet</div>
          </div>
        </div>

        <div class="zen-history-table-shell" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); overflow: hidden;">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--fm-border-light); display: flex; align-items: center;">
            <div style="position: relative; flex: 1; max-width: 300px;">
              <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--fm-text-tertiary); pointer-events: none;">search</span>
              ${renderInputMarkup({
    className: 'h-9 rounded-full border-[var(--fm-border)] bg-[var(--fm-bg-sunken)] pr-3 pl-9 text-[0.8rem] text-[var(--fm-text-tertiary)]',
    disabled: true,
    placeholder: 'Search history...',
  })}
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--fm-border-light);">
                <th style="padding: 0.75rem 1.25rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary);">Form Name</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary);">Analyzed On</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary);">Provider</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary); text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="history-zen-hide" style="padding: 1rem 1.25rem; border-top: 1px solid var(--fm-border-light); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.75rem; color: var(--fm-text-tertiary);">Showing 1 to ${Math.min(PAGE_SIZE, totalAnalyzed)} of ${totalAnalyzed} entries</span>
            <div style="display: flex; gap: 0.25rem;">
              ${renderButtonMarkup({
    className: 'size-8 rounded-[var(--fm-radius-sm)] border-[var(--fm-border)] text-[#cbd5e1]',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>',
    disabled: true,
    size: 'icon-sm',
    variant: 'outline',
  })}
              ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => `
                ${renderButtonMarkup({
        className: `size-8 rounded-[var(--fm-radius-sm)] border px-0 text-[0.75rem] font-bold ${i === 0 ? 'border-[var(--fm-primary)] bg-[var(--fm-primary)] text-white hover:bg-[var(--fm-primary)] hover:text-white' : 'border-[var(--fm-border)] bg-white text-[var(--fm-text)] hover:bg-white'}`,
        contentHtml: String(i + 1),
        disabled: true,
        size: 'icon-sm',
        variant: 'outline',
      })}
              `).join('')}
              ${renderButtonMarkup({
    className: 'size-8 rounded-[var(--fm-radius-sm)] border-[var(--fm-border)] text-[#cbd5e1]',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>',
    disabled: true,
    size: 'icon-sm',
    variant: 'outline',
  })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('history', historyContent, {
    zenMode: { screenId: 'history' },
    shellClassName: 'zen-layout-shell',
    contentClassName: 'zen-layout-content'
  });

  function init(wrapper) {
    const cleanupLayout = initLayout(wrapper, { zenMode: { screenId: 'history' } });

    wrapper.querySelector('#btn-export-all')?.addEventListener('click', () => {
      navigateTo('docs');
    });

    return () => {
      cleanupLayout?.();
    };
  }

  return { html, init };
}

