// ═══════════════════════════════════════════
// FormMate — New Form Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state.js';
import { navigateTo, goBack } from '../router.js';
import { parseFormUrl, detectFormPlatform } from '../parser/form-parser.js';
import { toast } from '../components/toast.js';
import { initAurora } from './Aurora.js';
import './Aurora.css';

export function newFormScreen() {
  const { isAuthenticated, userProfile, formUrl } = getState();

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${userProfile?.name?.split(' ')[0] || 'User'}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg btn-press" id="btn-login">Sign In</button>`;

  const html = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden animate-screen-enter">
      <!-- Aurora Background -->
      <div id="aurora-bg" class="aurora-container bg-white"></div>

      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-6 md:px-12 lg:px-24 sticky top-0 z-50 transition-all">
        <div class="flex-1 flex items-center justify-start">
          <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
        </div>
        
        <div class="flex-1 flex items-center justify-center">
            <div class="flex items-center gap-2 cursor-pointer" id="logo-home">
                <img src="/logo.png" class="size-8" alt="Logo" />
                <span class="text-xl font-black text-slate-900 tracking-tight">FormMate</span>
            </div>
        </div>

        <div class="flex-1 flex items-center justify-end">
          ${authButtonHtml}
        </div>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div class="max-w-[800px] w-full text-center space-y-10 relative z-10">
          <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-tight tracking-tight">
            Enter your form <span class="text-link-gradient animate-gradient-x">link</span>
          </h1>

          <div class="w-full max-w-2xl mx-auto relative z-20">
            <div class="bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl focus-within:ring-2 focus-within:ring-primary/20">
              <div class="flex-1 relative">
                <span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input
                  id="url-input"
                  class="w-full pl-14 pr-4 h-14 rounded-full border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base bg-transparent font-medium"
                  placeholder="paste link..."
                  type="text"
                  value="${formUrl || ''}"
                />
              </div>
              <button id="btn-analyze" class="bg-primary text-white px-8 h-14 rounded-full font-bold text-base hover:bg-primary-dark transition-all flex items-center justify-center gap-2 btn-press shadow-lg shadow-primary/25 group whitespace-nowrap">
                Start Analyzing
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </button>
            </div>
            
            <div class="mt-8 flex flex-col items-center gap-4">
              <p class="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Or</p>
              <div class="flex flex-wrap justify-center gap-3">
                  <button id="nav-examples" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">explore</span> Examples
                  </button>
                  <button id="nav-chat" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">chat_bubble</span> Chat
                  </button>
                  <button id="nav-help" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">help</span> Help Center
                  </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Decorative sparkle cross from design -->
      <div class="fixed bottom-10 right-10 size-12 text-slate-300 opacity-40 pointer-events-none">
           <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,0 L14,10 L24,12 L14,14 L12,24 L10,14 L0,12 L10,10 Z" />
           </svg>
      </div>
    </div>
  `;

  function init(wrapper) {
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');
    const btnBack = wrapper.querySelector('#btn-back');
    const auroraBg = wrapper.querySelector('#aurora-bg');

    // Initialize Aurora
    const cleanupAurora = initAurora(auroraBg, {
      colorStops: ["#8bf9f9", "#c7f8ff", "#00fbff"],
      blend: 1,
      amplitude: 1.0,
      speed: 0.8
    });

    btnBack.addEventListener('click', () => goBack());
    wrapper.querySelector('#logo-home')?.addEventListener('click', () => navigateTo('landing'));

    btnAnalyze.addEventListener('click', () => {
      let url = urlInput.value.trim();

      if (!url) {
        toast.error('Please paste a form link first');
        return;
      }

      // Auto-prepend https if missing
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
        urlInput.value = url;
      }

      if (!isValidFormProvider(url)) {
        toast.error('Unsupported form provider');
        return;
      }

      try {
        new URL(url);
        setState({ formUrl: url });
        navigateTo('analyzing');
      } catch {
        toast.error('Invalid URL format');
      }
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAnalyze.click();
    });

    // Navigation pills
    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#nav-chat')?.addEventListener('click', () => {
      navigateTo('ai-chat');
    });
    wrapper.querySelector('#nav-help')?.addEventListener('click', () => navigateTo('docs'));

    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => navigateTo('accounts'));

    function isValidFormProvider(url) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const whitelistedDomains = [
          'docs.google.com', 'forms.gle', 'forms.google.com',
          'form.typeform.com', 'typeform.com',
          'form.jotform.com', 'jotform.com',
          'surveymonkey.com', 'www.surveymonkey.com',
          'lever.co', 'jobs.lever.co',
          'greenhouse.io', 'boards.greenhouse.io',
          'ashbyhq.com', 'jobs.ashbyhq.com',
          'workday.com', 'myworkdayjobs.com',
          'tally.so', 'airtable.com', 'feathery.io', 'qualtrics.com'
        ];
        return whitelistedDomains.some(d => host === d || host.endsWith(`.${d}`));
      } catch {
        return false;
      }
    }

    return () => {
      if (cleanupAurora) cleanupAurora();
    };
  }

  return { html, init };
}
