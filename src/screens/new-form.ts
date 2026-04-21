// @ts-nocheck
// FormMate - New Form Screen

import { getState, setState } from '../state';
import { navigateTo, goBack } from '../router';
import { normalizeSubmittedFormUrl } from '../parser/url-intake';
import { toast } from '../components/toast';
import { initLayout, withLayout } from '../components/layout';
import { initAurora } from './Aurora';
import './Aurora.css';

export function newFormScreen() {
  const { formUrl } = getState();

  const newFormContent = `
    <div class="relative flex min-h-full w-full flex-col overflow-hidden zen-new-form-shell" data-fm-transition-main="true" data-fm-scroll-region="main">
      <div id="aurora-bg" class="aurora-container bg-white zen-new-form-aurora"></div>

      <main class="flex-1 flex flex-col items-center justify-center px-6 py-10 md:px-10 lg:px-16 zen-new-form-main">
        <div class="relative z-10 w-full max-w-[960px] space-y-8 zen-new-form-panel">
          <div class="flex items-center justify-between gap-3 zen-new-form-header">
            <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
            <div class="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur-sm zen-new-form-copy">
              <span class="material-symbols-outlined text-base text-primary">link</span>
              Paste a form link to open a new workspace
            </div>
          </div>

          <div class="mx-auto max-w-[800px] text-center space-y-10">
            <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-tight tracking-tight zen-new-form-copy">
              Enter your form <span class="text-link-gradient animate-gradient-x">link</span>
            </h1>

            <div class="w-full max-w-2xl mx-auto relative z-20 zen-new-form-form">
              <div class="bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl focus-within:ring-2 focus-within:ring-primary/20">
                <div class="flex-1 relative">
                  <span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                  <input
                    aria-label="Form URL"
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

              <div class="mt-8 flex flex-col items-center gap-4 zen-new-form-secondary">
                <p class="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Or</p>
                <div class="flex flex-wrap justify-center gap-3">
                  <button id="nav-examples" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">explore</span> Examples
                  </button>
                  <button id="nav-chat" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">chat_bubble</span> Chat
                  </button>
                  <button id="nav-help" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">menu_book</span> Docs &amp; Help
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div class="absolute bottom-10 right-10 size-12 text-slate-300 opacity-40 pointer-events-none zen-new-form-decor">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,0 L14,10 L24,12 L14,14 L12,24 L10,14 L0,12 L10,10 Z" />
        </svg>
      </div>
    </div>
  `;

  const html = withLayout('new', newFormContent, {
    zenMode: { screenId: 'new' },
    shellClassName: 'zen-layout-shell',
    contentClassName: 'zen-layout-content zen-new-form-content'
  });

  function init(wrapper) {
    const cleanupLayout = initLayout(wrapper, { zenMode: { screenId: 'new' } });
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');
    const auroraBg = wrapper.querySelector('#aurora-bg');

    const cleanupAurora = initAurora(auroraBg, {
      colorStops: ['#8bf9f9', '#c7f8ff', '#00fbff'],
      blend: 1,
      amplitude: 1.0,
      speed: 0.8
    });

    wrapper.querySelector('#btn-back')?.addEventListener('click', () => goBack());

    btnAnalyze?.addEventListener('click', () => {
      try {
        const url = normalizeSubmittedFormUrl(urlInput.value, { allowDemo: true });
        urlInput.value = url;
        setState({ formUrl: url, capturePayload: null, imageArtifacts: null, parseResult: null, formData: null });
        navigateTo('analyzing');
      } catch (error) {
        toast.error(error?.message || 'Invalid URL format');
      }
    });

    urlInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        btnAnalyze?.click();
      }
    });

    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#nav-chat')?.addEventListener('click', () => navigateTo('ai-chat'));
    wrapper.querySelector('#nav-help')?.addEventListener('click', () => navigateTo('docs'));

    return () => {
      cleanupLayout?.();
      cleanupAurora?.();
    };
  }

  return { html, init };
}
