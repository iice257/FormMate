// ═══════════════════════════════════════════
// FormMate — Pricing / Subscription Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state.js';
import { navigateTo } from '../router.js';
import { save } from '../storage/local-store.js';
import { toast } from '../components/toast.js';

export function pricingScreen() {
  const currentTier = getState().tier || 'free';

  const html = `
    <div class="min-h-screen bg-mesh py-12 px-6">
      <div class="max-w-6xl mx-auto">
        
        <!-- Header -->
        <div class="text-center mb-16 relative">
          <button id="btn-back" class="absolute left-0 top-0 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold hover:bg-black/5" style="color: var(--fm-text-secondary);">
            <span class="material-symbols-outlined">arrow_back</span> Back
          </button>
          
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style="color: var(--fm-text);">Upgrade your workflow</h1>
          <p class="text-lg max-w-xl mx-auto" style="color: var(--fm-text-secondary);">Get unlimited form processing, access to advanced AI models, and priority support.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
          
          <!-- Free Tier -->
          <div class="rounded-3xl p-8 flex flex-col" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
            <div class="mb-6">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style="background: var(--fm-bg-sunken); color: var(--fm-text-secondary);">Free</span>
              <h2 class="text-3xl font-bold mb-2" style="color: var(--fm-text);">$0 <span class="text-base font-normal text-slate-500">/mo</span></h2>
              <p class="text-sm" style="color: var(--fm-text-tertiary);">Perfect for occasional use</p>
            </div>
            
            <ul class="space-y-4 mb-8 flex-1">
              ${renderFeature('5 forms per month', true)}
              ${renderFeature('50 AI generation requests', true)}
              ${renderFeature('Core models (Llama 3, OSS)', true)}
              ${renderFeature('Personal Vault auto-fill', false)}
              ${renderFeature('Advanced Analytics', false)}
            </ul>
            
            <button class="w-full h-12 rounded-xl text-sm font-bold flex flex-center items-center justify-center transition-colors btn-press ${currentTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}" 
                    style="background: var(--fm-bg-sunken); color: var(--fm-text);" ${currentTier === 'free' ? 'disabled' : ''}>
              ${currentTier === 'free' ? 'Current Plan' : 'Downgrade to Free'}
            </button>
          </div>

          <!-- Pro Tier (Highlighted) -->
          <div class="rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4" style="background: var(--fm-bg-elevated); border: 2px solid var(--fm-primary); box-shadow: var(--fm-shadow-primary-lg);">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2">
              <span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white" style="background: var(--fm-gradient-primary); box-shadow: 0 4px 12px rgba(91,19,236,0.5);">Most Popular</span>
            </div>
            
            <div class="mb-6 mt-2">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style="background: var(--fm-primary-50); color: var(--fm-primary);">Pro</span>
              <h2 class="text-3xl font-bold mb-2" style="color: var(--fm-text);">$9 <span class="text-base font-normal text-slate-500">/mo</span></h2>
              <p class="text-sm" style="color: var(--fm-text-secondary);">For power users and professionals</p>
            </div>
            
            <ul class="space-y-4 mb-8 flex-1">
              ${renderFeature('Unlimited forms per month', true, 'primary')}
              ${renderFeature('Unlimited AI generation', true)}
              ${renderFeature('Premium models (Qwen 32B+, GPT)', true)}
              ${renderFeature('Personal Vault auto-fill', true)}
              ${renderFeature('Customizable AI personalities', true)}
              ${renderFeature('Analytics Dashboard', true)}
            </ul>
            
            <button id="btn-upgrade-pro" class="w-full h-12 rounded-xl text-sm font-bold text-white flex flex-center items-center justify-center transition-transform btn-press ${currentTier === 'pro' ? 'opacity-50 cursor-not-allowed' : ''}" 
                    style="background: var(--fm-gradient-primary);" ${currentTier === 'pro' ? 'disabled' : ''}>
              ${currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
          </div>

          <!-- Enterprise Tier -->
          <div class="rounded-3xl p-8 flex flex-col" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
            <div class="mb-6">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style="background: var(--fm-bg-sunken); color: var(--fm-text-secondary);">Enterprise</span>
              <h2 class="text-3xl font-bold mb-2" style="color: var(--fm-text);">Custom</h2>
              <p class="text-sm" style="color: var(--fm-text-tertiary);">For teams and high volume</p>
            </div>
            
            <ul class="space-y-4 mb-8 flex-1">
              ${renderFeature('Everything in Pro', true)}
              ${renderFeature('Shared team vaults', true)}
              ${renderFeature('Custom fine-tuned prompts', true)}
              ${renderFeature('Priority API routing', true)}
              ${renderFeature('Dedicated support channel', true)}
            </ul>
            
            <button class="w-full h-12 rounded-xl text-sm font-bold flex flex-center items-center justify-center transition-colors hover:bg-slate-50 btn-press" 
                    style="border: 1px solid var(--fm-border); color: var(--fm-text);">
              Contact Sales
            </button>
          </div>

        </div>
        
        <!-- FAQ -->
        <div class="text-center">
          <p class="text-sm" style="color: var(--fm-text-tertiary);">Have questions? <a href="#" onclick="window.__fmNav('help')" class="font-semibold hover:underline" style="color: var(--fm-primary);">Visit our Help Center</a></p>
        </div>

      </div>
    </div>
  `;

  function renderFeature(text, included, style = 'default') {
    if (!included) {
      return `
        <li class="flex items-start gap-3 opacity-50">
          <span class="material-symbols-outlined text-[18px] mt-0.5" style="color: var(--fm-text-tertiary);">close</span>
          <span class="text-sm font-medium" style="color: var(--fm-text-tertiary);">${text}</span>
        </li>
      `;
    }

    return `
      <li class="flex items-start gap-3">
        <span class="material-symbols-outlined text-[18px] mt-0.5" style="color: ${style === 'primary' ? 'var(--fm-primary)' : 'var(--fm-success)'};">check_circle</span>
        <span class="text-sm font-medium" style="color: var(--fm-text);">${text}</span>
      </li>
    `;
  }

  function init(wrapper) {
    window.__fmNav = (screen) => navigateTo(screen);
    wrapper.querySelector('#btn-back').addEventListener('click', () => navigateTo('landing'));

    // Simulated Upgrade flow
    const btnPro = wrapper.querySelector('#btn-upgrade-pro');
    if (btnPro && !btnPro.disabled) {
      btnPro.addEventListener('click', () => {
        btnPro.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">sync</span> Processing...';
        btnPro.style.opacity = '0.8';

        setTimeout(() => {
          setState({ tier: 'pro' });
          save('subscription_tier', 'pro');
          toast.success('Successfully upgraded to Pro!');
          navigateTo('landing');
        }, 1500);
      });
    }

    return () => { delete window.__fmNav; };
  }

  return { html, init };
}
