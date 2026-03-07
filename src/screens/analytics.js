// ═══════════════════════════════════════════
// FormMate — Analytics Dashboard
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { navigateTo } from '../router.js';
import {
  getActivityCount, estimateTimeSaved, getStreak, getDailyActivity
} from '../storage/activity-logger.js';
import { getUsageSummary } from '../storage/usage-gate.js';
import { renderEmptyState } from '../components/ui-components.js';

export function analyticsScreen() {
  const formsAnalyzed = getActivityCount('form_analyzed');
  const answersGen = getActivityCount('answer_generated');
  const edits = getActivityCount('quick_edit') + getActivityCount('answer_edited');
  const submitted = getActivityCount('form_submitted');
  const timeSaved = estimateTimeSaved(); // minutes
  const streak = getStreak();

  const usage = getUsageSummary();
  const dailyData = getDailyActivity(7);

  // Create simple bar chart heights
  const maxDaily = Math.max(...dailyData.map(d => d.count), 1);
  const barsHtml = dailyData.map(d => {
    const heightPercent = Math.max((d.count / maxDaily) * 100, 4); // Min height 4%
    return `
      <div class="flex flex-col items-center gap-2 group flex-1">
        <div class="w-full flex items-end justify-center h-32 rounded-lg relative" style="background: var(--fm-bg-sunken);">
          <div class="w-full rounded-lg transition-all" style="height: ${heightPercent}%; background: ${d.count > 0 ? 'var(--fm-primary)' : 'var(--fm-border)'};"></div>
          
          <!-- Tooltip -->
          <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-2 py-1 rounded text-xs font-bold text-white bg-gray-800 z-10 pointer-events-none">
            ${d.count} activities
          </div>
        </div>
        <span class="text-[10px] font-medium" style="color: var(--fm-text-tertiary);">${d.date.split(' ')[0]}</span>
      </div>
    `;
  }).join('');

  const html = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 border-r flex-col shrink-0 hidden lg:flex" style="border-color: var(--fm-border); background: var(--fm-bg-elevated);">
        <div class="p-6 flex items-center gap-3">
          <div class="size-8 rounded-lg flex items-center justify-center text-white" style="background: var(--fm-primary);">
            <span class="material-symbols-outlined">auto_awesome</span>
          </div>
          <h1 class="text-xl font-bold tracking-tight" style="color: var(--fm-text);">FormMate</h1>
        </div>
        <nav class="flex-1 px-4 space-y-1">
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('landing')">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer" style="background: var(--fm-primary-50); color: var(--fm-primary);">
            <span class="material-symbols-outlined">monitoring</span> Analytics
          </a>
        </nav>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto no-scrollbar relative" style="background: var(--fm-bg);">
        <header class="h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 glass" style="border-color: var(--fm-border);">
          <div class="flex items-center gap-3">
            <button id="btn-back" class="p-2 rounded-lg transition-colors" style="color: var(--fm-text-secondary);">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 class="text-lg font-bold" style="color: var(--fm-text);">Usage Analytics</h2>
          </div>
          
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold" style="background: var(--fm-bg-elevated); border-color: var(--fm-border); color: var(--fm-text);">
            <span class="material-symbols-outlined text-[14px]" style="color: var(--fm-warning);">local_fire_department</span>
            ${streak} Day Streak
          </div>
        </header>

        <div class="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
          
          <!-- Top Stats row -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-5 rounded-2xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div class="size-10 rounded-xl flex items-center justify-center mb-3" style="background: var(--fm-primary-50); color: var(--fm-primary);">
                <span class="material-symbols-outlined">description</span>
              </div>
              <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: var(--fm-text-tertiary);">Forms Analyzed</p>
              <h3 class="text-3xl font-bold" style="color: var(--fm-text);">${formsAnalyzed}</h3>
            </div>
            
            <div class="p-5 rounded-2xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div class="size-10 rounded-xl flex items-center justify-center mb-3" style="background: var(--fm-success-light); color: var(--fm-success);">
                <span class="material-symbols-outlined">check_circle</span>
              </div>
              <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: var(--fm-text-tertiary);">Forms Filled</p>
              <h3 class="text-3xl font-bold" style="color: var(--fm-text);">${submitted}</h3>
            </div>
            
            <div class="p-5 rounded-2xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div class="size-10 rounded-xl flex items-center justify-center mb-3" style="background: var(--fm-info-light); color: var(--fm-info);">
                <span class="material-symbols-outlined">smart_toy</span>
              </div>
              <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: var(--fm-text-tertiary);">Answers Generated</p>
              <h3 class="text-3xl font-bold" style="color: var(--fm-text);">${answersGen}</h3>
            </div>
            
            <div class="p-5 rounded-2xl" style="background: var(--fm-gradient-primary);">
              <div class="size-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(255,255,255,0.2); color: white;">
                <span class="material-symbols-outlined">timer</span>
              </div>
              <p class="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Est. Time Saved</p>
              <div class="flex items-baseline gap-1">
                <h3 class="text-3xl font-bold text-white">${timeSaved > 60 ? (timeSaved / 60).toFixed(1) : timeSaved}</h3>
                <span class="text-sm font-medium text-white/80">${timeSaved > 60 ? 'hours' : 'mins'}</span>
              </div>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Activity Chart -->
            <div class="md:col-span-2 p-6 rounded-2xl flex flex-col" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div class="mb-6">
                <h3 class="text-base font-bold" style="color: var(--fm-text);">Activity History</h3>
                <p class="text-xs" style="color: var(--fm-text-tertiary);">Your form analysis & edit volume over the last 7 days.</p>
              </div>
              
              <div class="flex-1 flex gap-2 w-full mt-auto">
                ${barsHtml}
              </div>
            </div>

            <!-- Current Plan limits -->
            <div class="p-6 rounded-2xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div class="mb-6 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold" style="color: var(--fm-text);">Current Plan</h3>
                  <p class="text-xs capitalize font-semibold mt-0.5" style="color: var(--fm-primary);">${usage.tier} Tier</p>
                </div>
                ${usage.tier === 'free' ? `
                  <button class="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg btn-press" style="background: var(--fm-primary); color: white;" onclick="window.__fmNav('pricing')">Upgrade</button>
                ` : ''}
              </div>
              
              <div class="space-y-4">
                <!-- Forms quota -->
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-semibold" style="color: var(--fm-text-secondary);">Forms Analyzed</span>
                    <span class="font-mono" style="color: var(--fm-text);">${usage.forms.used} / ${usage.forms.limit === Infinity ? '∞' : usage.forms.limit}</span>
                  </div>
                  <div class="h-2 w-full rounded-full overflow-hidden" style="background: var(--fm-bg-sunken);">
                    <div class="h-full rounded-full transition-all" style="width: ${usage.forms.percent}%; background: ${usage.forms.percent > 90 ? 'var(--fm-error)' : 'var(--fm-primary)'};"></div>
                  </div>
                </div>
                
                <!-- AI Calls quota -->
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-semibold" style="color: var(--fm-text-secondary);">AI Generations</span>
                    <span class="font-mono" style="color: var(--fm-text);">${usage.aiCalls.used} / ${usage.aiCalls.limit === Infinity ? '∞' : usage.aiCalls.limit}</span>
                  </div>
                  <div class="h-2 w-full rounded-full overflow-hidden" style="background: var(--fm-bg-sunken);">
                    <div class="h-full rounded-full transition-all" style="width: ${usage.aiCalls.percent}%; background: ${usage.aiCalls.percent > 90 ? 'var(--fm-error)' : 'var(--fm-accent)'};"></div>
                  </div>
                </div>

                <!-- Edits quota -->
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-semibold" style="color: var(--fm-text-secondary);">Quick Edits</span>
                    <span class="font-mono" style="color: var(--fm-text);">${usage.edits.used} / ${usage.edits.limit === Infinity ? '∞' : usage.edits.limit}</span>
                  </div>
                  <div class="h-2 w-full rounded-full overflow-hidden" style="background: var(--fm-bg-sunken);">
                    <div class="h-full rounded-full transition-all" style="width: ${usage.edits.percent}%; background: ${usage.edits.percent > 90 ? 'var(--fm-error)' : 'var(--fm-info)'};"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <!-- Quality Trends -->
          <div class="p-6 rounded-2xl flex items-center gap-6" style="background: var(--fm-surface); border: 1px solid var(--fm-border);">
            <div class="size-12 rounded-full flex items-center justify-center shrink-0" style="background: var(--fm-success-light); color: var(--fm-success);">
              <span class="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div class="flex-1">
              <h4 class="text-sm font-bold" style="color: var(--fm-text);">AI Accuracy Rate</h4>
              <p class="text-xs mt-1 leading-relaxed" style="color: var(--fm-text-secondary);">
                Based on your edit volume, the AI is generating acceptable answers on the first try <strong style="color: var(--fm-text);">${answersGen > 0 ? Math.round(((answersGen - edits) / answersGen) * 100) : 100}%</strong> of the time. We use this anonymous ratio to tune our fallback prompts.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  `;

  function init(wrapper) {
    window.__fmNav = (screen) => navigateTo(screen);
    wrapper.querySelector('#btn-back').addEventListener('click', () => navigateTo('landing'));
    return () => { delete window.__fmNav; };
  }

  return { html, init };
}
