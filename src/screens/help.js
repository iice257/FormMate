// ═══════════════════════════════════════════
// FormMate — Help Center
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { navigateTo, goBack } from '../router.js';
import { renderAccordion, renderModal, showModal } from '../components/ui-components.js';
import { toast } from '../components/toast.js';

export function helpScreen() {
  const faqs = [
    { title: 'How does FormMate work?', content: 'FormMate uses advanced AI models to read form structure, understand the context of each question, and generate appropriate answers based on your profile and past history.' },
    { title: 'Is my data secure?', content: 'Yes. Your personal vault data, history, and profile information are stored entirely on your device (in localStorage). We do not store your private data on our servers.' },
    { title: 'Why did the AI answer a question wrong?', content: 'AI generation is probabilistic. If an answer seems incorrect, you can click "Regenerate" to get a new variant, or manually edit the text. FormMate learns from your edits to get better over time.' },
    { title: 'What is the "Vault"?', content: 'The Vault is a secure storage area in your Accounts Center where you can save frequently used information (like your resume, bio, or addresses). FormMate uses this data to instantly auto-fill identical personal questions without needing to generate them from scratch.' },
    { title: 'How do I change the Groq API key?', content: 'You can update your Groq API key by going to the main Dashboard (Landing page) and clicking the gear icon in the top right to open the setup modal.' }
  ];

  const html = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 border-r flex-col shrink-0 hidden lg:flex" style="border-color: var(--fm-border); background: var(--fm-bg-elevated);">
        <div class="p-6 flex items-center gap-3">
          <div class="size-8 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
          </div>
          <h1 class="text-xl font-black tracking-tighter" style="color: var(--fm-text);">Form<span class="text-primary">Mate</span></h1>
        </div>
        <nav id="help-nav" class="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('landing')">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('accounts')">
            <span class="material-symbols-outlined">person</span> Account
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('settings')">
            <span class="material-symbols-outlined">settings</span> Settings
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer" style="background: var(--fm-primary-50); color: var(--fm-primary);">
            <span class="material-symbols-outlined">help_outline</span> Help
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
            <h2 class="text-lg font-bold" style="color: var(--fm-text);">Help & Support</h2>
          </div>
        </header>

        <div class="max-w-3xl mx-auto p-8 space-y-8">
          
          <!-- Hero Banner -->
          <div class="p-8 rounded-[var(--fm-card-radius)] relative overflow-hidden" style="background: var(--fm-gradient-primary);">
            <div class="relative z-10 text-white">
              <h2 class="text-2xl font-bold mb-2">How can we help?</h2>
              <p class="text-white/80 text-sm max-w-sm">Search our FAQs, check keyboard shortcuts, or contact support directly.</p>
              
              <div class="mt-6 flex gap-3">
                <button id="btn-shortcuts" class="h-10 px-5 rounded-xl text-sm font-bold bg-white text-[var(--fm-primary)] btn-press flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">keyboard</span> Keyboard Shortcuts
                </button>
                <button id="btn-contact" class="h-10 px-5 rounded-xl text-sm font-bold text-white btn-press flex items-center gap-2" style="background: rgba(255,255,255,0.2);">
                  <span class="material-symbols-outlined text-sm">mail</span> Contact Us
                </button>
              </div>
            </div>
            
            <!-- Decor -->
            <div class="absolute -right-12 -bottom-12 size-48 rounded-full border-[24px] border-white/10 hidden md:block"></div>
            <span class="material-symbols-outlined absolute right-12 top-1/2 -translate-y-1/2 text-[120px] text-white/5 rotate-12 hidden md:block">support_agent</span>
          </div>

          <!-- FAQ Section -->
          <div>
            <h3 class="text-xl font-bold mb-4" style="color: var(--fm-text);">Frequently Asked Questions</h3>
            <div id="faq-container">
              ${renderAccordion(faqs)}
            </div>
          </div>

          <!-- Version Info -->
          <div class="flex items-center justify-between p-4 rounded-xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg flex items-center justify-center" style="background: var(--fm-primary-50); color: var(--fm-primary);">
                <span class="material-symbols-outlined text-xl">new_releases</span>
              </div>
              <div>
                <p class="text-sm font-bold" style="color: var(--fm-text);">FormMate v2.0 (Expansion Update)</p>
                <p class="text-xs" style="color: var(--fm-text-tertiary);">Up to date</p>
              </div>
            </div>
            <button id="btn-changelog" class="text-xs font-semibold hover:underline" style="color: var(--fm-primary);">View Changelog</button>
          </div>

        </div>
      </main>

      <!-- Support Modal -->
      ${renderModal('contact-modal', {
    title: 'Contact Support',
    content: `
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Subject</label>
              <input id="support-subject" type="text" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="Brief description of the issue" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Message</label>
              <textarea id="support-message" class="w-full min-h-[120px] px-4 py-3 rounded-xl text-sm resize-none" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" placeholder="How can we help you?"></textarea>
            </div>
            <button id="btn-submit-support" class="w-full h-11 rounded-xl text-sm font-bold text-white btn-press mt-2" style="background: var(--fm-gradient-primary);">Send Message</button>
          </div>
        `
  })}

      <!-- Changelog Modal -->
      ${renderModal('changelog-modal', {
    title: 'Changelog',
    content: `
          <div class="space-y-6">
            <div class="relative pl-6 border-l-2" style="border-color: var(--fm-primary);">
              <div class="absolute w-3 h-3 rounded-full top-1 -left-[7px]" style="background: var(--fm-primary);"></div>
              <p class="text-xs font-bold mb-1" style="color: var(--fm-primary);">v2.0 — Major Expansion</p>
              <ul class="text-sm space-y-1 list-disc list-inside" style="color: var(--fm-text-secondary);">
                <li>New persistent data layer with Accounts Center & Vault.</li>
                <li>Comprehensive settings module with AI personality adjustments.</li>
                <li>Advanced Chat Copilot with multi-turn memory.</li>
                <li>AI generation improvements with structured JSON.</li>
              </ul>
            </div>
            <div class="relative pl-6 border-l-2" style="border-color: var(--fm-border);">
              <div class="absolute w-3 h-3 rounded-full top-1 -left-[7px]" style="background: var(--fm-border);"></div>
              <p class="text-xs font-bold mb-1" style="color: var(--fm-text-secondary);">v1.0 — Initial Release</p>
              <ul class="text-sm space-y-1 list-disc list-inside" style="color: var(--fm-text-tertiary);">
                <li>Core form parsing engine.</li>
                <li>Basic AI generation via Groq.</li>
                <li>Voice-to-text input via Whisper.</li>
              </ul>
            </div>
          </div>
        `
  })}
    </div>
  `;

  function init(wrapper) {
    window.__fmNav = (screen) => navigateTo(screen);
    wrapper.querySelector('#btn-back').addEventListener('click', () => goBack());

    // Init components
    import('../components/ui-components.js').then(ui => {
      ui.initAccordion(wrapper);
      ui.initModals(wrapper);
    });

    // Support Flow
    wrapper.querySelector('#btn-contact').addEventListener('click', () => {
      showModal('contact-modal');
    });

    wrapper.querySelector('#btn-submit-support').addEventListener('click', () => {
      const subj = wrapper.querySelector('#support-subject').value.trim();
      const msg = wrapper.querySelector('#support-message').value.trim();

      if (!subj || !msg) {
        toast.error('Please fill in both subject and message fields.');
        return;
      }

      // Simulate submission
      setTimeout(() => {
        toast.success('Message sent! We will get back to you soon.');
        wrapper.querySelector('#support-subject').value = '';
        wrapper.querySelector('#support-message').value = '';
        import('../components/ui-components.js').then(ui => ui.hideModal('contact-modal'));
      }, 600);
    });

    // Shortcuts
    wrapper.querySelector('#btn-shortcuts').addEventListener('click', () => {
      navigateTo('settings');
      setTimeout(() => {
        const item = document.querySelector('[data-section="shortcuts"]');
        if (item) item.click();
      }, 50);
    });

    // Changelog
    wrapper.querySelector('#btn-changelog').addEventListener('click', () => {
      showModal('changelog-modal');
    });

    return () => { delete window.__fmNav; };
  }

  return { html, init };
}
