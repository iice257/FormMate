import { navigateTo } from '../router.js';
import { generateText } from '../ai/ai-service.js';
import { toast } from '../components/toast.js';
import { getState } from '../state.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function docsScreen() {
  const html = `
    <div class="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <!-- Navigation Bar -->
      <header class="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0 z-30">
        <div class="flex-1 flex justify-start">
        </div>
        
        <div class="flex-1 flex justify-center items-center gap-4">
            <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span> Help Center</span>
          <div class="w-px h-6 bg-slate-200 hidden md:block"></div>
          <div class="hidden md:block flex-1 max-w-md" id="docs-search-wrapper">
             <div class="relative w-full" id="docs-search-container">
               <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
               <input type="text" id="docs-search-input" placeholder="Search guides..." class="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-sm transition-all outline-none" />
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

        <div class="flex-1 flex items-center justify-end gap-4 text-sm font-semibold">
           <button type="button" class="text-slate-500 hover:text-slate-900 transition-colors hidden md:block cursor-pointer bg-transparent border-0 p-0" id="btn-docs-pricing">Pricing</button>
           <div class="w-px h-5 bg-slate-200 hidden md:block"></div>
           <button class="bg-primary text-white px-4 py-2 rounded-lg hover:brightness-110 transition-colors shadow-sm btn-press" id="btn-dashboard">Go to Dashboard</button>
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
                <h4 class="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-3">Account & Settings</h4>
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
                 All of your preferences, data, and settings are handled in the <strong>Accounts Center</strong> (accessed via the Sidebar).
               </p>
               
               <div class="mb-6">
                 <h4 class="font-bold text-slate-900 text-base mb-2">Settings & Theme</h4>
                 <p class="text-sm text-slate-600">Under the <strong>Settings</strong> tab, you can fundamentally change how FormMate interacts with you. Change the default AI Temperature to be more "Creative" or more "Precise". Adjust the default verbosity level, and toggle UI animations or compact mode to fit your visual preference.</p>
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
                    <p class="text-slate-600 text-sm leading-relaxed">Yes! You can fill up to 5 forms per month for free. For users who need higher volume or more advanced AI features, we offer Weekly and Monthly Pro subscriptions.</p>
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
            
            <div class="bg-gradient-to-br from-slate-50 to-primary/5 rounded-2xl p-8 border border-primary/10 text-center mt-12 mb-8">
               <h3 class="text-xl font-bold text-slate-900 mb-2">Still need help?</h3>
               <p class="text-slate-600 mb-6 max-w-lg mx-auto">Our support team is always available to help you configure your vault or troubleshoot any issues.</p>
               <button id="btn-docs-contact-support" class="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors">Contact Support</button>
            </div>

          </div>
          
          <div class="border-t border-slate-200 py-6 px-6 lg:px-12 flex justify-between items-center text-sm">
             <div class="text-slate-500">© 2026 FormMate. All rights reserved.</div>
          </div>
        </main>

        <!-- Right Resize Handle -->
        <div id="handle-right" class="w-1.5 hover:bg-primary/20 cursor-col-resize shrink-0 z-40 transition-colors hidden lg:block"></div>
        
        <!-- AI Docs Chat (Right Sidebar) -->
        <aside id="docs-sidebar-right" class="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] hidden lg:flex">
          <div class="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50 sticky top-0">
            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <span class="font-bold tracking-tight text-sm block text-slate-900">Docs Assistant</span>
              <span class="text-[10px] text-slate-500 font-medium">Ask me about FormMate</span>
            </div>
          </div>
          
          <div id="docs-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-white">
            <div class="flex flex-col gap-1 animate-message-in">
              <div class="max-w-[85%] bg-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-sm border border-slate-200/50">
                Hi! I'm the FormMate Docs assistant. Need help understanding how the Vault works or how to use the Copilot? Ask away!
              </div>
            </div>
          </div>

          <div class="p-3 border-t border-slate-200 bg-slate-50 relative">
            <!-- Focus Tooltip -->
            <div id="ai-focus-tooltip" class="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 translate-y-2 z-50 whitespace-nowrap">
              Ask me anything!
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45"></div>
            </div>

            <div class="relative group">
              <textarea id="docs-chat-input" class="w-full rounded-xl border border-slate-200 bg-white focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs py-3 pl-3 pr-10 resize-none transition-all shadow-sm" placeholder="Ask a question..." rows="1" style="min-height: 48px; max-height: 120px;"></textarea>
              <button id="btn-docs-send" class="absolute bottom-1/2 translate-y-1/2 right-2 w-8 h-8 flex shrink-0 items-center justify-center bg-primary text-white rounded-full hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50" disabled>
                <span class="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  function init(wrapper) {
    const authed = getState().isAuthenticated;
    wrapper.querySelector('#btn-home')?.addEventListener('click', () => navigateTo(authed ? 'dashboard' : 'landing'));
    wrapper.querySelector('#btn-dashboard')?.addEventListener('click', () => navigateTo('dashboard'));
    wrapper.querySelector('#btn-docs-pricing')?.addEventListener('click', () => navigateTo('pricing'));
    wrapper.querySelector('#btn-docs-contact-support')?.addEventListener('click', () => navigateTo('help'));

    // --- Search & Chat Logic ---
    const searchInput = wrapper.querySelector('#docs-search-input');
    const searchDropdown = wrapper.querySelector('#search-results-dropdown');
    const searchResultsList = wrapper.querySelector('#search-results-list');
    const btnAskAiSearch = wrapper.querySelector('#btn-ask-ai-search');
    const btnClearSearch = wrapper.querySelector('#btn-clear-search');
    const chatInput = wrapper.querySelector('#docs-chat-input');
    const btnSend = wrapper.querySelector('#btn-docs-send');
    const chatMessages = wrapper.querySelector('#docs-chat-messages');

    const searchIndex = [
      { id: 'welcome', title: 'Welcome to FormMate', text: 'FormMate is your intelligent assistant for filling out tedious, long, and complex online forms.', type: 'guide' },
      { id: 'first-form', title: 'Filling Your First Form', text: 'On the Dashboard, paste the URL of the form you want to fill into the input box.', type: 'guide' },
      { id: 'vault', title: 'The Information Vault', text: 'The Vault is your secure, personal database inside FormMate. Think of it as your brain\'s notepad.', type: 'guide' },
      { id: 'copilot', title: 'Using the Form Copilot', text: 'On the right side of the Workspace screen sits your Form Copilot conversational assistant.', type: 'guide' },
      { id: 'editing', title: 'Reviewing & Editing', text: 'In your Workspace center screen, you\'ll notice a list of question cards.', type: 'guide' },
      { id: 'account', title: 'Managing Your Account', text: 'All of your preferences, data, and settings are handled in the Accounts Center.', type: 'guide' },
      { id: 'history', title: 'Form History', text: 'Accidentally closed a tab? Need to review an application you submitted last week?', type: 'guide' },
      { id: 'faqs', title: 'Pricing FAQ', text: 'Is FormMate free to use? Yes! You can fill up to 5 forms per month for free.', type: 'faq' },
      { id: 'faqs', title: 'Multi-step FAQ', text: 'Can FormMate handle multi-step forms? Absolutely.', type: 'faq' },
      { id: 'faqs', title: 'Security FAQ', text: 'How safe is my Vault data? Your data is stored locally and used only for your sessions.', type: 'faq' }
    ];

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
        searchResultsList.innerHTML = results.map(item => `
             <button type="button" class="docs-search-result w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors group" data-doc-target="${item.id}">
                <div class="flex items-center gap-2 mb-0.5">
                   <span class="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-primary">${item.type === 'faq' ? 'quiz' : 'description'}</span>
                   <span class="text-[13px] font-bold text-slate-900">${item.title}</span>
                </div>
                <p class="text-[11px] text-slate-500 line-clamp-1">${item.text}</p>
             </button>
          `).join('');
        searchDropdown.classList.remove('hidden');
      } else {
        searchResultsList.innerHTML = `
             <div class="p-4 text-center">
                <p class="text-xs text-slate-400 font-medium">No results found for "${escapeHtml(query)}"</p>
             </div>
          `;
        searchDropdown.classList.remove('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.querySelector('#docs-search-container')?.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });

    searchResultsList?.addEventListener('click', (e) => {
      const btn = e.target.closest?.('button.docs-search-result[data-doc-target]');
      if (!btn) return;
      const targetId = btn.dataset.docTarget;
      const target = wrapper.querySelector(`#${CSS.escape(targetId)}`) || document.getElementById(targetId);
      target?.scrollIntoView({ behavior: 'smooth' });
      searchDropdown?.classList.add('hidden');
    });

    btnAskAiSearch?.addEventListener('click', () => {
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
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const target = wrapper.querySelector('#' + targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // --- Docs AI Chat Logic ---

    let chatHistory = [
      {
        role: 'system',
        content: `You are a helpful, extremely concise assistant embedded directly in FormMate's documentation page.
Your ONLY job is to help users understand FormMate, its features (like the Vault, Form Copilot, autofilling forms, and the dashboard).
Keep your answers extremely simple, non-technical, and easy for a very casual user to understand. 
Do NOT include any code snippets, JSON objects, SDK setups, or technical API jargon. 
If the user asks something completely beyond the scope of FormMate, FormMate's features, or general FormMate help, you MUST decline respectfully by saying that you are only here to help with FormMate and the question is beyond your scope.`
      }
    ];

    if (chatInput && btnSend) {
      const tooltip = wrapper.querySelector('#ai-focus-tooltip');

      chatInput.addEventListener('focus', () => {
        if (!chatInput.value.trim()) {
          tooltip?.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
          tooltip?.classList.add('opacity-100', '-translate-y-1');
        }
      });

      chatInput.addEventListener('blur', () => {
        tooltip?.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
        tooltip?.classList.remove('opacity-100', '-translate-y-1');
      });

      chatInput.addEventListener('input', function () {
        if (this.value.trim()) {
          tooltip?.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
          tooltip?.classList.remove('opacity-100', '-translate-y-1');
        }

        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        btnSend.disabled = !this.value.trim();
      });

      const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        btnSend.disabled = true;
        chatInput.style.height = '48px';

        // User Bubble
        chatHistory.push({ role: 'user', content: text });
        chatMessages.insertAdjacentHTML('beforeend', `
          <div class="flex flex-col gap-1 items-end animate-message-in">
            <div class="max-w-[85%] bg-primary text-white rounded-[var(--fm-card-radius)] rounded-tr-none px-4 py-3 text-xs font-medium leading-relaxed shadow-sm">
              ${escapeHtml(text)}
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
          const responseText = await generateText({
            task: 'docs_chat',
            messages: chatHistory,
            temperature: 0.6,
            maxTokens: 512
          });

          chatHistory.push({ role: 'assistant', content: responseText.replace(/`/g, '\\`') });

          const typingEl = wrapper.querySelector('#' + typingId);
          if (typingEl) typingEl.remove();

          chatMessages.insertAdjacentHTML('beforeend', `
            <div class="flex flex-col gap-1 animate-message-in">
              <div class="max-w-[90%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-sm flex flex-col gap-2">
                ${escapeHtml(responseText).replace(/\n/g, '<br>')}
              </div>
            </div>
          `);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (e) {
          console.error(e);
          const typingEl = wrapper.querySelector('#' + typingId);
          if (typingEl) typingEl.remove();

          chatMessages.insertAdjacentHTML('beforeend', `
            <div class="flex flex-col gap-1 animate-message-in">
              <div class="max-w-[85%] bg-red-50 text-red-600 border border-red-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-3 text-xs leading-relaxed">
                <div class="flex items-center gap-1.5 font-bold mb-1"><span class="material-symbols-outlined text-[14px]">error</span> AI service is currently unavailable.</div>
                Please check system configuration or try again later.
              </div>
            </div>
          `);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      };

      btnSend.addEventListener('click', sendMessage);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

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
      return () => handle.removeEventListener('mousedown', onMouseDown);
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
      sections.forEach(s => observer.unobserve(s));
      observer.disconnect();
      cleanupLeft();
      cleanupRight();
    };
  }

  return { html, init };
}
