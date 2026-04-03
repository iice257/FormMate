// @ts-nocheck
// FormMate - Pricing / Subscription Screen

import { getState } from '../state';
import { navigateTo, goBack } from '../router';
import { openAccountModal } from '../components/layout';

export function pricingScreen() {
  const { isAuthenticated, tier = 'free' } = getState();
  const currentTier = tier || 'free';

  const html = `
    <div class="min-h-screen bg-mesh py-12 px-6">
      <div class="max-w-6xl mx-auto">
        <header class="h-16 flex items-center justify-between mb-8">
          <div class="flex-1 flex justify-start">
            <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Back
            </button>
          </div>
          <div class="flex-1 flex justify-center items-center gap-2">
             <div class="size-8 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span></span>
          </div>
          <div class="flex-1 flex justify-end">
            <button id="btn-user-badge" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
              <img src="${isAuthenticated ? `https://ui-avatars.com/api/?name=${encodeURIComponent('User')}&background=2298da&color=fff&bold=true` : `https://ui-avatars.com/api/?name=G&background=ccc&color=fff&bold=true`}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
              <span class="truncate max-w-[100px]">User</span>
              <span class="w-px h-4 bg-slate-300"></span>
              <span class="text-xs font-bold ${currentTier === 'free' ? 'text-slate-400' : 'text-primary'} uppercase tracking-tight">${currentTier === 'free' ? 'Free' : 'Pro'}</span>
            </button>
          </div>
        </header>

        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style="color: var(--fm-text);">Pricing <span class="text-primary font-cursive underline underline-offset-4 decoration-primary/30">status</span></h1>
          <p class="text-lg max-w-2xl mx-auto" style="color: var(--fm-text-secondary);">Plan display is live, but billing is not wired to a payment processor in this release pass yet.</p>
        </div>

        <div class="max-w-4xl mx-auto mb-10 rounded-3xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-amber-900">
          <div class="font-bold uppercase tracking-[0.14em] text-[11px] mb-2">Deferred</div>
          <p>Billing actions are disabled until checkout, subscription state, and account syncing are implemented end to end.</p>
          <p class="mt-3">Current blockers: payment provider integration, webhook-backed plan updates, and account-linked subscription persistence.</p>
        </div>

        <div class="grid grid-cols-1 ${currentTier === 'free' ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl'} gap-6 lg:gap-8 mx-auto mb-16">
          ${currentTier === 'free' ? `
          <div class="rounded-3xl p-8 flex flex-col bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
            <div class="mb-6">
              <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-slate-100 text-slate-500 border border-slate-200">Free</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$0</h2>
              <p class="text-xs font-medium text-slate-500">Current public tier</p>
            </div>
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('Form parsing access', true)}
              ${renderFeature('Standard AI processing', true)}
              ${renderFeature('Local and account-backed history', true)}
              ${renderFeature('Paid billing workflow', false)}
              ${renderFeature('Subscription management', false)}
            </ul>
            <button class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press bg-slate-100 text-slate-400 cursor-not-allowed" disabled>
              Current Plan
            </button>
          </div>
          ` : ''}

          <div class="rounded-3xl p-8 flex flex-col relative ${currentTier === 'free' ? 'transform md:-translate-y-4 shadow-xl shadow-primary/10' : 'shadow-sm'} bg-white border-2 ${currentTier === 'weekly' ? 'border-primary' : (currentTier === 'monthly' ? 'border-slate-200 opacity-60' : 'border-primary')} overflow-hidden group">
            <div class="absolute top-0 right-0 p-4">
              <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">Deferred</span>
            </div>
            <div class="mb-6">
              <span class="inline-block text-[10px] font-black uppercase tracking-widest mb-4 text-primary">Pro Weekly</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$3 <span class="text-sm font-medium text-slate-400">/ week</span></h2>
              <p class="text-xs font-medium text-slate-500">Displayed for planning only</p>
            </div>
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('Unlimited forms', true)}
              ${renderFeature('Advanced AI models', true)}
              ${renderFeature('Full vault access', true)}
              ${renderFeature('Real checkout flow', false)}
              ${renderFeature('Webhook-backed entitlement sync', false)}
            </ul>
            <button id="btn-upgrade-weekly" class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press bg-slate-100 text-slate-400 cursor-not-allowed" disabled>
              ${currentTier === 'weekly' ? 'Current Plan' : 'Billing Not Enabled'}
            </button>
          </div>

          <div class="rounded-3xl p-8 flex flex-col bg-white border-2 ${currentTier === 'monthly' ? 'border-primary shadow-xl shadow-primary/10 transform md:-translate-y-4' : 'border-slate-200 shadow-sm'} relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4">
              <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">Deferred</span>
            </div>
            <div class="mb-6">
              <span class="inline-block text-[10px] font-black uppercase tracking-widest mb-4 text-primary">Pro Monthly</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$9 <span class="text-sm font-medium text-slate-400">/ month</span></h2>
              <p class="text-xs font-medium text-slate-500">Displayed for planning only</p>
            </div>
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('Everything in Weekly Pro', true)}
              ${renderFeature('Lower monthly cost', true)}
              ${renderFeature('Unlimited vault storage', true)}
              ${renderFeature('Real checkout flow', false)}
              ${renderFeature('Account-linked subscription lifecycle', false)}
            </ul>
            <button id="btn-upgrade-monthly" class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press bg-slate-100 text-slate-400 cursor-not-allowed" disabled>
              ${currentTier === 'monthly' ? 'Current Plan' : 'Billing Not Enabled'}
            </button>
          </div>
        </div>

        <div class="text-center space-y-4">
          <p class="text-sm" style="color: var(--fm-text-tertiary);">
            Have questions?
            <button type="button" id="btn-pricing-help" class="font-semibold hover:underline bg-transparent border-0 p-0" style="color: var(--fm-primary);">Visit our Help Center</button>
          </p>
          ${currentTier !== 'free' ? `
            <button id="btn-cancel-membership" class="text-xs text-slate-400 underline transition-colors cursor-not-allowed block mx-auto" disabled>Cancellation Flow Deferred</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  function renderFeature(text, included) {
    return `
      <li class="flex items-center gap-3 ${!included ? 'opacity-40' : ''}">
        <span class="material-symbols-outlined text-[18px] ${included ? 'text-primary' : 'text-slate-300'}">
          ${included ? 'check_circle' : 'cancel'}
        </span>
        <span class="text-sm font-medium ${included ? 'text-slate-700' : 'text-slate-400'}">
          ${text}
        </span>
      </li>
    `;
  }

  function init(wrapper) {
    wrapper.querySelector('#btn-back')?.addEventListener('click', () => goBack());
    wrapper.querySelector('#btn-pricing-help')?.addEventListener('click', () => navigateTo('docs'));
    wrapper.querySelector('#btn-user-badge')?.addEventListener('click', () => openAccountModal('profile'));
  }

  return { html, init };
}
