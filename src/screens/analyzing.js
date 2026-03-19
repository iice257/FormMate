// ═══════════════════════════════════════════
// FormMate — Analyzing Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state.js';
import { navigateTo } from '../router.js';
import { parseFormUrl, detectFormPlatform } from '../parser/form-parser.js';
import { generateAnswers } from '../ai/ai-actions.js';
import { capturedPayloadToFormData } from '../parser/capture-parser.js';
import { MOCK_AI_ANSWERS } from '../parser/mock-forms.js';
import { incrementUsage, saveFormHistory, loadFormHistory } from '../storage/local-store.js';

export function analyzingScreen() {
  const { formUrl } = getState();
  const platform = detectFormPlatform(formUrl);
  const authed = getState().isAuthenticated;
  const homeLabel = authed ? 'Go to Dashboard' : 'Go Home';

  const html = `
    <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Navigation -->
        <header class="flex items-center justify-between border-b border-primary/10 px-6 py-4 md:px-20 lg:px-40 bg-white/50 backdrop-blur-md sticky top-0 z-50">
          <div class="flex items-center gap-3">
            <button id="btn-back-header" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
            <button type="button" class="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0 text-left" id="btn-logo-home" aria-label="Go to home">
              <div class="size-8 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
              </div>
              <h2 class="text-slate-900 text-xl font-black leading-tight tracking-tighter">Form<span class="text-primary">Mate</span></h2>
            </button>
          </div>
          <button id="btn-cancel" class="flex items-center justify-center rounded-full size-10 bg-slate-200/50 text-slate-600 hover:bg-slate-200 transition-colors">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <main class="flex-1 flex flex-col items-center justify-center px-6 py-12 md:px-20 lg:px-40">
          <div class="max-w-[640px] w-full flex flex-col items-center text-center">

            <!-- Visual Processing Indicator -->
            <div class="relative w-48 h-48 mb-12 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
              <div class="absolute inset-4 rounded-full border-2 border-primary/40"></div>
              <div class="relative z-10 w-24 h-32 bg-white rounded-lg shadow-xl border border-slate-200 p-3 flex flex-col gap-2 overflow-hidden animate-float">
                <div class="h-1.5 w-1/2 bg-slate-200 rounded-full"></div>
                <div class="h-3 w-full bg-primary/10 rounded-md border border-primary/20"></div>
                <div class="h-1.5 w-2/3 bg-slate-200 rounded-full mt-2"></div>
                <div class="h-3 w-full bg-slate-100 rounded-md"></div>
                <div class="h-1.5 w-1/3 bg-slate-200 rounded-full mt-2"></div>
                <div class="h-8 w-full bg-primary rounded-md mt-auto flex items-center justify-center">
                  <div class="h-1.5 w-8 bg-white/30 rounded-full"></div>
                </div>
                <div class="absolute top-0 left-0 w-full h-1 bg-primary/40 shadow-[0_0_15px_rgba(91,19,236,0.5)] animate-scan-line"></div>
              </div>
            </div>

            <h1 class="text-slate-900 tracking-tight text-3xl md:text-4xl font-bold leading-tight mb-4">
              Analyzing your form...
            </h1>

            <p class="text-slate-600 text-lg font-normal leading-relaxed mb-2 max-w-md">
              Our AI is dissecting the structure, inputs, and flow to provide the best suggestions.
            </p>

            <p class="text-slate-400 text-sm mb-10">
              <span class="font-medium text-primary">${platform}</span> &middot; ${formUrl.length > 50 ? formUrl.substring(0, 50) + '...' : formUrl}
            </p>

            <!-- Progress Section -->
            <div class="w-full bg-white rounded-[var(--fm-card-radius)] p-8 border border-slate-200 shadow-sm mb-8">
              <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center mb-1">
                    <span id="progress-label" class="text-slate-900 font-semibold">Detecting questions</span>
                    <div class="flex items-center gap-2">
                      <div class="relative size-5">
                        <svg class="size-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" class="stroke-slate-100" stroke-width="4"></circle>
                          <circle id="progress-ring" cx="18" cy="18" r="16" fill="none" class="stroke-primary transition-all duration-700 ease-out" stroke-width="4" stroke-dasharray="100" stroke-dashoffset="100" stroke-linecap="round"></circle>
                        </svg>
                      </div>
                      <span id="progress-percent" class="text-primary font-bold text-sm">0%</span>
                    </div>
                  </div>
                  <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div id="progress-bar" class="h-full bg-primary rounded-full transition-all duration-700 ease-out" style="width: 0%"></div>
                  </div>
                  <div class="flex justify-between">
                    <span id="progress-step" class="text-slate-500 text-xs font-medium uppercase tracking-wider">Step 1 of 3</span>
                    <span id="progress-hint" class="text-slate-400 text-xs italic">Starting...</span>
                  </div>
                </div>

                <div class="h-px bg-slate-100 w-full"></div>

                <!-- Stepper -->
                <div class="grid grid-cols-1 gap-4 text-left">
                  <div id="step-1" class="flex items-center gap-4">
                    <div class="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-lg">sync</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-slate-900 font-semibold leading-none">Detecting questions</span>
                      <span class="text-primary text-sm mt-1">Scanning form structure...</span>
                    </div>
                  </div>

                  <div id="step-2" class="flex items-center gap-4 opacity-50">
                    <div class="flex-shrink-0 size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span class="material-symbols-outlined text-lg">pending</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-slate-900 font-medium leading-none">Understanding inputs</span>
                      <span class="text-slate-500 text-sm mt-1">Analyzing validation rules & types</span>
                    </div>
                  </div>

                  <div id="step-3" class="flex items-center gap-4 opacity-50">
                    <div class="flex-shrink-0 size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span class="material-symbols-outlined text-lg">pending</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-slate-900 font-medium leading-none">Generating AI answers</span>
                      <span class="text-slate-500 text-sm mt-1">Creating intelligent suggestions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Info Tip -->
            <div class="flex items-center gap-2 text-slate-500 text-sm bg-white/50 px-4 py-2 rounded-full border border-slate-200">
              <span class="material-symbols-outlined text-sm">info</span>
              <span>Larger forms may take up to 30 seconds to parse completely.</span>
            </div>
          </div>
        </main>

        <!-- Decorative -->
        <div class="fixed -bottom-24 -left-24 size-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="fixed top-24 -right-24 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      </div>
      
      <!-- Full Screen Error Modal -->
      <div id="error-modal" class="fixed inset-0 z-[100] bg-white hidden flex-col items-center justify-center p-6 text-center animate-screen-enter">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6 border-4 border-white shadow-xl">
          <span class="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 class="text-3xl lg:text-4xl font-black text-slate-900 mb-4 tracking-tight">Analysis Failed</h2>
        <p id="error-modal-msg" class="text-slate-600 max-w-md mb-10 leading-relaxed text-lg">We encountered an unexpected issue while trying to read this form.</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <button id="btn-error-retry" class="px-8 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/95 shadow-lg shadow-primary/25 transition-all">Try Again</button>
          <button id="btn-error-home" class="px-8 py-3.5 rounded-xl font-bold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all">${homeLabel}</button>
        </div>
      </div>

      <!-- Assisted Capture Modal (Auth/Render required) -->
      <div id="capture-modal" class="fixed inset-0 z-[101] bg-white hidden flex-col items-center justify-center p-6 text-center animate-screen-enter">
        <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 border-4 border-white shadow-xl">
          <span id="capture-modal-icon" class="material-symbols-outlined text-4xl">lock</span>
        </div>
        <h2 class="text-3xl lg:text-4xl font-black text-slate-900 mb-4 tracking-tight">Assisted Capture Needed</h2>
        <p id="capture-modal-msg" class="text-slate-600 max-w-md mb-10 leading-relaxed text-lg">
          This form requires sign-in or is rendered client-side. Use Assisted Capture to import fields while you're already signed in.
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <button id="btn-capture-start" class="px-8 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/95 shadow-lg shadow-primary/25 transition-all">Use Assisted Capture</button>
          <button id="btn-capture-demo" class="px-8 py-3.5 rounded-xl font-bold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all">Try a Demo Instead</button>
        </div>
      </div>

    </div>
  `;

  function init(wrapper) {
    const progressBar = wrapper.querySelector('#progress-bar');
    const progressRing = wrapper.querySelector('#progress-ring');
    const progressPercent = wrapper.querySelector('#progress-percent');
    const progressLabel = wrapper.querySelector('#progress-label');
    const progressStep = wrapper.querySelector('#progress-step');
    const progressHint = wrapper.querySelector('#progress-hint');
    const btnCancel = wrapper.querySelector('#btn-cancel');

    const btnBackHeader = wrapper.querySelector('#btn-back-header');
    const errorModal = wrapper.querySelector('#error-modal');
    const errorMsg = wrapper.querySelector('#error-modal-msg');
    const btnErrorRetry = wrapper.querySelector('#btn-error-retry');
    const btnErrorHome = wrapper.querySelector('#btn-error-home');

    const captureModal = wrapper.querySelector('#capture-modal');
    const captureIcon = wrapper.querySelector('#capture-modal-icon');
    const captureMsg = wrapper.querySelector('#capture-modal-msg');
    const btnCaptureStart = wrapper.querySelector('#btn-capture-start');
    const btnCaptureDemo = wrapper.querySelector('#btn-capture-demo');

    let cancelled = false;

    const goHome = () => {
      cancelled = true;
      navigateTo(authed ? 'dashboard' : 'landing');
    };

    btnCancel.addEventListener('click', goHome);
    btnBackHeader?.addEventListener('click', goHome);
    btnErrorHome?.addEventListener('click', goHome);

    btnErrorRetry?.addEventListener('click', () => {
      cancelled = true;
      // Re-mount the analyzing screen to try again
      navigateTo('analyzing');
    });

    wrapper.querySelector('#btn-logo-home')?.addEventListener('click', goHome);

    btnCaptureStart?.addEventListener('click', () => {
      cancelled = true;
      navigateTo('capture');
    });

    btnCaptureDemo?.addEventListener('click', () => {
      cancelled = true;
      navigateTo('examples');
    });

    // Run analysis pipeline
    runAnalysis();

    async function runAnalysis() {
      try {
        const { formUrl } = getState();

        // Step 1: Detecting questions
        updateProgress(15, 'Detecting questions', 'Step 1 of 3', 'Scanning form...');
        await delay(800);
        if (cancelled) return;

        updateProgress(35, 'Detecting questions', 'Step 1 of 3', 'Extracting fields...');
        await delay(600);
        if (cancelled) return;

        // Parse / import form
        const { capturePayload } = getState();
        let formData;
        if (capturePayload) {
          updateProgress(40, 'Importing capture', 'Step 1 of 3', 'Normalizing captured fields...');
          await delay(250);
          if (cancelled) return;
          formData = capturedPayloadToFormData(capturePayload);
          // Clear after use to prevent accidental reuse
          setState({ capturePayload: null });
        } else {
          formData = await parseFormUrl(formUrl);
        }
        if (cancelled) return;

        completeStep(1, `Found ${formData.questions.length} distinct form fields`);

        // Step 2: Understanding inputs
        activateStep(2, 'Mapping validation rules & types...');
        updateProgress(55, 'Understanding inputs', 'Step 2 of 3', 'Analyzing types...');
        await delay(800);
        if (cancelled) return;

        updateProgress(70, 'Understanding inputs', 'Step 2 of 3', 'Almost there...');
        await delay(600);
        if (cancelled) return;

        completeStep(2, 'All field types analyzed');

        // Step 3: Generating AI answers
        activateStep(3, 'Creating intelligent suggestions...');
        updateProgress(80, 'Generating AI answers', 'Step 3 of 3', 'AI is thinking...');
        await delay(500);
        if (cancelled) return;

        let answers;
        if (formData.parseStrategy === 'demo' && formData.demoId && MOCK_AI_ANSWERS[formData.demoId]) {
          answers = MOCK_AI_ANSWERS[formData.demoId];
          updateProgress(96, 'Loading demo suggestions', 'Step 3 of 3', 'Using built-in demo answers...');
          await delay(250);
        } else {
          answers = await generateAnswers(formData, (current, total) => {
            if (!cancelled) {
              const percent = 80 + Math.floor((current / total) * 15);
              updateProgress(percent, 'Generating AI answers', 'Step 3 of 3', `Field ${current} of ${total}`);
            }
          });
        }
        if (cancelled) return;

        updateProgress(95, 'Generating AI answers', 'Step 3 of 3', 'Finalizing...');
        await delay(400);
        if (cancelled) return;

        completeStep(3, 'Suggestions ready');
        updateProgress(100, 'Complete!', 'Done', 'Redirecting...');

        // Store results + persist lightweight history/usage
        try { incrementUsage('formsAnalyzed'); } catch (e) { console.warn('[AnalyzingScreen] Usage tracking failed:', e); }
        try {
          saveFormHistory({
            id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            title: formData.title,
            url: formData.url || formUrl,
            status: 'completed',
            provider: formData.source || platform,
            parseStrategy: formData.parseStrategy || 'unknown',
            fields: Array.isArray(formData.questions) ? formData.questions.length : 0
          });
        } catch (e) { console.warn('[AnalyzingScreen] Failed to save form history:', e); }

        setState({ formData, answers, formHistory: loadFormHistory() });

        // Navigate to workspace
        await delay(600);
        if (!cancelled) navigateTo('workspace');
      } catch (err) {
        if (cancelled) return;
        console.error('[AnalyzingScreen] Pipeline Error:', err);

        // Stop animations
        const radar = wrapper.querySelector('.animate-float');
        if (radar) radar.classList.remove('animate-float');
        const ping = wrapper.querySelector('.animate-ping');
        if (ping) ping.classList.remove('animate-ping');
        const scanLine = wrapper.querySelector('.animate-scan-line');
        if (scanLine) scanLine.classList.remove('animate-scan-line');

        const code = err?.code;
        if ((code === 'AUTH_REQUIRED' || code === 'RENDER_REQUIRED') && captureModal) {
          captureModal.classList.remove('hidden');
          captureModal.classList.add('flex');
          if (captureIcon) {
            captureIcon.textContent = code === 'AUTH_REQUIRED' ? 'lock' : 'preview';
          }
          if (captureMsg) {
            const platform = err?.details?.platform ? ` (${err.details.platform})` : '';
            const fallbackMessage = code === 'AUTH_REQUIRED'
              ? 'This form requires sign-in or extra permission checks. Use Assisted Capture while you are already signed in.'
              : "This form is rendered client-side and can't be scanned reliably from a pasted URL. Use Assisted Capture to import the visible fields.";
            captureMsg.textContent = fallbackMessage + platform;
          }
          return;
        }

        // Show Full Screen Error Modal
        if (errorModal) {
          errorModal.classList.remove('hidden');
          errorModal.classList.add('flex');
          if (errorMsg) errorMsg.textContent = err.message || 'Could not map inputs from this form. Please ensure it is publicly accessible.';
        }
      }
    }

    function updateProgress(percent, label, step, hint) {
      if (progressBar) progressBar.style.width = percent + '%';
      if (progressRing) progressRing.setAttribute('stroke-dashoffset', 100 - percent);
      progressPercent.textContent = percent + '%';
      progressLabel.textContent = label;
      progressStep.textContent = step;
      progressHint.textContent = hint;
    }

    function completeStep(stepNum, subtitle) {
      const el = wrapper.querySelector(`#step-${stepNum}`);
      el.classList.remove('opacity-50');
      const icon = el.querySelector('.material-symbols-outlined');
      icon.textContent = 'check_circle';
      icon.parentElement.className = 'flex-shrink-0 size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600';
      const sub = el.querySelectorAll('span');
      if (sub[1]) {
        sub[1].className = 'text-slate-900 font-medium leading-none';
      }
      if (sub[2]) {
        sub[2].className = 'text-slate-500 text-sm mt-1';
        sub[2].textContent = subtitle;
      }
    }

    function activateStep(stepNum, subtitle) {
      const el = wrapper.querySelector(`#step-${stepNum}`);
      el.classList.remove('opacity-50');
      const icon = el.querySelector('.material-symbols-outlined');
      icon.textContent = 'sync';
      icon.parentElement.className = 'flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary';
      const sub = el.querySelectorAll('span');
      if (sub[1]) sub[1].className = 'text-slate-900 font-semibold leading-none';
      if (sub[2]) {
        sub[2].className = 'text-primary text-sm mt-1';
        sub[2].textContent = subtitle;
      }
    }

    return () => { cancelled = true; };
  }

  return { html, init };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
