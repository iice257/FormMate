// ═══════════════════════════════════════════
// FormMate — Main Workspace Screen
// ═══════════════════════════════════════════

import { getState, setState, updateAnswer, addChatMessage, undoAnswer, redoAnswer, canUndo, canRedo, subscribe } from '../state.js';
import { navigateTo } from '../router.js';
import { regenerateAnswer, processChatMessage, quickEditAnswer } from '../ai/ai-actions.js';
import { renderQuestionCard } from '../components/question-card.js';
import { categorizeField } from '../ai/field-classifier.js';

export function workspaceScreen() {
  const { formData, answers, isAuthenticated, userProfile, tier } = getState();

  if (!formData) {
    navigateTo('landing');
    return { html: '', init: () => { } };
  }

  let aiCount = 0;
  let autoCount = 0;
  let manualCount = 0;

  if (formData && formData.questions) {
    formData.questions.forEach(q => {
      const { category } = categorizeField(q);
      if (category === 'autofillable') autoCount++;
      else if (category === 'manual_only') manualCount++;
      else aiCount++;
    });
  }

  const questionsHtml = formData.questions.map((q, i) =>
    renderQuestionCard(q, answers[q.id], i)
  ).join('');

  const html = `
    <div class="h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      <!-- Header -->
      <header class="h-16 lg:h-18 glass-header flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 shadow-sm relative">
        <div class="flex items-center gap-3 cursor-pointer btn-press" id="btn-logo-home">
          <div class="size-10 rounded-xl bg-white shadow-[0_4px_12px_rgba(124,58,237,0.15)] border border-slate-100 p-[3px] flex items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="font-black text-2xl tracking-tighter text-slate-900 leading-none">Form<span class="text-primary">Mate</span></span>
            <span class="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mt-1">Form Copilot</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button id="btn-toggle-chat-navbar" class="hidden md:flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors btn-press">
            <span class="material-symbols-outlined text-[18px]">forum</span>
            <span class="toggle-text">Hide Chat</span>
          </button>
          
          <!-- Removed Review & Fill from here -->
          <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
          
          ${isAuthenticated && userProfile ? `
          <button id="btn-profile-header" class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
            <img src="${userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
            <span class="truncate max-w-[100px]">${userProfile?.name?.split(' ')[0] || 'User'}</span>
          </button>
          ` : `
          <button id="btn-profile-header" class="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-slate-600 text-[20px]">person</span>
          </button>
          `}
        </div>
      </header>

      <main class="flex-1 flex overflow-hidden lg:pl-2">
        <!-- Sidebar Navigation -->
        <aside id="sidebar" class="w-16 lg:w-[260px] glass-panel border border-slate-200/50 rounded-[var(--fm-card-radius)] flex flex-col py-4 shrink-0 transition-all z-20 hidden md:flex my-4 ml-4 shadow-sm" style="height: calc(100% - 2rem);">
          <nav class="flex-1 px-3 space-y-1.5 flex flex-col">
            <button id="nav-dashboard-sidebar" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">space_dashboard</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Dashboard</span>
            </button>
            <button id="nav-new-form" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">add_box</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">New Form</span>
            </button>
            <button class="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm border border-slate-100/50 text-slate-900 transition-all group relative overflow-hidden">
              <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-primary rounded-r-md"></div>
              <span class="material-symbols-outlined text-primary text-[20px]">edit_document</span>
              <span class="font-bold text-[14px] hidden lg:block tracking-wide ml-1">Active Form</span>
            </button>
            <button id="nav-history" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">history</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">History</span>
            </button>
            <button id="nav-chat" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">forum</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">AI Chat</span>
            </button>
            <button id="nav-examples" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">extension</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Examples</span>
            </button>

            <div class="my-3 border-t border-slate-100 w-full"></div>
            
            <button id="nav-vault" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">manage_accounts</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Account Center</span>
            </button>
            <button id="nav-settings" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors text-[20px]">settings</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Settings</span>
            </button>
            <button id="nav-support" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group mt-auto" onclick="window.__fmNav('docs')">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">help</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Help Center</span>
            </button>
          </nav>
          
          <!-- User Profile & Usage meter widget -->
          <div class="mt-auto px-4 hidden lg:flex flex-col gap-4">
            
            ${isAuthenticated && userProfile ? `
            <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200" id="sidebar-profile">
              <div class="size-9 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                ${userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-900 truncate">${userProfile.name}</p>
                <p class="text-[11px] font-medium text-slate-500 truncate">${userProfile.email}</p>
              </div>
              <span class="material-symbols-outlined text-slate-400 text-lg">unfold_more</span>
            </div>
            ` : ''}

            <div class="bg-gradient-to-b from-white to-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
              <div class="flex justify-between items-end text-xs font-bold text-slate-900 mb-2 relative z-10">
                <span class="text-slate-600">${tier === 'free' ? 'Free Plan' : 'Pro Plan'}</span>
                <span class="text-primary text-sm flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">bolt</span> 3<span class="text-slate-400 text-xs font-medium">${tier === 'free' ? '/5' : '/∞'}</span></span>
              </div>
              <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden relative z-10">
                <div class="h-full bg-gradient-to-r from-primary-light to-primary w-[60%] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
              </div>
              ${tier === 'free' ? `<button id="btn-upgrade-sidebar" class="mt-4 w-full py-2 bg-slate-100 hover:bg-primary hover:text-white rounded-lg text-[11px] uppercase tracking-widest font-bold text-slate-600 transition-all">Upgrade Pro</button>` : ''}
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="flex-1 flex overflow-hidden relative" id="editor-container">
          <!-- Editor Center -->
          <div class="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar" id="editor-scroll">
            <div class="max-w-3xl mx-auto px-6 md:px-8 lg:px-12 py-8 lg:py-12 pb-32">
              
                <div class="mb-4">
                  <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold tracking-wide text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors btn-press group" id="btn-question-categories">
                    <span class="material-symbols-outlined text-primary text-[14px]">category</span>
                    Question Categories
                    <span class="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-slate-600 ml-1">expand_more</span>
                  </div>
                  
                  <div id="question-categories-panel" class="hidden mt-3 flex-wrap items-center gap-2 text-[12px] animate-screen-enter">
                    <button class="filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-bold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all data-[active=true]:bg-slate-800 data-[active=true]:text-white data-[active=true]:border-slate-800" data-filter="all" data-active="true">
                      All Fields
                    </button>
                    ${autoCount > 0 ? `<button class="filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all data-[active=true]:bg-slate-800 data-[active=true]:text-white data-[active=true]:border-slate-800" data-filter="autofillable">
                      <span class="material-symbols-outlined text-[14px]">bolt</span> AutoFillable <span class="bg-slate-100/50 px-1.5 rounded ml-1 text-[10px] opacity-70 border border-slate-200/50">${autoCount}</span>
                    </button>` : ''}
                    ${aiCount > 0 ? `<button class="filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all data-[active=true]:bg-slate-800 data-[active=true]:text-white data-[active=true]:border-slate-800" data-filter="generatable">
                      <span class="material-symbols-outlined text-[14px]">auto_awesome</span> AI Fillable <span class="bg-slate-100/50 px-1.5 rounded ml-1 text-[10px] opacity-70 border border-slate-200/50">${aiCount}</span>
                    </button>` : ''}
                    ${manualCount > 0 ? `<button class="filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all data-[active=true]:bg-slate-800 data-[active=true]:text-white data-[active=true]:border-slate-800" data-filter="manual_only">
                      <span class="material-symbols-outlined text-[14px]">edit_document</span> Manual <span class="bg-slate-100/50 px-1.5 rounded ml-1 text-[10px] opacity-70 border border-slate-200/50">${manualCount}</span>
                    </button>` : ''}
                  </div>
                </div>

                <h1 class="text-3xl lg:text-[42px] font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">${escapeHtml(formData.title)}</h1>
                <p class="text-slate-500 text-base lg:text-[17px] leading-relaxed max-w-2xl">${escapeHtml(formData.description || 'Review the suggested answers below. You can edit them manually or use AI to refine them.')}</p>
                
                <div class="flex flex-wrap items-center gap-3 mt-6">
                  <div class="flex items-center gap-2 text-[13px] text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm font-semibold">
                    <span class="material-symbols-outlined text-primary text-[18px]">list_alt</span>
                    <span><span id="answered-count">${Object.keys(answers).filter(k => answers[k]?.text).length}</span> / ${formData.questions.length} answered</span>
                  </div>
                </div>
              </div>

              <!-- Question Cards -->
              <div id="questions-container" class="space-y-6 stagger-children pb-10">
                ${questionsHtml}
              </div>

              <!-- Bottom Review CTA -->
              <div class="mt-8 flex justify-center pb-12">
                <button id="btn-review-bottom" class="w-[200px] bg-primary text-white py-3 rounded-lg font-bold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:bg-primary/90 hover:shadow-[0_8px_16px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 btn-press group">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span>
                  Review
                </button>
              </div>
            </div>
          </div>

          <!-- AI Chat Panel (Right) -->
          <aside id="chat-panel" class="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] transition-all">
            <div class="p-4 lg:p-6 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-xl">smart_toy</span>
                <span class="font-bold tracking-tight">Copilot</span>
              </div>
            </div>

            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scroll-smooth">
              <!-- Initial AI greeting -->
              <div class="flex flex-col gap-2 animate-message-in">
                <div class="max-w-[85%] bg-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-4 text-sm text-slate-700 leading-relaxed relative group">
                  Hello! I've analyzed your form — <strong>${formData.title}</strong>. I found ${formData.questions.length} questions and generated suggested answers for each.
                  <ul class="mt-3 space-y-1 my-2">
                    <li class="flex items-start gap-2"><span class="material-symbols-outlined text-primary text-sm mt-0.5">edit_square</span> Edit any answer directly on the card.</li>
                    <li class="flex items-start gap-2"><span class="material-symbols-outlined text-primary text-sm mt-0.5">forum</span> Or ask me to refine specific answers down here.</li>
                  </ul>
                  Let me know what you need!
                </div>
                <span class="text-[10px] text-slate-400 font-medium ml-2">System • ${formatTime(new Date())}</span>
              </div>
            </div>

            <!-- Chat Input -->
            <div class="p-4 lg:p-6 border-t border-slate-200 bg-white">
              <div class="flex gap-2 mb-3 overflow-x-auto no-scrollbar scroll-smooth" id="chat-suggestions">
                <!-- Suggestion pills update dynamically -->
                <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Make all answers more professional">
                  <span class="material-symbols-outlined text-[14px]">work</span> Professional
                </button>
                <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Shorten all long answers">
                  <span class="material-symbols-outlined text-[14px]">compress</span> Shorten
                </button>
                <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Expand brief answers with more detail">
                  <span class="material-symbols-outlined text-[14px]">expand_content</span> Expand
                </button>
              </div>
              <div class="relative group">
                <textarea
                  id="chat-input"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm py-3 pl-4 pr-12 resize-none transition-all shadow-sm"
                  placeholder="Ask Copilot anything..."
                  rows="1"
                  style="min-height: 48px; max-height: 120px;"
                ></textarea>
                <button id="btn-send-chat" class="absolute bottom-1/2 translate-y-1/2 right-2 w-8 h-8 flex shrink-0 items-center justify-center bg-primary text-white rounded-full hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50">
                  <span class="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  `;

  function init(wrapper) {
    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send-chat');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const btnReview = wrapper.querySelector('#btn-review');
    const btnToggleChatNavbar = wrapper.querySelector('#btn-toggle-chat-navbar');
    const btnCloseChat = wrapper.querySelector('#btn-close-chat');
    const chatPanel = wrapper.querySelector('#chat-panel');
    const questionsContainer = wrapper.querySelector('#questions-container');

    // ─── Drag and Drop Card Reordering ───
    if (!window.Sortable) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => {
        if (questionsContainer) {
          window.Sortable.create(questionsContainer, {
            animation: 250,
            handle: '.drag-handle',
            ghostClass: 'opacity-40',
            dragClass: 'shadow-2xl',
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            onEnd: function (evt) {
              const { formData } = getState();
              if (formData?.questions) {
                const movedItem = formData.questions.splice(evt.oldIndex, 1)[0];
                formData.questions.splice(evt.newIndex, 0, movedItem);
                setState({ formData });
              }
            }
          });
        }
      };
      document.body.appendChild(script);
    } else if (questionsContainer) {
      window.Sortable.create(questionsContainer, {
        animation: 250,
        handle: '.drag-handle',
        ghostClass: 'opacity-40',
        dragClass: 'shadow-2xl',
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        onEnd: function (evt) {
          const { formData } = getState();
          if (formData?.questions) {
            const movedItem = formData.questions.splice(evt.oldIndex, 1)[0];
            formData.questions.splice(evt.newIndex, 0, movedItem);
            setState({ formData });
          }
        }
      });
    }

    // ─── Question card interactions ──────

    // Initialize & Sync Undo/Redo states
    const syncUndoRedoButtons = () => {
      const { formData } = getState();
      if (!formData?.questions) return;
      formData.questions.forEach(q => {
        const uBtn = questionsContainer.querySelector(`.btn-undo[data-question-id="${q.id}"]`);
        const rBtn = questionsContainer.querySelector(`.btn-redo[data-question-id="${q.id}"]`);
        if (uBtn) uBtn.disabled = !canUndo(q.id);
        if (rBtn) rBtn.disabled = !canRedo(q.id);
      });
    };
    syncUndoRedoButtons();
    subscribe(syncUndoRedoButtons);

    // Undo / Redo Click Handlers
    questionsContainer.addEventListener('click', (e) => {
      const undoBtn = e.target.closest('.btn-undo');
      const redoBtn = e.target.closest('.btn-redo');

      let newAns = null;
      let qId = null;

      if (undoBtn) {
        qId = undoBtn.dataset.questionId;
        newAns = undoAnswer(qId);
      } else if (redoBtn) {
        qId = redoBtn.dataset.questionId;
        newAns = redoAnswer(qId);
      }

      if (newAns && qId) {
        const textarea = questionsContainer.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
        if (textarea) textarea.value = newAns.text;

        const badge = questionsContainer.querySelector(`.answer-badge[data-question-id="${qId}"]`);
        if (badge) {
          if (newAns.source === 'user' || newAns.source === 'edited') {
            badge.outerHTML = `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-bg-sunken); color: var(--fm-text-secondary); border: 1px solid var(--fm-border);" data-question-id="${qId}"><span class="material-symbols-outlined text-[14px]">edit</span> User Edited</span>`;
          } else if (newAns.source === 'ai') {
            badge.outerHTML = `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-primary-50); color: var(--fm-primary); border: 1px solid rgba(var(--fm-primary-rgb), 0.2);" data-question-id="${qId}"><span class="material-symbols-outlined text-[14px]">auto_awesome</span> AI Generated</span>`;
          } else if (newAns.source === 'autofill') {
            badge.outerHTML = `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-success-light); color: var(--fm-success); border: 1px solid rgba(var(--fm-success-rgb), 0.2);" data-question-id="${qId}"><span class="material-symbols-outlined text-[14px]">bolt</span> Autofilled</span>`;
          }
        }
        updateAnsweredCount();
      }
    });

    // Edit answer in textarea
    questionsContainer.addEventListener('input', (e) => {
      if (e.target.matches('.answer-textarea')) {
        const qId = e.target.dataset.questionId;
        updateAnswer(qId, e.target.value, 'user');
        updateAnsweredCount();
      }
    });

    // Regenerate button
    questionsContainer.addEventListener('click', async (e) => {
      const regenBtn = e.target.closest('.btn-regenerate');
      if (!regenBtn) return;

      const qId = regenBtn.dataset.questionId;
      const { formData: fd, answers: ans } = getState();
      const question = fd.questions.find(q => q.id === qId);

      regenBtn.disabled = true;
      regenBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Generating...';

      const newAnswer = await regenerateAnswer(question, ans[qId]?.text || '');
      updateAnswer(qId, newAnswer.text, 'ai');

      // Update textarea
      const textarea = questionsContainer.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
      if (textarea) textarea.value = newAnswer.text;

      // Update pills
      updateChatPills(question);

      // Update badge
      const badge = questionsContainer.querySelector(`.answer-badge[data-question-id="${qId}"]`);
      if (badge) {
        badge.innerHTML = '<span class="material-symbols-outlined text-[12px]">auto_awesome</span> AI Generated';
        badge.className = 'answer-badge flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20';
        badge.dataset.questionId = qId;
      }

      regenBtn.disabled = false;
      regenBtn.innerHTML = '<span class="material-symbols-outlined text-sm">refresh</span> Regenerate';

      updateAnsweredCount();
    });

    // Quick action buttons (shorten, professional, friendly)
    questionsContainer.addEventListener('click', async (e) => {
      const actionBtn = e.target.closest('.quick-action');
      if (!actionBtn) return;

      const qId = actionBtn.dataset.questionId;
      const action = actionBtn.dataset.action;
      const { formData: fd, answers: ans } = getState();
      const currentText = ans[qId]?.text || '';
      const question = fd.questions.find(q => q.id === qId);

      if (!currentText) return;

      // Show loading state
      const originalHtml = actionBtn.innerHTML;
      actionBtn.disabled = true;
      actionBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> ...';

      try {
        const newAnswer = await quickEditAnswer(question, currentText, action);

        updateAnswer(qId, newAnswer.text, newAnswer.source);
        const textarea = questionsContainer.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
        if (textarea) textarea.value = newAnswer.text;

        // Re-render card completely to update badge and confidence (or just let the user know, since we use vanilla js right now)
        // A minimal DOM update for the badge:
        const badge = questionsContainer.querySelector(`.answer-badge[data-question-id="${qId}"]`);
        if (badge) {
          badge.outerHTML = `<span class="answer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide" style="background: var(--fm-bg-sunken); color: var(--fm-text-secondary); border: 1px solid var(--fm-border);" data-question-id="${qId}"><span class="material-symbols-outlined text-[14px]">edit</span> User Edited</span>`;
        }
      } catch (err) {
        console.error(err);
      } finally {
        actionBtn.disabled = false;
        actionBtn.innerHTML = originalHtml;
      }
    });

    // Select answers for radio/checkbox/dropdown
    questionsContainer.addEventListener('click', (e) => {
      const optionEl = e.target.closest('.option-select');
      if (!optionEl) return;

      const qId = optionEl.dataset.questionId;
      const value = optionEl.dataset.value;
      const type = optionEl.dataset.type;

      const { answers: ans } = getState();

      if (type === 'radio' || type === 'dropdown') {
        updateAnswer(qId, value, 'user');
        // Update UI: deselect others, select this
        questionsContainer.querySelectorAll(`.option-select[data-question-id="${qId}"]`).forEach(el => {
          el.classList.remove('border-primary', 'bg-primary/5');
          el.classList.add('border-slate-100');
          const dot = el.querySelector('.radio-dot');
          if (dot) dot.classList.add('hidden');
        });
        optionEl.classList.add('border-primary', 'bg-primary/5');
        optionEl.classList.remove('border-slate-100');
        const dot = optionEl.querySelector('.radio-dot');
        if (dot) dot.classList.remove('hidden');
      } else if (type === 'checkbox') {
        const currentVal = ans[qId]?.text || '';
        const selected = currentVal ? currentVal.split(', ') : [];
        const idx = selected.indexOf(value);
        if (idx >= 0) {
          selected.splice(idx, 1);
          optionEl.classList.remove('border-primary', 'bg-primary/5');
          optionEl.classList.add('border-slate-100');
          const check = optionEl.querySelector('.check-mark');
          if (check) check.classList.add('hidden');
        } else {
          selected.push(value);
          optionEl.classList.add('border-primary', 'bg-primary/5');
          optionEl.classList.remove('border-slate-100');
          const check = optionEl.querySelector('.check-mark');
          if (check) check.classList.remove('hidden');
        }
        updateAnswer(qId, selected.join(', '), 'user');
      }

      updateAnsweredCount();
    });

    // Scale selection
    questionsContainer.addEventListener('click', (e) => {
      const scaleBtn = e.target.closest('.scale-btn');
      if (!scaleBtn) return;

      const qId = scaleBtn.dataset.questionId;
      const value = scaleBtn.dataset.value;

      updateAnswer(qId, value, 'user');

      // Update UI
      questionsContainer.querySelectorAll(`.scale-btn[data-question-id="${qId}"]`).forEach(el => {
        el.classList.remove('bg-primary', 'text-white');
        el.classList.add('border-slate-200');
      });
      scaleBtn.classList.add('bg-primary', 'text-white');
      scaleBtn.classList.remove('border-slate-200');

      updateAnsweredCount();
    });

    // ─── Question Categories Toggle ──────
    const btnQuestionCategories = wrapper.querySelector('#btn-question-categories');
    const categoriesPanel = wrapper.querySelector('#question-categories-panel');
    if (btnQuestionCategories && categoriesPanel) {
      btnQuestionCategories.addEventListener('click', () => {
        categoriesPanel.classList.toggle('hidden');
        categoriesPanel.classList.toggle('flex');
        const icon = btnQuestionCategories.querySelector('span:last-child');
        icon.textContent = categoriesPanel.classList.contains('hidden') ? 'expand_more' : 'expand_less';
      });

      // Category filter pills logic
      const filterPills = categoriesPanel.querySelectorAll('.filter-pill');
      if (filterPills.length > 0) {
        filterPills.forEach(pill => {
          pill.addEventListener('click', () => {
            // Unset all active state
            filterPills.forEach(p => p.setAttribute('data-active', 'false'));
            // Set current active state
            pill.setAttribute('data-active', 'true');

            const filterType = pill.dataset.filter;
            const allCards = questionsContainer.querySelectorAll('.card-premium');

            allCards.forEach(card => {
              // Handle filtering
              if (filterType === 'all' || card.dataset.category === filterType) {
                card.classList.remove('hidden');
              } else {
                card.classList.add('hidden');
              }
            });
          });
        });
      }
    }

    // ─── Active Field Tracking ───────────
    window.activeFieldId = null;
    let hasShownAiTooltip = false;

    questionsContainer.addEventListener('focusin', (e) => {
      if (e.target.matches('.answer-textarea, input[type="radio"], input[type="checkbox"], select, input')) {
        const qId = e.target.dataset.questionId;
        if (qId) {
          window.activeFieldId = qId;
          if (!hasShownAiTooltip) {
            hasShownAiTooltip = true;
            // Short delay so it doesn't overlap immediately with page load
            setTimeout(() => {
              if (window.toast && window.toast.info) {
                window.toast.info('💡 Tip: Ask Copilot for help with this specific field.');
              }
            }, 500);
          }
        }
      }
    });

    // ─── Chat interactions ──────────────

    const chatHistory = [];

    // Setup Personality selector
    const selectPersonality = wrapper.querySelector('#chat-personality');
    const { settings } = getState();
    if (selectPersonality) {
      if (settings?.ai?.personality) {
        selectPersonality.value = settings.ai.personality;
        setState({ personality: settings.ai.personality });
      }
      selectPersonality.addEventListener('change', (e) => {
        setState({ personality: e.target.value });
      });
    }

    // Auto-resize chat textarea
    chatInput.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
      btnSend.disabled = !this.value.trim();
    });

    // Chat Search
    const chatSearch = wrapper.querySelector('#chat-search');
    if (chatSearch) {
      chatSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const messages = chatMessages.querySelectorAll('.animate-message-in');
        messages.forEach(msg => {
          if (!term || msg.textContent.toLowerCase().includes(term)) {
            msg.style.display = 'flex';
          } else {
            msg.style.display = 'none';
          }
        });
      });
    }

    // Chat Export
    const btnExportChat = wrapper.querySelector('#btn-export-chat');
    if (btnExportChat) {
      btnExportChat.addEventListener('click', () => {
        const extractText = Array.from(chatMessages.querySelectorAll('.animate-message-in')).map(node => {
          const isUser = node.querySelector('.bg-primary.text-white');
          const text = node.querySelector('.text-sm')?.textContent.trim() || '';
          return `${isUser ? 'You' : 'Copilot'}: ${text}`;
        }).join('\n\n');

        const blob = new Blob([extractText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FormMate-Chat-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
      });
    }

    async function sendMessage(text) {
      if (!text.trim()) return;

      chatHistory.push({ role: 'user', content: text });

      // Add user message
      const userBubble = document.createElement('div');
      userBubble.className = 'flex flex-col gap-1 items-end animate-message-in mb-6';
      userBubble.innerHTML = `
        <div class="max-w-[85%] bg-primary text-white rounded-[var(--fm-card-radius)] rounded-tr-none px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm">
          ${escapeHtml(text)}
        </div>
        <span class="text-[10px] text-slate-400 font-medium mr-2">You • ${formatTime(new Date())}</span>
      `;
      chatMessages.appendChild(userBubble);
      btnSend.disabled = true;

      // Show typing indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'flex flex-col gap-1 animate-message-in mb-6';
      typingEl.innerHTML = `
        <div class="max-w-[85%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none px-4 py-3 flex items-center gap-1.5 h-10 w-16">
          <div class="typing-dot bg-slate-400"></div>
          <div class="typing-dot bg-slate-400" style="animation-delay: 0.2s"></div>
          <div class="typing-dot bg-slate-400" style="animation-delay: 0.4s"></div>
        </div>
      `;
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Get AI response
      const { formData: fd } = getState();
      try {
        const responseText = await processChatMessage(text, {
          title: fd.title,
          questions: fd.questions // pass the full details
        }, chatHistory, window.activeFieldId || null);

        chatHistory.push({ role: 'assistant', content: responseText });

        // Remove typing
        typingEl.remove();

        // Check if response contains field suggestion format (e.g. [Field N]: "suggestion")
        // Basic heuristic for apply to field UI
        const isSuggestion = (responseText.includes('Field') || responseText.includes('Q')) && responseText.includes(':');

        // Extract <think> tags if present
        let cleanResponse = responseText;
        let thinkContent = '';
        const thinkMatch = responseText.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
          thinkContent = thinkMatch[1].trim();
          cleanResponse = responseText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }

        // Add AI message
        const aiBubble = document.createElement('div');
        aiBubble.className = 'flex flex-col gap-1 animate-message-in mb-6 group';

        let bubbleHtml = `<div class="max-w-[90%] bg-slate-50 border border-slate-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-4 text-[13px] text-slate-700 leading-relaxed relative flex flex-col gap-3">`;

        if (thinkContent) {
          bubbleHtml += `
             <details class="bg-slate-100/50 rounded-xl p-3 border border-slate-200/60 open:bg-white transition-all">
               <summary class="text-xs font-bold text-slate-500 cursor-pointer flex items-center gap-1.5 focus:outline-none">
                 <span class="material-symbols-outlined text-[14px] text-primary">psychology</span>
                 View Copilot's Thought Process
               </summary>
               <div class="mt-2 text-xs text-slate-500 font-mono whitespace-pre-wrap pl-5 border-l-2 border-slate-200">${escapeHtml(thinkContent)}</div>
             </details>
           `;
        }

        bubbleHtml += `
            <div>${formatMarkdown(escapeHtml(cleanResponse))}</div>
            
            ${isSuggestion ? `
              <div class="mt-3 pt-3 border-t border-slate-200/60 flex justify-end">
                <button class="text-xs bg-white border border-slate-200 text-primary font-bold px-3 py-1.5 rounded-lg shadow-sm hover:border-primary/30 transition-colors flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">checklist</span> Apply to fields
                </button>
              </div>
            ` : ''}
        `;

        aiBubble.innerHTML = bubbleHtml + `

            <!-- Quick copy action overlay ->
            <button class="absolute -right-2 -top-2 size-6 bg-white border border-slate-100 shadow-sm rounded-full text-slate-400 hover:text-primary items-center justify-center hidden group-hover:flex transition-all z-10" title="Copy text">
              <span class="material-symbols-outlined text-[12px]">content_copy</span>
            </button>
          </div>
          <span class="text-[10px] text-slate-400 font-medium ml-2">Copilot • ${formatTime(new Date())}</span>
        `;
        chatMessages.appendChild(aiBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Implement the apply button
        const applyBtn = aiBubble.querySelector('button');
        if (applyBtn) {
          applyBtn.addEventListener('click', () => {
            applyBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">check</span> Applied';
            applyBtn.classList.add('bg-green-50', 'text-green-600', 'border-green-200');
            alert('In a real environment, this would parse the response and update the specific form inputs directly using their IDs.');
          });
        }

      } catch (e) {
        typingEl.remove();
        console.error(e);
        const errorBubble = document.createElement('div');
        errorBubble.className = 'flex flex-col gap-1 animate-message-in mb-6 group';
        errorBubble.innerHTML = `
          <div class="max-w-[85%] bg-red-50 text-red-600 border border-red-100 rounded-[var(--fm-card-radius)] rounded-tl-none p-4 text-[13px] leading-relaxed relative flex flex-col gap-3">
             <div class="flex items-center gap-2 font-bold"><span class="material-symbols-outlined text-[16px]">error</span> AI service is currently unavailable.</div>
             <p class="text-xs">Please check system configuration or try again later.</p>
          </div>
          <span class="text-[10px] text-slate-400 font-medium ml-2">System • ${formatTime(new Date())}</span>
        `;
        chatMessages.appendChild(errorBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } finally {
        chatInput.style.height = '48px'; // reset auto height
      }
    }

    btnSend.addEventListener('click', () => {
      sendMessage(chatInput.value);
      chatInput.value = '';
      btnSend.disabled = true;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
        chatInput.value = '';
        btnSend.disabled = true;
      }
    });

    // Chip shortcuts - dynamic text insertion instead of immediate sending
    wrapper.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const msg = chip.dataset.msg;
        chatInput.value = msg;
        chatInput.focus();
        btnSend.disabled = false;
        // Trigger resize
        chatInput.dispatchEvent(new Event('input'));
      });
    });

    // ─── Personality Dropdown ───────────
    const personalitySelect = wrapper.querySelector('#chat-personality');
    if (personalitySelect) {
      personalitySelect.addEventListener('change', (e) => {
        setState({ personality: e.target.value });
      });
    }

    // ─── Toggle chat panel ──────────────
    let isDesktopChatOpen = true; // initially md:flex

    const toggleChatVisibility = () => {
      if (window.innerWidth >= 768) {
        // Desktop mode
        isDesktopChatOpen = !isDesktopChatOpen;
        if (isDesktopChatOpen) {
          chatPanel.classList.remove('md:hidden');
          chatPanel.classList.add('md:flex');
          if (btnToggleChatNavbar) {
            const textSpan = btnToggleChatNavbar.querySelector('.toggle-text');
            if (textSpan) textSpan.textContent = 'Hide Chat';
          }
        } else {
          chatPanel.classList.remove('md:flex');
          chatPanel.classList.add('md:hidden');
          if (btnToggleChatNavbar) {
            const textSpan = btnToggleChatNavbar.querySelector('.toggle-text');
            if (textSpan) textSpan.textContent = 'Show Chat';
          }
        }
      } else {
        // Mobile mode
        chatPanel.classList.toggle('hidden');
        if (btnToggleChatNavbar) {
          const isHidden = chatPanel.classList.contains('hidden');
          const textSpan = btnToggleChatNavbar.querySelector('.toggle-text');
          if (textSpan) textSpan.textContent = isHidden ? 'Show Chat' : 'Hide Chat';
        }
      }
    };

    btnToggleChatNavbar?.addEventListener('click', toggleChatVisibility);
    btnCloseChat?.addEventListener('click', toggleChatVisibility);

    // Sidebar chat toggle
    const btnNavChat = wrapper.querySelector('#nav-chat');
    btnNavChat?.addEventListener('click', toggleChatVisibility);

    // ─── Review buttons (top + bottom) ──
    btnReview?.addEventListener('click', () => navigateTo('review'));
    const btnReviewBottom = wrapper.querySelector('#btn-review-bottom');
    if (btnReviewBottom) btnReviewBottom.addEventListener('click', () => navigateTo('review'));

    // ─── Sidebar navigation ─────────────
    wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => navigateTo('landing'));

    wrapper.querySelector('#nav-dashboard-sidebar')?.addEventListener('click', () => navigateTo('landing'));

    wrapper.querySelector('#nav-new-form')?.addEventListener('click', () => {
      setState({ formData: null, answers: {} });
      navigateTo('landing');
    });

    wrapper.querySelector('#nav-history')?.addEventListener('click', () => {
      navigateTo('accounts');
      setTimeout(() => document.getElementById('tab-history')?.click(), 100);
    });

    wrapper.querySelector('#nav-settings')?.addEventListener('click', () => {
      navigateTo('accounts');
      setTimeout(() => {
        const settingsTabBtn = document.querySelector('[data-tab-index="4"]');
        if (settingsTabBtn) settingsTabBtn.click();
      }, 100);
    });

    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => {
      navigateTo('examples');
    });

    wrapper.querySelector('#sidebar-profile')?.addEventListener('click', () => {
      navigateTo('accounts');
    });

    wrapper.querySelector('#btn-upgrade-sidebar')?.addEventListener('click', () => {
      navigateTo('pricing');
    });

    wrapper.querySelector('#nav-vault')?.addEventListener('click', () => {
      navigateTo('accounts');
    });

    wrapper.querySelectorAll('#nav-settings').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo('accounts');
        setTimeout(() => {
          const settingsTabBtn = document.querySelector('[data-tab-index="4"]');
          if (settingsTabBtn) settingsTabBtn.click();
        }, 150);
      });
    });

    wrapper.querySelector('#nav-support')?.addEventListener('click', () => {
      navigateTo('help');
    });

    wrapper.querySelector('#btn-profile-header')?.addEventListener('click', () => {
      if (getState().isAuthenticated) {
        navigateTo('accounts');
      } else {
        navigateTo('auth');
      }
    });

    // ─── Helpers ────────────────────────
    function updateAnsweredCount() {
      const { answers: ans } = getState();
      const count = Object.values(ans).filter(a => a?.text).length;
      const el = wrapper.querySelector('#answered-count');
      if (el) el.textContent = count;
    }

    function updateChatPills(question) {
      if (!question) return;
      const suggestionsContainer = wrapper.querySelector('#chat-suggestions');
      if (!suggestionsContainer) return;

      const type = question.type;
      let pillsHtml = `
        <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Make the answer for this field more professional">
          <span class="material-symbols-outlined text-[14px]">work</span> Professional
        </button>
      `;

      if (type === 'long_text') {
        pillsHtml += `
          <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Make the answer shorter and more concise">
            <span class="material-symbols-outlined text-[14px]">compress</span> Shorter
          </button>
          <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Expand the answer with more detail">
            <span class="material-symbols-outlined text-[14px]">expand_content</span> Expand
          </button>
          <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Rewrite this answer completely">
            <span class="material-symbols-outlined text-[14px]">sync</span> Rewrite
          </button>
        `;
      } else {
        pillsHtml += `
          <button class="chat-chip whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-[11px] font-bold px-3 py-1.5 rounded-lg text-primary transition-colors border border-primary/10 flex items-center gap-1" data-msg="Give me another option for this field">
            <span class="material-symbols-outlined text-[14px]">lightbulb</span> Idea
          </button>
        `;
      }

      suggestionsContainer.innerHTML = pillsHtml;

      // Re-bind listeners for the new chips
      suggestionsContainer.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const msg = chip.dataset.msg;
          chatInput.value = msg;
          chatInput.focus();
          btnSend.disabled = false;
          chatInput.dispatchEvent(new Event('input'));
        });
      });
    }

    // Set initial pills based on first question
    const { formData: initialFd } = getState();
    if (initialFd?.questions?.length > 0) {
      updateChatPills(initialFd.questions[0]);
    }
  }

  return { html, init };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMarkdown(text) {
  let html = text;
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code
  html = html.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-primary px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
  // Bullets
  html = html.replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc marker:text-primary pl-1">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul class="my-2 space-y-1.5">$1</ul>');

  // Line breaks
  return html.replace(/\n\n/g, '<br><br>').replace(/\n(?!\s*<)/g, '<br>');
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
