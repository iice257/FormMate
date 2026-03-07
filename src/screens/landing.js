// ═══════════════════════════════════════════
// FormMate — Landing Screen
// ═══════════════════════════════════════════

import { setState, getState } from '../state.js';
import { navigateTo } from '../router.js';

export function landingScreen() {
  const html = `
    <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden" style="background: var(--fm-bg)">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Navigation -->
        <header class="flex items-center justify-between px-6 py-4 md:px-20 lg:px-40 bg-white/60 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div class="flex items-center gap-8">
            <div class="flex items-center gap-2.5">
              <div class="flex items-center justify-center size-9 rounded-lg bg-primary text-white">
                <span class="material-symbols-outlined text-xl">dynamic_form</span>
              </div>
              <h2 class="text-slate-900 text-lg font-bold tracking-tight">FormMate</h2>
            </div>
            <nav class="hidden md:flex gap-6 text-sm font-medium text-slate-500">
              <a class="hover:text-slate-900 transition-colors cursor-pointer" id="nav-product">Product</a>
              <a class="hover:text-slate-900 transition-colors cursor-pointer" id="nav-features">Features</a>
              <a class="hover:text-slate-900 transition-colors cursor-pointer" id="nav-pricing">Pricing</a>
            </nav>
          </div>
          <div class="flex items-center gap-3">
            <button class="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2" id="btn-login">Login</button>
            <button class="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all shadow-sm btn-press" id="btn-signup">Sign Up</button>
          </div>
        </header>

        <main class="flex-1 flex flex-col items-center px-6 pt-16 pb-12 md:pt-24">
          <!-- Hero Section -->
          <div class="max-w-[720px] w-full text-center space-y-6">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <span class="material-symbols-outlined text-sm">auto_awesome</span>
              Your AI Copilot for Forms
            </div>

            <h1 class="text-slate-900 text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Fill Any Form<br><span class="text-primary">in Seconds</span>
            </h1>

            <p class="text-slate-500 text-lg md:text-xl font-normal max-w-lg mx-auto leading-relaxed">
              Paste a form link and let AI generate smart answers, refine them with conversation, and autofill the entire form effortlessly.
            </p>

            <!-- URL Input -->
            <div class="mt-10 w-full max-w-xl mx-auto">
              <div class="bg-white p-2 rounded-2xl shadow-xl shadow-primary/5 border border-slate-200/60 flex flex-col md:flex-row gap-2">
                <div class="flex-1 relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                  <input
                    id="url-input"
                    class="w-full pl-11 pr-4 h-12 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 placeholder:text-slate-400 text-sm bg-transparent"
                    placeholder="Paste your form link here..."
                    type="text"
                  />
                </div>
                <button id="btn-analyze" class="bg-primary text-white px-8 h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 btn-press shadow-lg shadow-primary/25">
                  Analyze
                  <span class="material-symbols-outlined text-lg">arrow_forward</span>
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
          <div class="max-w-[960px] w-full mt-16">
            <div class="bg-white rounded-2xl shadow-2xl shadow-primary/5 border border-slate-200/50 overflow-hidden">
              <!-- Preview Chrome Bar -->
              <div class="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div class="flex gap-1.5">
                  <div class="size-3 rounded-full bg-slate-200"></div>
                  <div class="size-3 rounded-full bg-slate-200"></div>
                  <div class="size-3 rounded-full bg-slate-200"></div>
                </div>
                <div class="flex-1 flex justify-center">
                  <div class="bg-white rounded-md border border-slate-200 px-4 py-1 text-xs text-slate-400 w-80 text-center truncate">formmate.ai/workspace</div>
                </div>
              </div>

              <!-- Three-Column Preview -->
              <div class="flex min-h-[340px]">
                <!-- Sidebar Preview -->
                <div class="w-48 border-r border-slate-100 p-4 hidden md:flex flex-col gap-2">
                  <div class="flex items-center gap-2 mb-4">
                    <div class="size-6 bg-primary rounded-md"></div>
                    <span class="text-xs font-bold text-slate-700">FormMate</span>
                  </div>
                  <div class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    <span class="material-symbols-outlined text-sm">folder</span> Active Forms
                  </div>
                  <div class="flex items-center gap-2 px-2 py-1.5 text-slate-400 text-xs">
                    <span class="material-symbols-outlined text-sm">person</span> Profiles
                  </div>
                  <div class="flex items-center gap-2 px-2 py-1.5 text-slate-400 text-xs">
                    <span class="material-symbols-outlined text-sm">history</span> History
                  </div>
                </div>

                <!-- Center: Question Cards -->
                <div class="flex-1 p-6 space-y-4 overflow-hidden">
                  <h3 class="text-sm font-bold text-slate-800">Senior UX Designer Application</h3>
                  <p class="text-[10px] text-slate-400">posted by CreativeSync • 3h ago</p>

                  <div class="space-y-3 mt-4">
                    <!-- Question Card 1 -->
                    <div class="border border-slate-100 rounded-xl p-4">
                      <p class="text-xs font-semibold text-slate-500 mb-2">Professional Summary</p>
                      <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                        I am a Senior UX Designer with over 8 years of experience building accessible enterprise platforms. At my previous role at Acme Corp, I led the redesign of...
                      </div>
                      <div class="flex items-center justify-end mt-2">
                        <span class="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AI GENERATED</span>
                      </div>
                    </div>

                    <!-- Question Card 2 -->
                    <div class="border border-slate-100 rounded-xl p-4">
                      <p class="text-xs font-semibold text-slate-500 mb-2">Expected Salary Range</p>
                      <div class="border border-primary/30 rounded-lg p-3 text-xs text-primary font-medium">
                        Loading profile data...
                      </div>
                    </div>

                    <!-- Question Card 3 -->
                    <div class="border border-slate-100 rounded-xl p-4 opacity-80">
                      <p class="text-xs font-semibold text-slate-500 mb-2">Why do you want to join our team?</p>
                      <div class="text-xs text-slate-400 italic">Click to generate response based on company research</div>
                    </div>
                  </div>
                </div>

                <!-- Right: AI Chat Preview -->
                <div class="w-56 border-l border-slate-100 p-4 hidden lg:flex flex-col">
                  <div class="flex items-center gap-2 mb-4">
                    <span class="material-symbols-outlined text-primary text-sm">smart_toy</span>
                    <span class="text-xs font-bold">FormMate AI</span>
                  </div>
                  <div class="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed mb-3">
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
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Tedious Forms</h3>
                <p class="text-slate-500 text-sm leading-relaxed">The average person spends 4 hours a month filling out repetitive online forms and applications.</p>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow text-left">
                <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-lg">replay</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-2">Repetitive Answers</h3>
                <p class="text-slate-500 text-sm leading-relaxed">How many times have you typed your address or work history? We stop the endless cycle of repetition.</p>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow text-left">
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
              <div class="p-8 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
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
              <div class="p-8 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
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
              <div class="p-8 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
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
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow flex flex-col items-center gap-3 cursor-pointer" data-demo="job-application">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">work</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Job Apps</span>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow flex flex-col items-center gap-3 cursor-pointer" data-demo="job-application">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">school</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Scholarships</span>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow flex flex-col items-center gap-3 cursor-pointer" data-demo="customer-feedback">
                <div class="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">poll</span>
                </div>
                <span class="text-sm font-bold text-slate-900">Surveys</span>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer" data-demo="travel-visa">
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
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
                <p class="text-slate-600 text-sm leading-relaxed italic mb-4">"I applied to 60 jobs in the time it used to take to do 5. This is a game changer for job seekers."</p>
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">AE</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Alex Evans</p>
                    <p class="text-xs text-slate-400">Product Designer</p>
                  </div>
                </div>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
                <p class="text-slate-600 text-sm leading-relaxed italic mb-4">"The contextual generation is spooky accurate. It actually improved my personal statement on my college app."</p>
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">SJ</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Sarah Jardine</p>
                    <p class="text-xs text-slate-400">High School Senior</p>
                  </div>
                </div>
              </div>
              <div class="p-6 rounded-2xl bg-white border border-white shadow-sm hover:shadow-[0_4px_18px_rgba(91,19,236,0.18)] transition-shadow">
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
    </div>
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
