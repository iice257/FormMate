// ═══════════════════════════════════════════
// FormMate — Onboarding Screen
// ═══════════════════════════════════════════
//
// Single-page onboarding that collects essential
// user context. Optional and skippable.
// ═══════════════════════════════════════════

import { setState, getState, updateProfile, updateVault } from '../state.js';
import { navigateTo } from '../router.js';
import { setOnboardingComplete } from '../storage/local-store.js';
import { toast } from '../components/toast.js';

export function onboardingScreen() {
  const html = `
    <div class="relative flex min-h-screen items-center justify-center bg-mesh px-6 py-12">
      <div class="w-full max-w-[560px]">

        <!-- Header -->
        <div class="text-center mb-10">
          <div class="mb-4">
            <span class="material-symbols-outlined text-5xl" style="color: var(--fm-primary);">waving_hand</span>
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Welcome to FormMate</h1>
          <p class="text-sm" style="color: var(--fm-text-tertiary);">Tell us a bit about yourself so we can personalize your experience. This is optional.</p>
        </div>

        <!-- Onboarding Card -->
        <div class="rounded-[var(--fm-card-radius)] p-8 space-y-6 animate-slide-up" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border); box-shadow: var(--fm-shadow-xl);">

          <!-- Name -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Your Name</label>
            <input id="ob-name" type="text" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="e.g. Alexander Johnson" />
          </div>

          <!-- Email -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Primary Email</label>
            <input id="ob-email" type="email" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="you@example.com" />
          </div>

          <!-- Two-column row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Occupation</label>
              <input id="ob-occupation" type="text" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="e.g. Product Designer" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Experience</label>
              <select id="ob-experience" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);">
                <option value="">Select...</option>
                <option value="student">Student</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
          </div>

          <!-- Phone -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Phone Number <span style="color: var(--fm-text-tertiary);">(optional)</span></label>
            <input id="ob-phone" type="tel" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="+1 (555) 000-0000" />
          </div>

          <!-- Preferred Tone -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wider mb-2 block" style="color: var(--fm-text-secondary);">Preferred Writing Tone</label>
            <div class="grid grid-cols-3 gap-2" id="tone-options">
              ${['professional', 'friendly', 'concise', 'creative', 'formal', 'casual'].map(tone => `
                <button class="tone-btn h-10 rounded-xl text-xs font-semibold capitalize transition-all btn-press" 
                        data-tone="${tone}"
                        style="border: 1px solid var(--fm-border); color: var(--fm-text-secondary);">
                  ${tone}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Common Info -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Anything else we should know? <span style="color: var(--fm-text-tertiary);">(optional)</span></label>
            <textarea id="ob-bio" class="w-full min-h-[80px] px-4 py-3 rounded-xl text-sm resize-none" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="e.g. I frequently apply for design roles, I'm based in San Francisco..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3 pt-2">
            <button id="btn-complete" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
              Save & Continue
              <span class="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            <button id="btn-skip" class="w-full h-10 rounded-xl text-xs font-semibold transition-colors" style="color: var(--fm-text-tertiary);">
              Skip for now
            </button>
          </div>
        </div>

        <!-- Progress dots -->
        <div class="flex items-center justify-center gap-2 mt-6">
          <div class="size-2 rounded-full" style="background: var(--fm-primary);"></div>
          <div class="size-2 rounded-full" style="background: var(--fm-border);"></div>
          <div class="size-2 rounded-full" style="background: var(--fm-border);"></div>
        </div>
      </div>
    </div>
  `;

  function init(wrapper) {
    let selectedTone = 'professional';

    // Pre-fill from auth user
    const { authUser } = getState();
    if (authUser?.name) {
      wrapper.querySelector('#ob-name').value = authUser.name;
    }
    if (authUser?.email) {
      const em = wrapper.querySelector('#ob-email');
      em.value = authUser.email;
      em.readOnly = true;
      em.style.opacity = '0.6';
      em.style.cursor = 'not-allowed';
    }

    // Tone selection
    const toneButtons = wrapper.querySelectorAll('.tone-btn');
    // Set default
    toneButtons.forEach(btn => {
      if (btn.dataset.tone === selectedTone) {
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.color = 'var(--fm-primary)';
      }
    });

    toneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTone = btn.dataset.tone;

        // Deselect all
        toneButtons.forEach(b => {
          b.style.background = '';
          b.style.borderColor = 'var(--fm-border)';
          b.style.color = 'var(--fm-text-secondary)';
        });

        // Select this one
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.color = 'var(--fm-primary)';
      });
    });

    // Save & Continue
    wrapper.querySelector('#btn-complete').addEventListener('click', () => {
      const name = wrapper.querySelector('#ob-name').value.trim();
      const email = wrapper.querySelector('#ob-email').value.trim();
      const occupation = wrapper.querySelector('#ob-occupation').value.trim();
      const experience = wrapper.querySelector('#ob-experience').value;
      const phone = wrapper.querySelector('#ob-phone').value.trim();
      const bio = wrapper.querySelector('#ob-bio').value.trim();

      // Update profile
      updateProfile({
        name: name || getState().userProfile.name,
        email: email || getState().userProfile.email,
        occupation,
        experience,
        phone,
        bio,
        preferredTone: selectedTone,
      });

      // Update vault with common info
      if (name) updateVault('Full Name', name);
      if (email) updateVault('Email Address', email);
      if (phone) updateVault('Phone Number', phone);

      // Update settings
      const settings = { ...getState().settings };
      settings.personalization.defaultTone = selectedTone;
      setState({ settings, personality: selectedTone });

      // Mark onboarding complete
      setOnboardingComplete(true);
      setState({ onboardingComplete: true });

      toast.success('Profile saved! You\'re all set.');
      navigateTo('landing');
    });

    // Skip
    wrapper.querySelector('#btn-skip').addEventListener('click', () => {
      setOnboardingComplete(true);
      setState({ onboardingComplete: true });
      navigateTo('landing');
    });
  }

  return { html, init };
}
