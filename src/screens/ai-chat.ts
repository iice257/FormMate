// @ts-nocheck
// FormMate - AI Chat Screen

import { getState, addChatMessage } from '../state';
import { withLayout, initLayout, openAccountModal } from '../components/layout';
import { processChatMessage } from '../ai/ai-actions';
import { AI_SURFACES, extractVisionContext, getAiErrorMessage } from '../ai/ai-service';
import { cancelRecording, getRecordingState, isVoiceSupported, startRecording, stopAndTranscribe } from '../ai/voice';
import { toast } from '../components/toast';
import { escapeAttr, escapeHtml, safeHttpUrl } from '../utils/escape';
import { replaceChildrenWithSafeHtml } from '../utils/safe-html';
import { RASTER_IMAGE_MIME_TYPES, isAllowedRasterImageFile } from '../utils/file-validation';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';
import { getAnonymousPref, setAnonymousPref } from '../storage/anonymous-prefs';
import { clampSidebarWidth } from '../utils/sidebar-sizing';
import {
  buildMessageWithUiContext,
  buildNextFollowUps,
  createFollowUpClickEvent,
  createUiContextEvent,
  enqueueUiContextEvent,
  getDefaultFollowUps,
  stripFollowUpTags,
} from '../ai/chat-interactions';

const SESSION_STORAGE_KEY = 'fm_chat_sessions';
const MAX_IMAGE_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function loadSessions() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage failures and keep the current chat responsive.
  }
}

function buildChatAvatar(icon, background) {
  const avatar = document.createElement('div');
  avatar.style.cssText = `width: 28px; height: 28px; border-radius: 50%; background: ${background}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`;

  const iconEl = document.createElement('span');
  iconEl.className = 'material-symbols-outlined';
  iconEl.style.cssText = 'font-size: 16px; color: #fff;';
  iconEl.textContent = icon;
  avatar.appendChild(iconEl);
  return avatar;
}

function buildTypingBubble() {
  const container = document.createElement('div');
  container.style.cssText = 'background: var(--fm-bg-sunken); border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.85rem; display: flex; gap: 5px;';

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    dot.style.cssText = 'width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;';
    container.appendChild(dot);
  }

  return container;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function aiChatScreen() {
  const { userProfile, formData } = getState();
  const displayName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const sessions = loadSessions();
  const avatarSrc = safeHttpUrl(userProfile?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const rightSidebarOpen = getAnonymousPref('aiChat.rightSidebarOpen', true) !== false;
  const rightSidebarWidth = Number(getAnonymousPref('aiChat.rightSidebarWidth', 280)) || 280;

  const chatContent = `
    <div class="flex-1 flex overflow-hidden zen-chat-shell" data-fm-transition-main="true">
      <div class="zen-chat-main" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <div class="zen-chat-header" data-zen-hide="always" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-size: 1.1rem; font-weight: 800; color: var(--fm-text);">FormMate AI</h2>
            <span style="padding: 0.15rem 0.5rem; background: #d1fae5; color: #059669; border-radius: var(--fm-radius-full); font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Copilot Active</span>
          </div>
          <div style="display: flex; gap: 0.35rem;">
            <button type="button" aria-label="Share chat" title="Share chat" style="width: 32px; height: 32px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; border-radius: var(--fm-radius-sm);">
              <span class="material-symbols-outlined" style="font-size: 20px;">ios_share</span>
            </button>
          </div>
        </div>

        <div id="chat-messages" class="no-scrollbar zen-chat-messages" data-fm-scroll-region="main" style="flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div id="chat-empty-state" style="text-align: center; max-width: 420px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--fm-primary-50); color: var(--fm-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
              <span class="material-symbols-outlined" style="font-size: 32px;">auto_awesome</span>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 900; color: var(--fm-text); margin-bottom: 0.5rem;">How can I help you today?</h3>
            <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5;">I can assist with form analysis, answer generation, and intelligent suggestions - just ask.</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <button class="chat-suggestion btn-press" data-msg="Analyze my latest form and suggest improvements" style="padding: 1rem; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); background: #fff; cursor: pointer; text-align: left;">
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary); margin-bottom: 0.4rem; display: block;">analytics</span>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--fm-text); line-height: 1.35;">Analyze my latest form</span>
              </button>
              <button class="chat-suggestion btn-press" data-msg="Help me write a professional cover letter" style="padding: 1rem; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); background: #fff; cursor: pointer; text-align: left;">
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary); margin-bottom: 0.4rem; display: block;">edit_note</span>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--fm-text); line-height: 1.35;">Help me write a cover letter</span>
              </button>
            </div>
          </div>
        </div>

        <div class="zen-chat-composer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <div id="chat-followups" class="chat-followups chat-followups-main"></div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button id="btn-chat-attach" type="button" aria-label="Attach file" title="Attach file" style="width: 36px; height: 36px; border: 1px solid var(--fm-border); border-radius: 50%; background: #fff; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 18px;">attachment</span>
            </button>
            <input id="chat-attach-input" type="file" accept="image/png,image/jpeg,image/webp" multiple style="display:none;" />
            <div style="flex: 1; position: relative;">
              <label for="chat-input" style="position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;">Message FormMate AI</label>
              <input type="text" id="chat-input" data-zen-focus-target aria-label="Message FormMate AI" placeholder="Message FormMate AI..." style="width: 100%; height: 44px; padding: 0 3rem 0 1rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.85rem; background: #fff; color: var(--fm-text);" />
              <button id="btn-send" type="button" aria-label="Send message" title="Send message" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: var(--fm-primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" disabled>
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_upward</span>
              </button>
            </div>
            <button id="btn-chat-voice" type="button" aria-label="Start voice input" title="Start voice input" style="width: 36px; height: 36px; border: 1px solid var(--fm-border); border-radius: 50%; background: #fff; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 18px;">mic</span>
            </button>
          </div>
          <div id="chat-attachment-state" class="chat-attachment-strip" aria-live="polite"></div>
          <div style="text-align: center; font-size: 0.65rem; color: #cbd5e1; margin-top: 0.4rem;">AI can make mistakes. Check important info.</div>
        </div>
      </div>

      <button id="btn-show-chat-sidebar" type="button" class="detached-sidebar-show-btn ${rightSidebarOpen ? '' : 'is-visible'}" aria-label="Show sidebar" title="Show sidebar">
        <span class="material-symbols-outlined">right_panel_open</span>
      </button>

      <div id="chat-right-sidebar" class="hidden lg:flex zen-chat-sidebar no-scrollbar detached-right-sidebar ${rightSidebarOpen ? '' : 'is-hidden'}" data-fm-right-sidebar="true" data-fm-transition-panel="true" data-zen-hide="always" style="width: ${rightSidebarWidth}px; flex-direction: column; padding: 1.25rem; flex-shrink: 0; overflow-y: auto;" ${rightSidebarOpen ? '' : 'hidden'}>
        <div class="detached-sidebar-resizer" aria-hidden="true"></div>
        <div class="detached-sidebar-header">
          <div class="detached-sidebar-heading-group">
            <span class="detached-sidebar-title">Chats</span>
            <button id="btn-search-chat-sidebar" type="button" class="detached-sidebar-icon-btn" aria-label="Search chats" title="Search chats">
              <span class="material-symbols-outlined">search</span>
            </button>
          </div>
          <button id="btn-hide-chat-sidebar" type="button" class="detached-sidebar-hide-btn" aria-label="Hide sidebar">
            <span>Hide</span>
            <span class="material-symbols-outlined">right_panel_close</span>
          </button>
        </div>
        <div id="chat-sidebar-search-row" class="chat-sidebar-search-row" hidden>
          <span class="material-symbols-outlined">search</span>
          <input id="chat-sidebar-search" type="search" placeholder="Search chats..." autocomplete="off" aria-label="Search chat titles and messages" />
        </div>
        <div style="display: flex; align-items: center; gap: 0.6rem; padding-bottom: 1rem; border-bottom: 1px solid var(--fm-border-light); margin-bottom: 1rem;">
          <img src="${escapeAttr(avatarSrc)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" alt="Avatar" />
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">${displayName}</div>
            <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 500;">Online</div>
          </div>
        </div>

        <button id="btn-new-chat" class="btn-press" style="width: 100%; padding: 0.6rem; display: flex; align-items: center; justify-content: center; gap: 0.35rem; background: #fff; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.8rem; font-weight: 600; color: var(--fm-text); cursor: pointer; margin-bottom: 1.25rem;">
          <span class="material-symbols-outlined" style="font-size: 18px;">add</span> New Chat
        </button>

        <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem;">Recent Chats</div>
        <div id="sessions-list" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 1.5rem;">
          ${sessions.length > 0 ? sessions.slice(0, 8).map(s => `
            <button class="session-item" data-session-id="${s.id}" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.65rem; border: none; background: none; border-radius: var(--fm-radius-sm); cursor: pointer; text-align: left; font-family: var(--fm-font-sans); width: 100%; color: var(--fm-text); transition: background 0.15s;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: #94a3b8;">chat_bubble_outline</span>
              <span style="font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.title || `Chat ${s.id.substring(0, 4)}`)}</span>
            </button>
          `).join('') : '<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 0.5rem;">No recent chats</div>'}
        </div>

        <div style="margin-top: auto; padding: 1rem; background: var(--fm-bg-sunken); border-radius: var(--fm-radius-xl);">
          <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.6rem;">Current Context</div>
          <div style="font-size: 0.75rem; color: #64748b; line-height: 1.5;">
            ${formData?.title ? `Active form: ${escapeHtml(formData.title)}` : 'No active form is attached to this chat yet.'}
          </div>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('ai-chat', chatContent, {
    zenMode: { screenId: 'ai-chat' },
    shellClassName: 'zen-layout-shell',
    contentClassName: 'zen-layout-content'
  });

  function init(wrapper) {
    const cleanupLayout = initLayout(wrapper, { zenMode: { screenId: 'ai-chat' } });
    const rightSidebar = wrapper.querySelector('#chat-right-sidebar');
    const rightSidebarResizer = wrapper.querySelector('#chat-right-sidebar .detached-sidebar-resizer');
    const showSidebarBtn = wrapper.querySelector('#btn-show-chat-sidebar');
    const hideSidebarBtn = wrapper.querySelector('#btn-hide-chat-sidebar');
    const searchSidebarBtn = wrapper.querySelector('#btn-search-chat-sidebar');
    const searchSidebarRow = wrapper.querySelector('#chat-sidebar-search-row');
    const searchSidebarInput = wrapper.querySelector('#chat-sidebar-search');
    const sessionsList = wrapper.querySelector('#sessions-list');
    const cleanupSidebarControls = [];
    const setRightSidebarOpen = (open) => {
      if (!rightSidebar) return;
      rightSidebar.hidden = !open;
      rightSidebar.classList.toggle('is-hidden', !open);
      showSidebarBtn?.classList.toggle('is-visible', !open);
      showSidebarBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
      hideSidebarBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
      setAnonymousPref('aiChat.rightSidebarOpen', open);
    };
    const handleShowSidebar = () => setRightSidebarOpen(true);
    const handleHideSidebar = () => setRightSidebarOpen(false);
    showSidebarBtn?.addEventListener('click', handleShowSidebar);
    hideSidebarBtn?.addEventListener('click', handleHideSidebar);
    cleanupSidebarControls.push(() => {
      showSidebarBtn?.removeEventListener('click', handleShowSidebar);
      hideSidebarBtn?.removeEventListener('click', handleHideSidebar);
    });
    const getMainSidebarWidth = () => wrapper.querySelector('#sidebar')?.getBoundingClientRect?.().width || 0;
    const applyRightSidebarWidth = (width) => {
      if (!rightSidebar) return 0;
      const nextWidth = clampSidebarWidth(width, { oppositeWidth: getMainSidebarWidth() });
      rightSidebar.style.width = `${nextWidth}px`;
      setAnonymousPref('aiChat.rightSidebarWidth', nextWidth);
      return nextWidth;
    };
    const handleRightSidebarPointerDown = (event) => {
      const rect = rightSidebar.getBoundingClientRect();
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = rect.width;
      const onMove = (moveEvent) => {
        applyRightSidebarWidth(startWidth + startX - moveEvent.clientX);
      };
      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    rightSidebarResizer?.addEventListener('pointerdown', handleRightSidebarPointerDown);
    const handleRightSidebarResize = () => {
      if (!rightSidebar || rightSidebar.hidden) return;
      applyRightSidebarWidth(rightSidebar.getBoundingClientRect().width);
    };
    window.addEventListener('resize', handleRightSidebarResize);
    cleanupSidebarControls.push(() => {
      rightSidebarResizer?.removeEventListener('pointerdown', handleRightSidebarPointerDown);
      window.removeEventListener('resize', handleRightSidebarResize);
    });
    applyRightSidebarWidth(rightSidebar?.getBoundingClientRect?.().width || rightSidebarWidth);
    setRightSidebarOpen(!rightSidebar?.hidden);
    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send');
    const btnAttach = wrapper.querySelector('#btn-chat-attach');
    const attachInput = wrapper.querySelector('#chat-attach-input');
    const btnVoice = wrapper.querySelector('#btn-chat-voice');
    const followUpsWrap = wrapper.querySelector('#chat-followups');
    const attachmentState = wrapper.querySelector('#chat-attachment-state');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const emptyState = wrapper.querySelector('#chat-empty-state');
    let isChatPending = false;
    let chatHistory = [];
    let sessionList = Array.isArray(sessions) ? [...sessions] : [];
    let currentSessionSearchText = '';
    let pendingImages = [];
    let pendingUiContextEvents = [];
    let followUpSuggestions = getDefaultFollowUps(AI_SURFACES.AI_CHAT, formData?.title || '');
    const cleanupRichActions = bindRichActionClicks(chatMessages, {
      openAccountModal,
      onInteractiveCommit: (payload) => {
        const event = createUiContextEvent(payload);
        pendingUiContextEvents = enqueueUiContextEvent(pendingUiContextEvents, event);
        renderAttachmentState();
        if (chatInput && !chatInput.value.trim()) {
          chatInput.value = 'Apply the queued field updates.';
        }
        syncSendButton();
        toast.success('Queued for the next AI message.');
        return true;
      },
    });

    const syncSendButton = () => {
      if (!btnSend) return;
      const hasText = Boolean(chatInput?.value?.trim());
      const hasAttachment = pendingImages.length > 0 || pendingUiContextEvents.length > 0;
      btnSend.disabled = !(hasText || hasAttachment) || isChatPending;
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

    const renderAttachmentState = () => {
      const imageCount = pendingImages.length;
      const uiContextCount = pendingUiContextEvents.length;
      if (!attachmentState) return;
      const imageChips = pendingImages.map((image, index) => `
        <div class="chat-attachment-chip" title="${escapeAttr(image.name || `Image ${index + 1}`)}">
          <img src="${escapeAttr(image.dataUrl)}" alt="" />
          <span>Image ${index + 1}</span>
        </div>
      `).join('');
      const queuedChip = uiContextCount ? `
        <div class="chat-attachment-chip chat-attachment-chip-muted">
          <span class="material-symbols-outlined">pending_actions</span>
          <span>${uiContextCount} queued update${uiContextCount === 1 ? '' : 's'}</span>
        </div>
      ` : '';
      replaceChildrenWithSafeHtml(attachmentState, `${imageChips}${queuedChip}`);
      attachmentState.hidden = !imageCount && !uiContextCount;
      syncSendButton();
    };

    const syncVoiceButton = () => {
      if (!btnVoice) return;
      const icon = btnVoice.querySelector('.material-symbols-outlined');
      const recording = getRecordingState().isRecording;
      btnVoice.style.color = recording ? '#dc2626' : '#94a3b8';
      btnVoice.style.borderColor = recording ? '#fecaca' : 'var(--fm-border)';
      btnVoice.setAttribute('aria-label', recording ? 'Stop voice input' : 'Start voice input');
      btnVoice.setAttribute('title', recording ? 'Stop voice input' : 'Start voice input');
      if (icon) icon.textContent = recording ? 'stop_circle' : 'mic';
    };

    const clearPendingAttachments = () => {
      pendingImages = [];
      renderAttachmentState();
    };

    const clearUiContextQueue = () => {
      pendingUiContextEvents = [];
      renderAttachmentState();
    };

    const addImageFiles = async (files) => {
      const incoming = Array.from(files || []);
      const checks = await Promise.all(incoming.map(async (file) => ({ file, ok: await isAllowedRasterImageFile(file) })));
      const selected = checks.filter((entry) => entry.ok).map((entry) => entry.file);
      if (!selected.length) {
        if (incoming.length) toast.warning('Only PNG, JPEG, and WebP images are supported.');
        return;
      }
      if (selected.length < incoming.length) {
        toast.warning('Only PNG, JPEG, and WebP images are supported. Other files were ignored.');
      }
      const slots = MAX_IMAGE_ATTACHMENTS - pendingImages.length;
      if (slots <= 0) {
        toast.warning(`Maximum ${MAX_IMAGE_ATTACHMENTS} images can be attached.`);
        return;
      }

      const valid = selected
        .filter((file) => file.size <= MAX_IMAGE_BYTES)
        .slice(0, slots);

      if (valid.length < selected.length) {
        toast.warning(`Ignored oversized images. Max ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB each.`);
      }

      for (const file of valid) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          pendingImages.push({ name: file.name || 'Image', dataUrl });
        } catch {
          // Ignore a single file failure and continue.
        }
      }
      renderAttachmentState();
    };

    function persistCurrentSession(latestPrompt) {
      const baseTitle = String(latestPrompt || formData?.title || 'New chat').trim() || 'New chat';
      const nextSession = {
        id: sessionList[0]?.id || `session-${Date.now()}`,
        title: baseTitle.length > 60 ? `${baseTitle.slice(0, 57)}...` : baseTitle,
        searchableText: currentSessionSearchText.slice(-4000),
        updatedAt: new Date().toISOString(),
      };

      sessionList = [nextSession, ...sessionList.filter((session) => session.id !== nextSession.id)]
        .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
        .slice(0, 8);

      saveSessions(sessionList);
      renderSessionList(searchSidebarInput?.value || '');
    }

    function renderSessionList(query = '') {
      const normalizedQuery = String(query || '').trim().toLowerCase();
      const matches = sessionList
        .filter((session) => {
          if (!normalizedQuery) return true;
          return `${session.title || ''} ${session.searchableText || ''}`.toLowerCase().includes(normalizedQuery);
        })
        .slice(0, 8);

      if (!sessionsList) return;
      if (!matches.length) {
        sessionsList.innerHTML = `<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 0.5rem;">${normalizedQuery ? 'No matching chats' : 'No recent chats'}</div>`;
        return;
      }

      sessionsList.innerHTML = matches.map((session) => `
        <button class="session-item" data-session-id="${escapeAttr(session.id)}" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.65rem; border: none; background: none; border-radius: var(--fm-radius-sm); cursor: pointer; text-align: left; font-family: var(--fm-font-sans); width: 100%; color: var(--fm-text); transition: background 0.15s;">
          <span class="material-symbols-outlined" style="font-size: 18px; color: #94a3b8;">chat_bubble_outline</span>
          <span style="font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(session.title || `Chat ${String(session.id || '').substring(0, 4)}`)}</span>
        </button>
      `).join('');
    }

    function appendBubble(role, text) {
      if (emptyState && emptyState.parentElement === chatMessages) {
        emptyState.remove();
        chatMessages.style.justifyContent = 'flex-start';
        chatMessages.style.alignItems = 'stretch';
      }

      const isUser = role === 'user';
      const bubble = document.createElement('div');
      bubble.className = 'animate-message-in';
      bubble.style.cssText = `display: flex; gap: 0.6rem; align-items: flex-start; ${isUser ? 'flex-direction: row-reverse;' : ''} margin-bottom: 0.75rem;`;
      bubble.appendChild(buildChatAvatar(isUser ? 'person' : 'smart_toy', isUser ? 'var(--fm-primary-dark)' : 'var(--fm-primary)'));

      const body = document.createElement('div');
      body.style.cssText = `background: ${isUser ? 'var(--fm-primary)' : 'var(--fm-bg-sunken)'}; color: ${isUser ? '#fff' : 'var(--fm-text)'}; border-radius: ${isUser ? 'var(--fm-radius-lg) 0 var(--fm-radius-lg) var(--fm-radius-lg)' : '0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg)'}; padding: 0.85rem 1rem; font-size: 0.85rem; line-height: 1.55; max-width: 75%;`;
      if (isUser) {
        body.textContent = text;
        body.style.whiteSpace = 'pre-wrap';
      } else {
        body.classList.add('ai-message-rich');
        replaceChildrenWithSafeHtml(body, renderAssistantRichText(text, {
          onDiagnostics: (diagnostics) => {
            if (diagnostics.length) {
              console.warn('[AI Chat] Assistant message diagnostics:', diagnostics);
            }
          },
        }));
      }
      bubble.appendChild(body);
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(text) {
      const trimmed = text.trim();
      const hasUiContext = pendingUiContextEvents.length > 0;
      if ((!trimmed && !pendingImages.length && !hasUiContext) || isChatPending) return;
      isChatPending = true;
      chatInput.value = '';
      btnSend.disabled = true;
      chatInput.disabled = true;
      btnAttach && (btnAttach.disabled = true);
      btnVoice && (btnVoice.disabled = true);

      const userVisibleText = trimmed
        || (hasUiContext ? 'Applied queued interactive edits for this request.' : 'Added attachment context for this request.');
      const modelMessage = buildMessageWithUiContext(trimmed, pendingUiContextEvents);
      appendBubble('user', userVisibleText);
      addChatMessage('user', userVisibleText);
      currentSessionSearchText = `${currentSessionSearchText}\nuser: ${userVisibleText}`.trim();
      chatHistory.push({ role: 'user', content: modelMessage || userVisibleText });
      persistCurrentSession(userVisibleText);

      const typingEl = document.createElement('div');
      typingEl.style.cssText = 'display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.75rem;';
      typingEl.appendChild(buildChatAvatar('smart_toy', 'var(--fm-primary)'));
      typingEl.appendChild(buildTypingBubble());
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const attachmentPayload = [];
        if (pendingImages.length) {
          try {
            const vision = await extractVisionContext({
              surface: AI_SURFACES.AI_CHAT,
              images: pendingImages.map((entry) => entry.dataUrl),
              prompt: trimmed,
              formTitle: formData?.title || '',
              activeFieldText: '',
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
            console.warn('[AI Chat] Screenshot context unavailable:', visionError);
          }
        }

        const response = await processChatMessage(modelMessage || userVisibleText, formData, chatHistory, null, {
          surface: AI_SURFACES.AI_CHAT,
          attachments: attachmentPayload,
        });
        const clean = String(response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || 'I did not generate a response.';
        const displayResponse = stripFollowUpTags(clean);
        followUpSuggestions = buildNextFollowUps({
          surface: AI_SURFACES.AI_CHAT,
          responseText: clean,
          formTitle: formData?.title || '',
        });
        renderFollowUps();
        typingEl.remove();
        appendBubble('assistant', displayResponse);
        addChatMessage('assistant', displayResponse);
        currentSessionSearchText = `${currentSessionSearchText}\nassistant: ${displayResponse}`.trim();
        chatHistory.push({ role: 'assistant', content: displayResponse });
        persistCurrentSession(userVisibleText);
        clearPendingAttachments();
        clearUiContextQueue();
      } catch (error) {
        console.error('[AI Chat] Message failed:', error);
        typingEl.remove();
        const msg = getAiErrorMessage(error, 'AI service is unavailable right now.');
        appendBubble('assistant', msg);
      } finally {
        chatInput.disabled = false;
        btnAttach && (btnAttach.disabled = false);
        btnVoice && (btnVoice.disabled = false);
        isChatPending = false;
        syncSendButton();
        chatInput.focus();
      }
    }

    chatInput?.addEventListener('input', () => {
      syncSendButton();
    });

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnSend.click();
      }
    });

    btnSend?.addEventListener('click', () => {
      sendMessage(chatInput.value);
    });

    btnAttach?.addEventListener('click', () => attachInput?.click());
    attachInput?.addEventListener('change', async () => {
      const files = Array.from(attachInput.files || []);
      await addImageFiles(files);
      attachInput.value = '';
    });

    chatInput?.addEventListener('paste', async (event) => {
      const items = Array.from(event?.clipboardData?.items || []);
      const imageFiles = items
        .filter((item) => item.kind === 'file' && RASTER_IMAGE_MIME_TYPES.has(String(item.type || '').toLowerCase()))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (imageFiles.length) {
        event.preventDefault();
        await addImageFiles(imageFiles);
        return;
      }

    });

    btnVoice?.addEventListener('click', async () => {
      if (!isVoiceSupported()) {
        toast.error('Voice input is not supported in this browser.');
        return;
      }

      try {
        if (getRecordingState().isRecording) {
          const transcript = await stopAndTranscribe(AI_SURFACES.AI_CHAT);
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

    wrapper.querySelectorAll('.chat-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        sendMessage(btn.dataset.msg || '');
      });
    });

    wrapper.querySelector('#btn-new-chat')?.addEventListener('click', () => {
      chatHistory = [];
      sessionList = [];
      currentSessionSearchText = '';
      saveSessions(sessionList);
      renderSessionList('');
      if (searchSidebarInput) searchSidebarInput.value = '';
      followUpSuggestions = getDefaultFollowUps(AI_SURFACES.AI_CHAT, formData?.title || '');
      clearUiContextQueue();
      renderFollowUps();
      chatMessages.replaceChildren();
      chatMessages.style.justifyContent = 'center';
      chatMessages.style.alignItems = 'center';
      chatMessages.appendChild(emptyState || document.createTextNode(''));
    });

    searchSidebarBtn?.addEventListener('click', () => {
      if (!searchSidebarRow || !searchSidebarInput) return;
      searchSidebarRow.hidden = false;
      searchSidebarInput.focus();
      renderSessionList(searchSidebarInput.value || '');
    });

    searchSidebarInput?.addEventListener('input', () => {
      renderSessionList(searchSidebarInput.value || '');
    });

    return () => {
      if (getRecordingState().isRecording) cancelRecording();
      cleanupRichActions?.();
      cleanupSidebarControls.forEach((task) => task());
      cleanupLayout?.();
    };
  }

  return { html, init };
}
