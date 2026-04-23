// @ts-nocheck
import { getDashboardActionScreenForUser, goBack, navigateTo } from '../router';
import { getState } from '../state';

function renderLegalTabs(active) {
  const tabs = [
    { id: 'docs', label: 'Docs', route: 'docs' },
    { id: 'privacy', label: 'Privacy Policy', route: 'privacy' },
    { id: 'terms', label: 'Terms of Service', route: 'terms' },
  ];

  return `
    <div class="flex flex-wrap items-center justify-center gap-2 mb-10">
      ${tabs.map((tab) => `
        <button
          type="button"
          class="px-4 py-2 rounded-full text-xs font-bold transition-all border ${active === tab.id
            ? 'bg-primary text-white border-primary shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary'}"
          data-legal-nav="${tab.route}"
        >
          ${tab.label}
        </button>
      `).join('')}
    </div>
  `;
}

function renderLegalShell({ title, subtitle, bodyHtml, activeTab }) {
  const authed = getState().isAuthenticated;
  const dashboardLabel = authed ? 'Go to Dashboard' : 'Sign In';

  return `
    <div class="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <header class="docs-topbar h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 z-30">
        <div class="flex-1 flex justify-start">
          <button type="button" class="docs-home-button bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press" id="btn-home">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
        </div>

        <div class="flex-1 flex justify-center items-center gap-3 md:gap-4 min-w-0">
          <span class="font-black text-base md:text-lg tracking-tighter text-slate-900 whitespace-nowrap">Form<span class="text-primary">Mate</span> Legal</span>
        </div>

        <div class="flex-1 flex items-center justify-end gap-3 md:gap-4 text-sm font-semibold">
          <button class="docs-dashboard-button bg-primary text-white px-4 py-2 rounded-xl hover:brightness-110 transition-colors shadow-sm btn-press" id="btn-dashboard">${dashboardLabel}</button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-white">
        <div class="max-w-3xl mx-auto px-6 lg:px-12 py-12 pb-24">
          ${renderLegalTabs(activeTab)}
          <div class="mb-10 text-center">
            <h1 class="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">${title}</h1>
            <p class="text-base lg:text-lg text-slate-500 max-w-2xl mx-auto">${subtitle}</p>
          </div>

          <article class="space-y-8 text-sm leading-7 text-slate-600">
            ${bodyHtml}
          </article>
        </div>
      </main>
    </div>
  `;
}

export function privacyScreen() {
  const html = renderLegalShell({
    activeTab: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How FormMate handles account data, form context, AI processing, and session storage.',
    bodyHtml: `
      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Overview</h2>
        <p>FormMate helps users review and complete online forms. To do that, FormMate may process account profile details, vault data, form structure, screenshots you choose to upload, and the prompts you send to FormMate features.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">What we collect</h2>
        <p>We may collect account details such as your name, email address, profile settings, vault entries, and form history. We also process the messages, screenshots, and form context you explicitly provide while using FormMate.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">How we use data</h2>
        <p>We use your data to authenticate your account, sync supported account data, generate form answers, improve autofill relevance within your session, and operate the product safely and reliably.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">AI processing</h2>
        <p>When you use FormMate AI features, relevant prompts, form context, and optional attachments may be sent to third-party AI providers to generate responses. Do not provide unnecessary highly sensitive data. AI access requires sign-in.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Storage and retention</h2>
        <p>Supported account data such as profile, settings, vault, and form history may be stored in Supabase when cloud services are available. Sensitive browser-side caches are session-scoped and are cleared on sign-out or session expiry where supported.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Your choices</h2>
        <p>You can review, update, or delete supported account data from within FormMate. You can also sign out at any time. If you do not want AI processing, do not use FormMate AI chat, parser, or answer-generation features.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Contact</h2>
        <p>If you have privacy questions, use the contact section in Docs or reach out through FormMate support channels.</p>
      </section>
    `,
  });

  function init(wrapper) {
    wrapper.querySelector('#btn-home')?.addEventListener('click', () => goBack());
    wrapper.querySelector('#btn-dashboard')?.addEventListener('click', () => navigateTo(getDashboardActionScreenForUser()));
    wrapper.querySelectorAll('[data-legal-nav]').forEach((button) => {
      button.addEventListener('click', () => navigateTo(button.dataset.legalNav));
    });
  }

  return { html, init };
}

export function termsScreen() {
  const html = renderLegalShell({
    activeTab: 'terms',
    title: 'Terms of Service',
    subtitle: 'Simple operating terms for access to FormMate while the product remains in active development.',
    bodyHtml: `
      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Using FormMate</h2>
        <p>FormMate is provided to help users analyze forms, generate draft answers, and manage reusable account information. You are responsible for reviewing all generated outputs before submission.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Account responsibility</h2>
        <p>You are responsible for activity that occurs through your account and for keeping your sign-in credentials secure. AI features and example launches require sign-in.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Acceptable use</h2>
        <p>You may not use FormMate to abuse third-party services, bypass restrictions unlawfully, submit deceptive information, or use the product for unrelated general-purpose inference at scale.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Generated output</h2>
        <p>FormMate may generate imperfect or incomplete content. You remain responsible for confirming the accuracy, legality, and suitability of anything you submit using FormMate.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Availability</h2>
        <p>FormMate is offered on an evolving basis. Features may change, be limited, or be unavailable from time to time, especially where external AI, auth, parsing, or storage providers are involved.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Limitation</h2>
        <p>FormMate is provided as-is to the extent permitted by law. We do not guarantee uninterrupted availability, universal parser coverage, or perfect output accuracy.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold text-slate-900 mb-3">Contact</h2>
        <p>Questions about these terms can be directed through the support and contact paths available inside FormMate Docs.</p>
      </section>
    `,
  });

  function init(wrapper) {
    wrapper.querySelector('#btn-home')?.addEventListener('click', () => goBack());
    wrapper.querySelector('#btn-dashboard')?.addEventListener('click', () => navigateTo(getDashboardActionScreenForUser()));
    wrapper.querySelectorAll('[data-legal-nav]').forEach((button) => {
      button.addEventListener('click', () => navigateTo(button.dataset.legalNav));
    });
  }

  return { html, init };
}
