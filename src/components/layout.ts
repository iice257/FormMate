// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Shared Layout Component (Redesigned)
// ═══════════════════════════════════════════

import { getState } from '../state';
import { getHomeScreenForUser, navigateTo } from '../router';
import { escapeHtml, safeHttpUrl } from '../utils/escape';

// Global account modal state
let _accountModalOpenFn = null;
const ZEN_MODE_STORAGE_PREFIX = 'fm_zen_mode_';

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

function getZenModeStorageKey(screenId) {
  return `${ZEN_MODE_STORAGE_PREFIX}${screenId}`;
}

export function isZenModeEnabled(screenId) {
  try {
    return window.sessionStorage.getItem(getZenModeStorageKey(screenId)) === 'true';
  } catch {
    return false;
  }
}

export function setZenModeEnabled(screenId, enabled) {
  try {
    window.sessionStorage.setItem(getZenModeStorageKey(screenId), enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures and continue with in-memory DOM state.
  }
}

export function getZenModeToggleHtml(screenId, { label = 'Zen Mode', variant = 'header' } = {}) {
  const isActive = isZenModeEnabled(screenId);
  const className = variant === 'minimal' ? 'zen-mode-toggle zen-mode-toggle-minimal' : 'layout-header-icon-btn zen-mode-toggle';
  const text = label ? `<span class="layout-zen-toggle-label">${escapeHtml(label)}</span>` : '';

  return `
    <button
      type="button"
      id="btn-zen-toggle"
      class="${className}"
      data-zen-screen="${escapeHtml(screenId)}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      aria-label="${isActive ? 'Exit Zen Mode' : 'Enter Zen Mode'}"
      title="${isActive ? 'Exit Zen Mode' : 'Enter Zen Mode'}"
    >
      <span class="material-symbols-outlined">${isActive ? 'fullscreen_exit' : 'fullscreen'}</span>
      ${text}
    </button>
  `;
}

function getZenModeExitButtonHtml(screenId) {
  const isActive = isZenModeEnabled(screenId);
  return `
    <button
      type="button"
      id="btn-zen-exit"
      class="zen-mode-exit-btn ${isActive ? 'visible' : ''}"
      data-zen-screen="${escapeHtml(screenId)}"
      aria-label="Exit Zen Mode"
      ${isActive ? '' : 'hidden'}
    >
      <span class="material-symbols-outlined">close</span>
      <span>Close</span>
    </button>
  `;
}

/**
 * Wraps a screen's content with the shared Sidebar and Header.
 * @param {string} pageId - The ID of the current page for active states.
 * @param {string} contentHtml - The inner HTML of the page.
 * @returns {string} The full HTML with layout wrapper.
 */
export function withLayout(pageId, contentHtml, options = {}) {
  const { isAuthenticated, userProfile, tier } = getState();
  const zenScreenId = options.zenMode?.screenId || pageId;
  const zenModeEnabled = options.zenMode ? isZenModeEnabled(zenScreenId) : false;
  const displayName = escapeHtml(userProfile?.name || 'User');
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
    <div class="layout-shell ${options.shellClassName || ''} ${zenModeEnabled ? 'is-zen-mode' : ''}" data-zen-shell="${options.zenMode ? 'true' : 'false'}" data-zen-screen="${options.zenMode ? escapeHtml(zenScreenId) : ''}">
      ${options.zenMode ? getZenModeExitButtonHtml(zenScreenId) : ''}
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
          ${options.zenMode ? getZenModeToggleHtml(zenScreenId, { label: '', variant: 'header' }) : ''}
          ${isAuthenticated ? `
          <button class="layout-header-primary-action" id="btn-header-new-form" aria-label="New Form">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Form</span>
          </button>
          <button class="layout-header-signin" id="btn-profile-header" aria-label="Open account">
            <img src="${avatarSrc}" alt="${displayName}" style="width: 24px; height: 24px; border-radius: 999px; object-fit: cover;" />
            <span>${displayName}</span>
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
          
          <!-- Bottom Section: Account -->
          <div class="layout-sidebar-bottom">
            <div class="layout-sidebar-account-block">
              <div id="nav-profile-sidebar" class="layout-sidebar-user layout-sidebar-user--stacked" role="button" tabindex="0" aria-label="Open account">
                <div class="layout-sidebar-avatar-wrap">
                  <img src="${avatarSrc}" alt="Avatar" />
                  ${tier !== 'free' ? '<div class="layout-sidebar-pro-badge"><span class="material-symbols-outlined">bolt</span></div>' : ''}
                </div>
                <div class="layout-sidebar-user-info">
                  <span class="layout-sidebar-user-name">${displayName}</span>
                  <span class="layout-sidebar-user-plan ${tier !== 'free' ? 'pro' : ''}">${tier === 'free' ? 'Free Plan' : 'Pro Member'}</span>
                </div>
                <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>

                <button id="btn-sidebar-settings" class="layout-sidebar-settings-inline" type="button" aria-label="Open settings">
                  <span class="material-symbols-outlined layout-sidebar-icon">settings</span>
                  <span class="layout-sidebar-settings-copy">
                    <span class="layout-sidebar-user-name">Settings</span>
                    <span class="layout-sidebar-user-plan">Manage preferences</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="layout-content ${options.contentClassName || ''}" id="internal-page-container">
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
export function initLayout(wrapper, options = {}) {
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

  // Logo → home
  wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => {
    navigateTo(getHomeScreenForUser());
  });

  wrapper.querySelector('#btn-header-new-form')?.addEventListener('click', () => {
    navigateTo('new');
  });

  wrapper.querySelector('#btn-profile-header')?.addEventListener('click', () => {
    openAccountModal('profile');
  });

  // Sidebar user card → account modal (profile tab)
  wrapper.querySelector('#nav-profile-sidebar')?.addEventListener('click', () => {
    openAccountModal('profile');
  });

  wrapper.querySelector('#btn-sidebar-settings')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openAccountModal('settings');
  });

  wrapper.querySelector('#nav-profile-sidebar')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAccountModal('profile');
    }
  });

  // Login button
  wrapper.querySelector('#btn-login-header')?.addEventListener('click', () => {
    navigateTo('auth');
  });

  const zenMode = options.zenMode;
  if (!zenMode) {
    return () => {
      document.body.classList.remove('fm-zen-mode');
    };
  }

  const zenScreenId = zenMode.screenId;
  const zenShell = wrapper.querySelector('[data-zen-shell="true"]');
  const zenToggleBtn = wrapper.querySelector('#btn-zen-toggle');
  const zenExitBtn = wrapper.querySelector('#btn-zen-exit');

  const syncZenUi = (enabled) => {
    zenShell?.classList.toggle('is-zen-mode', enabled);
    wrapper.classList.toggle('zen-mode-active', enabled);
    document.body.classList.toggle('fm-zen-mode', enabled);

    if (zenToggleBtn) {
      zenToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      zenToggleBtn.setAttribute('aria-label', enabled ? 'Exit Zen Mode' : 'Enter Zen Mode');
      zenToggleBtn.setAttribute('title', enabled ? 'Exit Zen Mode' : 'Enter Zen Mode');
      const icon = zenToggleBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = enabled ? 'fullscreen_exit' : 'fullscreen';
    }

    if (zenExitBtn) {
      zenExitBtn.hidden = !enabled;
      zenExitBtn.classList.toggle('visible', enabled);
    }

    zenMode.onChange?.(enabled, { wrapper, zenShell });
  };

  const setZenMode = (enabled) => {
    setZenModeEnabled(zenScreenId, enabled);
    syncZenUi(enabled);
  };

  const handleZenToggle = () => {
    setZenMode(!isZenModeEnabled(zenScreenId));
  };

  const handleZenExit = () => setZenMode(false);
  const handleEscape = (event) => {
    if (event.key === 'Escape' && isZenModeEnabled(zenScreenId)) {
      setZenMode(false);
    }
  };

  zenToggleBtn?.addEventListener('click', handleZenToggle);
  zenExitBtn?.addEventListener('click', handleZenExit);
  document.addEventListener('keydown', handleEscape);
  syncZenUi(isZenModeEnabled(zenScreenId));

  return () => {
    zenToggleBtn?.removeEventListener('click', handleZenToggle);
    zenExitBtn?.removeEventListener('click', handleZenExit);
    document.removeEventListener('keydown', handleEscape);
    document.body.classList.remove('fm-zen-mode');
  };
}
