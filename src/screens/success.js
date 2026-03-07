// ═══════════════════════════════════════════
// FormMate — Success Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state.js';
import { navigateTo } from '../router.js';

export function successScreen() {
  const { formData, answers } = getState();
  const answeredCount = formData ? Object.values(answers).filter(a => a?.text).length : 0;

  const html = `
    <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Header -->
        <header class="flex items-center justify-between border-b border-slate-200 px-6 md:px-40 py-4 bg-white">
          <div class="flex items-center gap-3 text-primary">
            <div class="size-8 flex items-center justify-center bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined">auto_fix_high</span>
            </div>
            <h2 class="text-slate-900 text-xl font-bold tracking-tight">FormMate</h2>
          </div>
          <button id="btn-close" class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <!-- Main Content -->
        <div class="flex flex-1 justify-center py-10 px-4">
          <div class="flex flex-col max-w-[640px] flex-1">

            <!-- Success Header -->
            <div class="flex flex-col items-center text-center space-y-4 mb-10">
              <div class="size-24 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-check-pop">
                <span class="material-symbols-outlined text-primary text-5xl">check_circle</span>
              </div>
              <h1 class="text-slate-900 text-4xl font-extrabold tracking-tight">Form Completed!</h1>
              <p class="text-slate-600 text-lg max-w-md">
                Your form has been accurately filled with your verified data and is ready for submission.
              </p>
            </div>

            <!-- Confirmation Card -->
            <div class="bg-white rounded-xl p-8 shadow-sm border border-slate-200 flex flex-col items-center gap-6 mb-8">
              <div class="bg-slate-50 aspect-video rounded-xl w-full flex items-center justify-center relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                <div class="relative z-10 flex flex-col items-center gap-3">
                  <div class="size-16 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-3xl">description</span>
                  </div>
                  <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Form Filled Successfully</span>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-4 w-full">
                <button class="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 shadow-md shadow-primary/20 btn-press">
                  <span class="material-symbols-outlined text-sm">open_in_new</span>
                  <span>View Original Form</span>
                </button>
                <button class="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-slate-100 text-slate-900 text-sm font-bold transition-all hover:bg-slate-200 btn-press">
                  <span class="material-symbols-outlined text-sm">download</span>
                  <span>Download Receipt</span>
                </button>
              </div>
            </div>

            <!-- Next Steps -->
            <div class="space-y-4 stagger-children">
              <h3 class="text-slate-900 text-xl font-bold leading-tight px-1">Next Steps</h3>

              <!-- Save to Profile -->
              <div class="group flex items-stretch justify-between gap-6 rounded-xl bg-white p-6 shadow-sm border border-slate-200 hover:border-primary/40 transition-all cursor-pointer">
                <div class="flex flex-col justify-between gap-4 flex-1">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-primary mb-1">
                      <span class="material-symbols-outlined text-sm">bolt</span>
                      <span class="text-xs font-bold uppercase tracking-wider">Recommended</span>
                    </div>
                    <p class="text-slate-900 text-lg font-bold leading-tight">Save to Secure Vault</p>
                    <p class="text-slate-600 text-sm leading-relaxed">
                      Add these ${answeredCount} verified responses to your profile to speed up 90% of future forms automatically.
                    </p>
                  </div>
                  <button class="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary/10 text-primary text-sm font-bold w-fit hover:bg-primary hover:text-white transition-all btn-press">
                    <span class="material-symbols-outlined text-sm">verified_user</span>
                    <span>Save to Profile</span>
                  </button>
                </div>
                <div class="hidden sm:block w-32 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div class="absolute inset-0 bg-primary/10">
                    <div class="flex h-full w-full items-center justify-center">
                      <span class="material-symbols-outlined text-primary/30 text-5xl">shield</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Share -->
              <div class="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-300 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                <div class="flex items-center gap-4">
                  <div class="size-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span class="material-symbols-outlined text-slate-500">share</span>
                  </div>
                  <div>
                    <p class="text-slate-900 text-sm font-semibold">Share Automation</p>
                    <p class="text-slate-500 text-xs">Invite colleagues to use FormMate</p>
                  </div>
                </div>
                <span class="material-symbols-outlined text-slate-400">chevron_right</span>
              </div>

              <!-- New Form -->
              <button id="btn-new-form" class="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors btn-press mt-4">
                <span class="material-symbols-outlined text-sm">add_circle</span>
                Fill Another Form
              </button>
            </div>

            <!-- Footer -->
            <div class="mt-12 pt-8 border-t border-slate-200 flex flex-col items-center gap-4">
              <p class="text-slate-400 text-xs text-center">
                Encrypted with 256-bit SSL security. Your data is never shared without your explicit consent.
              </p>
              <div class="flex gap-6">
                <a class="text-slate-400 hover:text-primary transition-colors text-xs font-medium cursor-pointer">Terms of Service</a>
                <a class="text-slate-400 hover:text-primary transition-colors text-xs font-medium cursor-pointer">Privacy Policy</a>
                <a class="text-slate-400 hover:text-primary transition-colors text-xs font-medium cursor-pointer">Help Center</a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `;

  function init(wrapper) {
    wrapper.querySelector('#btn-close').addEventListener('click', () => navigateTo('landing'));

    wrapper.querySelector('#btn-new-form').addEventListener('click', () => {
      // Reset state for new form
      setState({
        formUrl: '',
        formData: null,
        answers: {},
        chatMessages: [],
        analysisProgress: { step: 0, percent: 0, message: '' }
      });
      navigateTo('landing');
    });
  }

  return { html, init };
}
