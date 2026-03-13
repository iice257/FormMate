// ═══════════════════════════════════════════
// FormMate — Dashboard Screen
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { withLayout, initLayout } from '../components/layout.js';
import { navigateTo } from '../router.js';
import { escapeAttr, escapeHtml } from '../utils/escape.js';

export function dashboardScreen() {
  const { userProfile, formHistory, tier, formData } = getState();
  const firstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');

  const mockStats = [
    { label: 'Total Forms', value: formHistory.length || 0, icon: 'description', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'AI Credits', value: tier === 'free' ? '3/5' : 'Unlimited', icon: 'bolt', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Time Saved', value: '1.2h', icon: 'schedule', color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Accuracy', value: '98%', icon: 'verified', color: 'text-primary', bg: 'bg-indigo-50' },
  ];

  const recentFormsHtml = formHistory.length > 0 
    ? formHistory.slice(0, 5).map(form => `
        <div class="recent-form-item flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all group cursor-pointer" data-form-url="${escapeAttr(form.url || '')}" role="button" tabindex="0">
          <div class="flex items-center gap-4">
            <div class="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <span class="material-symbols-outlined">edit_document</span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-900 truncate max-w-[200px]">${escapeHtml(form.title || 'Untitled Form')}</span>
              <span class="text-[11px] text-slate-400 font-medium">${new Date(form.timestamp).toLocaleDateString()} • ${escapeHtml(form.provider || 'Google Forms')}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
             <span class="text-[10px] font-bold px-2 py-1 rounded-full ${form.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'} uppercase tracking-tight">${escapeHtml(form.status || 'In Progress')}</span>
             <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
          </div>
        </div>
      `).join('')
    : `
        <div class="flex flex-col items-center justify-center py-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <div class="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
            <span class="material-symbols-outlined text-3xl">history</span>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">No forms yet</h3>
          <p class="text-xs text-slate-500 max-w-[200px]">Start by pasting a link to analyze your first form.</p>
          <button id="btn-empty-new" class="mt-6 px-6 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-sm btn-press">Start New Form</button>
        </div>
      `;

  const dashboardContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter">
      <div class="max-w-6xl mx-auto px-6 py-8 md:py-10">
        
        <!-- Welcome Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Welcome back, ${firstName}!</h1>
            <p class="text-sm text-slate-500 mt-1">Here's what's happening with your forms today.</p>
          </div>
          <div class="flex items-center gap-3">
            ${formData ? `
              <button id="btn-dashboard-resume" class="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press">
                <span class="material-symbols-outlined text-[20px]">play_arrow</span>
                Resume Active Form
              </button>
            ` : ''}
            <button id="btn-dashboard-new" class="flex items-center gap-2 ${formData ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-primary text-white hover:bg-primary/90'} px-6 py-3 rounded-2xl font-bold shadow-lg ${formData ? 'shadow-slate-900/10' : 'shadow-primary/20'} hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press">
              <span class="material-symbols-outlined text-[20px]">add</span>
              New Form
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          ${mockStats.map(stat => `
            <div class="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div class="size-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[22px]">${stat.icon}</span>
              </div>
              <div class="text-2xl font-black text-slate-900">${stat.value}</div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">${stat.label}</div>
            </div>
          `).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Recent Forms -->
          <div class="lg:col-span-2">
            <div class="flex items-center justify-between mb-5 px-1">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">history</span>
                Recent Forms
              </h3>
              <button id="btn-dashboard-view-all" class="text-xs font-bold text-primary hover:underline">View All</button>
            </div>
            <div class="space-y-4">
              ${recentFormsHtml}
            </div>
          </div>

          <!-- Side Cards -->
          <div class="space-y-6">
            <!-- AI Pro Card -->
            <button type="button" id="btn-upgrade-card" class="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white group cursor-pointer text-left w-full">
              <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/30 transition-colors"></div>
              <div class="relative z-10">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-primary text-[10px] font-black uppercase tracking-widest border border-white/10 mb-6">
                  <span class="material-symbols-outlined text-[14px]">bolt</span>
                  Pro Features
                </div>
                <h4 class="text-xl font-bold mb-3">Unlimited AI Power</h4>
                <p class="text-slate-400 text-xs leading-relaxed mb-6">Get 100% accuracy with advanced reasoning models & unlimited form parses.</p>
                <div class="flex items-center gap-2 font-bold text-sm text-white group-hover:gap-3 transition-all">
                  Upgrade Now
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </div>
            </button>

            <!-- Quick Tips -->
            <div class="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500 text-[18px]">lightbulb</span>
                Quick Tip
              </h4>
              <p class="text-xs text-slate-600 leading-relaxed mb-4">Did you know you can type <strong>"Make it professional"</strong> in the chat to rewrite your summaries?</p>
              <button id="btn-dashboard-try-chat" class="w-full py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors">Try AI Chat</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('dashboard', dashboardContent);

  function init(wrapper) {
    initLayout(wrapper);

    wrapper.querySelector('#btn-dashboard-new')?.addEventListener('click', () => {
      navigateTo('new');
    });

    wrapper.querySelector('#btn-dashboard-resume')?.addEventListener('click', () => {
      navigateTo('workspace');
    });

    wrapper.querySelector('#btn-empty-new')?.addEventListener('click', () => {
      navigateTo('new');
    });

    wrapper.querySelector('#btn-dashboard-view-all')?.addEventListener('click', () => {
      navigateTo('history');
    });

    wrapper.querySelector('#btn-dashboard-try-chat')?.addEventListener('click', () => {
      navigateTo('ai-chat');
    });

    wrapper.querySelectorAll('.recent-form-item').forEach((el) => {
      el.addEventListener('click', () => {
        // Keep data flow as-is for now (no param hydration yet).
        navigateTo('workspace');
      });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        el.click();
      });
    });

    wrapper.querySelector('#btn-upgrade-card')?.addEventListener('click', () => {
      navigateTo('pricing');
    });
  }

  return { html, init };
}
