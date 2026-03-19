// ═══════════════════════════════════════════
// FormMate — Pricing / Subscription Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state.js';
import { navigateTo, goBack } from '../router.js';
import { save } from '../storage/local-store.js';
import { toast } from '../components/toast.js';

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
        
        <div class="text-center mb-16">
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style="color: var(--fm-text);">${currentTier === 'free' ? 'Upgrade your' : 'Manage your'} <span class="text-primary font-cursive underline underline-offset-4 decoration-primary/30">workflow</span></h1>
          <p class="text-lg max-w-xl mx-auto" style="color: var(--fm-text-secondary);">Get unlimited form processing, access to advanced AI models, and priority support.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid grid-cols-1 ${currentTier === 'free' ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl'} gap-6 lg:gap-8 mx-auto mb-16">
          
          <!-- Free Tier -->
          ${currentTier === 'free' ? `
          <div class="rounded-3xl p-8 flex flex-col bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
            <div class="mb-6">
              <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-slate-100 text-slate-500 border border-slate-200">Free</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$0</h2>
              <p class="text-xs font-medium text-slate-500">Basic form filling usage</p>
            </div>
            
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('5 forms per month', true)}
              ${renderFeature('Standard AI processing', true)}
              ${renderFeature('Basic Vault (5 items)', true)}
              ${renderFeature('No Voice analysis', false)}
              ${renderFeature('Priority model access', false)}
            </ul>
            
            <button id="btn-upgrade-free" class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press bg-slate-100 text-slate-400 cursor-not-allowed" disabled>
              Current Plan
            </button>
          </div>
          ` : ''}

          <!-- Weekly Pro -->
          <div class="rounded-3xl p-8 flex flex-col relative ${currentTier === 'free' ? 'transform md:-translate-y-4 shadow-xl shadow-primary/10' : 'shadow-sm'} bg-white border-2 ${currentTier === 'weekly' ? 'border-primary' : (currentTier === 'monthly' ? 'border-slate-200 opacity-60' : 'border-primary')} overflow-hidden group">
            <div class="absolute top-0 right-0 p-4">
              <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">Popular</span>
            </div>
            
            <div class="mb-6">
              <span class="inline-block text-[10px] font-black uppercase tracking-widest mb-4 text-primary">Pro Weekly</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$3 <span class="text-sm font-medium text-slate-400">/ week</span></h2>
              <p class="text-xs font-medium text-slate-500">Perfect for one-off projects</p>
            </div>
            
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('Unlimited forms', true)}
              ${renderFeature('Advanced AI models', true)}
              ${renderFeature('Full Vault access', true)}
              ${renderFeature('Voice analysis', true)}
              ${renderFeature('Priority support', true)}
            </ul>
            
            <button id="btn-upgrade-weekly" class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press ${currentTier === 'weekly' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (currentTier === 'monthly' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'text-white bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:scale-[1.02]')}"
                    ${currentTier === 'weekly' ? 'disabled' : ''}>
              ${!isAuthenticated ? 'Sign in to Subscribe' : (currentTier === 'weekly' ? 'Current Plan' : (currentTier === 'monthly' ? 'Downgrade to Weekly' : 'Upgrade to Weekly'))}
            </button>
          </div>

          <!-- Monthly Pro -->
          <div class="rounded-3xl p-8 flex flex-col bg-white border-2 ${currentTier === 'monthly' ? 'border-primary shadow-xl shadow-primary/10 transform md:-translate-y-4' : 'border-slate-200 shadow-sm'} relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4">
              <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">Best Value</span>
            </div>

            <div class="mb-6">
              <span class="inline-block text-[10px] font-black uppercase tracking-widest mb-4 text-primary">Pro Monthly</span>
              <h2 class="text-4xl font-black text-slate-900 mb-1">$9 <span class="text-sm font-medium text-slate-400">/ month</span></h2>
              <p class="text-xs font-medium text-slate-500">For serious professionals</p>
            </div>
            
            <ul class="space-y-3.5 mb-8 flex-1">
              ${renderFeature('Everything in Weekly Pro', true)}
              ${renderFeature('25% savings vs weekly', true)}
              ${renderFeature('Unlimited Vault storage', true)}
              ${renderFeature('Early access features', true)}
              ${renderFeature('Priority processing queue', true)}
            </ul>
            
            <button id="btn-upgrade-monthly" class="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all btn-press ${currentTier === 'monthly' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (currentTier === 'weekly' ? 'text-white bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:scale-[1.02]' : 'border-2 border-primary/40 hover:bg-primary/5 text-primary')}"
                    ${currentTier === 'monthly' ? 'disabled' : ''}>
               ${!isAuthenticated ? 'Sign in to Subscribe' : (currentTier === 'monthly' ? 'Current Plan' : 'Upgrade to Monthly')}
            </button>
          </div>

        </div>
        
        <!-- FAQ & Cancel -->
        <div class="text-center space-y-4">
          <p class="text-sm" style="color: var(--fm-text-tertiary);">
            Have questions?
            <button type="button" id="btn-pricing-help" class="font-semibold hover:underline bg-transparent border-0 p-0" style="color: var(--fm-primary);">Visit our Help Center</button>
          </p>
          ${currentTier !== 'free' ? `
            <button id="btn-cancel-membership" class="text-xs text-slate-400 hover:text-slate-600 underline transition-colors cursor-pointer block mx-auto">Cancel Subscription</button>
          ` : ''}
        </div>

      </div>

      <!-- Feedback Modal -->
      <div id="cancellation-modal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
          <button id="close-modal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <span class="material-symbols-outlined">close</span>
          </button>
          
          <h3 class="text-2xl font-black text-slate-900 mb-2" id="modal-title">Wait, don't go!</h3>
          <p class="text-sm text-slate-500 mb-6" id="modal-desc">We're sorry to see you go. Could you tell us why you're cancelling so we can improve?</p>
          
          <div class="space-y-4">
            <label class="block">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Reason for leaving</span>
              <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 transition-all cursor-pointer bg-slate-50/50">
                  <input type="checkbox" name="reason" value="expensive" class="accent-primary" aria-label="Too expensive" />
                  <span class="text-sm text-slate-600">Too expensive</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 transition-all cursor-pointer bg-slate-50/50">
                  <input type="checkbox" name="reason" value="not-useful" class="accent-primary" aria-label="Not useful for me" />
                  <span class="text-sm text-slate-600">Not useful for me</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 transition-all cursor-pointer bg-slate-50/50">
                  <input type="checkbox" name="reason" value="buggy" class="accent-primary" aria-label="Encountered bugs" />
                  <span class="text-sm text-slate-600">Encountered bugs</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 transition-all cursor-pointer bg-slate-50/50">
                  <input type="checkbox" name="reason" value="other" class="accent-primary" aria-label="Other" />
                  <span class="text-sm text-slate-600">Other</span>
                </label>
              </div>
            </label>
            
            <label class="block">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Tell us more</span>
              <textarea id="feedback-text" class="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" rows="4" placeholder="What can we do to improve?"></textarea>
            </label>
            
            <div class="flex gap-3 mt-8">
              <button id="btn-keep-plan" class="flex-1 h-12 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all">Keep My Plan</button>
              <button id="btn-confirm-cancel" class="flex-1 h-12 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all">Confirm Action</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  function renderFeature(text, included, style = 'default') {
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
    wrapper.querySelector('#btn-back').addEventListener('click', () => goBack());
    wrapper.querySelector('#btn-pricing-help')?.addEventListener('click', () => navigateTo('docs'));

    const handleUpgrade = (tier) => {
      if (!isAuthenticated) {
        toast.info('Please sign in to subscribe.');
        navigateTo('auth');
        return;
      }

      const btnId = `#btn-upgrade-${tier}`;
      const btn = wrapper.querySelector(btnId);
      if (!btn || btn.disabled) return;

      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">sync</span>';
      btn.disabled = true;

      setTimeout(() => {
        setState({ tier });
        save('subscription_tier', tier);
        toast.success(`Successfully changed plan to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
        navigateTo('workspace');
      }, 1200);
    };

    wrapper.querySelector('#btn-upgrade-weekly')?.addEventListener('click', () => {
      if (currentTier === 'monthly') {
        openFeedbackModal('downgrade');
      } else {
        handleUpgrade('weekly');
      }
    });

    wrapper.querySelector('#btn-upgrade-monthly')?.addEventListener('click', () => handleUpgrade('monthly'));

    // Modal Logic
    const modal = wrapper.querySelector('#cancellation-modal');
    const modalTitle = wrapper.querySelector('#modal-title');
    const modalDesc = wrapper.querySelector('#modal-desc');
    const feedbackText = wrapper.querySelector('#feedback-text');
    let modalMode = 'cancel'; // 'cancel' or 'downgrade'

    const openFeedbackModal = (mode) => {
      modalMode = mode;
      if (mode === 'downgrade') {
        modalTitle.textContent = 'Switching plans?';
        modalDesc.textContent = 'Could you tell us why you\'re downgrading to weekly? Your feedback helps us build a better monthly experience.';
      } else {
        modalTitle.textContent = 'Wait, don\'t go!';
        modalDesc.textContent = 'We\'re sorry to see you go. Could you tell us why you\'re cancelling so we can improve?';
      }
      modal.classList.remove('hidden');
    };

    wrapper.querySelector('#btn-cancel-membership')?.addEventListener('click', () => openFeedbackModal('cancel'));
    wrapper.querySelector('#close-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
    wrapper.querySelector('#btn-keep-plan')?.addEventListener('click', () => modal.classList.add('hidden'));

    wrapper.querySelector('#btn-confirm-cancel')?.addEventListener('click', () => {
      const feedback = feedbackText.value.trim();
      const reasons = Array.from(wrapper.querySelectorAll('input[name="reason"]:checked')).map(i => i.value);

      console.log(`[SUBSCRIPTION FEEDBACK] Mode: ${modalMode}, Reasons: ${reasons}, Text: ${feedback}`);

      const nextTier = modalMode === 'cancel' ? 'free' : 'weekly';

      setState({ tier: nextTier });
      save('subscription_tier', nextTier);

      toast.success(modalMode === 'cancel' ? 'Subscription cancelled.' : 'Plan changed to Weekly.');
      modal.classList.add('hidden');
      navigateTo('workspace');
    });
  }

  return { html, init };
}
