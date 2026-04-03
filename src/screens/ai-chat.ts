// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — AI Chat Screen (Redesigned)
// ═══════════════════════════════════════════

import { getState, setState, addChatMessage } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { processChatMessage } from '../ai/ai-actions';
import { getAiErrorMessage } from '../ai/ai-service';
import { escapeHtml } from '../utils/escape';
import { bindRichActionClicks, renderAssistantRichText } from '../actions/action-rich-text';
import { openAccountModal } from '../components/layout';
import { renderButtonMarkup, renderInputMarkup } from '../components/ui-markup';

const SESSION_STORAGE_KEY = 'fm_chat_sessions';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

export function aiChatScreen() {
  const { userProfile, formData } = getState();
  const displayName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const sessions = loadSessions();

  const avatarSrc = userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;

  const chatContent = `
    <div class="flex-1 flex overflow-hidden animate-screen-enter zen-chat-shell">
      
      <!-- Chat Main Area -->
      <div class="zen-chat-main" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <!-- Chat Header -->
        <div class="zen-chat-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-size: 1.1rem; font-weight: 800; color: var(--fm-text);">FormMate AI</h2>
            <span style="padding: 0.15rem 0.5rem; background: var(--fm-success-light); color: var(--fm-success); border-radius: var(--fm-radius-full); font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Copilot Active</span>
          </div>
          <div style="display: flex; gap: 0.35rem;">
            ${renderButtonMarkup({
    className: 'size-8 rounded-[var(--fm-radius-sm)] px-0 text-[var(--fm-text-tertiary)] hover:bg-muted/60',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 20px;">search</span>',
    size: 'icon-sm',
    variant: 'ghost',
  })}
            ${renderButtonMarkup({
    className: 'size-8 rounded-[var(--fm-radius-sm)] px-0 text-[var(--fm-text-tertiary)] hover:bg-muted/60',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 20px;">ios_share</span>',
    size: 'icon-sm',
    variant: 'ghost',
  })}
          </div>
        </div>

        <!-- Chat Messages -->
        <div id="chat-messages" class="no-scrollbar zen-chat-messages" style="flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div id="chat-empty-state" style="text-align: center; max-width: 420px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--fm-primary-50); color: var(--fm-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
              <span class="material-symbols-outlined" style="font-size: 32px;">auto_awesome</span>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 900; color: var(--fm-text); margin-bottom: 0.5rem;">How can I help you today?</h3>
            <p style="font-size: 0.85rem; color: var(--fm-text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">I can assist with form analysis, answer generation, and intelligent suggestions — just ask.</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              ${renderButtonMarkup({
    className: 'chat-suggestion btn-press h-auto items-start rounded-[var(--fm-radius-xl)] border-[var(--fm-border-light)] bg-[var(--fm-bg-elevated)] p-4 text-left',
    contentHtml: `
      <span class="material-symbols-outlined mb-1.5 block text-[20px] text-[var(--fm-primary)]">analytics</span>
      <span style="font-size: 0.8rem; font-weight: 600; color: var(--fm-text); line-height: 1.35;">Analyze my latest form</span>
    `,
    variant: 'outline',
  }).replace('<button', '<button data-msg="Analyze my latest form and suggest improvements"')}
              ${renderButtonMarkup({
    className: 'chat-suggestion btn-press h-auto items-start rounded-[var(--fm-radius-xl)] border-[var(--fm-border-light)] bg-[var(--fm-bg-elevated)] p-4 text-left',
    contentHtml: `
      <span class="material-symbols-outlined mb-1.5 block text-[20px] text-[var(--fm-primary)]">edit_note</span>
      <span style="font-size: 0.8rem; font-weight: 600; color: var(--fm-text); line-height: 1.35;">Help me write a cover letter</span>
    `,
    variant: 'outline',
  }).replace('<button', '<button data-msg="Help me write a professional cover letter"')}
            </div>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="zen-chat-composer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--fm-border-light); flex-shrink: 0;">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            ${renderButtonMarkup({
    className: 'size-9 rounded-full border-[var(--fm-border)] bg-[var(--fm-bg-elevated)] text-[var(--fm-text-tertiary)]',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">attachment</span>',
    size: 'icon',
    variant: 'outline',
  })}
            <div style="flex: 1; position: relative;">
              ${renderInputMarkup({
    className: 'h-11 rounded-full border-[var(--fm-border)] bg-[var(--fm-bg-elevated)] pr-12 pl-4 text-[0.85rem] text-[var(--fm-text)]',
    id: 'chat-input',
    placeholder: 'Message FormMate AI...',
  })}
              ${renderButtonMarkup({
    className: 'absolute top-1/2 right-1 size-9 -translate-y-1/2 rounded-full border-transparent bg-[var(--fm-primary)] text-[var(--primary-foreground)] hover:bg-[var(--fm-primary)]',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">arrow_upward</span>',
    disabled: true,
    id: 'btn-send',
    size: 'icon',
  })}
            </div>
            ${renderButtonMarkup({
    className: 'size-9 rounded-full border-[var(--fm-border)] bg-[var(--fm-bg-elevated)] text-[var(--fm-text-tertiary)]',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">mic</span>',
    size: 'icon',
    variant: 'outline',
  })}
          </div>
          <div style="text-align: center; font-size: 0.65rem; color: #cbd5e1; margin-top: 0.4rem;">AI can make mistakes. Check important info.</div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="hidden lg:flex zen-chat-sidebar no-scrollbar" style="width: 280px; border-left: 1px solid var(--fm-border-light); background: var(--fm-bg-elevated); flex-direction: column; padding: 1.25rem; flex-shrink: 0; overflow-y: auto;">
        <!-- User Card -->
        <div style="display: flex; align-items: center; gap: 0.6rem; padding-bottom: 1rem; border-bottom: 1px solid var(--fm-border-light); margin-bottom: 1rem;">
          <img src="${avatarSrc}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" alt="Avatar" />
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">${displayName}</div>
            <div style="font-size: 0.65rem; color: var(--fm-text-tertiary); font-weight: 500;">Online</div>
          </div>
        </div>
        
        ${renderButtonMarkup({
    className: 'btn-press mb-5 flex w-full items-center justify-center gap-1.5 px-4 py-2 text-[0.8rem] font-semibold',
    contentHtml: '<span class="material-symbols-outlined" style="font-size: 18px;">add</span> New Chat',
    id: 'btn-new-chat',
    variant: 'outline',
  })}

        <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary); margin-bottom: 0.5rem;">Recent Chats</div>
        <div id="sessions-list" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 1.5rem;">
          ${sessions.length > 0 ? sessions.slice(0, 8).map(s => `
            ${renderButtonMarkup({
      className: 'session-item w-full justify-start gap-2 rounded-[var(--fm-radius-sm)] px-3 py-2 text-left text-[var(--fm-text)] hover:bg-muted/60',
      contentHtml: `
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--fm-text-tertiary);">chat_bubble_outline</span>
        <span style="font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.title || `Chat ${s.id.substring(0, 4)}`)}</span>
      `,
      variant: 'ghost',
    }).replace('<button', `<button data-session-id="${s.id}"`)}
          `).join('') : '<div style="font-size: 0.8rem; color: var(--fm-text-tertiary); font-style: italic; padding: 0.5rem;">No recent chats</div>'}
        </div>

        <div style="margin-top: auto; padding: 1rem; background: var(--fm-bg-sunken); border-radius: var(--fm-radius-xl);">
          <div style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fm-text-tertiary); margin-bottom: 0.6rem;">Current Context</div>
          <div style="font-size: 0.75rem; color: var(--fm-text-secondary); line-height: 1.5;">
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
    const cleanupRichActions = bindRichActionClicks(chatMessages, { openAccountModal });

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
      bubble.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isUser ? 'var(--fm-primary-dark)' : 'var(--fm-primary)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary-foreground);">${isUser ? 'person' : 'smart_toy'}</span>
        </div>
        <div style="background: ${isUser ? 'var(--fm-primary)' : 'var(--fm-bg-sunken)'}; color: ${isUser ? '#fff' : 'var(--fm-text)'}; border-radius: ${isUser ? 'var(--fm-radius-lg) 0 var(--fm-radius-lg) var(--fm-radius-lg)' : '0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg)'}; padding: 0.85rem 1rem; font-size: 0.85rem; line-height: 1.55; max-width: 75%;">
          ${isUser ? escapeHtml(text).replace(/\n/g, '<br>') : renderAssistantRichText(text)}
        </div>
      `;
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

      const typingEl = document.createElement('div');
      typingEl.style.cssText = 'display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.75rem;';
      typingEl.innerHTML = `<div style="width: 28px; height: 28px; border-radius: 50%; background: var(--fm-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary-foreground);">smart_toy</span></div><div style="background: var(--fm-bg-sunken); border-radius: 0 var(--fm-radius-lg) var(--fm-radius-lg) var(--fm-radius-lg); padding: 0.85rem; display: flex; gap: 5px;"><div class="typing-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;"></div><div class="typing-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;"></div><div class="typing-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;"></div></div>`;
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
        appendBubble('assistant', msg);
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
    });

    wrapper.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        sendMessage(btn.dataset.msg || '');
      });
    });

    wrapper.querySelector('#btn-new-chat')?.addEventListener('click', () => {
      chatHistory = [];
      chatMessages.innerHTML = '';
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

