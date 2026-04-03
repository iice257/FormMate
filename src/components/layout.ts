// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Shared Layout Component (Redesigned)
// ═══════════════════════════════════════════

import { getState } from '../state';
import { getHomeScreenForUser, navigateTo } from '../router';
import { escapeHtml, safeHttpUrl } from '../utils/escape';
import { executeAction, searchActions } from '../actions/action-index';
import { renderButtonMarkup, renderInputMarkup } from './ui-markup';

// Global account modal state
let _accountModalOpenFn = null;
const ZEN_MODE_STORAGE_PREFIX = 'fm_zen_mode_';
const ZEN_MODE_EVENT = 'fm:zen-mode-change';
const SUPPORTED_ZEN_SCREENS = new Set(['dashboard', 'ai-chat', 'new', 'history', 'workspace', 'vault', 'examples']);
const ZEN_SCREEN_LABELS = {
  'dashboard': 'Dashboard',
  'ai-chat': 'AI Chat',
  'new': 'New Form',
  'history': 'History',
  'workspace': 'Active Form',
  'vault': 'Vault',
  'examples': 'Examples',
};

/**
 * Register the account modal opener. Called once during app boot after modal init.
 */
export function registerAccountModalOpener(fn) {
  _accountModalOpenFn = fn;
  window.__fmOpenAccountModalTab = openAccountModal;
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

export function isZenModeSupported(screenId) {
  return SUPPORTED_ZEN_SCREENS.has(screenId);
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

export function updateZenMode(screenId, enabled) {
  if (!isZenModeSupported(screenId)) {
    return false;
  }

  setZenModeEnabled(screenId, enabled);
  window.dispatchEvent(new CustomEvent(ZEN_MODE_EVENT, {
    detail: { screenId, enabled }
  }));
  return true;
}

export function toggleZenMode(screenId) {
  return updateZenMode(screenId, !isZenModeEnabled(screenId));
}

export function getZenModeToggleHtml(screenId, { label = 'Zen', variant = 'header' } = {}) {
  const isActive = isZenModeEnabled(screenId);
  const className = variant === 'minimal'
    ? 'zen-mode-toggle zen-mode-toggle-minimal'
    : 'zen-mode-toggle zen-mode-toggle-header';
  const text = label ? `<span class="layout-zen-toggle-label">${escapeHtml(label)}</span>` : '';

  return renderButtonMarkup({
    ariaLabel: isActive ? 'Exit Zen Mode' : 'Enter Zen Mode',
    className,
    contentHtml: `
      <span class="material-symbols-outlined">${isActive ? 'self_improvement' : 'self_improvement'}</span>
      ${text}
    `,
  }).replace('<button', `<button data-zen-toggle-btn="true" data-zen-screen="${escapeHtml(screenId)}" aria-pressed="${isActive ? 'true' : 'false'}" title="${isActive ? 'Exit Zen Mode' : 'Enter Zen Mode'}"`);
}

function getZenModeExitButtonHtml(screenId) {
  const isActive = isZenModeEnabled(screenId);
  const switchTargets = [...SUPPORTED_ZEN_SCREENS]
    .filter((candidate) => candidate !== screenId)
    .map((candidate) => `
      <button
        type="button"
        class="zen-mode-menu-item"
        data-zen-target="${escapeHtml(candidate)}"
      >
        <span>${escapeHtml(ZEN_SCREEN_LABELS[candidate] || candidate)}</span>
      </button>
    `)
    .join('');

  return `
    <div class="zen-mode-fab-stack ${isActive ? 'visible' : ''}" ${isActive ? '' : 'hidden'}>
      ${renderButtonMarkup({
        ariaLabel: 'Exit Zen Mode',
        className: `zen-mode-exit-btn ${isActive ? 'visible' : ''}`,
        contentHtml: '<span class="material-symbols-outlined">close</span>',
        id: 'btn-zen-exit',
      }).replace('<button', `<button data-zen-screen="${escapeHtml(screenId)}"`)}

      <div class="zen-mode-menu-wrap">
        ${renderButtonMarkup({
          ariaLabel: 'Open Zen navigation',
          className: 'zen-mode-menu-btn',
          contentHtml: '<span class="material-symbols-outlined">menu</span>',
          id: 'btn-zen-menu',
        }).replace('<button', `<button data-zen-screen="${escapeHtml(screenId)}" aria-expanded="false"`)}

        <div id="zen-mode-menu" class="zen-mode-menu" hidden>
          ${switchTargets}
        </div>
      </div>
    </div>
  `;
}

export function bindZenModeControls(wrapper, zenMode) {
  if (!zenMode) {
    return () => {
      document.body.classList.remove('fm-zen-mode');
    };
  }

  const zenScreenId = zenMode.screenId;
  const zenShell = wrapper.querySelector('[data-zen-shell="true"]');
  const zenToggleButtons = Array.from(wrapper.querySelectorAll('[data-zen-toggle-btn="true"]'));
  const zenExitBtn = wrapper.querySelector('#btn-zen-exit');
  const zenFabStack = wrapper.querySelector('.zen-mode-fab-stack');
  const zenMenuBtn = wrapper.querySelector('#btn-zen-menu');
  const zenMenu = wrapper.querySelector('#zen-mode-menu');
  const zenMenuItems = wrapper.querySelectorAll('[data-zen-target]');

  const syncZenUi = (enabled) => {
    zenShell?.classList.toggle('is-zen-mode', enabled);
    wrapper.classList.toggle('zen-mode-active', enabled);
    document.body.classList.toggle('fm-zen-mode', enabled);

    zenToggleButtons.forEach((zenToggleBtn) => {
      zenToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      zenToggleBtn.setAttribute('aria-label', enabled ? 'Exit Zen Mode' : 'Enter Zen Mode');
      zenToggleBtn.setAttribute('title', enabled ? 'Exit Zen Mode' : 'Enter Zen Mode');
      zenToggleBtn.classList.toggle('is-active', enabled);
      const icon = zenToggleBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'self_improvement';
    });

    if (zenExitBtn) {
      zenExitBtn.classList.toggle('visible', enabled);
    }

    if (zenFabStack) {
      zenFabStack.hidden = !enabled;
      zenFabStack.classList.toggle('visible', enabled);
    }

    if (!enabled && zenMenuBtn && zenMenu) {
      zenMenuBtn.setAttribute('aria-expanded', 'false');
      zenMenu.classList.remove('is-open');
      zenMenu.hidden = true;
    }

    zenMode.onChange?.(enabled, { wrapper, zenShell });
  };

  const setZenMode = (enabled) => {
    updateZenMode(zenScreenId, enabled);
  };

  const handleZenToggle = () => {
    setZenMode(!isZenModeEnabled(zenScreenId));
  };

  const handleZenExit = () => setZenMode(false);
  const handleZenMenuToggle = () => {
    if (!zenMenu || !zenMenuBtn) return;
    const nextOpen = zenMenu.hidden;
    zenMenu.hidden = false;
    zenMenu.classList.toggle('is-open', nextOpen);
    zenMenuBtn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    if (!nextOpen) {
      window.setTimeout(() => {
        if (!zenMenu.classList.contains('is-open')) {
          zenMenu.hidden = true;
        }
      }, 140);
    }
  };
  const closeZenMenu = () => {
    if (!zenMenu || !zenMenuBtn) return;
    zenMenuBtn.setAttribute('aria-expanded', 'false');
    zenMenu.classList.remove('is-open');
    window.setTimeout(() => {
      if (!zenMenu.classList.contains('is-open')) {
        zenMenu.hidden = true;
      }
    }, 140);
  };
  const handleEscape = (event) => {
    if (event.key === 'Escape' && isZenModeEnabled(zenScreenId)) {
      if (zenMenu?.classList.contains('is-open')) {
        closeZenMenu();
        return;
      }
      setZenMode(false);
    }
  };
  const handleZenChange = (event) => {
    if (event.detail?.screenId === zenScreenId) {
      syncZenUi(Boolean(event.detail.enabled));
    }
  };
  const handleZenMenuClickAway = (event) => {
    if (!zenMenu || !zenMenuBtn) return;
    const target = event.target;
    if (zenMenu.contains(target) || zenMenuBtn.contains(target)) return;
    closeZenMenu();
  };

  zenToggleButtons.forEach((zenToggleBtn) => {
    zenToggleBtn.addEventListener('click', handleZenToggle);
  });
  zenExitBtn?.addEventListener('click', handleZenExit);
  zenMenuBtn?.addEventListener('click', handleZenMenuToggle);
  zenMenuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetScreen = item.getAttribute('data-zen-target');
      if (!targetScreen) return;
      setZenModeEnabled(targetScreen, true);
      closeZenMenu();
      navigateTo(targetScreen, false, 'forward');
    });
  });
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('click', handleZenMenuClickAway);
  window.addEventListener(ZEN_MODE_EVENT, handleZenChange);
  syncZenUi(isZenModeEnabled(zenScreenId));

  return () => {
    zenToggleButtons.forEach((zenToggleBtn) => {
      zenToggleBtn.removeEventListener('click', handleZenToggle);
    });
    zenExitBtn?.removeEventListener('click', handleZenExit);
    zenMenuBtn?.removeEventListener('click', handleZenMenuToggle);
    document.removeEventListener('keydown', handleEscape);
    document.removeEventListener('click', handleZenMenuClickAway);
    window.removeEventListener(ZEN_MODE_EVENT, handleZenChange);
    document.body.classList.remove('fm-zen-mode');
  };
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
  const supportsZenOnPage = options.zenMode && isZenModeSupported(zenScreenId);
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
      ${renderButtonMarkup({
        className: `layout-sidebar-link ${isActive ? 'active' : ''}`,
        contentHtml: `
          ${isActive ? '<div class="layout-sidebar-active-bar"></div>' : ''}
          <span class="material-symbols-outlined layout-sidebar-icon">${link.icon}</span>
          <span class="layout-sidebar-label">${link.label}</span>
        `,
        id: `nav-${link.id}`,
      }).replace('<button', `<button aria-current="${isActive ? 'page' : 'false'}"`)}
    `;
  }).join('');

  return `
    <div class="layout-shell ${options.shellClassName || ''} ${zenModeEnabled ? 'is-zen-mode' : ''}" data-zen-shell="${options.zenMode ? 'true' : 'false'}" data-zen-screen="${options.zenMode ? escapeHtml(zenScreenId) : ''}">
      ${options.zenMode ? getZenModeExitButtonHtml(zenScreenId) : ''}
      <!-- Header -->
      <header data-fm-hide-on-scroll="true" class="layout-header">
        ${renderButtonMarkup({
          ariaLabel: 'Go to home',
          className: 'layout-brand',
          contentHtml: `
            <div class="layout-brand-icon">
              <img src="/logo.png" alt="FormMate Logo" />
            </div>
            <span class="layout-brand-text">Form<span class="text-primary">Mate</span></span>
          `,
          id: 'btn-logo-home',
          variant: 'ghost',
        })}
        
        <div class="layout-search-container">
          <span class="material-symbols-outlined layout-search-icon">search</span>
          ${renderInputMarkup({
            className: 'layout-search-input',
            id: 'layout-search',
            placeholder: 'Search pages, actions, help, or preferences...',
          }).replace('<input', '<input autocomplete="off"')}
          ${renderButtonMarkup({
            ariaLabel: 'Clear search',
            className: 'layout-search-clear',
            contentHtml: '<span class="material-symbols-outlined">close</span>',
            id: 'btn-layout-search-clear',
            variant: 'ghost',
          }).replace('<button', '<button hidden')}
          <div class="layout-search-results" id="layout-search-results" hidden>
            <div class="layout-search-results-list" id="layout-search-results-list"></div>
          </div>
        </div>

        <div class="layout-header-actions">
          ${isAuthenticated ? `
          ${renderButtonMarkup({
            ariaLabel: 'New Form',
            className: 'layout-header-primary-action',
            contentHtml: `
              <span class="material-symbols-outlined">add_circle</span>
              <span>New Form</span>
            `,
            id: 'btn-header-new-form',
          })}
          ` : `
          ${renderButtonMarkup({
            className: 'layout-header-signin',
            contentHtml: 'Sign In',
            id: 'btn-login-header',
            variant: 'outline',
          })}
          `}
        </div>
      </header>

      <main class="layout-main">
        <!-- Sidebar Navigation -->
        <aside id="sidebar" class="layout-sidebar">
          <nav class="layout-sidebar-nav">
            ${sidebarLinksHtml}

            <div class="layout-sidebar-divider"></div>
            
            ${renderButtonMarkup({
              ariaLabel: 'Help Center',
              className: 'layout-sidebar-link',
              contentHtml: `
                <span class="material-symbols-outlined layout-sidebar-icon">help</span>
                <span class="layout-sidebar-label">Help Center</span>
              `,
              id: 'nav-support',
            })}
          </nav>
          
          <!-- Bottom Section: Account -->
          <div class="layout-sidebar-bottom">
            ${supportsZenOnPage ? `
              <div class="layout-sidebar-zen-row">
                ${getZenModeToggleHtml(zenScreenId, { label: 'Zen Mode', variant: 'minimal' })}
              </div>
            ` : ''}
            <div class="layout-sidebar-account-block">
              <div id="nav-profile-sidebar" class="layout-sidebar-user" role="button" tabindex="0" aria-label="Open account">
                <div class="layout-sidebar-avatar-wrap">
                  <img src="${avatarSrc}" alt="Avatar" />
                  ${tier !== 'free' ? '<div class="layout-sidebar-pro-badge"><span class="material-symbols-outlined">bolt</span></div>' : ''}
                </div>
                <div class="layout-sidebar-user-info">
                  <span class="layout-sidebar-user-name">${displayName}</span>
                </div>
                ${renderButtonMarkup({
                  ariaLabel: 'Open preferences',
                  className: 'layout-sidebar-settings-inline',
                  contentHtml: '<span class="material-symbols-outlined layout-sidebar-icon">settings</span>',
                  id: 'btn-sidebar-settings',
                  variant: 'ghost',
                })}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="layout-content ${pageId !== 'ai-chat' ? 'layout-content-scrollable' : ''} ${options.contentClassName || ''}" id="internal-page-container">
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

  const searchInput = wrapper.querySelector('#layout-search');
  const searchClear = wrapper.querySelector('#btn-layout-search-clear');
  const searchResults = wrapper.querySelector('#layout-search-results');
  const searchResultsList = wrapper.querySelector('#layout-search-results-list');
  let activeSearchResults = [];
  let activeSearchIndex = 0;
  const handleDocumentClick = (event) => {
    const container = wrapper.querySelector('.layout-search-container');
    if (container && !container.contains(event.target)) {
      closeSearch();
    }
  };

  const closeSearch = () => {
    if (searchResults) searchResults.hidden = true;
  };

  const renderSearchResults = (query = '') => {
    if (!searchInput || !searchResults || !searchResultsList) return;

    activeSearchResults = searchActions(query, { limit: 8 });
    activeSearchIndex = 0;
    if (searchClear) searchClear.hidden = !query.trim();

    if (!activeSearchResults.length) {
      searchResultsList.innerHTML = `
        <div class="layout-search-empty">
          <span class="material-symbols-outlined">search_off</span>
          <span>No matching actions found</span>
        </div>
      `;
      searchResults.hidden = false;
      return;
    }

      searchResultsList.innerHTML = activeSearchResults.map((action, index) =>
        renderButtonMarkup({
          className: `layout-search-result ${index === 0 ? 'is-active' : ''}`,
          contentHtml: `
            <span class="material-symbols-outlined layout-search-result-icon">${escapeHtml(action.icon || 'arrow_forward')}</span>
            <span class="layout-search-result-copy">
              <span class="layout-search-result-title">${escapeHtml(action.title)}</span>
              <span class="layout-search-result-description">${escapeHtml(action.description || '')}</span>
            </span>
          `,
          variant: 'ghost',
        }).replace('<button', `<button data-action-id="${escapeHtml(action.id)}"`)
      ).join('');

    searchResults.hidden = false;
  };

  const syncActiveSearchItem = () => {
    searchResultsList?.querySelectorAll('.layout-search-result').forEach((item, index) => {
      item.classList.toggle('is-active', index === activeSearchIndex);
    });
  };

  const runSearchAction = (actionId) => {
    closeSearch();
    if (searchInput) {
      searchInput.value = '';
      if (searchClear) searchClear.hidden = true;
    }
    executeAction(actionId, {
      currentScreen: getState().currentScreen,
      openAccountModal
    });
  };

  searchInput?.addEventListener('focus', () => {
    renderSearchResults(searchInput.value);
  });

  searchInput?.addEventListener('input', () => {
    renderSearchResults(searchInput.value);
  });

  searchInput?.addEventListener('keydown', (event) => {
    if (!searchResults || searchResults.hidden || !activeSearchResults.length) {
      if (event.key === 'Enter' && searchInput.value.trim()) {
        const [firstAction] = searchActions(searchInput.value, { limit: 1 });
        if (firstAction) {
          event.preventDefault();
          runSearchAction(firstAction.id);
        }
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeSearchIndex = (activeSearchIndex + 1) % activeSearchResults.length;
      syncActiveSearchItem();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeSearchIndex = (activeSearchIndex - 1 + activeSearchResults.length) % activeSearchResults.length;
      syncActiveSearchItem();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runSearchAction(activeSearchResults[activeSearchIndex]?.id);
    } else if (event.key === 'Escape') {
      closeSearch();
      searchInput.blur();
    }
  });

  searchClear?.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.value = '';
    renderSearchResults('');
    searchInput.focus();
  });

  searchResultsList?.addEventListener('click', (event) => {
    const target = event.target.closest('.layout-search-result[data-action-id]');
    if (!target) return;
    runSearchAction(target.dataset.actionId);
  });

  document.addEventListener('click', handleDocumentClick);

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
      document.removeEventListener('click', handleDocumentClick);
      document.body.classList.remove('fm-zen-mode');
    };
  }
  const cleanupZen = bindZenModeControls(wrapper, zenMode);
  return () => {
    document.removeEventListener('click', handleDocumentClick);
    cleanupZen?.();
  };
}
