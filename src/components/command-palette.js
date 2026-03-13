import { navigateTo } from '../router.js';
import { getState } from '../state.js';
import { escapeHtml } from '../utils/escape.js';

export function initCommandPalette() {
  if (document.getElementById('command-palette')) return;

  const html = `
    <div id="command-palette" class="fixed inset-0 z-[100] hidden flex-col items-center pt-[15vh]">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" id="cmd-overlay"></div>
      <div class="relative w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[60vh] animate-screen-enter">
        <div class="flex items-center px-4 border-b border-slate-100">
          <span class="material-symbols-outlined text-slate-400 text-xl mr-3">search</span>
          <input type="text" id="cmd-input" class="flex-1 h-14 bg-transparent border-0 ring-0 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-lg font-medium" placeholder="Type a command or search..." autocomplete="off">
          <kbd class="hidden sm:inline-block px-2 py-1 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200 font-bold uppercase tracking-wider">ESC</kbd>
        </div>
        <div class="flex-1 overflow-y-auto p-2 no-scrollbar" id="cmd-results">
          <!-- Dynamic results -->
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const palette = document.getElementById('command-palette');
  const input = document.getElementById('cmd-input');
  const resultsContainer = document.getElementById('cmd-results');
  const overlay = document.getElementById('cmd-overlay');

  const commands = [
    { id: 'new', icon: 'add_box', title: 'Create New Form', desc: 'Start a new form via URL', route: 'new' },
    { id: 'active-form', icon: 'edit_document', title: 'Active Form', desc: 'Return to your current workspace', route: 'workspace', authRequired: true },
    { id: 'history', icon: 'history', title: 'Form History', desc: 'View past completed forms', route: 'accounts', authRequired: true },
    { id: 'vault', icon: 'lock', title: 'My Vault', desc: 'Manage your saved personal information', route: 'accounts', authRequired: true },
    { id: 'settings', icon: 'settings', title: 'Settings', desc: 'App preferences and configurations', route: 'settings', authRequired: true },
    { id: 'help', icon: 'help', title: 'Help & Support', desc: 'Get assistance and view FAQs', route: 'help' }
  ];

  function renderResults(query = '') {
    const q = query.toLowerCase();
    const filtered = commands.filter(c =>
      c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      const safeQuery = escapeHtml(query);
      resultsContainer.innerHTML = `
        <div class="py-8 text-center text-slate-500">
          <span class="material-symbols-outlined text-3xl mb-2 opacity-50">search_off</span>
          <p class="text-sm font-medium">No commands found for "${safeQuery}"</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = filtered.map((c, i) => `
      <button class="cmd-item w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-slate-100 transition-colors group ${i === 0 ? 'bg-slate-50 border border-slate-200/50' : 'border border-transparent'}" data-id="${c.id}" tabindex="0">
        <div class="flex items-center justify-center size-10 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors text-slate-500">
          <span class="material-symbols-outlined">${c.icon}</span>
        </div>
        <div class="flex-1">
          <div class="text-sm font-bold text-slate-900">${c.title}</div>
          <div class="text-[11px] font-medium text-slate-500">${c.desc}</div>
        </div>
        <span class="material-symbols-outlined text-slate-300 group-hover:text-primary-light transition-colors">chevron_right</span>
      </button>
    `).join('');

    // Attach click listeners
    resultsContainer.querySelectorAll('.cmd-item').forEach(btn => {
      btn.addEventListener('click', () => {
        executeCommand(filtered.find(c => c.id === btn.dataset.id));
      });
    });
  }

  function executeCommand(cmd) {
    if (cmd.authRequired && !getState().isAuthenticated) {
      if (window.toast) toast.error('Please sign in to access this feature.');
      else alert('Please sign in to access this feature.');
      close();
      navigateTo('auth');
      return;
    }

    close();
    if (cmd.route) navigateTo(cmd.route);
    if (cmd.action === 'toggleDark') {
      window.toggleTheme && window.toggleTheme();
    }
  }

  function open() {
    palette.classList.remove('hidden');
    palette.classList.add('flex');
    input.value = '';
    renderResults();
    setTimeout(() => input.focus(), 50);
  }

  function close() {
    palette.classList.add('hidden');
    palette.classList.remove('flex');
  }

  // Event Listeners
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (palette.classList.contains('hidden')) open();
      else close();
    }
    if (e.key === 'Escape' && !palette.classList.contains('hidden')) {
      close();
    }
  });

  overlay.addEventListener('click', close);

  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // Export open function globally
  window.openCommandPalette = open;
}
