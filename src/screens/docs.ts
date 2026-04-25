// @ts-nocheck
import { navigateTo } from '../router';
import { AI_SURFACES, generateText, getAiErrorMessage } from '../ai/ai-service';
import { SESSION_CLOSED_EVENT } from '../auth/session-lifecycle';
import { toast } from '../components/toast';
import { getState } from '../state';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { replaceChildrenWithSafeHtml } from '../utils/safe-html';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';
import {
  buildMessageWithUiContext,
  buildNextFollowUps,
  createFollowUpClickEvent,
  createUiContextEvent,
  enqueueUiContextEvent,
  getDefaultFollowUps,
  stripFollowUpTags,
} from '../ai/chat-interactions';

const DOCS_KNOWLEDGE = [
  { id: 'welcome', title: 'Welcome to FormMate', text: 'FormMate helps users fill out tedious, long, and complex online forms by reading form questions, using saved Vault/profile context, and drafting answers for review.', type: 'guide' },
  { id: 'first-form', title: 'Filling Your First Form', text: 'Start from the Dashboard or New Form screen, paste a form URL, analyze the form, review the generated workspace answers, then copy or submit with user approval.', type: 'guide' },
  { id: 'vault', title: 'The Information Vault', text: 'The Vault stores reusable personal context such as education, work history, project details, portfolio links, preferences, and other data the AI can reference when drafting answers.', type: 'guide' },
  { id: 'copilot', title: 'Using the Form Copilot', text: 'The Form Copilot helps refine workspace answers, rewrite tone, shorten responses, explain field categories, and apply targeted edits to active form answers.', type: 'guide' },
  { id: 'editing', title: 'Reviewing & Editing', text: 'Users should review every generated answer in the Workspace, edit fields manually when needed, regenerate AI-supported answers, and confirm outputs before submission.', type: 'guide' },
  { id: 'account', title: 'Managing Your Account', text: 'Account settings, profile details, vault data, preferences, and supported account-backed storage are managed in the Accounts Center.', type: 'guide' },
  { id: 'history', title: 'Form History', text: 'Form History lets users reopen recently analyzed forms and continue from previous context when stored history is available.', type: 'guide' },
  { id: 'faqs', title: 'Free Access FAQ', text: 'FormMate is currently available as a free offering while the product is in active development.', type: 'faq' },
  { id: 'faqs', title: 'Multi-step FAQ', text: 'FormMate can support multi-step forms when the parser can access the visible form state and the user remains in control of each step.', type: 'faq' },
  { id: 'faqs', title: 'Security FAQ', text: 'Vault data is private to the user session/account context and is used only where relevant to FormMate features. Users should avoid adding unnecessary sensitive data.', type: 'faq' },
  { id: 'feedback', title: 'Review & Feedback', text: 'Users can share feedback from the Docs feedback section to help improve FormMate.', type: 'guide' },
  { id: 'contact', title: 'Contact Us', text: 'Users can contact support from the Docs contact section with questions, bugs, or partnership inquiries.', type: 'guide' },
  { id: 'privacy', title: 'Privacy Policy', text: 'FormMate may process account profile details, vault data, form structure, screenshots supplied by the user, and prompts needed for AI-powered form workflows.', type: 'legal' },
  { id: 'terms', title: 'Terms of Service', text: 'Users are responsible for reviewing generated outputs before use and may not use FormMate for abuse, deception, unlawful bypassing, or unrelated inference at scale.', type: 'legal' },
];

function tokenizeDocsText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function getRelevantDocsSnippets(query, limit = 4) {
  const terms = new Set(tokenizeDocsText(query));
  const scored = DOCS_KNOWLEDGE.map((entry) => {
    const haystack = `${entry.title} ${entry.text}`.toLowerCase();
    let score = 0;
    terms.forEach((term) => {
      if (entry.title.toLowerCase().includes(term)) score += 4;
      if (haystack.includes(term)) score += 1;
    });
    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => `### ${entry.title}\n${entry.text}`);

  if (scored.length) return scored;

  return DOCS_KNOWLEDGE
    .filter((entry) => ['welcome', 'first-form', 'vault', 'copilot'].includes(entry.id))
    .slice(0, limit)
    .map((entry) => `### ${entry.title}\n${entry.text}`);
}

export function docsScreen() {
  const authed = getState().isAuthenticated;

  const html = `
    <div class="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <style>
        .docs-signin-cta {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid transparent;
          background:
            linear-gradient(var(--fm-primary), var(--fm-primary)) padding-box,
            linear-gradient(115deg, rgba(255,255,255,0.32), rgba(139,249,249,0.78), rgba(34,152,218,0.55), rgba(255,255,255,0.24)) border-box;
          box-shadow: 0 16px 34px -22px rgba(34, 152, 218, 0.95);
          transform: translateZ(0);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            filter 160ms ease;
        }

        .docs-signin-cta::after {
          content: "";
          position: absolute;
          inset: -2px;
          z-index: -1;
          background: linear-gradient(110deg, transparent 0 20%, rgba(255,255,255,0.7) 38%, rgba(139,249,249,0.86) 50%, rgba(255,255,255,0.52) 62%, transparent 80% 100%);
          transform: translateX(-130%);
          opacity: 0;
          pointer-events: none;
        }

        .docs-signin-cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 18px 42px -22px rgba(34, 152, 218, 1);
        }

        .docs-signin-cta:hover::after,
        .docs-signin-cta-enter::after {
          opacity: 1;
          animation: docs-signin-shimmer 1450ms cubic-bezier(0.16, 1, 0.3, 1) 1;
        }

        @keyframes docs-signin-shimmer {
          from { transform: translateX(-130%); }
          to { transform: translateX(130%); }
        }
      </style>
      <!-- Navigation Bar -->
      <header class="docs-topbar h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 z-30">
        <div class="flex-1 flex justify-start">
          <button type="button" class="docs-home-button bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press" id="btn-home">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </button>
        </div>
        
        <div class="flex-1 flex justify-center items-center gap-3 md:gap-4 min-w-0">
            <span class="font-black text-base md:text-lg tracking-tighter text-slate-900 whitespace-nowrap">Form<span class="text-primary">Mate</span> Docs &amp; Help</span>
          <div class="w-px h-6 bg-slate-200 hidden md:block"></div>
          <div class="hidden md:block flex-1 max-w-lg lg:max-w-xl" id="docs-search-wrapper">
             <div class="relative w-full" id="docs-search-container">
               <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
               <input type="text" id="docs-search-input" placeholder="Search guides..." aria-label="Search guides" class="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-sm transition-all outline-none" />
               <button id="btn-clear-search" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors hidden">
                  <span class="material-symbols-outlined text-[16px]">close</span>
               </button>
               <div id="search-results-dropdown" class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden hidden z-50">
                  <div id="search-results-list" class="max-h-[300px] overflow-y-auto p-2 space-y-1"></div>
                  <div id="search-footer" class="p-3 bg-slate-50 border-t border-slate-100 text-center">
                     <button id="btn-ask-ai-search" class="text-[11px] font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5 w-full">
                        <span class="material-symbols-outlined text-[14px]">smart_toy</span>
                        Cant find what youre looking for? Ask our AI
                     </button>
                  </div>
               </div>
             </div>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-end gap-2 md:gap-3 text-sm font-semibold">
          <button type="button" class="px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all border bg-primary text-white border-primary shadow-sm" data-docs-nav="docs">Docs</button>
          <button type="button" class="px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all border bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary" data-docs-nav="privacy">Privacy Policy</button>
          <button type="button" class="px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all border bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary" data-docs-nav="terms">Terms</button>
        </div>
      </header>

      <!-- Layout -->
      <div class="flex flex-1 overflow-hidden relative">
        <!-- Sidebar -->
        <aside id="docs-sidebar-left" class="w-64 border-r border-slate-200 bg-slate-50 shrink-0 hidden md:flex flex-col py-6 overflow-y-auto no-scrollbar relative">
          <nav class="space-y-6 px-4" id="docs-nav-sidebar">
             <div>
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Getting Started</h4>
                <div class="space-y-1">
                   <a href="#welcome" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Welcome to FormMate</a>
                   <a href="#first-form" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Filling Your First Form</a>
                </div>
             </div>
             
             <div>
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Core Features</h4>
                <div class="space-y-1">
                   <a href="#vault" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">The Information Vault</a>
                   <a href="#copilot" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Using the Form Copilot</a>
                   <a href="#editing" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Reviewing & Editing</a>
                </div>
             </div>

             <div>
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Account & Preferences</h4>
                <div class="space-y-1">
                   <a href="#account" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Managing Your Account</a>
                   <a href="#history" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Form History</a>
                </div>
             </div>

             <div>
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Support</h4>
                <div class="space-y-1">
                   <a href="#faqs" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Frequently Asked Questions</a>
                </div>
             </div>
             
             <div>
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Connect</h4>
                <div class="space-y-1">
                   <a href="#feedback" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Review & Feedback</a>
                   <a href="#contact" class="sidebar-link flex items-center px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors">Contact Us Form</a>
                </div>
             </div>
          </nav>
          
        </aside>

        <!-- Left Resize Handle -->
        <div id="handle-left" class="w-1.5 hover:bg-primary/20 cursor-col-resize shrink-0 z-40 transition-colors hidden md:block"></div>

        <!-- Content -->
        <main class="flex-1 overflow-y-auto bg-white scroll-smooth relative" id="docs-content">
          <div class="max-w-3xl mx-auto px-6 lg:px-12 py-12 pb-32">
            <article id="welcome" class="mb-20 scroll-mt-24">
               <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-4">
                 <span class="material-symbols-outlined text-[14px]">waving_hand</span> Welcome
               </div>
               <h1 class="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Welcome to FormMate</h1>
               <p class="text-lg text-slate-600 leading-relaxed mb-6">FormMate is your intelligent assistant for filling out tedious, long, and complex online forms. Instead of typing out your personal details, work experience, or answers to repetitive questions over and over, FormMate does it for you in seconds.</p>
               
               <h3 class="text-xl font-bold text-slate-900 mb-3">How does it work?</h3>
               <p class="text-base text-slate-600 leading-relaxed mb-6">You simply provide FormMate with a link to a form (like a job application, registration page, or survey). Our AI instantly reads the questions, looks at the personal details you've securely saved in your "Vault", and generates the perfect thoughtful answers. You can chat with the Copilot to tweak those answers, and then copy them directly!</p>
               
               <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                 <div class="p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-start text-left">
                    <span class="material-symbols-outlined text-primary mb-3 text-2xl bg-white p-2 rounded-lg shadow-sm border border-slate-100">timer</span>
                    <h3 class="font-bold text-slate-900 mb-1">Save Hours</h3>
                    <p class="text-sm text-slate-500">Stop typing the same answers repeatedly.</p>
                 </div>
                 <div class="p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-start text-left">
                    <span class="material-symbols-outlined text-primary mb-3 text-2xl bg-white p-2 rounded-lg shadow-sm border border-slate-100">auto_awesome</span>
                    <h3 class="font-bold text-slate-900 mb-1">Tailored Answers</h3>
                    <p class="text-sm text-slate-500">The AI adapts to the form's unique context flawlessly.</p>
                 </div>
               </div>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- First Form -->
            <article id="first-form" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Filling Your First Form
                 <a href="#first-form" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                 Using FormMate is incredibly easy. Here is the step-by-step process of how to handle any form:
               </p>

               <div class="space-y-6">
                  <div class="flex gap-4">
                     <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                     <div>
                        <h4 class="font-bold text-slate-900 text-lg mb-1">Paste a URL</h4>
                        <p class="text-slate-600 text-sm">On the Dashboard, paste the URL of the form you want to fill into the input box and press "Analyze Form".</p>
                     </div>
                  </div>
                  <div class="flex gap-4">
                     <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
                     <div>
                        <h4 class="font-bold text-slate-900 text-lg mb-1">Wait for Magic</h4>
                        <p class="text-slate-600 text-sm">FormMate will rapidly scan the page, identify all the fields, dropdowns, and text areas, and generate the best answers using your Vault data.</p>
                     </div>
                  </div>
                  <div class="flex gap-4">
                     <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">3</div>
                     <div>
                        <h4 class="font-bold text-slate-900 text-lg mb-1">Review & Modify</h4>
                        <p class="text-slate-600 text-sm">You'll be taken to the Workspace where you can read through the answers, ask the Copilot to change them, or rewrite them yourself.</p>
                     </div>
                  </div>
               </div>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- The Vault -->
            <article id="vault" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 The Information Vault
                 <a href="#vault" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                 The <strong>Vault</strong> is your secure, personal database inside FormMate. Think of it as your brain's notepad. 
                 It stores information like your Full Name, Education History, Job Experience, specific project details, or even links to your portfolio.
               </p>
               
               <div class="p-6 bg-amber-50 rounded-xl border border-amber-200 mb-8">
                 <h4 class="font-bold text-amber-900 text-sm flex items-center gap-2 mb-2">
                   <span class="material-symbols-outlined text-amber-600 text-lg">security</span> Privacy & Security
                 </h4>
                 <p class="text-amber-800 text-sm">Your Vault data is private. It is only retrieved when the AI needs specific context to answer a question on your behalf, and is never shared or used to train public AI models.</p>
               </div>

               <h3 class="text-lg font-bold text-slate-900 mb-3">How to add items to your Vault:</h3>
               <ul class="list-disc pl-5 space-y-2 text-slate-600 mb-6 text-sm">
                 <li>Go to the <strong>Accounts Center</strong> from the left sidebar navigation.</li>
                 <li>Click on the <strong>Vault</strong> tab.</li>
                 <li>Click the "Add Entry" button to explicitly add key-value pairs (e.g., Key: "Hometown", Value: "Chicago").</li>
                 <li>You can also fill out the general "Bio" and "Occupation" fields in the <strong>Profile</strong> tab, which the AI references heavily.</li>
               </ul>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- The Copilot -->
            <article id="copilot" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Using the AI Copilot
                 <a href="#copilot" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                 On the right side of the Workspace screen sits your <strong>AI Copilot</strong>. This is a conversational assistant whose sole job is to help you craft the absolute perfect response for any given field securely.
               </p>
               
               <h3 class="text-lg font-bold text-slate-900 mb-3">Chatting with the Copilot</h3>
               <p class="text-sm text-slate-600 mb-4">You can type instructions directly into the chat box. For example:<br>
               <em>"Make all of the answers sound much more formal."</em><br>
               <em>"Shorten the response to question 3."</em><br>
               <em>"I forgot to mention in my vault that I know Python. Update my programming answer."</em></p>

               <div class="flex flex-col sm:flex-row gap-4 mb-6 mt-6">
                 <div class="flex-1 border border-slate-200 rounded-xl p-5 hover:border-primary/40 transition-colors">
                   <div class="flex items-center gap-2 mb-2">
                     <span class="material-symbols-outlined text-primary">face</span>
                     <h4 class="font-bold text-slate-900 text-sm">Changing Personalities</h4>
                   </div>
                   <p class="text-xs text-slate-500">Use the dropdown menu at the top of the Copilot to switch its writing tone. Make it sound <strong>Professional</strong>, <strong>Friendly</strong>, <strong>Concise</strong>, or <strong>Creative</strong> with a single click.</p>
                 </div>
                 <div class="flex-1 border border-slate-200 rounded-xl p-5 hover:border-primary/40 transition-colors">
                   <div class="flex items-center gap-2 mb-2">
                     <span class="material-symbols-outlined text-primary">bolt</span>
                     <h4 class="font-bold text-slate-900 text-sm">Quick Suggestion Pills</h4>
                   </div>
                   <p class="text-xs text-slate-500">Above the text input, you'll see clickable pills like "Shorten" or "Professional". Clicking these instantly asks the Copilot to apply that transformation to your form.</p>
                 </div>
               </div>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- Reviewing -->
            <article id="editing" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Reviewing & Editing
                 <a href="#editing" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                 In your Workspace center screen, you'll notice a list of question cards. Each card represents a field on the original form. FormMate assigns different badges to these fields so you know exactly how the answer was populated.
               </p>
               
               <ul class="space-y-4 mb-8">
                 <li class="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div class="w-24 shrink-0 mt-1">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Autofilled</span>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-bold text-slate-900 text-sm">Exactly matched data</h4>
                      <p class="text-xs text-slate-600 mt-1">These answers come directly from your vault without AI hallucination (e.g., your First Name, Phone Number, or standard standard dropdowns).</p>
                    </div>
                 </li>
                 <li class="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div class="w-24 shrink-0 mt-1">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">AI Generated</span>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-bold text-slate-900 text-sm">Crafted by AI</h4>
                      <p class="text-xs text-slate-600 mt-1">These answers required some level of creative writing or context-assimilation. The AI read the question and crafted an original response based on your profile.</p>
                    </div>
                 </li>
                 <li class="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div class="w-24 shrink-0 mt-1">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">User Edited</span>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-bold text-slate-900 text-sm">Modified by You</h4>
                      <p class="text-xs text-slate-600 mt-1">If you click into the text area of any answer and start typing manually, it converts to User Edited.</p>
                    </div>
                 </li>
               </ul>

               <h3 class="text-lg font-bold text-slate-900 mb-3">Quick Manual Overrides</h3>
               <p class="text-sm text-slate-600">On every AI Generated question card, you will see a small row of action buttons: <strong>Shorten</strong>, <strong>Professional</strong>, and <strong>Regenerate</strong>. Simply click one of these buttons, and the AI will only rewrite that specific card instantly.</p>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- Account -->
            <article id="account" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Managing Your Account
                 <a href="#account" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                All of your preferences, data, and account-backed settings are handled in the <strong>Accounts Center</strong> (accessed via the Sidebar).
               </p>
               
               <div class="mb-6">
                  <h4 class="font-bold text-slate-900 text-base mb-2">Preferences</h4>
                  <p class="text-sm text-slate-600">Under the <strong>Preferences</strong> tab, you can fundamentally change how FormMate interacts with you. Change the default AI Temperature to be more "Creative" or more "Precise". Adjust the default verbosity level, and toggle UI animations or compact mode to fit your visual preference.</p>
               </div>
            </article>

            <!-- History -->
            <article id="history" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Form History
                 <a href="#history" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-6">
                 Accidentally closed a tab? Need to review an application you submitted last week?
               </p>
               <p class="text-sm text-slate-600">Navigate to <strong>Accounts Center > History</strong> to view a timeline of every single form you've ever processed through FormMate. Clicking on a history item will instantly reload that form directly into your Workspace so you can continue right where you left off without losing a single character.</p>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- FAQs -->
            <article id="faqs" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-8 flex items-center group">
                 Frequently Asked Questions
                 <a href="#faqs" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               
               <div class="space-y-6">
                  <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 class="font-bold text-slate-900 mb-2">Is FormMate free to use?</h4>
                    <p class="text-slate-600 text-sm leading-relaxed">Yes. FormMate is currently available as a free offering while we continue to expand reliability and feature coverage.</p>
                  </div>
                  
                  <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 class="font-bold text-slate-900 mb-2">Can FormMate handle multi-step forms?</h4>
                    <p class="text-slate-600 text-sm leading-relaxed">Absolutely. If a form has multiple pages, FormMate will analyze each step as you progress, maintaining context from your previous answers automatically.</p>
                  </div>

                  <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 class="font-bold text-slate-900 mb-2">How safe is my Vault data?</h4>
                    <p class="text-slate-600 text-sm leading-relaxed">Your data is stored locally and used only to give context to your specific form-filling sessions. We do not use your private data to train general models or share it with any third parties.</p>
                  </div>

                  <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 class="font-bold text-slate-900 mb-2">What happens if a form changes?</h4>
                    <p class="text-slate-600 text-sm leading-relaxed">FormMate re-analyzes the page every time you paste the URL, so if a form field is added or removed, it will detect the change instantly and adjust its answers accordingly.</p>
                  </div>
               </div>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- Review & Feedback -->
            <article id="feedback" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Review & Feedback
                 <a href="#feedback" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-8">We'd love to hear what you think of FormMate. Your feedback directly shapes our roadmap and helps us build a better product.</p>

               <div class="p-8 border border-slate-200 rounded-2xl bg-slate-50">
                 <div class="mb-6">
                   <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">Your Rating</label>
                   <div id="star-rating" class="flex items-center gap-1">
                     <span data-val="1" class="material-symbols-outlined text-3xl text-slate-300 cursor-pointer hover:text-amber-400 transition-colors select-none">star</span>
                     <span data-val="2" class="material-symbols-outlined text-3xl text-slate-300 cursor-pointer hover:text-amber-400 transition-colors select-none">star</span>
                     <span data-val="3" class="material-symbols-outlined text-3xl text-slate-300 cursor-pointer hover:text-amber-400 transition-colors select-none">star</span>
                     <span data-val="4" class="material-symbols-outlined text-3xl text-slate-300 cursor-pointer hover:text-amber-400 transition-colors select-none">star</span>
                     <span data-val="5" class="material-symbols-outlined text-3xl text-slate-300 cursor-pointer hover:text-amber-400 transition-colors select-none">star</span>
                   </div>
                 </div>

                 <div class="mb-6">
                   <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="feedback-category">Category</label>
                   <select id="feedback-category" class="w-full h-11 px-4 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                     <option value="general">General Feedback</option>
                     <option value="feature">Feature Request</option>
                     <option value="bug">Bug Report</option>
                     <option value="praise">Praise & Appreciation</option>
                   </select>
                 </div>

                 <div class="mb-6">
                   <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="feedback-text">Your Feedback</label>
                   <textarea id="feedback-text" rows="4" class="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Tell us what you love, what could be better, or share ideas for new features..."></textarea>
                 </div>

                 <button id="btn-submit-feedback" class="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:brightness-110 transition-all btn-press flex items-center gap-2">
                   <span class="material-symbols-outlined text-lg">send</span>
                   Submit Feedback
                 </button>
               </div>
            </article>

            <hr class="border-slate-100 my-16" />

            <!-- Contact Us -->
            <article id="contact" class="mb-20 scroll-mt-24">
               <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-4 flex items-center group">
                 Contact Us
                 <a href="#contact" class="opacity-0 group-hover:opacity-100 ml-2 text-primary transition-opacity"><span class="material-symbols-outlined text-xl">link</span></a>
               </h2>
               <p class="text-base text-slate-600 leading-relaxed mb-8">Have a specific question or partnership inquiry? Reach out to our support team and we'll get back to you within 24 hours.</p>

               <div class="p-8 border border-slate-200 rounded-2xl bg-slate-50">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div>
                     <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="contact-name">Full Name</label>
                     <input id="contact-name" type="text" class="w-full h-11 px-4 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Your name" />
                   </div>
                   <div>
                     <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="contact-email">Email Address <span class="text-red-400">*</span></label>
                     <input id="contact-email" type="email" class="w-full h-11 px-4 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="you@example.com" />
                   </div>
                 </div>

                 <div class="mb-4">
                   <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="contact-subject">Subject</label>
                   <select id="contact-subject" class="w-full h-11 px-4 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                     <option value="general">General Inquiry</option>
                     <option value="support">Technical Support</option>
                     <option value="partnership">Partnership</option>
                   </select>
                 </div>

                 <div class="mb-4">
                   <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block" for="contact-message">Message <span class="text-red-400">*</span></label>
                   <textarea id="contact-message" rows="5" class="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Describe your issue or question in detail..."></textarea>
                 </div>

                 <div class="flex items-center justify-between flex-wrap gap-4">
                   <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                     <input id="contact-save-info" type="checkbox" class="size-4 rounded border-slate-300 text-primary focus:ring-primary/30" />
                     Save my info for next time
                   </label>
                   <button id="btn-submit-contact" class="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:brightness-110 transition-all btn-press flex items-center gap-2">
                     <span class="material-symbols-outlined text-lg">mail</span>
                     Send Message
                   </button>
                 </div>
               </div>
            </article>

            <div class="bg-gradient-to-br from-slate-50 to-primary/5 rounded-2xl p-8 border border-primary/10 text-center mt-12 mb-8">
               <h3 class="text-xl font-bold text-slate-900 mb-2">Still need help?</h3>
               <p class="text-slate-600 mb-6 max-w-lg mx-auto">Our support team is always available to help you configure your vault or troubleshoot any issues.</p>
               <button id="btn-docs-contact-support" class="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors">Contact Support</button>
            </div>

          </div>
          
          <div class="border-t border-slate-200 py-6 px-6 lg:px-12 flex justify-between items-center text-sm">
             <div class="text-slate-500">(c) 2026 FormMate. All rights reserved.</div>
          </div>
        </main>

        <!-- Right Resize Handle -->
        <div id="handle-right" class="w-1.5 hover:bg-primary/20 cursor-col-resize shrink-0 z-40 transition-colors hidden lg:block"></div>
        
        <!-- AI Docs Chat (Right Sidebar) -->
        <aside id="docs-sidebar-right" class="border-l border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.98))] flex flex-col shrink-0 z-20 shadow-[-16px_0_48px_rgba(37,99,235,0.08)] hidden lg:flex" style="width: 357px;">
          <div class="p-5 border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0">
            <span class="block text-[11px] font-black uppercase tracking-[0.22em] text-primary">Docs AI</span>
            ${authed ? '<span class="mt-1 block text-sm font-semibold text-slate-500">Ask about FormMate features and workflows</span>' : ''}
          </div>

          <div id="docs-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-transparent">
            <div class="flex flex-col gap-1 animate-message-in">
              ${authed
                ? `
                  <div class="max-w-[85%] bg-white rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-sm border border-slate-200/70">
                    Hi! I'm the FormMate Docs assistant. Need help understanding how the Vault works or how to use the Copilot? Ask away!
                  </div>
                `
                : `
                  <div class="flex min-h-[calc(100vh-24rem)] items-center justify-center px-4 py-12">
                    <div class="w-full rounded-[2rem] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_30px_80px_-40px_rgba(37,99,235,0.35)] backdrop-blur-xl">
                      <div class="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(14,165,233,0.2))] flex items-center justify-center text-primary shadow-sm">
                        <span class="material-symbols-outlined text-[26px]">forum</span>
                      </div>
                      <h3 class="text-3xl md:text-4xl font-black tracking-tight leading-none text-slate-900">Sign in to chat</h3>
                      <p class="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        Sign in to learn more, or to ask questions about how FormMate works.
                      </p>
                    </div>
                  </div>
                `}
            </div>
          </div>

          <div class="p-3 border-t border-slate-200/80 bg-white/70 backdrop-blur-md relative">
            <!-- Focus Tooltip -->
            <div id="ai-focus-tooltip" class="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 translate-y-2 z-50 whitespace-nowrap">
              Ask me anything!
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45"></div>
            </div>

            <div id="docs-chat-followups" class="chat-followups chat-followups-docs mb-2"></div>
            ${authed ? `
              <div class="relative group">
                <label for="docs-chat-input" class="sr-only">Ask the documentation assistant a question</label>
                <textarea id="docs-chat-input" aria-label="Ask the documentation assistant a question" class="w-full rounded-xl border border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs py-3 pl-3 pr-10 resize-none transition-all shadow-sm" placeholder="Ask a question..." rows="1" style="min-height: 48px; max-height: 120px;"></textarea>
                <button id="btn-docs-send" type="button" aria-label="Send documentation chat message" class="absolute bottom-1/2 translate-y-1/2 right-2 w-8 h-8 flex shrink-0 items-center justify-center bg-primary text-white rounded-full hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50" disabled>
                  <span class="material-symbols-outlined text-[16px]">send</span>
                </button>
              </div>
            ` : `
              <button id="btn-docs-signin" type="button" class="w-full rounded-2xl text-white px-4 py-3 text-sm font-black tracking-tight btn-press docs-signin-cta">
                <span class="relative z-10">Sign in to chat</span>
              </button>
            `}
          </div>
        </aside>
      </div>
    </div>
  `;

  function init(wrapper) {
    wrapper.querySelector('#btn-home')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#btn-docs-signin')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelectorAll('[data-docs-nav]').forEach((button) => {
      button.addEventListener('click', () => navigateTo(button.dataset.docsNav));
    });
    wrapper.querySelector('#btn-docs-contact-support')?.addEventListener('click', () => {
      const target = wrapper.querySelector('#contact');
      target?.scrollIntoView({ behavior: 'smooth' });
    });

    // --- Search & Chat Logic ---
    const searchInput = wrapper.querySelector('#docs-search-input');
    const searchDropdown = wrapper.querySelector('#search-results-dropdown');
    const searchResultsList = wrapper.querySelector('#search-results-list');
    const btnAskAiSearch = wrapper.querySelector('#btn-ask-ai-search');
    const btnClearSearch = wrapper.querySelector('#btn-clear-search');
    const chatInput = wrapper.querySelector('#docs-chat-input');
    const btnSend = wrapper.querySelector('#btn-docs-send');
    const chatMessages = wrapper.querySelector('#docs-chat-messages');
    const followUpsWrap = wrapper.querySelector('#docs-chat-followups');
    const cleanupTasks = [];

    const searchIndex = DOCS_KNOWLEDGE;

    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query) {
        btnClearSearch?.classList.remove('hidden');
      } else {
        btnClearSearch?.classList.add('hidden');
        searchDropdown.classList.add('hidden');
        return;
      }

      const results = searchIndex.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.text.toLowerCase().includes(query)
      ).slice(0, 3);

      if (results.length > 0) {
        replaceChildrenWithSafeHtml(searchResultsList, results.map(item => `
             <button type="button" class="docs-search-result w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors group" data-doc-target="${item.id}">
                <div class="flex items-center gap-2 mb-0.5">
                   <span class="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-primary">${item.type === 'faq' ? 'quiz' : 'description'}</span>
                   <span class="text-[13px] font-bold text-slate-900">${item.title}</span>
                </div>
                <p class="text-[11px] text-slate-500 line-clamp-1">${item.text}</p>
             </button>
          `).join(''));
        searchDropdown.classList.remove('hidden');
      } else {
        replaceChildrenWithSafeHtml(searchResultsList, `
             <div class="p-4 text-center">
                <p class="text-xs text-slate-400 font-medium">No results found for "${escapeHtml(query)}"</p>
              </div>
          `);
        searchDropdown.classList.remove('hidden');
      }
    });

    const handleDocumentClick = (e) => {
      if (!wrapper.querySelector('#docs-search-container')?.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleDocumentClick);
    cleanupTasks.push(() => document.removeEventListener('click', handleDocumentClick));

    searchResultsList?.addEventListener('click', (e) => {
      const btn = e.target.closest?.('button.docs-search-result[data-doc-target]');
      if (!btn) return;
      const targetId = btn.dataset.docTarget;
      const target = wrapper.querySelector(`#${CSS.escape(targetId)}`) || document.getElementById(targetId);
      target?.scrollIntoView({ behavior: 'smooth' });
      searchDropdown?.classList.add('hidden');
    });

    btnAskAiSearch?.addEventListener('click', () => {
      if (!authed) {
        toast.info('Sign in to use the Docs assistant.');
        navigateTo('auth');
        return;
      }
      searchDropdown.classList.add('hidden');
      chatInput?.focus();
    });

    btnClearSearch?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
      }
    });

    // Highlight active link simple logic
    const sections = wrapper.querySelectorAll('article[id]');
    const navLinks = wrapper.querySelectorAll('.sidebar-link');

    // Using Intersection Observer to trigger scroll spy
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (href === id) {
              link.classList.add('bg-slate-200/50', 'text-slate-900', 'font-semibold');
              link.classList.remove('text-slate-600', 'font-medium');
            } else {
              link.classList.remove('bg-slate-200/50', 'text-slate-900', 'font-semibold');
              link.classList.add('text-slate-600', 'font-medium');
            }
          });
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });

    sections.forEach(section => observer.observe(section));

    // Setup smooth scrolling for hash links within this view
    wrapper.querySelectorAll('a[href^="#"]').forEach(anchor => {
      const handleAnchorClick = function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const target = wrapper.querySelector('#' + targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      };
      anchor.addEventListener('click', handleAnchorClick);
      cleanupTasks.push(() => anchor.removeEventListener('click', handleAnchorClick));
    });

    // --- Docs AI Chat Logic ---

    let chatHistory = [];
    let pendingUiContextEvents = [];
    let followUpSuggestions = getDefaultFollowUps(AI_SURFACES.DOCS);
    const initialDocsChatMarkup = chatMessages?.innerHTML || '';
    const cleanupRichActions = bindRichActionClicks(chatMessages, {
      onInteractiveCommit: (payload) => {
        const event = createUiContextEvent(payload);
        pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, event);
        if (chatInput && !chatInput.value.trim()) {
          chatInput.value = 'Apply the queued docs assistant edits.';
          chatInput.dispatchEvent(new Event('input'));
        }
        toast.success('Queued for your next docs message.');
        return true;
      },
    });
    cleanupTasks.push(() => cleanupRichActions?.());

    if (chatInput && btnSend) {
      const tooltip = wrapper.querySelector('#ai-focus-tooltip');
      let isChatPending = false;

      const syncSendButton = () => {
        const hasText = Boolean(chatInput.value.trim());
        const hasUiContext = pendingUiContextEvents.length > 0;
        btnSend.disabled = isChatPending || !(hasText || hasUiContext);
      };

      const renderFollowUps = () => {
        if (!followUpsWrap) return;
        const items = (Array.isArray(followUpSuggestions) ? followUpSuggestions : [])
          .filter(Boolean)
          .slice(0, 2);
        replaceChildrenWithSafeHtml(
          followUpsWrap,
          items.map((prompt) => `
            <button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">
              <span class="material-symbols-outlined">tips_and_updates</span>
              <span class="chat-followup-chip-label">${escapeHtml(prompt)}</span>
            </button>
          `).join('')
        );
      };

      const handleChatFocus = () => {
        if (!chatInput.value.trim()) {
          tooltip?.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
          tooltip?.classList.add('opacity-100', '-translate-y-1');
        }
      };

      const handleChatBlur = () => {
        tooltip?.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
        tooltip?.classList.remove('opacity-100', '-translate-y-1');
      };

      const handleChatInput = function () {
        if (this.value.trim()) {
          tooltip?.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
          tooltip?.classList.remove('opacity-100', '-translate-y-1');
        }

        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        syncSendButton();
      };

      const sendMessage = async () => {
        const text = chatInput.value.trim();
        const hasUiContext = pendingUiContextEvents.length > 0;
        if ((!text && !hasUiContext) || isChatPending) return;
        isChatPending = true;

        chatInput.value = '';
        syncSendButton();
        chatInput.style.height = '48px';
        chatInput.disabled = true;
        const userVisibleText = text || 'Applied queued interactive edits for this docs request.';
        const modelMessage = buildMessageWithUiContext(text, pendingUiContextEvents);

        // User Bubble
        chatHistory.push({ role: 'user', content: modelMessage || userVisibleText });
        chatMessages.insertAdjacentHTML('beforeend', `
          <div class="flex flex-col gap-1 items-end animate-message-in">
            <div class="max-w-[85%] bg-primary text-white rounded-[var(--fm-card-radius)] rounded-tr-none px-4 py-3 text-xs font-medium leading-relaxed shadow-sm">
              ${escapeHtml(userVisibleText)}
            </div>
          </div>
        `);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Typing Indicator
        const typingId = 'typing-' + Date.now();
        chatMessages.insertAdjacentHTML('beforeend', `
          <div id="${typingId}" class="flex flex-col gap-1 animate-message-in">
            <div class="max-w-[85%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none px-3 py-2 flex items-center justify-center gap-1.5 h-10 w-16">
              <div class="typing-dot bg-slate-400"></div>
              <div class="typing-dot bg-slate-400" style="animation-delay: 0.2s"></div>
              <div class="typing-dot bg-slate-400" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        `);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
          const relevantDocs = getRelevantDocsSnippets(modelMessage || userVisibleText);
          const docsAttachments = relevantDocs.length
            ? [{
              type: 'docs_context',
              name: 'Relevant FormMate docs',
              text: relevantDocs.join('\n\n'),
            }]
            : [];
          const recentMessages = chatHistory.slice(-6);
          const responseText = await generateText({
            task: 'docs_chat',
            surface: AI_SURFACES.DOCS,
            messages: recentMessages,
            temperature: 0.6,
            maxTokens: 512,
            attachments: docsAttachments,
            context: {
              formTitle: 'FormMate Documentation',
            },
          });

          const cleanResponse = String(responseText || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          const displayResponse = stripFollowUpTags(cleanResponse);
          followUpSuggestions = buildNextFollowUps({
            surface: AI_SURFACES.DOCS,
            responseText: cleanResponse,
            formTitle: 'FormMate Documentation',
          });
          renderFollowUps();
          chatHistory.push({ role: 'assistant', content: displayResponse.replace(/`/g, '\\`') });

          const typingEl = wrapper.querySelector('#' + typingId);
          if (typingEl) typingEl.remove();

          const row = document.createElement('div');
          row.className = 'flex flex-col gap-1 animate-message-in';
          const body = document.createElement('div');
          body.className = 'max-w-[90%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-sm flex flex-col gap-2';
          replaceChildrenWithSafeHtml(body, renderAssistantRichText(displayResponse, {
            interactive: false,
            onDiagnostics: (diagnostics) => {
              if (diagnostics.length) {
                console.warn('[Docs Chat] Assistant message diagnostics:', diagnostics);
              }
            },
          }));
          row.appendChild(body);
          chatMessages.appendChild(row);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          pendingUiContextEvents = [];
        } catch (e) {
          console.error(e);
          const typingEl = wrapper.querySelector('#' + typingId);
          if (typingEl) typingEl.remove();
          const message = getAiErrorMessage(e, 'AI service is currently unavailable. Please try again.');
          const row = document.createElement('div');
          row.className = 'flex flex-col gap-1 animate-message-in';
          const body = document.createElement('div');
          body.className = 'max-w-[90%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-sm flex flex-col gap-2';
          replaceChildrenWithSafeHtml(body, renderAssistantRichText(message, {
            interactive: false,
            onDiagnostics: (diagnostics) => {
              if (diagnostics.length) {
                console.warn('[Docs Chat] Assistant message diagnostics:', diagnostics);
              }
            },
          }));
          row.appendChild(body);
          chatMessages.appendChild(row);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } finally {
          isChatPending = false;
          chatInput.disabled = false;
          syncSendButton();
          chatInput.focus();
        }
      };

      const handleChatKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };

      const handleFollowUpClick = (event) => {
        const chip = event.target?.closest?.('.chat-followup-chip[data-followup-msg]');
        if (!chip || !followUpsWrap.contains(chip)) return;
        const prompt = String(chip.dataset.followupMsg || '').trim();
        if (!prompt) return;
        pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, createFollowUpClickEvent(prompt));
        chatInput.value = prompt;
        chatInput.dispatchEvent(new Event('input'));
        sendMessage();
      };
      followUpsWrap?.addEventListener('click', handleFollowUpClick);

      btnSend.addEventListener('click', sendMessage);
      chatInput.addEventListener('focus', handleChatFocus);
      chatInput.addEventListener('blur', handleChatBlur);
      chatInput.addEventListener('input', handleChatInput);
      chatInput.addEventListener('keydown', handleChatKeydown);
      renderFollowUps();
      syncSendButton();
      cleanupTasks.push(() => btnSend.removeEventListener('click', sendMessage));
      cleanupTasks.push(() => chatInput.removeEventListener('focus', handleChatFocus));
      cleanupTasks.push(() => chatInput.removeEventListener('blur', handleChatBlur));
      cleanupTasks.push(() => chatInput.removeEventListener('input', handleChatInput));
      cleanupTasks.push(() => chatInput.removeEventListener('keydown', handleChatKeydown));
      cleanupTasks.push(() => followUpsWrap?.removeEventListener('click', handleFollowUpClick));
    }

    const handleSessionClosed = () => {
      chatHistory = [];
      pendingUiContextEvents = [];
      followUpSuggestions = getDefaultFollowUps(AI_SURFACES.DOCS);
      if (chatMessages) {
        chatMessages.innerHTML = initialDocsChatMarkup;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      if (followUpsWrap) {
        replaceChildrenWithSafeHtml(
          followUpsWrap,
          followUpSuggestions.slice(0, 2).map((prompt) => `
            <button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">
              <span class="material-symbols-outlined">tips_and_updates</span>
              <span class="chat-followup-chip-label">${escapeHtml(prompt)}</span>
            </button>
          `).join('')
        );
      }
      if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = '48px';
      }
      if (btnSend) btnSend.disabled = true;
    };
    window.addEventListener(SESSION_CLOSED_EVENT, handleSessionClosed);
    cleanupTasks.push(() => window.removeEventListener(SESSION_CLOSED_EVENT, handleSessionClosed));

    // --- Resizable Sidebars Logic ---
    const handleLeft = wrapper.querySelector('#handle-left');
    const handleRight = wrapper.querySelector('#handle-right');
    const sidebarLeft = wrapper.querySelector('#docs-sidebar-left');
    const sidebarRight = wrapper.querySelector('#docs-sidebar-right');

    const setupResizer = (handle, target, direction) => {
      if (!handle || !target) return;

      let startX, startWidth;

      const onMouseDown = (e) => {
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(target).width, 10);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        const delta = direction === 'left' ? e.clientX - startX : startX - e.clientX;
        const newWidth = Math.max(200, Math.min(600, startWidth + delta));
        target.style.width = `${newWidth}px`;
      };

      const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', onMouseDown);
      return () => {
        handle.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    };

    const cleanupLeft = setupResizer(handleLeft, sidebarLeft, 'left');
    const cleanupRight = setupResizer(handleRight, sidebarRight, 'right');

    // Sidebar back to home
    wrapper.querySelector('#btn-back-home-sidebar')?.addEventListener('click', () => {
      navigateTo(authed ? 'dashboard' : 'landing');
    });

    // Rating Logic
    let currentRating = 0;
    const stars = wrapper.querySelectorAll('#star-rating span');
    stars.forEach(star => {
      star.addEventListener('click', (e) => {
        currentRating = parseInt(e.target.dataset.val);
        stars.forEach((s, i) => {
          if (i < currentRating) s.classList.replace('text-slate-300', 'text-amber-400');
          else s.classList.replace('text-amber-400', 'text-slate-300');
        });
      });
    });

    // Feedback Submit
    wrapper.querySelector('#btn-submit-feedback')?.addEventListener('click', () => {
      const text = wrapper.querySelector('#feedback-text').value.trim();
      if (!text || currentRating === 0) {
        toast.error('Please provide a rating and a comment.');
        return;
      }
      setTimeout(() => {
        toast.success('Thank you for your feedback! It means a lot to us.');
        wrapper.querySelector('#feedback-text').value = '';
        currentRating = 0;
        stars.forEach(s => s.classList.replace('text-amber-400', 'text-slate-300'));
      }, 500);
    });

    // Contact Submit
    wrapper.querySelector('#btn-submit-contact')?.addEventListener('click', () => {
      const email = wrapper.querySelector('#contact-email').value.trim();
      const msg = wrapper.querySelector('#contact-message').value.trim();
      if (!email || !msg) {
        toast.error('Your Email and Message are required to contact support.');
        return;
      }
      setTimeout(() => {
        toast.success('Your message has been sent to our support team!');
        wrapper.querySelector('#contact-name').value = '';
        wrapper.querySelector('#contact-email').value = '';
        wrapper.querySelector('#contact-subject').value = '';
        wrapper.querySelector('#contact-message').value = '';
        wrapper.querySelector('#contact-save-info').checked = false;
      }, 500);
    });

    return () => {
      cleanupTasks.forEach((task) => task());
      sections.forEach(s => observer.unobserve(s));
      observer.disconnect();
      cleanupLeft?.();
      cleanupRight?.();
    };
  }

  return { html, init };
}
