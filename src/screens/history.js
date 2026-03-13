// ═══════════════════════════════════════════
// FormMate — History Screen
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { withLayout, initLayout } from '../components/layout.js';
import { navigateTo } from '../router.js';
import { escapeAttr, escapeHtml } from '../utils/escape.js';

export function historyScreen() {
  const { formHistory } = getState();

  const historyContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter">
      <div class="max-w-5xl mx-auto px-6 py-10">
        <div class="flex items-center justify-between mb-10">
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">Form History</h1>
            <p class="text-sm text-slate-500 mt-1">Review and revisit your previously analyzed forms.</p>
          </div>
          <button class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all btn-press">
            Export All
          </button>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                <th class="px-6 py-4">Form Name</th>
                <th class="px-6 py-4">Analyzed On</th>
                <th class="px-6 py-4">Provider</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              ${formHistory.length > 0 ? formHistory.map(form => `
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-[18px]">edit_document</span>
                      </div>
                      <span class="font-bold text-slate-900">${escapeHtml(form.title || 'Untitled Form')}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-slate-500 font-medium font-mono text-[12px]">${new Date(form.timestamp).toLocaleDateString()}</td>
                  <td class="px-6 py-5">
                    <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight">${escapeHtml(form.provider || 'Google Forms')}</span>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <button type="button" class="btn-open-history text-primary font-bold hover:underline" data-form-url="${escapeAttr(form.url || '')}">Open</button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="4" class="px-6 py-20 text-center text-slate-400 italic font-medium">No history found. Try analyzing a new form!</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('history', historyContent);

  function init(wrapper) {
    initLayout(wrapper);

    wrapper.querySelectorAll('.btn-open-history').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo('workspace');
      });
    });
  }

  return { html, init };
}
