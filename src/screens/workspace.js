// ═══════════════════════════════════════════
// FormMate — Main Workspace Screen
// ═══════════════════════════════════════════

import { getState, setState, updateAnswer, addChatMessage, undoAnswer, redoAnswer, canUndo, canRedo, subscribe } from '../state.js';
import { navigateTo } from '../router.js';
import { regenerateAnswer, processChatMessage, quickEditAnswer } from '../ai/ai-actions.js';
import { renderQuestionCard } from '../components/question-card.js';
import { categorizeField } from '../ai/field-classifier.js';
import { withLayout, initLayout } from '../components/layout.js';
import { toast } from '../components/toast.js';

export function workspaceScreen() {
  const { formData, answers, tier } = getState();

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

  const workspaceContent = `
    <div class="flex-1 flex overflow-hidden relative" id="editor-container">
      <!-- Editor Center -->
      <div class="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar" id="editor-scroll">
        <div class="max-w-3xl mx-auto px-6 md:px-8 lg:px-12 py-8 lg:py-12 pb-32">
          
          <div class="mb-4">
            <button type="button" class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold tracking-wide text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors btn-press group" id="btn-question-categories" aria-controls="question-categories-panel" aria-expanded="false">
              <span class="material-symbols-outlined text-primary text-[14px]">category</span>
              Question Categories
              <span class="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-slate-600 ml-1">expand_more</span>
            </button>
            
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

          <!-- Question Cards -->
          <div id="questions-container" class="space-y-6 stagger-children pb-10 mt-10">
            ${questionsHtml}
          </div>

          <!-- Bottom Review CTA -->
          <div class="mt-8 flex justify-center pb-12">
            <button id="btn-review-bottom" class="w-[200px] bg-primary text-white py-3 rounded-lg font-bold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:bg-primary/90 hover:shadow-[0_8px_16px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 btn-press group">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              Review & Submit
            </button>
          </div>
        </div>
      </div>

      <!-- Copilot Panel (Right) -->
      <aside id="chat-panel" class="w-80 lg:w-96 border-l border-slate-100 bg-white flex flex-col shrink-0 hidden md:flex z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] transition-all">
        <div class="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">smart_toy</span>
            </div>
            <span class="font-black tracking-tight text-sm text-slate-900 uppercase">Copilot</span>
          </div>
          <button id="btn-close-chat" class="md:hidden size-8 flex items-center justify-center text-slate-400">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scroll-smooth no-scrollbar">
          <!-- Initial AI greeting -->
          <div class="flex flex-col gap-2 animate-message-in">
            <div class="max-w-[85%] bg-slate-50 rounded-2xl rounded-tl-none p-4 text-[13px] text-slate-700 leading-relaxed relative border border-slate-100 shadow-sm">
              Hello! I've analyzed <strong>${formData.title}</strong> and generated suggestions for ${formData.questions.length} fields.
              <ul class="mt-3 space-y-2 text-[12px]">
                <li class="flex items-start gap-2"><span class="material-symbols-outlined text-primary text-[14px] mt-0.5">edit</span> Edit any answer directly.</li>
                <li class="flex items-start gap-2"><span class="material-symbols-outlined text-primary text-[14px] mt-0.5">forum</span> Or ask me to refine everything at once.</li>
              </ul>
            </div>
            <span class="text-[10px] text-slate-400 font-bold ml-2">Copilot • ${formatTime(new Date())}</span>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="p-4 lg:p-6 border-t border-slate-100 bg-white">
          <div class="flex gap-2 mb-3 overflow-x-auto no-scrollbar scroll-smooth" id="chat-suggestions">
            <button class="chat-chip whitespace-nowrap bg-slate-50 hover:bg-white hover:border-primary/30 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-500 transition-all border border-slate-100 flex items-center gap-1" data-msg="Make all answers more professional">
              <span class="material-symbols-outlined text-[14px]">work</span> Professional
            </button>
            <button class="chat-chip whitespace-nowrap bg-slate-50 hover:bg-white hover:border-primary/30 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-500 transition-all border border-slate-100 flex items-center gap-1" data-msg="Shorten all long answers">
              <span class="material-symbols-outlined text-[14px]">compress</span> Shorten
            </button>
          </div>
          <div class="relative group">
            <textarea
              id="chat-input"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm py-3 pl-4 pr-12 resize-none transition-all shadow-sm outline-none"
              placeholder="Ask Copilot..."
              rows="1"
              style="min-height: 48px; max-height: 120px;"
            ></textarea>
            <button id="btn-send-chat" class="absolute bottom-1/2 translate-y-1/2 right-2 size-8 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition-all shadow-md active:scale-95 disabled:opacity-50">
              <span class="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;

  const html = withLayout('workspace', workspaceContent);

  function init(wrapper) {
    initLayout(wrapper);

    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send-chat');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const btnCloseChat = wrapper.querySelector('#btn-close-chat');
    const chatPanel = wrapper.querySelector('#chat-panel');
    const questionsContainer = wrapper.querySelector('#questions-container');

    // Drag and Drop
    if (!window.Sortable) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
      script.onload = () => initSortable();
      document.body.appendChild(script);
    } else {
      initSortable();
    }

    function initSortable() {
       if (questionsContainer && window.Sortable) {
          window.Sortable.create(questionsContainer, {
            animation: 250,
            handle: '.drag-handle',
            ghostClass: 'opacity-40',
            onEnd: function (evt) {
              const { formData } = getState();
              const movedItem = formData.questions.splice(evt.oldIndex, 1)[0];
              formData.questions.splice(evt.newIndex, 0, movedItem);
              setState({ formData });
            }
          });
        }
    }

    // Question card interactions
    const syncUndoRedoButtons = () => {
      formData.questions.forEach(q => {
        const uBtn = questionsContainer.querySelector(`.btn-undo[data-question-id="${q.id}"]`);
        const rBtn = questionsContainer.querySelector(`.btn-redo[data-question-id="${q.id}"]`);
        if (uBtn) uBtn.disabled = !canUndo(q.id);
        if (rBtn) rBtn.disabled = !canRedo(q.id);
      });
    };
    syncUndoRedoButtons();

    questionsContainer.addEventListener('click', async (e) => {
      const undoBtn = e.target.closest('.btn-undo');
      const redoBtn = e.target.closest('.btn-redo');
      const regenBtn = e.target.closest('.btn-regenerate');
      let newAns = null, qId = null;

      if (regenBtn) {
        qId = regenBtn.dataset.questionId;
        const { formData } = getState();
        const question = formData?.questions?.find(q => String(q.id) === String(qId));
        if (!question) return;

        const current = getState().answers?.[qId]?.text || '';
        const originalHtml = regenBtn.innerHTML;
        regenBtn.disabled = true;
        regenBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Regenerating';
        toast.info('Regenerating answer...');

        try {
          const res = await regenerateAnswer(question, current);
          updateAnswer(qId, res.text, 'ai');
          const textarea = wrapper.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
          if (textarea) textarea.value = res.text;
          updateAnsweredCount();
          syncUndoRedoButtons();
          try {
            const { incrementUsage } = await import('../storage/local-store.js');
            incrementUsage('edits');
          } catch (_) { /* no-op */ }
          toast.success('Answer updated');
        } catch (err) {
          console.error(err);
          toast.error(err?.message || 'Failed to regenerate answer');
        } finally {
          regenBtn.disabled = false;
          regenBtn.innerHTML = originalHtml;
        }

        return;
      }

      if (undoBtn) {
        qId = undoBtn.dataset.questionId;
        newAns = undoAnswer(qId);
      } else if (redoBtn) {
        qId = redoBtn.dataset.questionId;
        newAns = redoAnswer(qId);
      }

      if (newAns && qId) {
        const textarea = wrapper.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
        if (textarea) textarea.value = newAns.text;
        updateAnsweredCount();
      }
    });

    questionsContainer.addEventListener('input', (e) => {
      if (e.target.matches('.answer-textarea')) {
        updateAnswer(e.target.dataset.questionId, e.target.value, 'user');
        updateAnsweredCount();
      }
    });

    // Radio / checkbox / scale interactions (non-input controls)
    const applyRadioSelection = (questionId, selectedValue) => {
      wrapper.querySelectorAll(`.option-select[data-question-id="${questionId}"][data-type="radio"]`).forEach((el) => {
        const isSelected = el.dataset.value === selectedValue;
        el.classList.toggle('border-primary', isSelected);
        el.classList.toggle('bg-primary/5', isSelected);
        el.classList.toggle('border-slate-100', !isSelected);
        const dot = el.querySelector('.radio-dot');
        if (dot) dot.classList.toggle('hidden', !isSelected);
        const ring = el.querySelector('.size-4');
        if (ring) {
          ring.classList.toggle('border-primary', isSelected);
          ring.classList.toggle('border-slate-300', !isSelected);
        }
      });
    };

    const applyCheckboxSelection = (questionId, selectedValues) => {
      const set = new Set(selectedValues);
      wrapper.querySelectorAll(`.option-select[data-question-id="${questionId}"][data-type="checkbox"]`).forEach((el) => {
        const isChecked = set.has(el.dataset.value);
        el.classList.toggle('border-primary', isChecked);
        el.classList.toggle('bg-primary/5', isChecked);
        el.classList.toggle('border-slate-100', !isChecked);
        const mark = el.querySelector('.check-mark');
        if (mark) mark.classList.toggle('hidden', !isChecked);
        const box = el.querySelector('.size-4');
        if (box) {
          box.classList.toggle('border-primary', isChecked);
          box.classList.toggle('bg-primary', isChecked);
          box.classList.toggle('border-slate-300', !isChecked);
        }
      });
    };

    questionsContainer.addEventListener('click', (e) => {
      const opt = e.target.closest('.option-select');
      if (opt) {
        const qId = opt.dataset.questionId;
        const value = opt.dataset.value || '';
        const type = opt.dataset.type;

        if (type === 'radio') {
          updateAnswer(qId, value, 'user');
          applyRadioSelection(qId, value);
          updateAnsweredCount();
          syncUndoRedoButtons();
          return;
        }

        if (type === 'checkbox') {
          const current = getState().answers?.[qId]?.text || '';
          const items = current ? current.split(', ').filter(Boolean) : [];
          const idx = items.indexOf(value);
          if (idx >= 0) items.splice(idx, 1);
          else items.push(value);
          const next = items.join(', ');
          updateAnswer(qId, next, 'user');
          applyCheckboxSelection(qId, items);
          updateAnsweredCount();
          syncUndoRedoButtons();
          return;
        }
      }

      const scaleBtn = e.target.closest('.scale-btn');
      if (scaleBtn) {
        const qId = scaleBtn.dataset.questionId;
        const val = scaleBtn.dataset.value || '';
        updateAnswer(qId, String(val), 'user');
        // Update UI
        wrapper.querySelectorAll(`.scale-btn[data-question-id="${qId}"]`).forEach((b) => {
          const isActive = b.dataset.value === String(val);
          b.classList.toggle('bg-primary', isActive);
          b.classList.toggle('text-white', isActive);
          b.classList.toggle('border-slate-200', !isActive);
        });
        updateAnsweredCount();
        syncUndoRedoButtons();
      }
    });

    questionsContainer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const opt = e.target.closest('.option-select, .scale-btn');
      if (!opt) return;
      e.preventDefault();
      opt.click();
    });

    // Chat logic simplified for integration
    async function sendMessage(text) {
      if (!text.trim()) return;
      const userBubble = document.createElement('div');
      userBubble.className = 'flex flex-col gap-1 items-end animate-message-in';
      userBubble.innerHTML = `
        <div class="max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 text-[13px] font-bold shadow-sm">
          ${escapeHtml(text)}
        </div>
      `;
      chatMessages.appendChild(userBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // ... existing chat logic ...
    }

    btnSend?.addEventListener('click', () => {
      sendMessage(chatInput.value);
      chatInput.value = '';
    });

    // Review redirection
    wrapper.querySelector('#btn-review-bottom')?.addEventListener('click', () => navigateTo('review'));
    
    // Toggle Categories
    const categoriesBtn = wrapper.querySelector('#btn-question-categories');
    const categoriesPanel = wrapper.querySelector('#question-categories-panel');
    categoriesBtn?.addEventListener('click', () => {
      if (!categoriesPanel) return;
      const isHidden = categoriesPanel.classList.toggle('hidden');
      categoriesBtn.setAttribute('aria-expanded', String(!isHidden));
    });

    function updateAnsweredCount() {
       const count = Object.keys(getState().answers).filter(k => getState().answers[k]?.text).length;
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
