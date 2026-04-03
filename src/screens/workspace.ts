// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Main Workspace Screen (Redesigned)
// ═══════════════════════════════════════════

import { getState, setState, updateAnswer, addChatMessage, undoAnswer, redoAnswer, canUndo, canRedo, subscribe } from '../state';
import { navigateTo } from '../router';
import { regenerateAnswer, processChatMessage, quickEditAnswer } from '../ai/ai-actions';
import { getAiErrorMessage } from '../ai/ai-service';
import { renderQuestionCard } from '../components/question-card';
import { categorizeField } from '../ai/field-classifier';
import { withLayout, initLayout, openAccountModal } from '../components/layout';
import { toast } from '../components/toast';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';

function syncWorkspaceZenPanel(enabled, wrapper) {
  const rightPanel = wrapper.querySelector('#right-panel');
  const aiChatPanel = wrapper.querySelector('#ai-chat-panel');
  const aiActionsPanel = wrapper.querySelector('#ai-actions-panel');

  if (!rightPanel || !aiChatPanel || !aiActionsPanel) return;

  const activePanel = aiChatPanel.style.display !== 'none' ? 'chat' : 'actions';
  wrapper.dataset.zenWorkspacePanel = enabled ? activePanel : '';
  rightPanel.classList.toggle('zen-chat-active', enabled && activePanel === 'chat');
  rightPanel.classList.toggle('zen-actions-active', enabled && activePanel === 'actions');
}

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

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.text).length;
  const totalQ = formData.questions.length;

  const questionsHtml = formData.questions.map((q, i) =>
    renderQuestionCard(q, answers[q.id], i)
  ).join('');

  const workspaceContent = `
    <div class="flex-1 flex overflow-hidden relative zen-workspace-shell workspace-screen" id="editor-container">
      <!-- Editor Center -->
      <div class="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar zen-workspace-editor" id="editor-scroll">
        <div class="zen-workspace-editor-inner" style="max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem 8rem;">
          
          <!-- Breadcrumb & Actions Bar -->
          <div class="zen-workspace-toolbar app-surface-soft" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem;">
            <div class="workspace-zen-hide" style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Applications</span>
              <span style="font-size: 0.65rem; color: #cbd5e1;">›</span>
              <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-primary);">Current Draft</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="app-pill" style="background: #d1fae5; color: #059669; border-color: rgba(16, 185, 129, 0.18);">● <span id="answered-count">${answeredCount}</span> / ${totalQ} answered</span>
              <button id="btn-review-bottom" class="btn-press" style="padding: 0.5rem 1rem; background: var(--fm-primary-dark); color: #fff; border: none; border-radius: var(--fm-radius-md); font-size: 0.8rem; font-weight: 700; cursor: pointer;">Submit Application</button>
            </div>
          </div>

          <h1 class="workspace-title" style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 0.5rem;">${escapeHtml(formData.title)}</h1>

          <!-- Filter Tabs -->
          <div class="workspace-zen-hide app-surface-soft workspace-filter-row" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.25rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
            <button class="filter-pill" data-filter="all" data-active="true" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-text); background: var(--fm-text); color: #fff; font-size: 0.75rem; font-weight: 700; cursor: pointer;">All Questions</button>
            ${autoCount > 0 ? `<button class="filter-pill" data-filter="autofillable" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">Autofillable</button>` : ''}
            ${aiCount > 0 ? `<button class="filter-pill" data-filter="generatable" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">AI Generated</button>` : ''}
            ${manualCount > 0 ? `<button class="filter-pill" data-filter="manual_only" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">Manual</button>` : ''}
            <div style="margin-left: auto; display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #94a3b8; cursor: pointer;">
              <span class="material-symbols-outlined" style="font-size: 16px;">sort</span> Sort
            </div>
          </div>

          <!-- Question Cards -->
          <div id="questions-container" class="space-y-6 stagger-children workspace-question-list">
            ${questionsHtml}
          </div>

          <!-- Bottom Review CTA -->
          <div style="margin-top: 2.5rem; display: flex; justify-content: center;">
            <button id="btn-review-bottom-2" class="btn-press" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.7rem 2rem; background: var(--fm-primary-dark); color: #fff; border: none; border-radius: var(--fm-radius-xl); font-size: 0.85rem; font-weight: 700; cursor: pointer;">
              <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
              Review & Submit
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: AI Chat / AI Actions (Toggle) -->
      <aside id="right-panel" class="hidden md:flex zen-workspace-sidepanel" style="width: 320px; border-left: 1px solid var(--fm-border-light); background: #fff; flex-direction: column; flex-shrink: 0; z-index: 20;">
        
        <!-- Panel Toggle Tabs -->
        <div class="workspace-zen-panel-tabs" style="display: flex; border-bottom: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <button id="toggle-ai-chat" class="panel-toggle-btn active" style="flex: 1; padding: 0.75rem; border: none; background: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: var(--fm-primary); border-bottom: 2px solid var(--fm-primary);">AI Chat</button>
          <button id="toggle-ai-actions" class="panel-toggle-btn" style="flex: 1; padding: 0.75rem; border: none; background: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: #94a3b8; border-bottom: 2px solid transparent;">AI Actions</button>
        </div>

        <!-- AI Chat Panel -->
        <div id="ai-chat-panel" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--fm-border-light); display: flex; align-items: center; gap: 0.5rem;">
            <img src="https://ui-avatars.com/api/?name=AI&background=14919b&color=fff&bold=true&size=32" style="width: 32px; height: 32px; border-radius: 50%;" alt="Copilot" />
            <div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--fm-text);">Copilot</div>
              <div style="font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Always Active</div>
            </div>
            <div style="margin-left: auto; padding: 0.25rem 0.6rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.65rem; font-weight: 600; color: #64748b;">Tonal: Friendly</div>
          </div>

          <div style="padding: 0.5rem 1rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-primary); text-align: center;">Profile-Aware Assistant</div>

          <div id="chat-messages" class="no-scrollbar" style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--fm-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                <span class="material-symbols-outlined" style="font-size: 14px; color: #fff;">smart_toy</span>
              </div>
              <div style="background: var(--fm-bg-sunken); border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.75rem; font-size: 0.8rem; color: var(--fm-text); line-height: 1.5; max-width: 85%;">
                I can help refine answers for this form, explain field categories, and draft stronger responses where AI generation is available.
              </div>
            </div>
          </div>

          <!-- Chat Input -->
          <div style="padding: 0.75rem; border-top: 1px solid var(--fm-border-light);">
            <div style="display: flex; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">attachment</span>
                </button>
                <button style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">folder</span>
                </button>
              </div>
              <div style="flex: 1; position: relative;">
                <input type="text" id="chat-input" placeholder="Ask Copilot anything..." style="width: 100%; height: 36px; padding: 0 2.5rem 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.8rem; background: var(--fm-bg-sunken); color: var(--fm-text);" />
                <button id="btn-send-chat" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; background: var(--fm-primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
                </button>
              </div>
            </div>
            <div style="text-align: center; font-size: 0.6rem; color: #cbd5e1; margin-top: 0.35rem;">AI can make mistakes. Check important info.</div>
          </div>
        </div>

        <!-- AI Actions Panel (hidden by default) -->
        <div id="ai-actions-panel" class="no-scrollbar" style="display: none; flex-direction: column; flex: 1; overflow-y: auto; padding: 1.25rem;">
          <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text); margin-bottom: 0.15rem;">AI Actions</div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 1.25rem;">Fast-track your application workflow.</div>
          
          <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem;">Automated Tasks</div>
          
          <button id="btn-generate-all" class="btn-press" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 1rem; background: var(--fm-primary-dark); color: #fff; border: none; border-radius: var(--fm-radius-md); font-size: 0.85rem; font-weight: 700; cursor: pointer; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">auto_awesome</span> Generate All
            </div>
            <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
          </button>

          <button id="btn-review-all" class="btn-press" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 1rem; background: #fff; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; font-weight: 600; cursor: pointer; color: var(--fm-text); margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">checklist</span> Review All
            </div>
            <div style="display: flex; align-items: center; gap: 0.35rem; color: #94a3b8;">
              <span class="material-symbols-outlined" style="font-size: 16px;">sync</span>
              <span style="font-size: 0.75rem; font-weight: 700;">${totalQ}</span>
            </div>
          </button>

          <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem;">Refinement</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.25rem;">
            <button class="chat-chip btn-press" data-msg="Make all answers more professional" style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); background: #fff; cursor: pointer; color: var(--fm-text);">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary);">shield</span>
              <span style="font-size: 0.75rem; font-weight: 600;">Professional</span>
            </button>
            <button class="chat-chip btn-press" data-msg="Shorten all long answers" style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); background: #fff; cursor: pointer; color: var(--fm-text);">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary);">add</span>
              <span style="font-size: 0.75rem; font-weight: 600;">Concise</span>
            </button>
          </div>

          <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem;">Intelligence</div>
          <div style="padding: 1rem; background: var(--fm-bg-sunken); border-radius: var(--fm-radius-xl); margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--fm-primary);">location_on</span>
              <div>
                <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fm-primary); margin-bottom: 0.25rem;">Match Insight</div>
                <div style="font-size: 0.8rem; color: var(--fm-text); line-height: 1.45;">${autoCount} autofillable, ${aiCount} AI-generatable, ${manualCount} manual-only fields detected for this form.</div>
              </div>
            </div>
          </div>

          <div style="margin-top: auto;">
            <button id="btn-actions-review" class="btn-press" style="width: 100%; padding: 0.75rem; background: var(--fm-primary-dark); color: #fff; border: none; border-radius: var(--fm-radius-xl); font-size: 0.85rem; font-weight: 700; cursor: pointer;">Review & Submit</button>
          </div>
        </div>
      </aside>

      <!-- FAB for AI Actions (mobile) -->
      <button id="btn-fab-ai" style="position: absolute; bottom: 1.5rem; right: 1.5rem; width: 48px; height: 48px; border-radius: 50%; background: var(--fm-primary-dark); color: #fff; border: none; cursor: pointer; box-shadow: var(--fm-shadow-primary-lg); display: flex; align-items: center; justify-content: center; z-index: 10;" class="md:hidden btn-press">
        <span class="material-symbols-outlined">auto_awesome</span>
      </button>
    </div>
  `;

  const html = withLayout('workspace', workspaceContent, {
    zenMode: {
      screenId: 'workspace',
      onChange: (enabled, { wrapper }) => syncWorkspaceZenPanel(enabled, wrapper)
    },
    shellClassName: 'zen-layout-shell',
    contentClassName: 'zen-layout-content'
  });

  function init(wrapper) {
    const cleanupLayout = initLayout(wrapper, {
      zenMode: {
        screenId: 'workspace',
        onChange: (enabled, { wrapper }) => syncWorkspaceZenPanel(enabled, wrapper)
      }
    });

    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send-chat');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const questionsContainer = wrapper.querySelector('#questions-container');
    let isChatPending = false;
    const cleanupRichActions = bindRichActionClicks(chatMessages, { openAccountModal });

    // Panel Toggle
    const aiChatPanel = wrapper.querySelector('#ai-chat-panel');
    const aiActionsPanel = wrapper.querySelector('#ai-actions-panel');
    const toggleChat = wrapper.querySelector('#toggle-ai-chat');
    const toggleActions = wrapper.querySelector('#toggle-ai-actions');

    toggleChat?.addEventListener('click', () => {
      aiChatPanel.style.display = 'flex';
      aiActionsPanel.style.display = 'none';
      toggleChat.style.color = 'var(--fm-primary)';
      toggleChat.style.borderBottomColor = 'var(--fm-primary)';
      toggleActions.style.color = '#94a3b8';
      toggleActions.style.borderBottomColor = 'transparent';
      syncWorkspaceZenPanel(wrapper.classList.contains('zen-mode-active'), wrapper);
    });

    toggleActions?.addEventListener('click', () => {
      aiChatPanel.style.display = 'none';
      aiActionsPanel.style.display = 'flex';
      toggleActions.style.color = 'var(--fm-primary)';
      toggleActions.style.borderBottomColor = 'var(--fm-primary)';
      toggleChat.style.color = '#94a3b8';
      toggleChat.style.borderBottomColor = 'transparent';
      syncWorkspaceZenPanel(wrapper.classList.contains('zen-mode-active'), wrapper);
    });

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
      const chipBtn = e.target.closest('.btn-chip-action');
      let newAns = null, qId = null;

      if (chipBtn) {
        qId = chipBtn.dataset.questionId;
        const instruction = chipBtn.dataset.action || chipBtn.textContent?.trim() || '';
        const question = formData?.questions?.find((item) => String(item.id) === String(qId));
        const current = getState().answers?.[qId]?.text || '';
        if (!question || !instruction) return;

        const originalHtml = chipBtn.innerHTML;
        chipBtn.disabled = true;
        chipBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Updating';

        try {
          const res = await quickEditAnswer(question, current, instruction);
          updateAnswer(qId, res.text, 'edited');
          const textarea = wrapper.querySelector(`.answer-textarea[data-question-id="${qId}"]`);
          if (textarea) textarea.value = res.text;
          updateAnsweredCount();
          syncUndoRedoButtons();
          toast.success('Answer refined');
        } catch (err) {
          console.error(err);
          toast.error(getAiErrorMessage(err, 'Failed to refine answer.'));
        } finally {
          chipBtn.disabled = false;
          chipBtn.innerHTML = originalHtml;
        }
        return;
      }

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
            const { incrementUsage } = await import('../storage/local-store');
            incrementUsage('edits');
          } catch (_) { /* no-op */ }
          toast.success('Answer updated');
        } catch (err) {
          console.error(err);
          toast.error(getAiErrorMessage(err, 'Failed to regenerate answer.'));
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

    // Radio / checkbox / scale interactions
    const applyRadioSelection = (questionId, selectedValue) => {
      wrapper.querySelectorAll(`.option-select[data-question-id="${questionId}"][data-type="radio"]`).forEach((el) => {
        const isSelected = el.dataset.value === selectedValue;
        el.classList.toggle('border-primary', isSelected);
        el.classList.toggle('bg-primary/5', isSelected);
        el.classList.toggle('border-slate-100', !isSelected);
        const dot = el.querySelector('.radio-dot');
        if (dot) dot.classList.toggle('hidden', !isSelected);
        const ring = el.querySelector('.size-4');
        if (ring) { ring.classList.toggle('border-primary', isSelected); ring.classList.toggle('border-slate-300', !isSelected); }
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
        if (box) { box.classList.toggle('border-primary', isChecked); box.classList.toggle('bg-primary', isChecked); box.classList.toggle('border-slate-300', !isChecked); }
      });
    };

    questionsContainer.addEventListener('click', (e) => {
      const opt = e.target.closest('.option-select');
      if (opt) {
        const qId = opt.dataset.questionId;
        const value = opt.dataset.value || '';
        const type = opt.dataset.type;
        if (type === 'radio') { updateAnswer(qId, value, 'user'); applyRadioSelection(qId, value); updateAnsweredCount(); syncUndoRedoButtons(); return; }
        if (type === 'checkbox') {
          const current = getState().answers?.[qId]?.text || '';
          const items = current ? current.split(', ').filter(Boolean) : [];
          const idx = items.indexOf(value);
          if (idx >= 0) items.splice(idx, 1); else items.push(value);
          updateAnswer(qId, items.join(', '), 'user');
          applyCheckboxSelection(qId, items);
          updateAnsweredCount(); syncUndoRedoButtons(); return;
        }
      }
      const scaleBtn = e.target.closest('.scale-btn');
      if (scaleBtn) {
        const qId = scaleBtn.dataset.questionId;
        const val = scaleBtn.dataset.value || '';
        updateAnswer(qId, String(val), 'user');
        wrapper.querySelectorAll(`.scale-btn[data-question-id="${qId}"]`).forEach((b) => {
          const isActive = b.dataset.value === String(val);
          b.classList.toggle('bg-primary', isActive); b.classList.toggle('text-white', isActive); b.classList.toggle('border-slate-200', !isActive);
        });
        updateAnsweredCount(); syncUndoRedoButtons();
      }
    });

    questionsContainer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const opt = e.target.closest('.option-select, .scale-btn');
      if (!opt) return;
      e.preventDefault(); opt.click();
    });

    // Filter pills
    const applyQuestionFilter = (filter) => {
      wrapper.querySelectorAll('[data-card-id]').forEach((card) => {
        const category = card.getAttribute('data-category');
        card.style.display = filter === 'all' || category === filter ? '' : 'none';
      });
    };

    wrapper.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        wrapper.querySelectorAll('.filter-pill').forEach(p => {
          p.style.background = '#fff'; p.style.color = 'var(--fm-text)'; p.style.borderColor = 'var(--fm-border)';
          p.dataset.active = 'false';
        });
        pill.style.background = 'var(--fm-text)'; pill.style.color = '#fff'; pill.style.borderColor = 'var(--fm-text)';
        pill.dataset.active = 'true';
        applyQuestionFilter(pill.dataset.filter || 'all');
      });
    });

    // Chat
    const chatHistory = [];

    const appendChatBubble = (role, text) => {
      const isUser = role === 'user';
      const bubble = document.createElement('div');
      bubble.style.cssText = `display: flex; gap: 0.5rem; align-items: flex-start; ${isUser ? 'flex-direction: row-reverse;' : ''}`;
      bubble.innerHTML = `
        ${!isUser ? `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--fm-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;"><span class="material-symbols-outlined" style="font-size: 14px; color: #fff;">smart_toy</span></div>` : ''}
        <div style="background: ${isUser ? 'var(--fm-primary)' : 'var(--fm-bg-sunken)'}; color: ${isUser ? '#fff' : 'var(--fm-text)'}; border-radius: ${isUser ? 'var(--fm-radius-lg) 0 var(--fm-radius-lg) var(--fm-radius-lg)' : '0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg)'}; padding: 0.75rem; font-size: 0.8rem; line-height: 1.5; max-width: 85%;">
          ${isUser ? escapeHtml(text).replace(/\n/g, '<br>') : renderAssistantRichText(text)}
        </div>
        ${isUser ? `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--fm-primary-dark); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;"><span class="material-symbols-outlined" style="font-size: 14px; color: #fff;">person</span></div>` : ''}
      `;
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    async function sendMessage(text) {
      const trimmedText = text.trim();
      if (!trimmedText || isChatPending) return;
      isChatPending = true;
      appendChatBubble('user', trimmedText);
      addChatMessage('user', trimmedText);
      chatHistory.push({ role: 'user', content: trimmedText });
      btnSend.disabled = true;
      chatInput.disabled = true;

      const typingEl = document.createElement('div');
      typingEl.style.cssText = 'display: flex; gap: 0.5rem; align-items: flex-start;';
      typingEl.innerHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--fm-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><span class="material-symbols-outlined" style="font-size: 14px; color: #fff;">smart_toy</span></div><div style="background: var(--fm-bg-sunken); border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.75rem; display: flex; gap: 4px;"><div class="typing-dot" style="width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;"></div><div class="typing-dot" style="width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation-delay: 0.2s;"></div><div class="typing-dot" style="width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation-delay: 0.4s;"></div></div>`;
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const response = await processChatMessage(trimmedText, formData, chatHistory, getState().activeQuestionId);
        const cleanResponse = String(response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || 'I did not generate a response.';
        typingEl.remove();
        appendChatBubble('assistant', cleanResponse);
        addChatMessage('assistant', cleanResponse);
        chatHistory.push({ role: 'assistant', content: cleanResponse });
      } catch (error) {
        typingEl.remove();
        const message = getAiErrorMessage(error, 'AI service is unavailable right now.');
        appendChatBubble('assistant', message);
        toast.error(message);
      } finally {
        btnSend.disabled = !chatInput.value.trim();
        chatInput.disabled = false;
        isChatPending = false;
        chatInput.focus();
      }
    }

    chatInput?.addEventListener('input', () => {
      btnSend.disabled = !chatInput.value.trim();
    });

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btnSend.click(); }
    });

    btnSend?.addEventListener('click', () => {
      sendMessage(chatInput.value);
      chatInput.value = '';
    });

    wrapper.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.msg || '';
        chatInput.value = text;
        btnSend.disabled = !text.trim();
        // Switch to chat panel first
        toggleChat?.click();
        sendMessage(text);
      });
    });

    // Review & Submit
    wrapper.querySelector('#btn-review-bottom')?.addEventListener('click', () => navigateTo('review'));
    wrapper.querySelector('#btn-review-bottom-2')?.addEventListener('click', () => navigateTo('review'));
    wrapper.querySelector('#btn-actions-review')?.addEventListener('click', () => navigateTo('review'));

    function updateAnsweredCount() {
       const count = Object.keys(getState().answers).filter(k => getState().answers[k]?.text).length;
       wrapper.querySelectorAll('#answered-count').forEach(el => { el.textContent = count; });
    }

    syncWorkspaceZenPanel(wrapper.classList.contains('zen-mode-active'), wrapper);

    return () => {
      cleanupRichActions?.();
      cleanupLayout?.();
    };
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
