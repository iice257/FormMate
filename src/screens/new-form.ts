// @ts-nocheck
// FormMate - New Form Screen

import { getState, setState } from '../state';
import { canGoBackWithinApp, getHomeScreenForUser, navigateTo, goBack, goBackWithinApp } from '../router';
import { normalizeSubmittedFormUrl } from '../parser/url-intake';
import { toast } from '../components/toast';
import { initAurora } from './Aurora';
import './Aurora.css';
import { escapeAttr, escapeHtml, safeHttpUrl } from '../utils/escape';
import { isZenModeEnabled, updateZenMode, bindZenModeControls, openAccountModal, getZenModeToggleHtml } from '../components/layout';
import { RASTER_IMAGE_MIME_TYPES, isAllowedRasterImageFile } from '../utils/file-validation';

const MAX_SCREENSHOTS = 5;
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;

export function newFormScreen() {
  const { isAuthenticated, userProfile, formUrl } = getState();

  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${escapeAttr(avatarSrc)}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg btn-press" id="btn-login">Sign In</button>`;

  const zenActive = isZenModeEnabled('new');
  const showZenBack = zenActive && canGoBackWithinApp('new');

  const html = `
    <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden zen-new-form-shell ${zenActive ? 'is-zen-mode' : ''}" data-zen-shell="true" data-zen-screen="new">
      <button
        type="button"
        id="btn-zen-back"
        class="zen-mode-back-btn ${showZenBack ? 'visible' : ''}"
        aria-label="Go back"
        title="Back"
        ${showZenBack ? '' : 'hidden'}
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>

      <button
        type="button"
        id="btn-zen-exit"
        class="zen-mode-exit-btn ${zenActive ? 'visible' : ''}"
        aria-label="Exit Zen Mode"
      >
        <span class="material-symbols-outlined">close</span>
        <span class="zen-mode-fab-label">Exit Zen Mode</span>
      </button>

      <div id="aurora-bg" class="aurora-container bg-white zen-new-form-aurora"></div>

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

        <div class="flex-1 flex items-center justify-end gap-3">
          ${getZenModeToggleHtml('new', { label: '', variant: 'header' })}
          ${authButtonHtml}
        </div>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-6 pb-16 zen-new-form-main">
        <div class="zen-new-form-bg-overlay" aria-hidden="true"></div>
        <div class="zen-new-form-wave" aria-hidden="true"></div>
        <div class="max-w-[800px] w-full text-center space-y-10 relative z-10 zen-new-form-panel">
          <div class="new-form-hero-copy">
            <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-tight tracking-tight zen-new-form-copy">
              Enter your form <span class="text-link-gradient animate-gradient-x">link</span>
            </h1>
          </div>

          <div class="w-full max-w-2xl mx-auto relative z-20 zen-new-form-form">
            <div class="new-form-input-shell bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl focus-within:ring-2 focus-within:ring-primary/20">
              <div class="flex-1 relative">
                <span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input
                  aria-label="Form URL"
                  id="url-input"
                  data-zen-focus-target
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
              <div class="new-form-divider">
                <span></span>
                <p class="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Or</p>
                <span></span>
              </div>
              <div class="new-form-screenshot-card w-full max-w-xl mx-auto rounded-3xl border border-dashed border-primary/25 bg-white/70 backdrop-blur-sm p-4 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-center gap-3 text-left">
                  <div class="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">photo_library</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-black text-slate-900">Use screenshots instead</div>
                    <p class="text-xs text-slate-500 leading-relaxed">Upload visible form screenshots by themselves, or keep a link above so FormMate can preserve source context.</p>
                  </div>
                  <button id="btn-screenshot-upload" type="button" class="px-5 py-2.5 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-all btn-press shadow-sm whitespace-nowrap">
                    Upload screenshots
                  </button>
                  <input id="screenshot-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden />
                </div>
                <div id="screenshot-status" class="mt-3 text-xs font-semibold text-slate-500" aria-live="polite">PNG, JPEG, and WebP are supported. Max ${MAX_SCREENSHOTS} images.</div>
              </div>
              <div class="flex flex-wrap justify-center gap-3">
                <button id="nav-examples" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-base">explore</span> Examples
                </button>
                <button id="nav-chat" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-base">chat_bubble</span> Chat
                </button>
                <button id="nav-help" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-base">help</span> Docs &amp; Help
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  `;

  function init(wrapper) {
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');
    const btnBack = wrapper.querySelector('#btn-back');
    const btnZenBack = wrapper.querySelector('#btn-zen-back');
    const btnZenExit = wrapper.querySelector('#btn-zen-exit');
    const btnScreenshotUpload = wrapper.querySelector('#btn-screenshot-upload');
    const screenshotInput = wrapper.querySelector('#screenshot-input');
    const screenshotStatus = wrapper.querySelector('#screenshot-status');
    let zenEnabled = isZenModeEnabled('new');
    let zenTurnedOnFromNew = false;
    const auroraBg = wrapper.querySelector('#aurora-bg');

    const cleanupAurora = initAurora(auroraBg, {
      colorStops: ['#8bf9f9', '#c7f8ff', '#00fbff'],
      blend: 1,
      amplitude: 1.0,
      speed: 0.8
    });
    const cleanupZen = bindZenModeControls(wrapper, { screenId: 'new' });
    const handleZenModeChanged = (event) => {
      const nextEnabled = Boolean(event?.detail?.enabled);
      if (nextEnabled && !zenEnabled) {
        zenTurnedOnFromNew = true;
      }
      if (!nextEnabled) {
        zenTurnedOnFromNew = false;
      }
      zenEnabled = nextEnabled;
    };
    const handleZenExit = (event) => {
      if (!isZenModeEnabled('new')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      updateZenMode('new', false);
    };
    const handleZenBack = (event) => {
      if (!isZenModeEnabled('new')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (zenTurnedOnFromNew) {
        updateZenMode('new', false);
        return;
      }
      goBackWithinApp();
    };
    btnZenBack?.addEventListener('click', handleZenBack, true);
    btnZenExit?.addEventListener('click', handleZenExit, true);
    window.addEventListener('fm:zen-mode-change', handleZenModeChanged);

    btnBack.addEventListener('click', () => goBack());
    wrapper.querySelector('#logo-home')?.addEventListener('click', () => {
      navigateTo(getHomeScreenForUser());
    });

    btnAnalyze.addEventListener('click', () => {
      try {
        const url = normalizeSubmittedFormUrl(urlInput.value, { allowDemo: true });
        urlInput.value = url;
        setState({ formUrl: url, capturePayload: null, imageArtifacts: null, parseResult: null, formData: null });
        navigateTo('analyzing');
      } catch (error) {
        toast.error(error?.message || 'Invalid URL format');
      }
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAnalyze.click();
    });

    btnScreenshotUpload?.addEventListener('click', () => {
      screenshotInput.value = '';
      screenshotInput.click();
    });

    screenshotInput?.addEventListener('change', async () => {
      const files = Array.from(screenshotInput.files || []);
      if (!files.length) return;

      if (files.length > MAX_SCREENSHOTS) {
        toast.error(`Upload up to ${MAX_SCREENSHOTS} screenshots at a time.`);
        return;
      }

      const oversized = files.filter((file) => file.size > MAX_SCREENSHOT_BYTES);
      if (oversized.length) {
        toast.error(`Some screenshots are too large. Max ${Math.floor(MAX_SCREENSHOT_BYTES / (1024 * 1024))}MB each.`);
        return;
      }

      const checks = await Promise.all(files.map(async (file) => ({ file, ok: await isAllowedRasterImageFile(file) })));
      const valid = checks.filter((entry) => entry.ok && RASTER_IMAGE_MIME_TYPES.has(String(entry.file.type || '').toLowerCase())).map((entry) => entry.file);
      if (!valid.length) {
        toast.error('Use PNG, JPEG, or WebP screenshots.');
        return;
      }

      if (screenshotStatus) screenshotStatus.textContent = 'Preparing screenshots...';

      let sourceUrl = '';
      const rawUrl = String(urlInput.value || '').trim();
      if (rawUrl) {
        try {
          sourceUrl = normalizeSubmittedFormUrl(rawUrl, { allowDemo: true });
        } catch (error) {
          if (screenshotStatus) screenshotStatus.textContent = 'Fix or remove the link, then upload screenshots again.';
          toast.error(error?.message || 'Invalid URL format');
          return;
        }
      }

      try {
        const imageArtifacts = (await Promise.all(valid.map(fileToDataUrl))).filter(Boolean);
        if (!imageArtifacts.length) throw new Error('No screenshots could be prepared.');
        setState({
          formUrl: sourceUrl,
          capturePayload: null,
          imageArtifacts,
          parseResult: null,
          formData: null,
        });
        toast.success(sourceUrl ? 'Screenshots queued with link context.' : 'Screenshots queued for analysis.');
        navigateTo('analyzing');
      } catch (error) {
        if (screenshotStatus) screenshotStatus.textContent = 'Could not prepare screenshots.';
        toast.error(error?.message || 'Could not prepare screenshots.');
      }
    });

    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#nav-chat')?.addEventListener('click', () => {
      navigateTo('ai-chat');
    });
    wrapper.querySelector('#nav-help')?.addEventListener('click', () => navigateTo('docs'));

    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => openAccountModal('profile'));

    return () => {
      btnZenBack?.removeEventListener('click', handleZenBack, true);
      btnZenExit?.removeEventListener('click', handleZenExit, true);
      window.removeEventListener('fm:zen-mode-change', handleZenModeChanged);
      cleanupZen?.();
      cleanupAurora?.();
    };
  }

  return { html, init };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read screenshot.'));
    reader.readAsDataURL(file);
  });
}
