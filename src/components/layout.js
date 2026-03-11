// ═══════════════════════════════════════════
// FormMate — Shared Layout Component
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { navigateTo } from '../router.js';

/**
 * Wraps a screen's content with the shared Sidebar and Header.
 * @param {string} pageId - The ID of the current page for active states.
 * @param {string} contentHtml - The inner HTML of the page.
 * @returns {string} The full HTML with layout wrapper.
 */
export function withLayout(pageId, contentHtml) {
  const { isAuthenticated, userProfile, tier } = getState();

  const sidebarLinks = [
    { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard', route: 'dashboard' },
    { id: 'new', icon: 'add_box', label: 'New Form', route: 'new' },
    { id: 'workspace', icon: 'edit_document', label: 'Active Form', route: 'workspace' },
    { id: 'history', icon: 'history', label: 'History', route: 'history' },
    { id: 'ai-chat', icon: 'forum', label: 'AI Chat', route: 'ai-chat' },
    { id: 'examples', icon: 'extension', label: 'Examples', route: 'examples' },
  ];

  const sidebarLinksHtml = sidebarLinks.map(link => {
    const isActive = pageId === link.id;
    return `
      <button id="nav-${link.id}" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden ${
        isActive 
          ? 'bg-white shadow-sm border border-slate-100/50 text-slate-900' 
          : 'text-slate-600 hover:bg-white hover:shadow hover:text-slate-900'
      }">
        ${isActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-primary rounded-r-md"></div>' : ''}
        <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} transition-colors text-[20px]">${link.icon}</span>
        <span class="${isActive ? 'font-bold' : 'font-semibold'} text-[14px] hidden lg:block tracking-wide ${isActive ? 'ml-1' : ''}">${link.label}</span>
      </button>
    `;
  }).join('');

  return `
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
          <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
          
          ${isAuthenticated && userProfile ? `
          <button id="btn-profile-header" class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
            <img src="${userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
            <span class="truncate max-w-[100px]">${userProfile?.name?.split(' ')[0] || 'User'}</span>
          </button>
          ` : `
          <button id="btn-login-header" class="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-slate-800 transition-all shadow-sm btn-press">Sign In</button>
          `}
        </div>
      </header>

      <main class="flex-1 flex overflow-hidden lg:pl-2">
        <!-- Sidebar Navigation -->
        <aside id="sidebar" class="w-16 lg:w-[260px] glass-panel border border-slate-200/50 rounded-[var(--fm-card-radius)] flex flex-col py-4 shrink-0 transition-all z-20 hidden md:flex my-4 ml-4 shadow-sm" style="height: calc(100% - 2rem);">
          <nav class="flex-1 px-3 space-y-1.5 flex flex-col overflow-y-auto no-scrollbar">
            ${sidebarLinksHtml}

            <div class="my-3 border-t border-slate-100 w-full"></div>
            
            <button id="nav-support" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-white hover:shadow hover:text-slate-900 transition-all group">
              <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[20px]">help</span>
              <span class="font-semibold text-[14px] hidden lg:block tracking-wide">Help Center</span>
            </button>
          </nav>
          
          <!-- Bottom Section: Profile & Settings -->
          <div class="mt-auto px-1.5 lg:px-3 pt-4 border-t border-slate-50">
             <div class="flex items-center justify-between p-2 lg:p-3 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm mb-3">
                <div class="flex items-center gap-2.5 min-w-0">
                   <div class="relative shrink-0">
                      <img src="${userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`}" class="size-8 lg:size-10 rounded-full object-cover border-2 border-white shadow-sm" alt="Avatar" />
                      ${tier !== 'free' ? '<div class="absolute -bottom-1 -right-1 size-4 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm"><span class="material-symbols-outlined text-[10px]">bolt</span></div>' : ''}
                   </div>
                   <div class="hidden lg:flex flex-col min-w-0">
                      <span class="text-[13px] font-bold text-slate-900 truncate">${userProfile?.name || 'User'}</span>
                      <span class="text-[10px] font-heavy ${tier === 'free' ? 'text-slate-400' : 'text-primary'} uppercase tracking-tighter">${tier === 'free' ? 'Free Plan' : 'Pro Member'}</span>
                   </div>
                </div>
                <button id="nav-settings" class="size-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all shrink-0">
                   <span class="material-symbols-outlined text-[20px]">settings</span>
                </button>
             </div>
             
             ${tier === 'free' ? `
             <div class="px-2 pb-2 hidden lg:block">
                <button id="btn-upgrade-sidebar" class="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-[11px] uppercase tracking-widest font-black transition-all border border-primary/10">Upgrade Pro</button>
             </div>
             ` : ''}
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="flex-1 flex overflow-hidden relative" id="internal-page-container">
           ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

/**
 * Common layout event listeners.
 * @param {HTMLElement} wrapper - The root element of the screen.
 */
export function initLayout(wrapper) {
  // Sidebar navigation
  const links = [
    { id: 'nav-dashboard', route: 'dashboard' },
    { id: 'nav-new', route: 'new' },
    { id: 'nav-workspace', route: 'workspace' },
    { id: 'nav-history', route: 'history' },
    { id: 'nav-ai-chat', route: 'ai-chat' },
    { id: 'nav-examples', route: 'examples' },
    { id: 'nav-settings', route: 'accounts' },
    { id: 'nav-support', route: 'docs' },
  ];

  links.forEach(link => {
    wrapper.querySelector(`#${link.id}`)?.addEventListener('click', () => {
      // Small optimization: don't navigate if already there
      // (This requires router to expose current route, for now let's just let it be)
      import('../router.js').then(r => r.navigateTo(link.route));
    });
  });

  wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => {
    import('../router.js').then(r => r.navigateTo('landing'));
  });

  wrapper.querySelector('#btn-profile-header')?.addEventListener('click', () => {
    import('../router.js').then(r => r.navigateTo('accounts'));
  });

  wrapper.querySelector('#btn-login-header')?.addEventListener('click', () => {
    import('../router.js').then(r => r.navigateTo('auth'));
  });

  wrapper.querySelector('#btn-upgrade-sidebar')?.addEventListener('click', () => {
    import('../router.js').then(r => r.navigateTo('pricing'));
  });
}
