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

  const quickActions = [
    {
      id: 'new',
      buttonId: 'btn-dashboard-focus-new',
      eyebrow: 'Start',
      title: 'Paste a new form link',
      copy: 'Kick off a fresh analysis flow in one click.',
      icon: 'link'
    },
    {
      id: 'history',
      buttonId: 'btn-dashboard-focus-history',
      eyebrow: 'Review',
      title: 'Open recent form history',
      copy: 'Jump back into a recent form without hunting around.',
      icon: 'history'
    },
    {
      id: 'chat',
      buttonId: 'btn-dashboard-focus-chat',
      eyebrow: 'Refine',
      title: 'Ask Copilot for help',
      copy: 'Rewrite, clarify, or tighten answers from one place.',
      icon: 'forum'
    }
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
        <div class="dashboard-hero mb-10">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-2xl">
              <div class="dashboard-kicker">
                <span class="material-symbols-outlined text-[15px]">nest_clock_farsight_analog</span>
                Your form cockpit
              </div>
              <h1 class="mt-4 text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.05]">Welcome back, ${firstName}!</h1>
              <p class="mt-3 max-w-xl text-sm md:text-[15px] text-slate-600 leading-relaxed">Everything important is surfaced here: active work, recent history, and the fastest way back into a form.</p>
            </div>
            <div class="flex items-center gap-3">
              ${formData ? `
                <button id="btn-dashboard-resume" class="dashboard-primary-action flex items-center gap-2 px-6 py-3 rounded-2xl font-bold btn-press">
                  <span class="material-symbols-outlined text-[20px]">play_arrow</span>
                  Resume Active Form
                </button>
              ` : ''}
              <button id="btn-dashboard-new" class="dashboard-secondary-action flex items-center gap-2 px-6 py-3 rounded-2xl font-bold btn-press">
                <span class="material-symbols-outlined text-[20px]">add</span>
                New Form
              </button>
            </div>
          </div>
          <div class="dashboard-hero-metrics mt-8">
            <div>
              <div class="dashboard-hero-metric-value">${formHistory.length || 0}</div>
              <div class="dashboard-hero-metric-label">Forms touched</div>
            </div>
            <div>
              <div class="dashboard-hero-metric-value">${tier === 'free' ? 'Free' : 'Pro'}</div>
              <div class="dashboard-hero-metric-label">Current plan</div>
            </div>
            <div>
              <div class="dashboard-hero-metric-value">${formData ? 'Live' : 'Idle'}</div>
              <div class="dashboard-hero-metric-label">Workspace status</div>
            </div>
          </div>
        </div>

        <div class="dashboard-section-surface mb-8">
          <div class="flex items-center justify-between gap-4 px-1 pb-4">
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Quick Actions</p>
              <h2 class="mt-1 text-lg font-black tracking-tight text-slate-900">Three fast paths back into work</h2>
            </div>
            <div class="hidden md:flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
              <span class="material-symbols-outlined text-[14px]">bolt</span>
              Optimized for speed
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            ${quickActions.map((action) => `
              <button id="${action.buttonId}" class="dashboard-quick-action btn-press" data-dashboard-focus="${action.id}">
                <div class="dashboard-quick-action-icon">
                  <span class="material-symbols-outlined text-[20px]">${action.icon}</span>
                </div>
                <div class="min-w-0">
                  <span class="dashboard-quick-action-eyebrow">${action.eyebrow}</span>
                  <span class="dashboard-quick-action-title">${action.title}</span>
                  <span class="dashboard-quick-action-copy">${action.copy}</span>
                </div>
                <span class="material-symbols-outlined dashboard-quick-action-arrow">arrow_outward</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          ${mockStats.map(stat => `
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-edge"></div>
              <div class="dashboard-stat-glow"></div>
              <div class="size-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 shadow-sm relative z-10">
                <span class="material-symbols-outlined text-[22px]">${stat.icon}</span>
              </div>
              <div class="text-2xl font-black text-slate-900 relative z-10">${stat.value}</div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 relative z-10">${stat.label}</div>
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

    wrapper.querySelector('#btn-dashboard-focus-new')?.addEventListener('click', () => {
      navigateTo('new');
    });

    wrapper.querySelector('#btn-dashboard-focus-history')?.addEventListener('click', () => {
      navigateTo('history');
    });

    wrapper.querySelector('#btn-dashboard-focus-chat')?.addEventListener('click', () => {
      navigateTo('ai-chat');
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
