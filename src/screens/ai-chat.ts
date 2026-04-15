// @ts-nocheck
// FormMate - AI Chat Screen

import { getState, addChatMessage } from '../state';
import { withLayout, initLayout, openAccountModal } from '../components/layout';
import { processChatMessage } from '../ai/ai-actions';
import { getAiErrorMessage } from '../ai/ai-service';
import { escapeAttr, escapeHtml, safeHttpUrl } from '../utils/escape';
import { replaceChildrenWithSafeHtml } from '../utils/safe-html';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';

const SESSION_STORAGE_KEY = 'fm_chat_sessions';

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

export function aiChatScreen() {
  const { userProfile, formData } = getState();
  const displayName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const sessions = loadSessions();
  const avatarSrc = safeHttpUrl(userProfile?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;

  const chatContent = `
    <div class="flex-1 flex overflow-hidden zen-chat-shell">
      <div class="zen-chat-main" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <div class="zen-chat-header" data-zen-hide="always" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-size: 1.1rem; font-weight: 800; color: var(--fm-text);">FormMate AI</h2>
            <span style="padding: 0.15rem 0.5rem; background: #d1fae5; color: #059669; border-radius: var(--fm-radius-full); font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Copilot Active</span>
          </div>
          <div style="display: flex; gap: 0.35rem;">
            <button type="button" aria-label="Search chats" title="Search chats" style="width: 32px; height: 32px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; border-radius: var(--fm-radius-sm);">
              <span class="material-symbols-outlined" style="font-size: 20px;">search</span>
            </button>
            <button type="button" aria-label="Share chat" title="Share chat" style="width: 32px; height: 32px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; border-radius: var(--fm-radius-sm);">
              <span class="material-symbols-outlined" style="font-size: 20px;">ios_share</span>
            </button>
          </div>
        </div>

        <div id="chat-messages" class="no-scrollbar zen-chat-messages" style="flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
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
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" aria-label="Attach file" title="Attach file" style="width: 36px; height: 36px; border: 1px solid var(--fm-border); border-radius: 50%; background: #fff; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 18px;">attachment</span>
            </button>
            <div style="flex: 1; position: relative;">
              <label for="chat-input" style="position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;">Message FormMate AI</label>
              <input type="text" id="chat-input" data-zen-focus-target aria-label="Message FormMate AI" placeholder="Message FormMate AI..." style="width: 100%; height: 44px; padding: 0 3rem 0 1rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); font-size: 0.85rem; background: #fff; color: var(--fm-text);" />
              <button id="btn-send" type="button" aria-label="Send message" title="Send message" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: var(--fm-primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" disabled>
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_upward</span>
              </button>
            </div>
            <button type="button" aria-label="Start voice input" title="Start voice input" style="width: 36px; height: 36px; border: 1px solid var(--fm-border); border-radius: 50%; background: #fff; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 18px;">mic</span>
            </button>
          </div>
          <div style="text-align: center; font-size: 0.65rem; color: #cbd5e1; margin-top: 0.4rem;">AI can make mistakes. Check important info.</div>
        </div>
      </div>

      <div class="hidden lg:flex zen-chat-sidebar no-scrollbar" data-zen-hide="always" style="width: 280px; border-left: 1px solid var(--fm-border-light); background: #fff; flex-direction: column; padding: 1.25rem; flex-shrink: 0; overflow-y: auto;">
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
    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send');
    const chatMessages = wrapper.querySelector('#chat-messages');
    const emptyState = wrapper.querySelector('#chat-empty-state');
    let isChatPending = false;
    let chatHistory = [];
    let sessionList = Array.isArray(sessions) ? [...sessions] : [];
    const cleanupRichActions = bindRichActionClicks(chatMessages, { openAccountModal });

    function persistCurrentSession(latestPrompt) {
      const baseTitle = String(latestPrompt || formData?.title || 'New chat').trim() || 'New chat';
      const nextSession = {
        id: sessionList[0]?.id || `session-${Date.now()}`,
        title: baseTitle.length > 60 ? `${baseTitle.slice(0, 57)}...` : baseTitle,
        updatedAt: new Date().toISOString(),
      };

      sessionList = [nextSession, ...sessionList.filter((session) => session.id !== nextSession.id)]
        .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
        .slice(0, 8);

      saveSessions(sessionList);
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
        replaceChildrenWithSafeHtml(body, renderAssistantRichText(text));
      }
      bubble.appendChild(body);
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendErrorBubble(text) {
      if (emptyState && emptyState.parentElement === chatMessages) {
        emptyState.remove();
        chatMessages.style.justifyContent = 'flex-start';
        chatMessages.style.alignItems = 'stretch';
      }

      const bubble = document.createElement('div');
      bubble.className = 'animate-message-in';
      bubble.style.cssText = 'display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.75rem;';
      bubble.appendChild(buildChatAvatar('error', '#ef4444'));

      const body = document.createElement('div');
      body.style.cssText = 'background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.85rem 1rem; font-size: 0.85rem; line-height: 1.55; max-width: 75%; white-space: pre-wrap;';
      body.textContent = text;
      bubble.appendChild(body);
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(text) {
      const trimmed = text.trim();
      if (!trimmed || isChatPending) return;
      isChatPending = true;
      chatInput.value = '';
      btnSend.disabled = true;
      chatInput.disabled = true;

      appendBubble('user', trimmed);
      addChatMessage('user', trimmed);
      chatHistory.push({ role: 'user', content: trimmed });
      persistCurrentSession(trimmed);

      const typingEl = document.createElement('div');
      typingEl.style.cssText = 'display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.75rem;';
      typingEl.appendChild(buildChatAvatar('smart_toy', 'var(--fm-primary)'));
      typingEl.appendChild(buildTypingBubble());
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const response = await processChatMessage(trimmed, formData, chatHistory);
        const clean = String(response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || 'I did not generate a response.';
        typingEl.remove();
        appendBubble('assistant', clean);
        addChatMessage('assistant', clean);
        chatHistory.push({ role: 'assistant', content: clean });
      } catch (error) {
        typingEl.remove();
        const msg = getAiErrorMessage(error, 'AI service is unavailable right now.');
        appendErrorBubble(msg);
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
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnSend.click();
      }
    });

    btnSend?.addEventListener('click', () => {
      sendMessage(chatInput.value);
    });

    wrapper.querySelectorAll('.chat-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        sendMessage(btn.dataset.msg || '');
      });
    });

    wrapper.querySelector('#btn-new-chat')?.addEventListener('click', () => {
      chatHistory = [];
      sessionList = [];
      saveSessions(sessionList);
      chatMessages.replaceChildren();
      chatMessages.style.justifyContent = 'center';
      chatMessages.style.alignItems = 'center';
      chatMessages.appendChild(emptyState || document.createTextNode(''));
    });

    return () => {
      cleanupRichActions?.();
      cleanupLayout?.();
    };
  }

  return { html, init };
}
