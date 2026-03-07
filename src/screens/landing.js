// ═══════════════════════════════════════════
// FormMate — Landing Screen
// ═══════════════════════════════════════════

import { setState, getState } from '../state.js';
import { navigateTo } from '../router.js';

export function landingScreen() {
  const html = `
    <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Navigation -->
        <header class="flex items-center justify-between border-b border-primary/10 px-6 py-4 md:px-20 lg:px-40 bg-white/50 backdrop-blur-md sticky top-0 z-50">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
              <span class="material-symbols-outlined text-2xl">dynamic_form</span>
            </div>
            <h2 class="text-slate-900 text-xl font-bold tracking-tight">FormMate</h2>
          </div>
          <div class="flex items-center gap-6">
            <nav class="hidden md:flex gap-8 text-sm font-medium text-slate-600">
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-how">How it works</a>
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-templates">Templates</a>
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-pricing">Pricing</a>
            </nav>
            <button class="flex items-center justify-center rounded-xl h-10 px-5 bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm btn-press" id="btn-settings">
              <span class="material-symbols-outlined text-lg mr-1">settings</span>
              <span>Settings</span>
            </button>
          </div>
        </header>

        <main class="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24">
          <!-- Hero Section -->
          <div class="max-w-[800px] w-full text-center space-y-8">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <span class="material-symbols-outlined text-sm">auto_awesome</span>
              Powered by Advanced AI
            </div>

            <h1 class="text-slate-900 text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              AI-assisted form companion
            </h1>

            <p class="text-slate-600 text-lg md:text-xl font-normal max-w-2xl mx-auto">
              Paste any URL to let FormMate analyze and help you fill out complex forms automatically, accurately, and instantly.
            </p>

            <!-- URL Input Container -->
            <div class="mt-12 w-full max-w-2xl mx-auto">
              <div class="bg-white p-2 rounded-2xl shadow-xl shadow-primary/5 border border-primary/10 flex flex-col md:flex-row gap-2">
                <div class="flex-1 relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">link</span>
                  <input
                    id="url-input"
                    class="w-full pl-12 pr-4 h-14 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 placeholder:text-slate-400 text-lg bg-transparent"
                    placeholder="https://example.com/form"
                    type="text"
                  />
                </div>
                <button id="btn-analyze" class="bg-primary text-white px-8 h-14 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group btn-press shadow-lg shadow-primary/25">
                  Analyze Form
                  <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>

              <p class="mt-4 text-slate-400 text-sm">
                Try: <span class="text-primary cursor-pointer hover:underline" data-demo="job-application">Job Application</span>,
                <span class="text-primary cursor-pointer hover:underline" data-demo="customer-feedback">Mortgage Form</span>, or
                <span class="text-primary cursor-pointer hover:underline" data-demo="travel-visa">Travel Visa</span>
              </p>
            </div>
          </div>

          <!-- Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[960px] w-full mt-24 stagger-children">
            <div class="p-6 rounded-2xl bg-white border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span class="material-symbols-outlined">description</span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 mb-2">Smart Analysis</h3>
              <p class="text-slate-600 text-sm leading-relaxed">Automatically detects field types, constraints, and required documents.</p>
            </div>

            <div class="p-6 rounded-2xl bg-white border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span class="material-symbols-outlined">security</span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 mb-2">Privacy First</h3>
              <p class="text-slate-600 text-sm leading-relaxed">Your data is encrypted and only used to fill the specific form you choose.</p>
            </div>

            <div class="p-6 rounded-2xl bg-white border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span class="material-symbols-outlined">bolt</span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 mb-2">Instant Completion</h3>
              <p class="text-slate-600 text-sm leading-relaxed">Complete lengthy multi-page forms in seconds rather than hours.</p>
            </div>
          </div>

          <!-- Recent Forms -->
          <div class="max-w-[960px] w-full mt-20 pb-20">
            <div class="flex items-center justify-between mb-6">
              <h4 class="text-slate-900 font-bold text-xl">Recent Analyses</h4>
              <button class="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                View all <span class="material-symbols-outlined text-xs">chevron_right</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center gap-4 p-4 bg-white/50 rounded-xl border border-primary/5 hover:bg-white transition-colors cursor-pointer group" data-demo="job-application">
                <div class="size-12 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">school</span>
                </div>
                <div class="flex-1">
                  <p class="text-slate-900 font-medium">Graduate Admission Form</p>
                  <p class="text-slate-400 text-xs">stanford.edu • 2 hours ago</p>
                </div>
                <span class="material-symbols-outlined text-slate-300">history</span>
              </div>

              <div class="flex items-center gap-4 p-4 bg-white/50 rounded-xl border border-primary/5 hover:bg-white transition-colors cursor-pointer group" data-demo="job-application">
                <div class="size-12 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">work</span>
                </div>
                <div class="flex-1">
                  <p class="text-slate-900 font-medium">Senior Product Designer Role</p>
                  <p class="text-slate-400 text-xs">lever.co • 1 day ago</p>
                </div>
                <span class="material-symbols-outlined text-slate-300">history</span>
              </div>
            </div>
          </div>
        </main>

        <!-- Footer -->
        <footer class="px-6 md:px-20 lg:px-40 py-10 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-2 text-slate-400">
            <span class="material-symbols-outlined text-lg">copyright</span>
            <span class="text-sm">2026 FormMate AI. All rights reserved.</span>
          </div>
          <div class="flex gap-8 text-sm text-slate-500 font-medium">
            <a class="hover:text-primary transition-colors cursor-pointer">Terms of Service</a>
            <a class="hover:text-primary transition-colors cursor-pointer">Privacy Policy</a>
            <a class="hover:text-primary transition-colors cursor-pointer">Contact Support</a>
          </div>
        </footer>

      </div>

      <!-- Settings Modal (hidden by default) -->
      <div id="settings-modal" class="fixed inset-0 z-[100] hidden">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" id="settings-overlay"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[85vh] overflow-y-auto no-scrollbar">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold">AI Configuration</h3>
            <button id="settings-close" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="space-y-5">
            <!-- Connection Status -->
            <div class="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span class="material-symbols-outlined text-emerald-600">check_circle</span>
              <div>
                <p class="text-sm font-bold text-emerald-700">Groq API Connected</p>
                <p class="text-xs text-emerald-600">Multi-model routing active</p>
              </div>
            </div>

            <!-- API Key -->
            <div>
              <label class="text-sm font-semibold text-slate-700 block mb-2">Groq API Key</label>
              <input
                id="api-key-input"
                type="password"
                class="w-full rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm py-3"
                placeholder="gsk_..."
              />
              <p class="text-xs text-slate-400 mt-1">Get a free key at <a href="https://console.groq.com" target="_blank" class="text-primary hover:underline">console.groq.com</a></p>
            </div>

            <!-- Model Routing Table -->
            <div>
              <label class="text-sm font-semibold text-slate-700 block mb-3">Model Routing</label>
              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span class="text-slate-600 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-amber-500">neurology</span> Heavy reasoning</span>
                  <span class="font-mono font-bold text-slate-800">gpt-oss-120b</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span class="text-slate-600 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-blue-500">edit_note</span> Answer generation</span>
                  <span class="font-mono font-bold text-slate-800">gpt-oss-20b</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span class="text-slate-600 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-purple-500">chat</span> Copilot chat</span>
                  <span class="font-mono font-bold text-slate-800">qwen-2.5-32b</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span class="text-slate-600 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-green-500">bolt</span> Quick edits</span>
                  <span class="font-mono font-bold text-slate-800">qwen-2.5-7b</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span class="text-slate-600 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-rose-500">mic</span> Voice input</span>
                  <span class="font-mono font-bold text-slate-800">whisper-large-v3</span>
                </div>
              </div>
            </div>

            <button id="settings-save" class="w-full bg-primary text-white rounded-xl py-3 font-bold hover:bg-primary/90 transition-colors btn-press">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  function init(wrapper) {
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');
    const btnSettings = wrapper.querySelector('#btn-settings');
    const settingsModal = wrapper.querySelector('#settings-modal');
    const settingsOverlay = wrapper.querySelector('#settings-overlay');
    const settingsClose = wrapper.querySelector('#settings-close');
    const settingsSave = wrapper.querySelector('#settings-save');
    const apiKeyInput = wrapper.querySelector('#api-key-input');

    // Restore saved state
    const state = getState();
    if (state.formUrl) urlInput.value = state.formUrl;
    apiKeyInput.value = state.groqApiKey || '';

    // Analyze button
    btnAnalyze.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        urlInput.focus();
        urlInput.classList.add('ring-2', 'ring-red-300');
        setTimeout(() => urlInput.classList.remove('ring-2', 'ring-red-300'), 1500);
        return;
      }
      setState({ formUrl: url });
      navigateTo('analyzing');
    });

    // Enter key on input
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAnalyze.click();
    });

    // Demo links
    wrapper.querySelectorAll('[data-demo]').forEach(el => {
      el.addEventListener('click', () => {
        const demoType = el.dataset.demo;
        const urls = {
          'job-application': 'https://lever.co/creativesync/senior-product-designer',
          'customer-feedback': 'https://forms.google.com/feedback-survey',
          'travel-visa': 'https://gov.travel/visa-application'
        };
        urlInput.value = urls[demoType] || urls['customer-feedback'];
        setState({ formUrl: urlInput.value });
        navigateTo('analyzing');
      });
    });

    // Settings modal
    btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    settingsOverlay.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsClose.addEventListener('click', () => settingsModal.classList.add('hidden'));

    settingsSave.addEventListener('click', () => {
      setState({ groqApiKey: apiKeyInput.value.trim() });
      settingsModal.classList.add('hidden');
    });
  }

  return { html, init };
}
