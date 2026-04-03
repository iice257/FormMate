// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — New Form Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state';
import { getHomeScreenForUser, navigateTo, goBack } from '../router';
import { parseFormUrl, detectFormPlatform } from '../parser/form-parser';
import { normalizeSubmittedFormUrl } from '../parser/url-intake';
import { toast } from '../components/toast';
import { initAurora } from './Aurora';
import './Aurora.css';
import { escapeHtml, safeHttpUrl } from '../utils/escape';
import { isZenModeEnabled, bindZenModeControls, openAccountModal } from '../components/layout';

export function newFormScreen() {
  const { isAuthenticated, userProfile, formUrl } = getState();

  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${avatarSrc}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg btn-press" id="btn-login">Sign In</button>`;

  const zenActive = isZenModeEnabled('new');

  const html = `
    <div class="relative flex h-screen w-full flex-col overflow-hidden animate-screen-enter zen-new-form-shell ${zenActive ? 'is-zen-mode' : ''}" data-zen-shell="true" data-zen-screen="new">
      <button
        type="button"
        id="btn-zen-exit"
        class="zen-mode-exit-btn ${zenActive ? 'visible' : ''}"
        aria-label="Exit Zen Mode"
        ${zenActive ? '' : 'hidden'}
      >
        <span class="material-symbols-outlined">close</span>
        <span>Close</span>
      </button>

      <!-- Aurora Background -->
      <div id="aurora-bg" class="aurora-container bg-white zen-new-form-aurora"></div>

      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-6 md:px-12 lg:px-24 sticky top-0 z-50 transition-all zen-new-form-header">
        <div class="flex-1 flex items-center justify-start">
          <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
        </div>
        
        <div class="flex-1 flex items-center justify-center">
            <button type="button" class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0" id="logo-home" aria-label="Go to home">
                <img src="/logo.png" class="size-8" alt="Logo" />
                <span class="text-xl font-black text-slate-900 tracking-tight">FormMate</span>
            </button>
        </div>

        <div class="flex-1 flex items-center justify-end gap-3">${authButtonHtml}</div>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-6 pb-16 zen-new-form-main">
        <div class="max-w-[800px] w-full text-center space-y-10 relative z-10 zen-new-form-panel">
          <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-tight tracking-tight zen-new-form-copy">
            Enter your form <span class="text-link-gradient animate-gradient-x">link</span>
          </h1>

          <div class="w-full max-w-2xl mx-auto relative z-20 zen-new-form-form">
            <div class="bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl focus-within:ring-2 focus-within:ring-primary/20">
              <div class="flex-1 relative">
                <span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input aria-label="Form URL"
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
                    <span class="material-symbols-outlined text-base">help</span> Help Center
                  </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Decorative sparkle cross from design -->
      <div class="fixed bottom-10 right-10 size-12 text-slate-300 opacity-40 pointer-events-none zen-new-form-decor">
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

    const cleanupZen = bindZenModeControls(wrapper, { screenId: 'new' });

    btnBack.addEventListener('click', () => goBack());
    wrapper.querySelector('#logo-home')?.addEventListener('click', () => {
      navigateTo(getHomeScreenForUser());
    });

    btnAnalyze.addEventListener('click', () => {
      try {
        const url = normalizeSubmittedFormUrl(urlInput.value, { allowDemo: true });
        urlInput.value = url;
        setState({ formUrl: url });
        navigateTo('analyzing');
      } catch (error) {
        toast.error(error?.message || 'Invalid URL format');
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
    wrapper.querySelector('#nav-help')?.addEventListener('click', () => openAccountModal('help'));

    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => openAccountModal('profile'));
    return () => {
      cleanupZen?.();
      if (cleanupAurora) cleanupAurora();
    };
  }

  return { html, init };
}
