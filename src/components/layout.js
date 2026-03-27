// ═══════════════════════════════════════════
// FormMate — Shared Layout Component (Redesigned)
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { getHomeScreenForUser, navigateTo } from '../router.js';
import { escapeHtml, safeHttpUrl } from '../utils/escape.js';

// Global account modal state
let _accountModalOpenFn = null;

/**
 * Register the account modal opener. Called once by main.js after modal init.
 */
export function registerAccountModalOpener(fn) {
  _accountModalOpenFn = fn;
}

/**
 * Open the account modal on the given tab.
 * @param {'profile'|'settings'|'help'} tab
 */
export function openAccountModal(tab = 'profile') {
  if (_accountModalOpenFn) {
    _accountModalOpenFn(tab);
  }
}

/**
 * Wraps a screen's content with the shared Sidebar and Header.
 * @param {string} pageId - The ID of the current page for active states.
 * @param {string} contentHtml - The inner HTML of the page.
 * @returns {string} The full HTML with layout wrapper.
 */
export function withLayout(pageId, contentHtml) {
  const { isAuthenticated, userProfile, tier } = getState();
  const displayName = escapeHtml(userProfile?.name || 'User');
  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const sidebarLinks = [
    { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard', route: 'dashboard' },
    { id: 'new', icon: 'add_circle', label: 'New Form', route: 'new' },
    { id: 'workspace', icon: 'description', label: 'Active Form', route: 'workspace' },
    { id: 'history', icon: 'schedule', label: 'History', route: 'history' },
    { id: 'ai-chat', icon: 'chat_bubble', label: 'AI Chat', route: 'ai-chat' },
    { id: 'examples', icon: 'auto_stories', label: 'Examples', route: 'examples' },
  ];

  const sidebarLinksHtml = sidebarLinks.map(link => {
    const isActive = pageId === link.id;
    return `
      <button id="nav-${link.id}" class="layout-sidebar-link ${isActive ? 'active' : ''}" aria-current="${isActive ? 'page' : 'false'}">
        ${isActive ? '<div class="layout-sidebar-active-bar"></div>' : ''}
        <span class="material-symbols-outlined layout-sidebar-icon">${link.icon}</span>
        <span class="layout-sidebar-label">${link.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="layout-shell">
      <!-- Header -->
      <header data-fm-hide-on-scroll="true" class="layout-header">
        <button type="button" class="layout-brand" id="btn-logo-home" aria-label="Go to home">
          <div class="layout-brand-icon">
            <img src="/logo.png" alt="FormMate Logo" />
          </div>
          <span class="layout-brand-text">Form<span class="text-primary">Mate</span></span>
        </button>
        
        <div class="layout-search-container">
          <span class="material-symbols-outlined layout-search-icon">search</span>
          <input type="text" class="layout-search-input" placeholder="Search forms, templates, or AI prompts..." id="layout-search" />
        </div>

        <div class="layout-header-actions">
          ${isAuthenticated ? `
          <button class="layout-header-icon-btn" id="btn-notifications" aria-label="Notifications">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <button class="layout-header-icon-btn" id="btn-header-settings" aria-label="Settings">
            <span class="material-symbols-outlined">settings</span>
          </button>
          <button class="layout-header-avatar-btn" id="btn-profile-header" aria-label="Account">
            <img src="${avatarSrc}" alt="Avatar" />
          </button>
          ` : `
          <button id="btn-login-header" class="layout-header-signin">Sign In</button>
          `}
        </div>
      </header>

      <main class="layout-main">
        <!-- Sidebar Navigation -->
        <aside id="sidebar" class="layout-sidebar">
          <nav class="layout-sidebar-nav">
            ${sidebarLinksHtml}

            <div class="layout-sidebar-divider"></div>
            
            <button id="nav-support" class="layout-sidebar-link" aria-label="Help Center">
              <span class="material-symbols-outlined layout-sidebar-icon">help</span>
              <span class="layout-sidebar-label">Help Center</span>
            </button>
          </nav>
          
          <!-- Bottom Section: Profile & Settings -->
          <div class="layout-sidebar-bottom">
            <button id="nav-profile-sidebar" class="layout-sidebar-user">
              <div class="layout-sidebar-avatar-wrap">
                <img src="${avatarSrc}" alt="Avatar" />
                ${tier !== 'free' ? '<div class="layout-sidebar-pro-badge"><span class="material-symbols-outlined">bolt</span></div>' : ''}
              </div>
              <div class="layout-sidebar-user-info">
                <span class="layout-sidebar-user-name">${displayName}</span>
                <span class="layout-sidebar-user-plan ${tier !== 'free' ? 'pro' : ''}">${tier === 'free' ? 'Free Plan' : 'Pro Member'}</span>
              </div>
            </button>
             
            ${tier === 'free' ? `
            <button id="btn-upgrade-sidebar" class="layout-sidebar-upgrade">Upgrade Pro</button>
            ` : ''}
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="layout-content" id="internal-page-container">
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
  ];

  links.forEach(link => {
    wrapper.querySelector(`#${link.id}`)?.addEventListener('click', () => {
      navigateTo(link.route);
    });
  });

  // Help Center → account modal (help tab)
  wrapper.querySelector('#nav-support')?.addEventListener('click', () => {
    openAccountModal('help');
  });

  // Settings icon → account modal (settings tab)
  wrapper.querySelector('#btn-header-settings')?.addEventListener('click', () => {
    openAccountModal('settings');
  });

  // Logo → home
  wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => {
    navigateTo(getHomeScreenForUser());
  });

  // Header avatar → account modal (profile tab)
  wrapper.querySelector('#btn-profile-header')?.addEventListener('click', () => {
    openAccountModal('profile');
  });

  // Sidebar user card → account modal (profile tab)
  wrapper.querySelector('#nav-profile-sidebar')?.addEventListener('click', () => {
    openAccountModal('profile');
  });

  // Login button
  wrapper.querySelector('#btn-login-header')?.addEventListener('click', () => {
    navigateTo('auth');
  });

  // Upgrade button
  wrapper.querySelector('#btn-upgrade-sidebar')?.addEventListener('click', () => {
    navigateTo('pricing');
  });
}
