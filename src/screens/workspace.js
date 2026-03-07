// ═══════════════════════════════════════════
// FormMate — Main Workspace Screen
// ═══════════════════════════════════════════

import { getState, setState, updateAnswer, addChatMessage } from '../state.js';
import { navigateTo } from '../router.js';
import { regenerateAnswer, processChatMessage, quickEditAnswer } from '../ai/ai-actions.js';
import { renderQuestionCard } from '../components/question-card.js';

export function workspaceScreen() {
  const { formData, answers } = getState();

  if (!formData) {
    navigateTo('landing');
    return { html: '', init: () => { } };
  }

  const questionsHtml = formData.questions.map((q, i) =>
    renderQuestionCard(q, answers[q.id], i)
  ).join('');

  const html = `
    <div class="flex h-screen overflow-hidden">

      <!-- Sidebar Navigation -->
      <aside id="sidebar" class="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 hidden lg:flex">
        <div class="p-6 flex items-center gap-3 cursor-pointer" id="sidebar-logo">
          <div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span class="material-symbols-outlined">auto_awesome</span>
          </div>
          <h1 class="text-xl font-bold tracking-tight">FormMate</h1>
        </div>

        <nav class="flex-1 px-4 space-y-1">
          <a id="nav-active" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium cursor-pointer">
            <span class="material-symbols-outlined">folder_open</span> Active Form
          </a>
          <a id="nav-new-form" class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
            <span class="material-symbols-outlined">add_circle</span> New Form
          </a>
          <a id="nav-history" class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
            <span class="material-symbols-outlined">history</span> History
          </a>
        </nav>

        <div class="p-4 border-t border-slate-200">
          <div class="bg-slate-100 rounded-xl p-3">
            <p class="text-xs font-semibold text-slate-500 mb-2">AI CREDITS</p>
            <div class="w-full bg-slate-200 h-1.5 rounded-full mb-2">
              <div class="bg-primary w-1/4 h-full rounded-full"></div>
            </div>
            <p class="text-[10px] text-slate-500">${formData.questions.length} questions analyzed</p>
          </div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="flex-1 flex flex-col overflow-hidden bg-white">
        <!-- Top Header -->
        <header class="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md z-10 shrink-0">
          <div class="flex items-center gap-4">
            <button id="btn-menu" class="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <span class="material-symbols-outlined">menu</span>
            </button>
            <span class="text-slate-400 hidden sm:inline">My Projects</span>
            <span class="material-symbols-outlined text-slate-300 text-sm hidden sm:inline">chevron_right</span>
            <span class="font-semibold truncate max-w-[200px]">${formData.title}</span>
            <span class="bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded text-slate-500">DRAFT</span>
          </div>
          <div class="flex items-center gap-2 md:gap-3">
            <button id="btn-toggle-chat" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <span class="material-symbols-outlined text-lg">smart_toy</span>
              <span class="hidden sm:inline">AI Chat</span>
            </button>
            <button id="btn-review" class="bg-primary text-white px-4 md:px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all btn-press">
              Review & Fill
            </button>
          </div>
        </header>

        <div class="flex-1 flex overflow-hidden">

          <!-- Form Questions (Center) -->
          <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
            <div class="max-w-3xl mx-auto space-y-8">
              <!-- Header -->
              <div class="space-y-2 border-b border-slate-100 pb-8">
                <h2 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">${formData.title}</h2>
                <p class="text-slate-500 text-base md:text-lg">${formData.description}</p>
                <div class="flex items-center gap-4 pt-2">
                  <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">quiz</span>
                    ${formData.questions.length} questions
                  </span>
                  <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">check_circle</span>
                    <span id="answered-count">${Object.keys(answers).filter(k => answers[k]?.text).length}</span> answered
                  </span>
                </div>
              </div>

              <!-- Question Cards -->
              <div id="questions-container" class="space-y-6 stagger-children">
                ${questionsHtml}
              </div>

              <!-- Bottom Review CTA -->
              <div class="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4">
                <button id="btn-review-bottom" class="w-full bg-primary text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 btn-press">
                  <span class="material-symbols-outlined">check_circle</span>
                  Review & Fill
                </button>
              </div>

              <!-- Spacer -->
              <div class="h-4"></div>
            </div>
          </div>

          <!-- AI Chat Panel (Right) -->
          <aside id="chat-panel" class="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex">
            <div class="p-4 lg:p-6 border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">smart_toy</span>
                <span class="font-bold">FormMate AI</span>
              </div>
              <span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>
            </div>

            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 no-scrollbar">
              <!-- Initial AI greeting -->
              <div class="flex flex-col gap-2 animate-message-in">
                <div class="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-4 text-sm text-slate-600">
                  Hello! I've analyzed your form — <strong>${formData.title}</strong>. I found ${formData.questions.length} questions and generated suggested answers for each.
                  <ul class="mt-2 space-y-1 list-disc list-inside">
                    <li>Edit any answer directly on the card</li>
                    <li>Ask me to refine specific answers</li>
                    <li>Click "Review & Fill" when ready</li>
                  </ul>
                </div>
                <span class="text-[10px] text-slate-400 ml-2">Just now</span>
              </div>
            </div>

            <!-- Chat Input -->
            <div class="p-4 lg:p-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
              <div class="relative">
                <textarea
                  id="chat-input"
                  class="w-full rounded-xl border-slate-200 bg-white focus:ring-primary focus:border-primary text-sm p-4 pr-12 resize-none no-scrollbar shadow-inner"
                  placeholder="Ask AI to refine your form..."
                  rows="2"
                ></textarea>
                <button id="btn-send-chat" class="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 btn-press">
                  <span class="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
              <div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button class="chat-chip whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full text-slate-500 transition-colors" data-msg="Make all answers more professional">Professional</button>
                <button class="chat-chip whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full text-slate-500 transition-colors" data-msg="Shorten all long answers">Shorten</button>
                <button class="chat-chip whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full text-slate-500 transition-colors" data-msg="Expand brief answers with more detail">Expand</button>
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
    const btnToggleChat = wrapper.querySelector('#btn-toggle-chat');
    const chatPanel = wrapper.querySelector('#chat-panel');
    const questionsContainer = wrapper.querySelector('#questions-container');

    // ─── Question card interactions ──────

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

      // Update badge
      const badge = questionsContainer.querySelector(`.answer-badge[data-question-id="${qId}"]`);
      if (badge) {
        badge.innerHTML = '<span class="material-symbols-outlined text-[12px]">auto_awesome</span> AI Generated';
        badge.className = 'answer-badge flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold';
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

    // ─── Chat interactions ──────────────

    async function sendMessage(text) {
      if (!text.trim()) return;

      // Add user message
      const userBubble = document.createElement('div');
      userBubble.className = 'flex flex-col gap-2 items-end animate-message-in';
      userBubble.innerHTML = `
        <div class="max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-none p-4 text-sm font-medium">
          ${escapeHtml(text)}
        </div>
        <span class="text-[10px] text-slate-400 mr-2">${formatTime(new Date())}</span>
      `;
      chatMessages.appendChild(userBubble);

      // Show typing indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'flex flex-col gap-2 animate-message-in';
      typingEl.innerHTML = `
        <div class="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
          <div class="typing-dot size-2 bg-slate-400 rounded-full"></div>
          <div class="typing-dot size-2 bg-slate-400 rounded-full"></div>
          <div class="typing-dot size-2 bg-slate-400 rounded-full"></div>
        </div>
      `;
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Get AI response
      const { formData: fd } = getState();
      const response = await processChatMessage(text, {
        title: fd.title,
        questionCount: fd.questions.length
      });

      // Remove typing indicator
      typingEl.remove();

      // Add AI message
      const aiBubble = document.createElement('div');
      aiBubble.className = 'flex flex-col gap-2 animate-message-in';
      aiBubble.innerHTML = `
        <div class="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-4 text-sm text-slate-600">
          ${escapeHtml(response.text)}
        </div>
        <span class="text-[10px] text-slate-400 ml-2">${formatTime(new Date())}</span>
      `;
      chatMessages.appendChild(aiBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    btnSend.addEventListener('click', () => {
      sendMessage(chatInput.value);
      chatInput.value = '';
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
        chatInput.value = '';
      }
    });

    // Chip shortcuts
    wrapper.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const msg = chip.dataset.msg;
        chatInput.value = msg;
        sendMessage(msg);
        chatInput.value = '';
      });
    });

    // ─── Toggle chat panel ──────────────
    btnToggleChat.addEventListener('click', () => {
      chatPanel.classList.toggle('hidden');
    });

    // ─── Review buttons (top + bottom) ──
    btnReview.addEventListener('click', () => navigateTo('review'));
    const btnReviewBottom = wrapper.querySelector('#btn-review-bottom');
    if (btnReviewBottom) btnReviewBottom.addEventListener('click', () => navigateTo('review'));

    // ─── Sidebar navigation ─────────────
    wrapper.querySelector('#sidebar-logo')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#nav-new-form')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#nav-history')?.addEventListener('click', () => {
      alert('History feature coming soon! Your completed forms will appear here.');
    });

    // ─── Helpers ────────────────────────
    function updateAnsweredCount() {
      const { answers: ans } = getState();
      const count = Object.values(ans).filter(a => a?.text).length;
      const el = wrapper.querySelector('#answered-count');
      if (el) el.textContent = count;
    }
  }

  return { html, init };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
