// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Landing Screen
// ═══════════════════════════════════════════

import { setState, getState } from '../state';
import { getDashboardActionScreenForUser, getFormsEntryScreenForUser, navigateTo } from '../router';
import { escapeHtml, safeHttpUrl } from '../utils/escape';
import { normalizeSubmittedFormUrl } from '../parser/url-intake';
import { openAccountModal } from '../components/layout';

export function landingScreen() {
  const { isAuthenticated, userProfile } = getState();
  const dashboardActionLabel = isAuthenticated ? 'Go to Dashboard' : 'Sign In';

  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${avatarSrc}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 btn-press" id="btn-login">Sign In</button>`;

  const html = `
    <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-mesh">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Navigation -->
        <header data-fm-hide-on-scroll="true" class="flex items-center justify-between px-6 py-6 md:px-12 lg:px-24 sticky top-0 z-50 transition-all">
          <div class="flex-1 flex items-center justify-start">
            <button type="button" class="flex items-center gap-2.5 btn-press cursor-pointer bg-transparent border-0 p-0" id="btn-logo-home" aria-label="Go to home">
              <div class="size-10 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
              </div>
              <h2 class="text-slate-900 text-2xl font-black tracking-tighter" style="font-family: var(--fm-font-sans)">Form<span class="text-primary">Mate</span></h2>
            </button>
          </div>
          
          <nav class="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-full px-2.5 py-2 text-[15px] font-bold text-slate-500">
            ${isAuthenticated ? `<button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-forms">Dashboard</button>` : ''}
            <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-examples">Examples</button>
            <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-pricing">${(getState().tier && getState().tier !== 'free') ? 'Subscription' : 'Pricing'}</button>
            <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-docs">Docs</button>
          </nav>
 
          <div class="flex-1 flex items-center justify-end gap-3">
            ${authButtonHtml}
          </div>
        </header>

        <main class="flex-1 flex flex-col items-center px-6 pt-24 pb-16 md:pt-40 z-10">
          <!-- Hero Section -->
          <div class="max-w-[800px] w-full text-center space-y-6 animate-screen-enter">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-sm shadow-sm transition-transform hover:scale-105 cursor-default">
              <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
              Form Copilot
            </div>

            <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
              Fill Any Form<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-accent">in Seconds.</span>
            </h1>

            <p class="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed mt-6">
              Paste any <span class="font-bold text-slate-700">public</span> form link and let AI generate smart answers, refine them with conversation, and autofill the entire form effortlessly.
            </p>

            <!-- URL Input -->
            <div class="mt-12 w-full max-w-2xl mx-auto relative relative z-20">

              <div class="bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl hover:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                <div class="flex-1 relative">
                  <span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                  <input aria-label="Form URL"
                    id="url-input"
                    class="w-full pl-14 pr-4 h-14 rounded-full border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base bg-transparent font-medium focus-glow"
                    placeholder="Paste your form link here..."
                    type="text"
                  />
                </div>
                <button id="btn-analyze" class="bg-primary text-white px-5 sm:px-6 h-14 rounded-full font-bold text-sm sm:text-base hover:bg-primary-dark transition-all flex items-center justify-center gap-2 btn-press shadow-lg shadow-primary/25 group whitespace-nowrap">
                  Analyze
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </div>
              <div class="mt-8 flex flex-col items-center gap-4">
                <p class="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Or</p>
                <div class="flex flex-wrap justify-center gap-3">
                    <button id="btn-hero-examples" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">explore</span> Examples
                    </button>
                    <button id="btn-hero-chat" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">chat_bubble</span> Chat
                    </button>
                    <button id="btn-hero-help" class="px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 text-slate-800 text-[13px] font-bold hover:bg-white hover:border-primary/30 transition-all btn-press shadow-sm flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">help</span> Help Center
                    </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Workspace Preview (inline mockup) -->
          <div class="max-w-[1020px] w-full mt-32 stagger-children">
            <div class="bg-white/90 backdrop-blur-md rounded-[var(--fm-card-radius)] shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden group hover:shadow-[0_20px_60px_-15px_rgba(91,19,236,0.15)] transition-all duration-500">
              <!-- Preview Chrome Bar -->
              <div class="flex items-center gap-2 px-4 py-3 bg-slate-100/50 border-b border-slate-200/60">
                <div class="flex gap-1.5">
                  <div class="size-3 rounded-full bg-slate-300"></div>
                  <div class="size-3 rounded-full bg-slate-300"></div>
                  <div class="size-3 rounded-full bg-slate-300"></div>
                </div>
                <div class="flex-1 flex justify-center">
                  <div class="bg-white rounded-md border border-slate-200 px-4 py-1 text-[11px] font-medium text-slate-500 w-80 text-center truncate shadow-sm flex items-center justify-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">lock</span> formmate.ai/workspace
                  </div>
                </div>
              </div>

              <!-- Three-Column Preview -->
              <div class="flex min-h-[360px]">
                <!-- Sidebar Preview -->
                <div class="w-56 border-r border-slate-200/60 p-5 hidden md:flex flex-col gap-3 bg-slate-50/50">
                  <div class="flex items-center gap-2 mb-4">
                    <div class="size-7 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
                    </div>
                    <span class="text-sm font-black text-slate-900 tracking-tighter">Form<span class="text-primary">Mate</span></span>
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-[13px] font-bold shadow-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">edit_document</span> Active Form
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 text-slate-500 text-[13px] font-medium rounded-lg">
                    <span class="material-symbols-outlined text-[18px]">history</span> History
                  </div>
                </div>

                <!-- Center: Question Cards -->
                <div class="flex-1 p-6 lg:p-8 space-y-4 overflow-hidden relative">
                  <h3 class="text-xl font-black text-slate-900 tracking-tight">Senior UX Designer Application</h3>
                  <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CreativeSync</p>

                  <div class="space-y-4 mt-6">
                    <!-- Question Card 1 -->
                    <div class="border border-slate-200 rounded-xl p-5 shadow-sm bg-white transition-all group-hover:shadow-md animate-gentle-pulse">
                      <p class="text-[13px] font-bold text-slate-800 mb-2.5">Professional Summary</p>
                      <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[13px] text-slate-600 leading-relaxed font-medium">
                        I am a Senior UX Designer with over 8 years of experience building accessible enterprise platforms. At my previous role at Acme Corp, I led the redesign of...
                      </div>
                      <div class="flex items-center justify-end mt-3 gap-2">
                        <span class="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]">auto_awesome</span> AI GENERATED
                        </span>
                      </div>
                    </div>

                    <!-- Question Card 2 -->
                    <div class="border border-slate-200 rounded-xl p-4 shadow-sm bg-white opacity-70 cursor-not-allowed">
                      <p class="text-[13px] font-bold text-slate-800 mb-2">Expected Salary Range</p>
                      <div class="border border-dashed border-slate-300 rounded-lg p-3 text-[12px] text-slate-400 font-medium">
                        Waiting for user input...
                      </div>
                    </div>
                  </div>

                  <!-- Fade out bottom gradient -->
                  <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>

                <!-- Right: AI Chat Preview -->
                <div class="w-64 border-l border-slate-200/60 p-5 hidden lg:flex flex-col bg-white">
                  <div class="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                      <span class="text-[13px] font-bold text-slate-800">Copilot</span>
                    </div>
                    <span class="text-[9px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                  </div>
                  <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[12px] text-slate-700 leading-relaxed mb-4 font-medium shadow-sm relative">

                    I've detected 12 fields. 8 have been auto-filled based on your "UX Design" profile.
                  </div>
                  <div class="bg-primary/10 rounded-xl p-3 text-[11px] text-primary font-medium mb-3">
                    "Please elaborate more on my React experience in question 4"
                  </div>
                  <div class="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
                    Updating... I've added your 7 years of React development and specifically mentioned the component library you built.
                  </div>
                  <div class="mt-auto pt-4">
                    <div class="bg-white border border-slate-200 rounded-lg p-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Ask AI...</span>
                      <span class="material-symbols-outlined text-primary text-sm">send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ Section: Why is paperwork still so hard? ═══ -->
          <section class="max-w-[960px] w-full mt-28 text-center">
            <h2 class="text-slate-900 text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Why is paperwork still so hard?</h2>
            <p class="text-slate-400 text-sm max-w-lg mx-auto mb-12">We've spent thousands of hours analyzing the friction of data entry. Here is what we're fixing.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Tedious Forms</h3>
                <p class="text-slate-500 text-sm leading-relaxed">The average person spends 4 hours a month filling out repetitive online forms and applications.</p>
              </div>
              <div class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">replay</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Repetitive Answers</h3>
                <p class="text-slate-500 text-sm leading-relaxed">How many times have you typed your address or work history? We stop the endless cycle of repetition.</p>
              </div>
              <div class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">psychology_alt</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Mental Fatigue</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Searching through emails for old documents makes it draining. Let AI handle the retrieval for you.</p>
              </div>
            </div>
          </section>

          <!-- ═══ Section: One click, zero typing ═══ -->
          <section class="max-w-[960px] w-full mt-28">
            <div class="flex flex-col md:flex-row gap-12 items-center">
              <!-- Left: Steps -->
              <div class="flex-1 space-y-6">
                <h2 class="text-slate-900 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">One click,<br><span class="text-primary">zero typing.</span></h2>

                <div class="space-y-6 mt-8">
                  <div class="flex items-start gap-4">
                    <div class="size-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <div>
                      <h4 class="font-bold text-slate-900 text-sm">Paste link</h4>
                      <p class="text-slate-500 text-sm leading-relaxed">Simply copy any URL of a form or application and drop it into the FormMate interface.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div class="size-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <div>
                      <h4 class="font-bold text-slate-900 text-sm">AI Analyzes</h4>
                      <p class="text-slate-500 text-sm leading-relaxed">Our model engine maps the form fields to your verified profile and historical data securely.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4">
                    <div class="size-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <div>
                      <h4 class="font-bold text-slate-900 text-sm">Answers Appear</h4>
                      <p class="text-slate-500 text-sm leading-relaxed">Fields populate instantly — just review and submit.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Mockup -->
              <div class="flex-1 w-full">
                <div class="bg-white rounded-[var(--fm-card-radius)] border border-slate-200/60 shadow-xl overflow-hidden">
                  <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div class="flex gap-1.5">
                      <div class="size-2.5 rounded-full bg-slate-200"></div>
                      <div class="size-2.5 rounded-full bg-slate-200"></div>
                      <div class="size-2.5 rounded-full bg-slate-200"></div>
                    </div>
                    <div class="flex-1 flex justify-center">
                      <div class="bg-white rounded border border-slate-200 px-3 py-0.5 text-[10px] text-slate-400 w-56 text-center truncate">https://application.creativesync.com</div>
                    </div>
                    <button class="bg-primary text-white text-[10px] px-3 py-1 rounded font-bold">Analyze</button>
                  </div>
                  <div class="p-5 space-y-3">
                    <div class="flex items-center gap-2 text-[11px]">
                      <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span class="text-slate-500">creativesync.com</span>
                      <span class="ml-auto text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                    </div>
                    <div class="border border-slate-100 rounded-lg p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="size-5 rounded bg-primary/10 flex items-center justify-center"><span class="material-symbols-outlined text-primary text-xs">person</span></div>
                        <span class="text-[11px] font-bold text-slate-700">Full Name</span>
                        <span class="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AUTOFILLED</span>
                      </div>
                      <div class="bg-slate-50 rounded px-3 py-2 text-xs text-slate-700">Alexandra Martinez</div>
                    </div>
                    <div class="border border-primary/30 rounded-lg p-3 bg-primary/5">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="size-5 rounded bg-primary/10 flex items-center justify-center"><span class="material-symbols-outlined text-primary text-xs">work</span></div>
                        <span class="text-[11px] font-bold text-slate-700">Experience</span>
                        <span class="ml-auto"><span class="material-symbols-outlined text-primary text-sm animate-spin">sync</span></span>
                      </div>
                      <div class="bg-white rounded px-3 py-2 text-xs text-primary font-medium">Generating context-aware response...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ═══ Section: Feature Showpieces ═══ -->
          <section class="max-w-[960px] w-full mt-28">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Contextual AI Answer Gen -->
              <div class="p-8 rounded-[var(--fm-card-radius)] card-premium shadow-sm">
                <div class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <span class="material-symbols-outlined">auto_awesome</span>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Contextual AI Answer Gen</h3>
                <p class="text-slate-500 text-sm leading-relaxed mb-4">Our AI doesn't just copy-paste. It references your experience to match the specific tone and requirements of each form field.</p>
                <div class="flex gap-3 text-[11px] text-slate-400 font-medium">
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-green-500 text-sm">check</span> Semantic Matching</span>
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-green-500 text-sm">check</span> Tone Adaptation</span>
                </div>
              </div>

              <!-- Conversational Editing -->
              <div class="p-8 rounded-[var(--fm-card-radius)] card-premium shadow-sm">
                <div class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <span class="material-symbols-outlined">chat</span>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Conversational Editing</h3>
                <p class="text-slate-500 text-sm leading-relaxed mb-4">Want to change an answer? Just tell the AI "Make my experience sound more technical" and watch it update in real time.</p>
                <div class="flex gap-3 text-[11px] text-slate-400 font-medium">
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-green-500 text-sm">check</span> Natural Language</span>
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-green-500 text-sm">check</span> Live Updates</span>
                </div>
              </div>
            </div>

            <!-- Instant Autofill + Voice Input -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div class="p-8 rounded-[var(--fm-card-radius)] card-premium shadow-sm">
                <div class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <span class="material-symbols-outlined">bolt</span>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Instant Autofill</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Works across millions of sites. One keyboard shortcut or button click activates the FormMate helper on any web application.</p>
              </div>

              <div class="p-8 rounded-[var(--fm-card-radius)] bg-slate-900 text-white">
                <div class="flex items-center justify-between mb-5">
                  <h3 class="text-xl font-bold">Voice Input Mode</h3>
                  <div class="size-10 rounded-full bg-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-white">mic</span>
                  </div>
                </div>
                <p class="text-slate-300 text-sm leading-relaxed">Speak naturally. FormMate AI listens to your verbal responses and converts them into perfectly formatted form data.</p>
              </div>
            </div>
          </section>

          <!-- ═══ Section: Built for every application ═══ -->
          <section class="max-w-[960px] w-full mt-28 text-center">
            <div class="mb-12">
              <h2 class="text-slate-900 text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Built for every application</h2>
              <p class="text-slate-500 text-lg">Try out these examples</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <button type="button" class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" data-demo="job-application" aria-label="Try the Job Apps example">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">work</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Job Apps</span>
              </button>
              <button type="button" class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" data-demo="scholarship" aria-label="Try the Scholarships example">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">school</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Scholarships</span>
              </button>
              <button type="button" class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" data-demo="customer-feedback" aria-label="Try the Surveys example">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">poll</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Surveys</span>
              </button>
              <button type="button" class="p-6 rounded-[var(--fm-card-radius)] card-premium shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-shadow group" id="btn-view-more-examples" aria-label="View more examples">
                <div class="flex items-center gap-1.5 text-primary font-bold text-sm">
                  <span>View more examples</span>
                  <span class="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </div>
              </button>
            </div>
          </section>

          <!-- ═══ Section: Testimonials ═══ -->
          <section class="max-w-[1000px] w-full mt-28 mx-auto text-center flex flex-col items-center">
            <h2 class="text-slate-900 text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Loved by <span class="text-primary font-cursive">thousands</span></h2>
            <p class="text-slate-500 text-lg mb-12">What people are saying</p>
            
            <div id="testimonials-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left transition-all duration-500 overflow-hidden relative" style="max-height: 220px;">
              <!-- Initially we'll just put an empty div, we will render it via JS! -->
            </div>
            
            <!-- Fade out gradient for collapsed state -->
            <div id="testimonials-fade" class="w-full h-32 -mt-32 bg-gradient-to-t from-mesh to-transparent pointer-events-none relative z-10 transition-opacity"></div>

            <button id="btn-more-testimonials" class="mt-8 text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors mx-auto py-2.5 px-5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 relative z-20">
              <span id="btn-more-text">read more testimonials</span>
              <span id="btn-more-icon" class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </section>

          <!-- ═══ Section: CTA Banner ═══ -->
          <section class="max-w-[960px] w-full mt-20 mb-16">
            <div class="bg-slate-900 rounded-3xl p-12 md:p-16 text-center">
              <h2 class="text-white text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">
                Stop filling forms<br><span class="text-primary">manually.</span>
              </h2>
              <p class="text-slate-400 text-base max-w-md mx-auto mb-8">Join 500+ early adopters who have reclaimed their time with AI-powered form filling.</p>
              <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button id="btn-cta-start" class="bg-primary text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 btn-press">
                  Get Started Now
                </button>
                <button id="btn-cta-dashboard" class="bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-full font-bold text-base hover:bg-white/20 transition-all">
                  ${dashboardActionLabel}
                </button>
              </div>
            </div>
          </section>

        </main>

        <!-- Footer -->
        <footer class="px-6 md:px-20 lg:px-40 py-12 border-t border-slate-100 bg-white">
          <div class="max-w-[1100px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div class="flex items-center gap-2.5 shrink-0">
              <div class="size-8 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
              </div>
              <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span></span>
            </div>
            
            <div class="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-slate-500 font-medium">
              <button type="button" class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">Privacy Policy</button>
              <button type="button" class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">Terms of Service</button>
              <button type="button" class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">Cookie Settings</button>
              <button type="button" class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0" id="btn-footer-help">Help Center</button>
            </div>
            
            <div class="text-xs text-slate-400 shrink-0">© 2026 FormMate</div>
          </div>
        </footer>

      </div>
    </div >
    `;

  function init(wrapper) {
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');
    wrapper.querySelector('#btn-footer-help')?.addEventListener('click', () => navigateTo('docs'));

    wrapper.querySelector('#btn-hero-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#btn-hero-chat')?.addEventListener('click', () => navigateTo('ai-chat'));
    wrapper.querySelector('#btn-hero-help')?.addEventListener('click', () => navigateTo('docs'));

    // Restore saved URL
    const state = getState();
    if (state.formUrl) urlInput.value = state.formUrl;

    // Analyze button
    btnAnalyze.addEventListener('click', () => {
      // Basic reset
      urlInput.classList.remove('ring-2', 'ring-red-500', 'animate-shake-horizontal');
      btnAnalyze.innerHTML = `Analyze <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;

      try {
        const url = normalizeSubmittedFormUrl(urlInput.value, { allowDemo: true });
        urlInput.value = url;
        setState({ formUrl: url });
        navigateTo('analyzing');
      } catch (e) {
        triggerError(e?.message || 'Invalid URL format');
      }
    });

    function triggerError(msg) {
      urlInput.focus();
      urlInput.classList.add('ring-2', 'ring-red-500', 'animate-shake-horizontal');
      btnAnalyze.innerHTML = `<span class="material-symbols-outlined text-xl">error</span> ${escapeHtml(msg)}`;
      btnAnalyze.classList.add('bg-red-500', 'hover:bg-red-600');

      setTimeout(() => {
        urlInput.classList.remove('ring-2', 'ring-red-500', 'animate-shake-horizontal');
        btnAnalyze.innerHTML = `Analyze <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
        btnAnalyze.classList.remove('bg-red-500', 'hover:bg-red-600');
      }, 2000);
    }
    // Enter key on input
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAnalyze.click();
    });

    // Demo links
    wrapper.querySelectorAll('[data-demo]').forEach(el => {
      el.addEventListener('click', () => {
        const demoType = el.dataset.demo;
        const urls = {
          'job-application': 'demo://job-application',
          'customer-feedback': 'demo://customer-feedback',
          'travel-visa': 'demo://travel-visa',
          'scholarship': 'demo://scholarship'
        };
        urlInput.value = urls[demoType] || urls['customer-feedback'];
        setState({ formUrl: urlInput.value });
        navigateTo('analyzing');
      });
    });

    // View more examples link
    const viewMoreBtn = wrapper.querySelector('#btn-view-more-examples');
    if (viewMoreBtn) {
      viewMoreBtn.addEventListener('click', () => {
        navigateTo('examples');
      });
    }

    // Nav links scroll to sections
    // Nav links
    // Navigation routing


    wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    wrapper.querySelector('#nav-forms')?.addEventListener('click', () => {
      navigateTo(getDashboardActionScreenForUser());
    });
    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#nav-pricing')?.addEventListener('click', () => navigateTo('pricing'));
    wrapper.querySelector('#nav-docs')?.addEventListener('click', () => navigateTo('docs'));
    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => openAccountModal('profile'));

    wrapper.querySelector('#btn-cta-start')?.addEventListener('click', () => {
      urlInput.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => urlInput.focus(), 500);
    });

    wrapper.querySelector('#btn-cta-dashboard')?.addEventListener('click', () => {
      navigateTo(getDashboardActionScreenForUser());
    });

    // Testimonials Logic
    const testimonialsList = [
      { quote: "I applied to 14 product design roles in one weekend using FormMate. Each cover letter was tailored to the company's specific stack. My callback rate went from 12% to nearly 40%.", author: "James Peterson", role: "Procurement Analyst, Deloitte" },
      { quote: "The AI correctly auto-filled my 6 years of Python and Go experience across three different ATS formats without me editing a single line. That alone justified the subscription.", author: "Aisha Patel", role: "Software Engineer, Stripe" },
      { quote: "I process about 30 new patient intake forms per week. FormMate helps my admin staff pre-populate medical histories so patients only need to verify — saves roughly 2 hours daily.", author: "Dr. Marcus Thorne", role: "Clinical Psychologist" },
      { quote: "Our team used FormMate to fill out Michigan's annual compliance renewal — 47 fields across 5 pages. It pulled our EIN, DUNS number, and officer details from the vault perfectly.", author: "Sarah Jenkins", role: "Operations Lead, Acme Corp" },
      { quote: "I was skeptical because every autofill tool I've tried breaks on Workday's custom iframes. FormMate actually parsed the nested fields and suggested accurate answers for each one.", author: "David Reyes", role: "B2B Sales Executive, HubSpot" },
      { quote: "As a solo consultant, I answer the same 20 vendor security questionnaire items for every new client. FormMate stores my SOC 2 responses and adapts them per client's specific language.", author: "Chloe O'Brian", role: "Independent Security Consultant" },
      { quote: "I used the voice input feature to dictate answers to a Schengen visa application while cooking dinner. It transcribed and formatted everything, including my travel itinerary dates.", author: "Rafael Dominguez", role: "Freelance Photographer" },
      { quote: "Our HR team rolled this out for the entire recruiting department. We process 200+ Greenhouse applications a month, and FormMate cut our average time-per-form from 18 minutes to under 4.", author: "Nina Kowalski", role: "Head of Talent Acquisition, Figma" },
      { quote: "I'm a grad student applying to 8 PhD programs simultaneously. FormMate adapted my research statement for each university's specific word count and prompt requirements. Lifesaver.", author: "Tomás Herrera", role: "PhD Candidate, MIT" },
      { quote: "The Copilot suggested I reframe my teaching experience as 'curriculum design and stakeholder engagement' on a product manager application. I got the interview.", author: "Priya Chandrasekar", role: "Career Switcher, Ex-Teacher" },
      { quote: "We handle insurance claims that require 60+ fields of vehicle and driver data. FormMate's vault remembered all of it after the first claim. Now renewals take 90 seconds.", author: "Greg Halloran", role: "Claims Adjuster, State Farm" },
      { quote: "I run a small nonprofit and we fill out about a dozen grant applications per quarter. FormMate keeps our mission statement, budget summaries, and board details perfectly organized.", author: "Amara Osei", role: "Executive Director, Bright Futures Foundation" }
    ];

    const grid = wrapper.querySelector('#testimonials-grid');
    grid.innerHTML = testimonialsList.map(t => `
      <div class="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full">
        <p class="text-slate-700 text-sm mb-6 leading-relaxed">"${t.quote}"</p>
        <div class="flex items-center gap-3 mt-auto">
          <div class="size-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase">${t.author.substring(0, 2)}</div>
          <div>
            <div class="text-sm font-bold text-slate-900">${t.author}</div>
            <div class="text-[11px] text-slate-500 font-medium">${t.role}</div>
          </div>
        </div>
      </div>
    `).join('');

    const moreBtn = wrapper.querySelector('#btn-more-testimonials');
    let expanded = false;

    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        expanded = !expanded;
        const fade = wrapper.querySelector('#testimonials-fade');
        const textStr = wrapper.querySelector('#btn-more-text');
        const icon = wrapper.querySelector('#btn-more-icon');

        if (expanded) {
          grid.style.maxHeight = grid.scrollHeight + "px";
          fade.style.opacity = "0";
          textStr.textContent = "Show less";
          icon.textContent = "expand_less";
        } else {
          grid.style.maxHeight = "220px";
          fade.style.opacity = "1";
          textStr.textContent = "read more testimonials";
          icon.textContent = "expand_more";
          // Scroll back up slightly to ensure context
          grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  return { html, init };
}
