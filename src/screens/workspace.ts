// @ts-nocheck
// FormMate - Main Workspace Screen


import { getState, setState, updateAnswer, addChatMessage, undoAnswer, redoAnswer, canUndo, canRedo } from '../state';
import { navigateTo } from '../router';
import { regenerateAnswer, processChatMessage, quickEditAnswer } from '../ai/ai-actions';
import { AI_SURFACES, extractVisionContext, getAiErrorMessage } from '../ai/ai-service';
import { cancelRecording, getRecordingState, isVoiceSupported, startRecording, stopAndTranscribe } from '../ai/voice';
import { renderQuestionCard } from '../components/question-card';
import { categorizeField } from '../ai/field-classifier';
import { withLayout, initLayout, openAccountModal } from '../components/layout';
import { toast } from '../components/toast';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { replaceChildrenWithSafeHtml } from '../utils/safe-html';
import {
  buildMessageWithUiContext,
  buildNextFollowUps,
  createFollowUpClickEvent,
  createUiContextEvent,
  enqueueUiContextEvent,
  getDefaultFollowUps,
  stripFollowUpTags,
} from '../ai/chat-interactions';

let sortableModulePromise = null;
const MAX_CHAT_IMAGE_ATTACHMENTS = 5;
const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_CHAT_TEXT_CHARS = 3200;

async function loadSortable() {
  if (!sortableModulePromise) {
    sortableModulePromise = import('sortablejs').then((module) => module.default || module);
  }

  return sortableModulePromise;
}
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

function formatFileMetadata(file) {
  if (!file) return '';
  const size = file.size >= 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  const type = file.type ? file.type : 'unknown type';
  return `${file.name} - ${size} - ${type}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

function buildChatAvatar(icon, background) {
  const avatar = document.createElement('div');
  avatar.style.cssText = `width: 24px; height: 24px; border-radius: 50%; background: ${background}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;`;

  const iconEl = document.createElement('span');
  iconEl.className = 'material-symbols-outlined';
  iconEl.style.cssText = 'font-size: 14px; color: #fff;';
  iconEl.textContent = icon;
  avatar.appendChild(iconEl);
  return avatar;
}

function buildTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.style.cssText = 'background: var(--fm-bg-sunken); border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.75rem; display: flex; gap: 4px;';

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;${index > 0 ? ` animation-delay: ${index * 0.2}s;` : ''}`;
    indicator.appendChild(dot);
  }

  return indicator;
}

export function workspaceScreen() {
  const { formData, answers, aiDiagnostics } = getState();

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

  const answeredCount = getState().answeredCount;
  const totalQ = formData.questions.length;

  const questionsHtml = formData.questions.map((q, i) =>
    renderQuestionCard(q, answers[q.id], i)
  ).join('');
  const aiDiagnosticsBanner = renderAiDiagnosticsBanner(aiDiagnostics);

  const workspaceContent = `
    <div class="flex-1 flex overflow-hidden relative zen-workspace-shell workspace-screen" id="editor-container">
      <!-- Editor Center -->
      <div class="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar zen-workspace-editor workspace-editor-stage" id="editor-scroll" data-fm-transition-main="true" data-fm-scroll-region="main">
          <div class="zen-workspace-editor-inner workspace-editor-inner">
          
          <!-- Breadcrumb & Actions Bar -->
          <div class="zen-workspace-toolbar app-surface-soft workspace-toolbar-card">
            <div class="workspace-zen-hide workspace-topline">
              <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Applications</span>
              <span style="font-size: 0.65rem; color: #cbd5e1;">&gt;</span>
              <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-primary);">Current Draft</span>
            </div>
            <div class="workspace-progress-actions">
              <span class="app-pill workspace-answered-pill" style="background: #d1fae5; color: #059669; border-color: rgba(16, 185, 129, 0.18);">Answered <span id="answered-count">${answeredCount}</span> / ${totalQ}</span>
              <button id="btn-review-bottom" class="btn-press workspace-submit-btn">Submit Application</button>
            </div>
          </div>

          ${aiDiagnosticsBanner}

          <div class="workspace-title-block">
            <h1 class="workspace-title">${escapeHtml(formData.title)}</h1>
          </div>

          <!-- Filter Tabs -->
          <div class="workspace-zen-hide app-surface-soft workspace-filter-row workspace-filter-shell">
            <button class="filter-pill" data-filter="all" data-active="true" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-text); background: var(--fm-text); color: #fff; font-size: 0.75rem; font-weight: 700; cursor: pointer;">All Questions</button>
            ${autoCount > 0 ? `<button class="filter-pill" data-filter="autofillable" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">Autofillable</button>` : ''}
            ${aiCount > 0 ? `<button class="filter-pill" data-filter="generatable" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">AI Generated</button>` : ''}
            ${manualCount > 0 ? `<button class="filter-pill" data-filter="manual_only" style="padding: 0.4rem 0.85rem; border-radius: var(--fm-radius-full); border: 1px solid var(--fm-border); background: #fff; color: var(--fm-text); font-size: 0.75rem; font-weight: 600; cursor: pointer;">Manual</button>` : ''}
            <div data-zen-hide="always" class="workspace-sort-chip">
              <span class="material-symbols-outlined" style="font-size: 16px;">sort</span> Sort
            </div>
          </div>

          <!-- Question Cards -->
          <div id="questions-container" class="space-y-6 stagger-children workspace-question-list workspace-question-stack">
            ${questionsHtml}
          </div>

          <!-- Bottom Review CTA -->
          <div data-zen-hide="always" class="workspace-bottom-cta">
            <button id="btn-review-bottom-2" class="btn-press workspace-bottom-submit">
              <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
              Review & Submit
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: AI Chat / AI Actions (Toggle) -->
      <aside id="right-panel" class="hidden md:flex zen-workspace-sidepanel" data-fm-transition-panel="true" style="width: 320px; border-left: 1px solid var(--fm-border-light); background: #fff; flex-direction: column; flex-shrink: 0; z-index: 20;">
        
        <!-- Panel Toggle Tabs -->
        <div class="workspace-zen-panel-tabs" role="tablist" aria-label="Workspace AI panels" style="display: flex; border-bottom: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <button id="toggle-ai-chat" type="button" class="panel-toggle-btn active" role="tab" aria-selected="true" aria-controls="ai-chat-panel" tabindex="0" style="flex: 1; padding: 0.75rem; border: none; background: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: var(--fm-primary); border-bottom: 2px solid var(--fm-primary);">AI Chat</button>
          <button id="toggle-ai-actions" type="button" class="panel-toggle-btn" role="tab" aria-selected="false" aria-controls="ai-actions-panel" tabindex="-1" style="flex: 1; padding: 0.75rem; border: none; background: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: #94a3b8; border-bottom: 2px solid transparent;">AI Actions</button>
        </div>

        <!-- AI Chat Panel -->
        <div id="ai-chat-panel" role="tabpanel" aria-labelledby="toggle-ai-chat" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
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
          <div id="workspace-chat-followups" class="chat-followups chat-followups-sidebar"></div>
            <div style="display: flex; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button id="btn-workspace-chat-attach" type="button" aria-label="Attach a file" style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">attachment</span>
                </button>
                <button id="btn-workspace-chat-voice" type="button" aria-label="Start voice input" style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">mic</span>
                </button>
                <input id="workspace-chat-attach-input" type="file" accept="image/*,.txt,.md,.csv,text/plain" multiple style="display:none;" />
              </div>
              <div style="flex: 1; position: relative;">
                <input type="text" id="chat-input" placeholder="Ask Copilot anything..." aria-label="Ask Copilot anything" style="width: 100%; height: 36px; padding: 0 2.5rem 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.8rem; background: var(--fm-bg-sunken); color: var(--fm-text);" />
                <button id="btn-send-chat" type="button" aria-label="Send chat message" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; background: var(--fm-primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
                </button>
              </div>
            </div>
            <div style="text-align: center; font-size: 0.6rem; color: #cbd5e1; margin-top: 0.35rem;">AI can make mistakes. Check important info.</div>
          </div>
        </div>

        <!-- AI Actions Panel (hidden by default) -->
        <div id="ai-actions-panel" class="no-scrollbar" role="tabpanel" aria-labelledby="toggle-ai-actions" hidden style="display: none; flex-direction: column; flex: 1; overflow-y: auto; padding: 1.25rem;">
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
      <button id="btn-fab-ai" type="button" aria-label="Open AI actions" style="position: absolute; bottom: 1.5rem; right: 1.5rem; width: 48px; height: 48px; border-radius: 50%; background: var(--fm-primary-dark); color: #fff; border: none; cursor: pointer; box-shadow: var(--fm-shadow-primary-lg); display: flex; align-items: center; justify-content: center; z-index: 10;" class="md:hidden btn-press">
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
    const btnAttach = wrapper.querySelector('#btn-workspace-chat-attach');
    const attachInput = wrapper.querySelector('#workspace-chat-attach-input');
    const btnVoice = wrapper.querySelector('#btn-workspace-chat-voice');
    const followUpsWrap = wrapper.querySelector('#workspace-chat-followups');
    const attachmentState = wrapper.querySelector('#workspace-chat-attachment-state');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const questionsContainer = wrapper.querySelector('#questions-container');
    let sortableInstance = null;
    let isChatPending = false;
    let pendingImages = [];
    let pendingTextSnippets = [];
    let pendingUiContextEvents = [];
    let followUpSuggestions = getDefaultFollowUps(AI_SURFACES.WORKSPACE, formData?.title || '');
    const cleanupRichActions = bindRichActionClicks(chatMessages, {
      openAccountModal,
      onInteractiveCommit: (payload) => {
        const event = createUiContextEvent(payload);
        pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, event);
        renderAttachmentState();
        if (chatInput && !chatInput.value.trim()) {
          chatInput.value = 'Apply the queued field updates to the active form.';
        }
        syncSendButton();
        toast.success('Queued for your next copilot message.');
        return true;
      },
    });

    // Panel Toggle
    const aiChatPanel = wrapper.querySelector('#ai-chat-panel');
    const aiActionsPanel = wrapper.querySelector('#ai-actions-panel');
    const toggleChat = wrapper.querySelector('#toggle-ai-chat');
    const toggleActions = wrapper.querySelector('#toggle-ai-actions');
    const btnFabAi = wrapper.querySelector('#btn-fab-ai');

    const workspaceTabs = [toggleChat, toggleActions].filter(Boolean);
    const setWorkspacePanel = (panel) => {
      const showChat = panel === 'chat';
      aiChatPanel.style.display = showChat ? 'flex' : 'none';
      aiChatPanel.hidden = !showChat;
      aiActionsPanel.style.display = showChat ? 'none' : 'flex';
      aiActionsPanel.hidden = showChat;

      toggleChat.style.color = showChat ? 'var(--fm-primary)' : '#94a3b8';
      toggleChat.style.borderBottomColor = showChat ? 'var(--fm-primary)' : 'transparent';
      toggleChat.setAttribute('aria-selected', showChat ? 'true' : 'false');
      toggleChat.tabIndex = showChat ? 0 : -1;

      toggleActions.style.color = showChat ? '#94a3b8' : 'var(--fm-primary)';
      toggleActions.style.borderBottomColor = showChat ? 'transparent' : 'var(--fm-primary)';
      toggleActions.setAttribute('aria-selected', showChat ? 'false' : 'true');
      toggleActions.tabIndex = showChat ? -1 : 0;

      syncWorkspaceZenPanel(wrapper.classList.contains('zen-mode-active'), wrapper);
    };

    toggleChat?.addEventListener('click', () => {
      setWorkspacePanel('chat');
    });

    toggleActions?.addEventListener('click', () => {
      setWorkspacePanel('actions');
    });

    workspaceTabs.forEach((tab, index) => {
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = workspaceTabs.length - 1;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % workspaceTabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + workspaceTabs.length) % workspaceTabs.length;
        workspaceTabs[nextIndex]?.focus();
        setWorkspacePanel(nextIndex === 0 ? 'chat' : 'actions');
      });
    });

    btnFabAi?.addEventListener('click', () => {
      navigateTo('ai-chat');
    });

    // Drag and Drop
    void initSortable();

    async function initSortable() {
      if (!questionsContainer) return;

      try {
        const Sortable = await loadSortable();
        sortableInstance?.destroy?.();
        sortableInstance = Sortable.create(questionsContainer, {
          animation: 250,
          handle: '.drag-handle',
          ghostClass: 'opacity-40',
          onEnd: function (evt) {
            const currentFormData = getState().formData;
            const nextQuestions = Array.isArray(currentFormData?.questions)
              ? [...currentFormData.questions]
              : [];

            if (!nextQuestions.length || evt.oldIndex === evt.newIndex) return;

            const [movedItem] = nextQuestions.splice(evt.oldIndex, 1);
            if (!movedItem) return;

            nextQuestions.splice(evt.newIndex, 0, movedItem);
            setState({
              formData: {
                ...currentFormData,
                questions: nextQuestions,
              }
            });
          }
        });
      } catch (error) {
        console.error('[Workspace] Failed to initialize drag-and-drop:', error);
        toast.error('Question reordering is unavailable right now.');
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
        syncUndoRedoButtons();
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
        return;
      }

      const uploadBtn = e.target.closest('.question-card-upload-button');
      if (uploadBtn) {
        const qId = uploadBtn.dataset.questionId;
        const fileInput = wrapper.querySelector(`.question-card-upload-input[data-question-id="${qId}"]`);
        if (fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      }
    });

    questionsContainer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const opt = e.target.closest('.option-select, .scale-btn, .question-card-upload-button');
      if (!opt) return;
      e.preventDefault(); opt.click();
    });

    questionsContainer.addEventListener('change', (e) => {
      const input = e.target.closest('.question-card-upload-input');
      if (!input) return;

      const questionId = input.dataset.questionId;
      const file = input.files?.[0];
      const card = wrapper.querySelector(`.question-card[data-card-id="${questionId}"]`);
      const label = card?.querySelector('[data-upload-file-label]');

      if (!file) {
        updateAnswer(questionId, '', 'user');
        if (label) label.textContent = 'Click to choose a file';
        updateAnsweredCount();
        syncUndoRedoButtons();
        return;
      }

      const metadata = formatFileMetadata(file);
      updateAnswer(questionId, metadata, 'user');
      if (label) label.textContent = metadata;
      updateAnsweredCount();
      syncUndoRedoButtons();
      toast.success('File selected');
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

    const syncSendButton = () => {
      if (!btnSend) return;
      const hasText = Boolean(chatInput?.value?.trim());
      const hasAttachment = pendingImages.length > 0 || pendingTextSnippets.length > 0 || pendingUiContextEvents.length > 0;
      btnSend.disabled = !(hasText || hasAttachment) || isChatPending;
    };

    const renderFollowUps = () => {
      if (!followUpsWrap) return;
      const items = (Array.isArray(followUpSuggestions) ? followUpSuggestions : [])
        .filter(Boolean)
        .slice(0, 1);
      replaceChildrenWithSafeHtml(
        followUpsWrap,
        items.map((prompt) => `
          <button type="button" class="chat-followup-chip" data-followup-msg="${escapeAttr(prompt)}">
            <span class="chat-followup-chip-label">${escapeHtml(prompt)}</span>
          </button>
        `).join('')
      );
    };

    const renderAttachmentState = () => {
      const imageCount = pendingImages.length;
      const textCount = pendingTextSnippets.length;
      const uiContextCount = pendingUiContextEvents.length;
      if (attachmentState) {
        if (!imageCount && !textCount && !uiContextCount) {
          attachmentState.textContent = 'No attachments';
        } else {
          const parts = [];
          if (imageCount) parts.push(`${imageCount} screenshot${imageCount === 1 ? '' : 's'}`);
          if (textCount) parts.push(`${textCount} text snippet${textCount === 1 ? '' : 's'}`);
          if (uiContextCount) parts.push(`${uiContextCount} queued update${uiContextCount === 1 ? '' : 's'}`);
          attachmentState.textContent = `Attached: ${parts.join(' + ')}`;
        }
      }
      syncSendButton();
    };

    const syncVoiceButton = () => {
      if (!btnVoice) return;
      const icon = btnVoice.querySelector('.material-symbols-outlined');
      const recording = getRecordingState().isRecording;
      btnVoice.style.color = recording ? '#dc2626' : '#94a3b8';
      btnVoice.setAttribute('aria-label', recording ? 'Stop voice input' : 'Start voice input');
      btnVoice.setAttribute('title', recording ? 'Stop voice input' : 'Start voice input');
      if (icon) icon.textContent = recording ? 'stop_circle' : 'mic';
    };

    const clearPendingAttachments = () => {
      pendingImages = [];
      pendingTextSnippets = [];
      renderAttachmentState();
    };

    const clearUiContextQueue = () => {
      pendingUiContextEvents = [];
      renderAttachmentState();
    };

    const addTextSnippet = (label, text) => {
      const snippet = String(text || '').trim().slice(0, MAX_CHAT_TEXT_CHARS);
      if (!snippet) return false;
      pendingTextSnippets.push({
        label: label || 'Text snippet',
        text: snippet,
      });
      if (pendingTextSnippets.length > 6) {
        pendingTextSnippets = pendingTextSnippets.slice(-6);
      }
      renderAttachmentState();
      return true;
    };

    const addImageFiles = async (files) => {
      const selected = Array.from(files || []).filter((file) => String(file.type || '').startsWith('image/'));
      if (!selected.length) return;

      const slots = MAX_CHAT_IMAGE_ATTACHMENTS - pendingImages.length;
      if (slots <= 0) {
        toast.warning(`Maximum ${MAX_CHAT_IMAGE_ATTACHMENTS} screenshots can be attached.`);
        return;
      }

      const valid = selected
        .filter((file) => file.size <= MAX_CHAT_IMAGE_BYTES)
        .slice(0, slots);

      if (valid.length < selected.length) {
        toast.warning(`Ignored oversized screenshots. Max ${Math.floor(MAX_CHAT_IMAGE_BYTES / (1024 * 1024))}MB each.`);
      }

      for (const file of valid) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          pendingImages.push({ name: file.name || 'Screenshot', dataUrl });
        } catch {
          // Ignore individual file failures and continue.
        }
      }

      renderAttachmentState();
    };

    const addTextFiles = async (files) => {
      const selected = Array.from(files || []).filter((file) => {
        const type = String(file.type || '').toLowerCase();
        return type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name || '');
      });

      for (const file of selected.slice(0, 4)) {
        try {
          const text = await readFileAsText(file);
          addTextSnippet(file.name || 'Attachment', text);
        } catch {
          // Ignore individual file failures and continue.
        }
      }
    };

    // Chat
    const chatHistory = [];

    const appendChatBubble = (role, text) => {
      const isUser = role === 'user';
      const bubble = document.createElement('div');
      bubble.style.cssText = `display: flex; gap: 0.5rem; align-items: flex-start; ${isUser ? 'flex-direction: row-reverse;' : ''}`;
      bubble.appendChild(buildChatAvatar(isUser ? 'person' : 'smart_toy', isUser ? 'var(--fm-primary-dark)' : 'var(--fm-primary)'));

      const body = document.createElement('div');
      body.style.cssText = `background: ${isUser ? 'var(--fm-primary)' : 'var(--fm-bg-sunken)'}; color: ${isUser ? '#fff' : 'var(--fm-text)'}; border-radius: ${isUser ? 'var(--fm-radius-lg) 0 var(--fm-radius-lg) var(--fm-radius-lg)' : '0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg)'}; padding: 0.75rem; font-size: 0.8rem; line-height: 1.5; max-width: 85%;`;
      if (isUser) {
        body.textContent = text;
        body.style.whiteSpace = 'pre-wrap';
      } else {
        body.classList.add('ai-message-rich');
        replaceChildrenWithSafeHtml(body, renderAssistantRichText(text, {
          onDiagnostics: (diagnostics) => {
            if (diagnostics.length) {
              console.warn('[Workspace Chat] Assistant message diagnostics:', diagnostics);
            }
          },
        }));
      }
      bubble.appendChild(body);
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    async function sendMessage(text) {
      const trimmedText = text.trim();
      const hasUiContext = pendingUiContextEvents.length > 0;
      if ((!trimmedText && !pendingImages.length && !pendingTextSnippets.length && !hasUiContext) || isChatPending) return;
      isChatPending = true;
      const userVisibleText = trimmedText
        || (hasUiContext ? 'Applied queued interactive edits for this request.' : 'Added attachment context for this request.');
      const modelMessage = buildMessageWithUiContext(trimmedText, pendingUiContextEvents);
      appendChatBubble('user', userVisibleText);
      addChatMessage('user', userVisibleText);
      chatHistory.push({ role: 'user', content: modelMessage || userVisibleText });
      syncSendButton();
      chatInput.disabled = true;
      btnAttach && (btnAttach.disabled = true);
      btnVoice && (btnVoice.disabled = true);

      const typingEl = document.createElement('div');
      typingEl.style.cssText = 'display: flex; gap: 0.5rem; align-items: flex-start;';
      typingEl.appendChild(buildChatAvatar('smart_toy', 'var(--fm-primary)'));
      typingEl.appendChild(buildTypingIndicator());
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const attachmentPayload = [];
        pendingTextSnippets.forEach((entry) => {
          attachmentPayload.push({
            type: 'text_snippet',
            name: entry.label,
            text: entry.text,
          });
        });

        if (pendingImages.length) {
          try {
            const activeField = formData?.questions?.find((entry) => String(entry?.id) === String(getState().activeQuestionId));
            const vision = await extractVisionContext({
              surface: AI_SURFACES.WORKSPACE,
              images: pendingImages.map((entry) => entry.dataUrl),
              prompt: trimmedText,
              formTitle: formData?.title || '',
              activeFieldText: activeField?.text || '',
            });
            const fieldPreview = Array.isArray(vision.detectedFields)
              ? vision.detectedFields
                .slice(0, 6)
                .map((entry) => {
                  const label = String(entry?.label || '').trim();
                  const typeHint = String(entry?.typeHint || '').trim();
                  return label ? `${label}${typeHint ? ` (${typeHint})` : ''}` : '';
                })
                .filter(Boolean)
              : [];
            const combined = [
              vision.summary ? `Screenshot summary: ${vision.summary}` : '',
              fieldPreview.length ? `Detected fields: ${fieldPreview.join('; ')}` : '',
            ].filter(Boolean).join('\n');
            if (combined) {
              attachmentPayload.push({
                type: 'screenshot_summary',
                name: 'Screenshot context',
                text: combined,
              });
            }
          } catch (visionError) {
            console.warn('[Workspace Chat] Screenshot context unavailable:', visionError);
          }
        }

        const response = await processChatMessage(modelMessage || userVisibleText, formData, chatHistory, getState().activeQuestionId, {
          surface: AI_SURFACES.WORKSPACE,
          attachments: attachmentPayload,
        });
        const cleanResponse = String(response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || 'I did not generate a response.';
        const displayResponse = stripFollowUpTags(cleanResponse);
        followUpSuggestions = buildNextFollowUps({
          surface: AI_SURFACES.WORKSPACE,
          responseText: cleanResponse,
          formTitle: formData?.title || '',
        });
        renderFollowUps();
        typingEl.remove();
        appendChatBubble('assistant', displayResponse);
        addChatMessage('assistant', displayResponse);
        chatHistory.push({ role: 'assistant', content: displayResponse });
        clearPendingAttachments();
        clearUiContextQueue();
      } catch (error) {
        console.error('[Workspace Chat] Message failed:', error);
        typingEl.remove();
        const message = getAiErrorMessage(error, 'AI service is unavailable right now.');
        appendChatBubble('assistant', message);
      } finally {
        chatInput.disabled = false;
        btnAttach && (btnAttach.disabled = false);
        btnVoice && (btnVoice.disabled = false);
        isChatPending = false;
        syncSendButton();
        chatInput.focus();
        syncVoiceButton();
      }
    }

    chatInput?.addEventListener('input', () => {
      syncSendButton();
    });

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btnSend.click(); }
    });

    btnSend?.addEventListener('click', () => {
      sendMessage(chatInput.value);
      chatInput.value = '';
      syncSendButton();
    });

    btnAttach?.addEventListener('click', () => attachInput?.click());
    attachInput?.addEventListener('change', async () => {
      const files = Array.from(attachInput.files || []);
      await addImageFiles(files);
      await addTextFiles(files);
      attachInput.value = '';
    });

    chatInput?.addEventListener('paste', async (event) => {
      const items = Array.from(event?.clipboardData?.items || []);
      const imageFiles = items
        .filter((item) => item.kind === 'file' && String(item.type || '').startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (imageFiles.length) {
        event.preventDefault();
        await addImageFiles(imageFiles);
        return;
      }

      const pastedText = event?.clipboardData?.getData('text/plain') || '';
      if (pastedText.length > 180 && /\n/.test(pastedText)) {
        event.preventDefault();
        if (addTextSnippet('Pasted snippet', pastedText)) {
          toast.info('Attached pasted text snippet.');
        }
      }
    });

    btnVoice?.addEventListener('click', async () => {
      if (!isVoiceSupported()) {
        toast.error('Voice input is not supported in this browser.');
        return;
      }

      try {
        if (getRecordingState().isRecording) {
          const transcript = await stopAndTranscribe(AI_SURFACES.WORKSPACE);
          if (transcript) {
            chatInput.value = chatInput.value ? `${chatInput.value.trim()} ${transcript}` : transcript;
            syncSendButton();
          }
        } else {
          await startRecording();
        }
      } catch (error) {
        toast.error(getAiErrorMessage(error, 'Voice transcription failed.'));
      } finally {
        syncVoiceButton();
      }
    });

    followUpsWrap?.addEventListener('click', (event) => {
      const chip = event.target?.closest?.('.chat-followup-chip[data-followup-msg]');
      if (!chip || !followUpsWrap.contains(chip)) return;
      const prompt = String(chip.dataset.followupMsg || '').trim();
      if (!prompt) return;
      pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, createFollowUpClickEvent(prompt));
      renderAttachmentState();
      sendMessage(prompt);
    });

    renderFollowUps();
    syncVoiceButton();
    renderAttachmentState();
    syncSendButton();

    wrapper.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.msg || '';
        chatInput.value = text;
        btnSend.disabled = !text.trim();
        pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, createFollowUpClickEvent(text));
        renderAttachmentState();
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
       const count = getState().answeredCount;
       wrapper.querySelectorAll('#answered-count').forEach(el => { el.textContent = String(count); });
    }

    syncWorkspaceZenPanel(wrapper.classList.contains('zen-mode-active'), wrapper);

    return () => {
      if (getRecordingState().isRecording) cancelRecording();
      sortableInstance?.destroy?.();
      cleanupRichActions?.();
      cleanupLayout?.();
    };
  }

  return { html, init };
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderAiDiagnosticsBanner(aiDiagnostics) {
  if (!aiDiagnostics || aiDiagnostics.status === 'ok') return '';

  const isFailed = aiDiagnostics.status === 'failed';
  const icon = isFailed ? 'error' : 'warning';
  const bg = isFailed ? 'rgba(254, 242, 242, 0.98)' : 'rgba(255, 251, 235, 0.98)';
  const border = isFailed ? 'rgba(248, 113, 113, 0.2)' : 'rgba(245, 158, 11, 0.25)';
  const text = isFailed ? '#991b1b' : '#92400e';
  const title = isFailed ? 'AI suggestions unavailable' : 'Some AI suggestions need a retry';
  const summary = aiDiagnostics.summary || 'AI output was only partially available for this form.';

  return `
    <div style="display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem; padding: 0.9rem 1rem; border-radius: var(--fm-radius-xl); border: 1px solid ${border}; background: ${bg}; color: ${text};">
      <span class="material-symbols-outlined" style="font-size: 18px; margin-top: 1px;">${icon}</span>
      <div style="display: flex; flex-direction: column; gap: 0.2rem;">
        <div style="font-size: 0.78rem; font-weight: 800;">${title}</div>
        <div style="font-size: 0.8rem; line-height: 1.45;">${escapeHtml(summary)}</div>
      </div>
    </div>
  `;
}
