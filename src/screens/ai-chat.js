// ═══════════════════════════════════════════
// FormMate — Full-Screen AI Chat Screen
// ═══════════════════════════════════════════

import { getState, setState, addChatMessage } from '../state.js';
import { withLayout, initLayout } from '../components/layout.js';
import { processChatMessage } from '../ai/ai-actions.js';
import { getAiErrorMessage } from '../ai/ai-service.js';
import { escapeAttr, escapeHtml, escapeHtmlWithLineBreaks } from '../utils/escape.js';
import { toast } from '../components/toast.js';

// Persistence helpers for chat sessions
const CHAT_SESSIONS_KEY = 'chat_sessions';

function loadSessions() {
  const raw = localStorage.getItem(CHAT_SESSIONS_KEY);
  if (!raw) return [{ id: 'default', title: 'Default Conversation', messages: [], timestamp: Date.now() }];
  return JSON.parse(raw);
}

function saveSessions(sessions) {
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
}

export function aiChatScreen() {
  let sessions = loadSessions();
  let currentSessionId = localStorage.getItem('current_chat_session_id') || sessions[0].id;
  
  // Ensure current session exists
  if (!sessions.find(s => s.id === currentSessionId)) {
    currentSessionId = sessions[0].id;
  }

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession.messages || [];

  const chatContent = `
    <div class="flex-1 flex overflow-hidden bg-white animate-screen-enter">
      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Chat Header -->
        <header class="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <h2 class="text-sm font-black text-slate-900 tracking-tight" id="session-title-display">${escapeHtml(currentSession.title)}</h2>
              <div class="flex items-center gap-1.5">
                <span class="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Copilot Active</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Search messages">
              <span class="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button class="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Export Chat" id="btn-export-chat">
              <span class="material-symbols-outlined text-[20px]">ios_share</span>
            </button>
          </div>
        </header>

        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth no-scrollbar" id="chat-messages">
          ${messages.length === 0 ? `
            <div class="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div class="size-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6 border border-slate-100/50">
                <span class="material-symbols-outlined text-4xl">chat_bubble</span>
              </div>
              <h3 class="text-xl font-black text-slate-900 mb-2">How can I help you today?</h3>
              <p class="text-xs text-slate-500 leading-relaxed mb-8">Reference your forms, get advice on application tone, or ask for help with specific questions.</p>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                <button class="suggested-prompt p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md transition-all text-left group">
                  <span class="material-symbols-outlined text-[18px] text-amber-500 mb-2">work</span>
                  <div class="text-[11px] font-bold text-slate-800">Review my Work History</div>
                  <div class="text-[9px] text-slate-400 mt-0.5">Check for technical keywords</div>
                </button>
                <button class="suggested-prompt p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md transition-all text-left group">
                  <span class="material-symbols-outlined text-[18px] text-primary mb-2">history_edu</span>
                  <div class="text-[11px] font-bold text-slate-800">Scholarship Advice</div>
                  <div class="text-[9px] text-slate-400 mt-0.5">Adapt tone for academic committees</div>
                </button>
              </div>
            </div>
          ` : messages.map(msg => renderMessage(msg)).join('')}
        </div>

        <!-- Input Area -->
        <div class="p-6 bg-white shrink-0">
          <div class="max-w-4xl mx-auto">
            <div class="relative bg-slate-50 rounded-2xl border border-slate-200 p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <textarea 
                id="chat-input"
                class="w-full bg-transparent border-none focus:ring-0 p-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none min-h-[56px] max-h-32"
                placeholder="Message Copilot..."
              ></textarea>
              <div class="flex items-center justify-between px-2 pb-1.5 mt-1 border-t border-slate-100/50 pt-2">
                <div class="flex items-center gap-1">
                   <button class="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-white rounded-lg"><span class="material-symbols-outlined text-[18px]">attachment</span></button>
                   <button class="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-white rounded-lg"><span class="material-symbols-outlined text-[18px]">mic</span></button>
                </div>
                <button 
                  id="btn-send-chat"
                  class="size-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                  disabled
                >
                  <span class="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar: History & Actions -->
      <aside class="w-72 border-l border-slate-100 bg-slate-50/30 flex flex-col hidden xl:flex">
        <div class="p-6 border-b border-slate-100">
           <button id="btn-new-chat" class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-primary/50 hover:text-primary transition-all group">
              <span class="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
              New Chat
           </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-1" id="sessions-list">
          ${sessions.map(s => `
            <div data-session-id="${escapeAttr(s.id)}" class="session-item group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${s.id === currentSessionId ? 'bg-white shadow-sm border border-slate-100 text-slate-900' : 'text-slate-500 hover:bg-white/50'}" role="button" tabindex="0" aria-label="Open conversation: ${escapeAttr(s.title)}">
               <div class="flex items-center gap-3 min-w-0">
                  <span class="material-symbols-outlined text-[18px] ${s.id === currentSessionId ? 'text-primary' : 'text-slate-300'}">chat_bubble_outline</span>
                  <span class="text-xs font-bold truncate">${escapeHtml(s.title)}</span>
               </div>
               <div class="hidden group-hover:flex items-center gap-1">
                  <button type="button" class="size-6 rounded-md flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-900 btn-rename-session" data-id="${escapeAttr(s.id)}" aria-label="Rename conversation"><span class="material-symbols-outlined text-[14px]">edit</span></button>
                  <button type="button" class="size-6 rounded-md flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 btn-delete-session" data-id="${escapeAttr(s.id)}" aria-label="Delete conversation"><span class="material-symbols-outlined text-[14px]">delete</span></button>
               </div>
            </div>
          `).join('')}
        </div>

        <div class="p-6 pt-0">
           <div class="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100/50 rounded-2xl p-4">
              <div class="flex items-center gap-2 mb-3">
                 <div class="size-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">AI</div>
                 <span class="text-[10px] font-black uppercase text-indigo-900 tracking-wider">Storage Usage</span>
              </div>
              <div class="h-1 bg-white/50 rounded-full overflow-hidden mb-2">
                 <div class="h-full bg-indigo-500 w-[24%]"></div>
              </div>
              <div class="text-[9px] font-bold text-slate-400 flex justify-between">
                 <span>Sessions Persisted</span>
                 <span class="text-slate-600">${sessions.length}/50</span>
              </div>
           </div>
        </div>
      </aside>
    </div>
  `;

  const html = withLayout('ai-chat', chatContent);

  function renderMessage(msg) {
    const isUser = msg.role === 'user';
    const safeContent = escapeHtmlWithLineBreaks(msg.content);
    return `
      <div class="flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full group">
        <div class="flex items-center gap-2 mb-1">
           ${!isUser ? '<div class="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">smart_toy</span></div>' : ''}
           <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${isUser ? 'You' : 'Copilot'}</span>
        </div>
        <div class="max-w-[85%] ${isUser ? 'bg-primary text-white rounded-2xl rounded-tr-none' : 'bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none'} px-5 py-4 text-sm font-medium leading-relaxed shadow-sm relative">
          ${safeContent}
          ${!isUser ? `
            <button class="absolute -right-10 top-0 p-2 text-slate-300 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all">
              <span class="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          ` : ''}
        </div>
        <span class="text-[9px] font-bold text-slate-300 px-1">${new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
  }

  function init(wrapper) {
    initLayout(wrapper);

    const chatInput = wrapper.querySelector('#chat-input');
    const btnSend = wrapper.querySelector('#btn-send-chat');
    const messagesContainer = wrapper.querySelector('#chat-messages');
    const sessionsList = wrapper.querySelector('#sessions-list');
    let isSending = false;

    // Auto-resize textarea
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = (chatInput.scrollHeight) + 'px';
      btnSend.disabled = !chatInput.value.trim();
    });

    // Send Message
    async function sendMessage(text) {
      const trimmedText = text.trim();
      if (!trimmedText || isSending) return;
      isSending = true;
      
      const newMsg = { role: 'user', content: trimmedText, timestamp: Date.now() };
      currentSession.messages.push(newMsg);
      saveSessions(sessions);
      
      // Update UI
      if (messagesContainer.querySelector('.max-w-md')) {
        messagesContainer.innerHTML = '';
      }
      messagesContainer.innerHTML += renderMessage(newMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      chatInput.value = '';
      chatInput.style.height = 'auto';
      btnSend.disabled = true;
      chatInput.disabled = true;

      // Typing state
      const typingEl = document.createElement('div');
      typingEl.className = 'flex flex-col gap-2 items-start max-w-4xl mx-auto w-full';
      typingEl.innerHTML = `
        <div class="flex items-center gap-2 mb-1">
           <div class="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">smart_toy</span></div>
           <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Copilot</span>
        </div>
        <div class="max-w-px border border-slate-100 bg-slate-50 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1.5 h-10 w-20">
           <div class="typing-dot bg-slate-400 size-1 rounded-full"></div>
           <div class="typing-dot bg-slate-400 size-1 rounded-full" style="animation-delay: 0.2s"></div>
           <div class="typing-dot bg-slate-400 size-1 rounded-full" style="animation-delay: 0.4s"></div>
        </div>
      `;
      messagesContainer.appendChild(typingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const aiResponse = await processChatMessage(trimmedText, {}, currentSession.messages.slice(0, -1));
        
        // Remove <think> tags for cleaner display
        const cleanResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        
        const aiMsg = { role: 'assistant', content: cleanResponse, timestamp: Date.now() };
        currentSession.messages.push(aiMsg);
        saveSessions(sessions);
        
        typingEl.remove();
        messagesContainer.innerHTML += renderMessage(aiMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch (err) {
        typingEl.remove();
        console.error(err);
        const message = getAiErrorMessage(err, 'AI service is unavailable right now.');
        const errorMsg = { role: 'assistant', content: message, timestamp: Date.now() };
        currentSession.messages.push(errorMsg);
        saveSessions(sessions);
        messagesContainer.innerHTML += renderMessage(errorMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        toast.error(message);
      } finally {
        isSending = false;
        chatInput.disabled = false;
        btnSend.disabled = !chatInput.value.trim();
        chatInput.focus();
      }
    }

    btnSend?.addEventListener('click', () => sendMessage(chatInput.value));
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnSend.click();
      }
    });

    // Session Management
    wrapper.querySelector('#btn-new-chat')?.addEventListener('click', () => {
      const newId = 'chat_' + Date.now();
      const newSession = { id: newId, title: 'New Conversation', messages: [], timestamp: Date.now() };
      sessions.unshift(newSession);
      saveSessions(sessions);
      localStorage.setItem('current_chat_session_id', newId);
      import('../router.js').then(r => r.navigateTo('ai-chat'));
    });

    wrapper.querySelectorAll('.session-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const sessionId = item.dataset.sessionId;
        localStorage.setItem('current_chat_session_id', sessionId);
        import('../router.js').then(r => r.navigateTo('ai-chat'));
      });
      item.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        item.click();
      });
    });

    wrapper.querySelectorAll('.btn-delete-session').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (sessions.length <= 1) return alert('Cannot delete the last session.');
        if (confirm('Delete this conversation?')) {
          sessions = sessions.filter(s => s.id !== id);
          saveSessions(sessions);
          if (currentSessionId === id) {
             localStorage.setItem('current_chat_session_id', sessions[0].id);
          }
          import('../router.js').then(r => r.navigateTo('ai-chat'));
        }
      });
    });

    wrapper.querySelectorAll('.btn-rename-session').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const session = sessions.find(s => s.id === id);
        const newTitle = prompt('Enter new title:', session.title);
        if (newTitle && newTitle.trim()) {
          session.title = newTitle.trim();
          saveSessions(sessions);
          import('../router.js').then(r => r.navigateTo('ai-chat'));
        }
      });
    });

    wrapper.querySelectorAll('.suggested-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.querySelector('.text-[11px]').textContent;
        chatInput.value = text;
        btnSend.disabled = false;
        sendMessage(text);
      });
    });
  }

  return { html, init };
}
