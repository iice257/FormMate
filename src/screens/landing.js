// ═══════════════════════════════════════════
// FormMate — Landing Screen
// ═══════════════════════════════════════════

import { setState, getState } from '../state.js';
import { navigateTo } from '../router.js';

export function landingScreen() {
  const html = `
    <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-mesh dark-mode-transition">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Navigation -->
        <header class="flex items-center justify-between px-6 py-4 md:px-12 lg:px-24 glass-header sticky top-0 z-50 transition-all">
          <div class="flex items-center gap-8">
            <div class="flex items-center gap-2.5 btn-press">
              <div class="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-primary">
                <span class="material-symbols-outlined text-xl">dynamic_form</span>
              </div>
              <h2 class="text-slate-900 text-xl font-black tracking-tight" style="font-family: var(--fm-font-sans)">FormMate</h2>
            </div>
            <nav class="hidden md:flex gap-8 text-sm font-semibold text-slate-500">
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-product">Product</a>
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-features">Features</a>
              <a class="hover:text-primary transition-colors cursor-pointer" id="nav-pricing">Pricing</a>
            </nav>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden lg:flex items-center gap-1.5 mr-4 text-slate-400 bg-white/50 px-2 py-1 rounded-md border border-slate-200 shadow-sm cursor-pointer hover:bg-white transition-colors">
              <span class="material-symbols-outlined text-[14px]">search</span>
              <span class="text-[10px] font-mono font-bold">Cmd K</span>
            </div>
            <button class="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2" id="btn-login">Login</button>
            <button class="bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 btn-press" id="btn-signup">Get Started</button>
          </div>
        </header>

        <main class="flex-1 flex flex-col items-center px-6 pt-20 pb-16 md:pt-32 z-10">
          <!-- Hero Section -->
          <div class="max-w-[800px] w-full text-center space-y-6 animate-screen-enter">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-sm shadow-sm transition-transform hover:scale-105 cursor-default">
              <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
              Smart AI Copilot
            </div>

            <h1 class="text-slate-900 text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
              Fill Any Form<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-accent">in Seconds.</span>
            </h1>

            <p class="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed mt-6">
              Paste a form link and let AI generate smart answers, refine them with conversation, and autofill the entire form effortlessly.
            </p>

            <!-- URL Input -->
            <div class="mt-12 w-full max-w-2xl mx-auto">
              <div class="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl shadow-primary/10 border border-slate-200 flex flex-col md:flex-row gap-2 transition-all hover:shadow-2xl hover:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                <div class="flex-1 relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                  <input
                    id="url-input"
                    class="w-full pl-11 pr-4 h-14 rounded-xl border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base bg-transparent font-medium"
                    placeholder="Paste your form link here..."
                    type="text"
                  />
                </div>
                <button id="btn-analyze" class="bg-primary text-white px-8 h-14 rounded-xl font-bold text-base hover:bg-primary-dark transition-all flex items-center justify-center gap-2 btn-press shadow-lg shadow-primary/25 group">
                  Start Analyzing
                  <span class="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>

              <p class="mt-4 text-slate-400 text-sm">
                Or try out these examples:
                <span class="text-primary cursor-pointer hover:underline font-medium" data-demo="job-application">Job Application</span>,
                <span class="text-primary cursor-pointer hover:underline font-medium" data-demo="customer-feedback">Mortgage Form</span>, or
                <span class="text-primary cursor-pointer hover:underline font-medium" data-demo="travel-visa">Travel Visa</span>
              </p>
            </div>
          </div>

          <!-- Workspace Preview (inline mockup) -->
          <div class="max-w-[1020px] w-full mt-20 stagger-children">
            <div class="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden group hover:shadow-[0_20px_60px_-15px_rgba(91,19,236,0.15)] transition-all duration-500">
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
                    <div class="size-7 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">F</div>
                    <span class="text-sm font-black text-slate-800 tracking-tight">FormMate</span>
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-[13px] font-bold shadow-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">edit_document</span> Active Form
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 text-slate-500 text-[13px] font-medium hover:bg-slate-100/50 rounded-lg cursor-pointer transition-colors">
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
              <div class="p-6 rounded-2xl card-premium shadow-sm text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Tedious Forms</h3>
                <p class="text-slate-500 text-sm leading-relaxed">The average person spends 4 hours a month filling out repetitive online forms and applications.</p>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">replay</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Repetitive Answers</h3>
                <p class="text-slate-500 text-sm leading-relaxed">How many times have you typed your address or work history? We stop the endless cycle of repetition.</p>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm text-left">
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
                <div class="bg-white rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
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
              <div class="p-8 rounded-2xl card-premium shadow-sm">
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
              <div class="p-8 rounded-2xl card-premium shadow-sm">
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
              <div class="p-8 rounded-2xl card-premium shadow-sm">
                <div class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <span class="material-symbols-outlined">bolt</span>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Instant Autofill</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Works across millions of sites. One keyboard shortcut or button click activates the FormMate helper on any web application.</p>
              </div>

              <div class="p-8 rounded-2xl bg-slate-900 text-white">
                <div class="flex items-center justify-between mb-5">
                  <h3 class="text-xl font-bold">Voice Input Mode</h3>
                  <div class="size-10 rounded-full bg-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-white">mic</span>
                  </div>
                </div>
                <p class="text-slate-300 text-sm leading-relaxed">Speak naturally. FormMate listens to your verbal responses and converts them into perfectly formatted form data.</p>
              </div>
            </div>
          </section>

          <!-- ═══ Section: Built for every application ═══ -->
          <section class="max-w-[960px] w-full mt-28 text-center">
            <h2 class="text-slate-900 text-3xl md:text-4xl font-extrabold tracking-tight mb-12">Built for every application</h2>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div class="p-6 rounded-2xl card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer" data-demo="job-application">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">work</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Job Apps</span>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer" data-demo="job-application">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">school</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Scholarships</span>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm flex flex-col items-center gap-3 cursor-pointer" data-demo="customer-feedback">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">poll</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Surveys</span>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer" data-demo="travel-visa">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">account_balance</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Gov Forms</span>
              </div>
            </div>
          </section>

          <!-- ═══ Section: Testimonials ═══ -->
          <section class="max-w-[960px] w-full mt-20">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-6 rounded-2xl card-premium shadow-sm">
                <p class="text-slate-600 text-sm leading-relaxed italic mb-4">"I applied to 60 jobs in the time it used to take to do 5. This is a game changer for job seekers."</p>
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">AE</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Alex Evans</p>
                    <p class="text-xs text-slate-400">Product Designer</p>
                  </div>
                </div>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm">
                <p class="text-slate-600 text-sm leading-relaxed italic mb-4">"The contextual generation is spooky accurate. It actually improved my personal statement on my college app."</p>
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">SJ</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Sarah Jardine</p>
                    <p class="text-xs text-slate-400">High School Senior</p>
                  </div>
                </div>
              </div>
              <div class="p-6 rounded-2xl card-premium shadow-sm">
                <p class="text-slate-600 text-sm leading-relaxed italic mb-4">"As a busy consultant, I have to fill dozens of intake forms weekly. FormMate saves me at least 5 hours a week."</p>
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">MC</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Marcus Chen</p>
                    <p class="text-xs text-slate-400">Consultant</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ═══ Section: CTA Banner ═══ -->
          <section class="max-w-[960px] w-full mt-20 mb-16">
            <div class="bg-slate-900 rounded-3xl p-12 md:p-16 text-center">
              <h2 class="text-white text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">
                Stop filling forms<br><span class="text-primary">manually.</span>
              </h2>
              <p class="text-slate-400 text-base max-w-md mx-auto mb-8">Join 50,000+ others who have reclaimed their time with AI-powered form filling.</p>
              <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button id="btn-cta-start" class="bg-primary text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 btn-press">
                  Get Started Now
                </button>
                <button id="btn-cta-contact" class="bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-full font-bold text-base hover:bg-white/20 transition-all">
                  Contact Sales
                </button>
              </div>
            </div>
          </section>

        </main>

        <!-- Footer -->
        <footer class="px-6 md:px-20 lg:px-40 py-10 border-t border-slate-100 bg-white">
          <div class="max-w-[960px] mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <span class="material-symbols-outlined text-lg">dynamic_form</span>
              </div>
              <span class="font-bold text-slate-900">FormMate</span>
            </div>
            <div class="flex flex-wrap gap-x-12 gap-y-4 text-xs text-slate-500 font-medium">
              <a class="hover:text-primary transition-colors cursor-pointer">Privacy Policy</a>
              <a class="hover:text-primary transition-colors cursor-pointer">Terms of Service</a>
              <a class="hover:text-primary transition-colors cursor-pointer">Cookie Settings</a>
              <a class="hover:text-primary transition-colors cursor-pointer">Help Center</a>
            </div>
            <span class="text-xs text-slate-400">© 2026 FormMate AI</span>
          </div>
        </footer>

      </div>
    </div >
    `;

  function init(wrapper) {
    const urlInput = wrapper.querySelector('#url-input');
    const btnAnalyze = wrapper.querySelector('#btn-analyze');

    // Restore saved URL
    const state = getState();
    if (state.formUrl) urlInput.value = state.formUrl;

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

    // Nav links scroll to sections
    wrapper.querySelector('#nav-product')?.addEventListener('click', () => {
      wrapper.querySelector('section')?.scrollIntoView({ behavior: 'smooth' });
    });
    wrapper.querySelector('#nav-features')?.addEventListener('click', () => {
      wrapper.querySelectorAll('section')[2]?.scrollIntoView({ behavior: 'smooth' });
    });
    wrapper.querySelector('#nav-pricing')?.addEventListener('click', () => {
      alert('Pricing page coming soon!');
    });

    // Auth buttons
    wrapper.querySelector('#btn-login')?.addEventListener('click', () => {
      alert('Login feature coming soon! For now, just paste a form URL to get started.');
    });
    wrapper.querySelector('#btn-signup')?.addEventListener('click', () => {
      alert('Sign up feature coming soon! For now, just paste a form URL to get started.');
    });

    // CTA buttons scroll to input
    wrapper.querySelector('#btn-cta-start')?.addEventListener('click', () => {
      urlInput.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => urlInput.focus(), 500);
    });
    wrapper.querySelector('#btn-cta-contact')?.addEventListener('click', () => {
      alert('Contact sales at hello@formmate.ai');
    });
  }

  return { html, init };
}
