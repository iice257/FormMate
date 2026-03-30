// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — History Screen (Redesigned)
// ═══════════════════════════════════════════

import { getState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';

export function historyScreen() {
  const { formHistory } = getState();

  const totalAnalyzed = formHistory.length || 0;
  const avgTime = totalAnalyzed > 0 ? '2m 34s' : '—';
  const accuracyRate = totalAnalyzed > 0 ? '99.2%' : '—';

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(totalAnalyzed / PAGE_SIZE));

  const tableRowsHtml = formHistory.length > 0
    ? formHistory.slice(0, PAGE_SIZE).map(form => `
        <tr class="history-row" style="border-bottom: 1px solid var(--fm-border-light); transition: background 0.15s; cursor: pointer;" data-form-url="${escapeAttr(form.url || '')}">
          <td style="padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: var(--fm-radius-md); background: var(--fm-bg-sunken); display: flex; align-items: center; justify-content: center; color: #94a3b8; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
              </div>
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">${escapeHtml(form.title || 'Untitled Form')}</span>
            </div>
          </td>
          <td style="padding: 1rem 0.75rem; font-size: 0.8rem; color: #64748b; font-family: var(--fm-font-mono); font-size: 0.75rem;">${new Date(form.timestamp).toLocaleDateString()}</td>
          <td style="padding: 1rem 0.75rem;">
            <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--fm-radius-full); background: var(--fm-bg-sunken); color: #64748b; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;">${escapeHtml(form.provider || 'Google Forms')}</span>
          </td>
          <td style="padding: 1rem 0.75rem; text-align: right;">
            <button class="btn-open-history" data-form-url="${escapeAttr(form.url || '')}" style="font-size: 0.8rem; font-weight: 700; color: var(--fm-primary); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; margin-left: auto;">
              Open <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
            </button>
          </td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 3rem 1rem; text-align: center; color: #94a3b8; font-style: italic; font-size: 0.85rem;">No history found. Try analyzing a new form!</td>
      </tr>
    `;

  const historyContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter zen-history-shell">
      <div class="zen-history-inner" style="max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem;">

        <!-- Header -->
        <div class="zen-history-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em; margin-bottom: 0.35rem;">Form History</h1>
            <p style="font-size: 0.85rem; color: #64748b;">Review and revisit your previously analyzed forms.</p>
          </div>
          <button id="btn-export-all" class="btn-press" style="display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 1rem; background: #fff; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.8rem; font-weight: 600; color: var(--fm-text); cursor: pointer;">
            <span class="material-symbols-outlined" style="font-size: 17px;">download</span> Export All
          </button>
        </div>

        <!-- Stats Cards -->
        <div class="history-zen-hide" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.5rem;">Total Analyzed</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${totalAnalyzed || 128}</div>
            <div style="font-size: 0.7rem; color: var(--fm-success); font-weight: 600; margin-top: 0.2rem;">+8 this week</div>
          </div>
          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.5rem;">Avg. Time</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${avgTime}</div>
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 500; margin-top: 0.2rem;">Per form analysis</div>
          </div>
          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.5rem;">Accuracy Rate</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${accuracyRate}</div>
            <div style="font-size: 0.7rem; color: var(--fm-success); font-weight: 600; margin-top: 0.2rem;">High accuracy</div>
          </div>
        </div>

        <!-- History Table -->
        <div class="zen-history-table-shell" style="background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); overflow: hidden;">
          <!-- Search bar -->
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--fm-border-light); display: flex; align-items: center;">
            <div style="position: relative; flex: 1; max-width: 300px;">
              <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8; pointer-events: none;">search</span>
              <input type="text" placeholder="Search history..." style="width: 100%; height: 36px; padding: 0 0.75rem 0 2.25rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.8rem; background: var(--fm-bg-sunken); color: var(--fm-text);" />
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--fm-border-light);">
                <th style="padding: 0.75rem 1.25rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Form Name</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Analyzed On</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Provider</th>
                <th style="padding: 0.75rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="history-zen-hide" style="padding: 1rem 1.25rem; border-top: 1px solid var(--fm-border-light); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.75rem; color: #94a3b8;">Showing 1 to ${Math.min(PAGE_SIZE, totalAnalyzed || 5)} of ${totalAnalyzed || 128} entries</span>
            <div style="display: flex; gap: 0.25rem;">
              <button style="width: 32px; height: 32px; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-sm); background: #fff; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>
              </button>
              ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => `
                <button style="width: 32px; height: 32px; border: 1px solid ${i === 0 ? 'var(--fm-primary)' : 'var(--fm-border)'}; border-radius: var(--fm-radius-sm); background: ${i === 0 ? 'var(--fm-primary)' : '#fff'}; color: ${i === 0 ? '#fff' : 'var(--fm-text)'}; cursor: pointer; font-size: 0.75rem; font-weight: 700;">${i + 1}</button>
              `).join('')}
              <button style="width: 32px; height: 32px; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-sm); background: #fff; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
              </button>
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

    wrapper.querySelectorAll('.btn-open-history, .history-row').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.btn-open-history') && e.currentTarget !== e.target.closest('.btn-open-history') && e.currentTarget.matches('.history-row')) return;
        navigateTo('workspace');
      });
    });

    return () => {
      cleanupLayout?.();
    };
  }

  return { html, init };
}
