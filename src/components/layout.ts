// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Shared Layout Component (Redesigned)
// ═══════════════════════════════════════════

import { getState, setState } from '../state';
import { getHomeScreenForUser, navigateTo } from '../router';
import { escapeHtml, safeHttpUrl } from '../utils/escape';
import { executeAction, searchActions } from '../actions/action-index';

// Global account modal state
let _accountModalOpenFn = null;
const ZEN_MODE_STORAGE_KEY = 'fm_zen_mode_enabled';
const ZEN_MODE_EVENT = 'fm:zen-mode-change';
const SUPPORTED_ZEN_SCREENS = new Set(['dashboard', 'new', 'workspace', 'history', 'ai-chat', 'vault', 'examples']);
const SIDEBAR_COLLAPSED_CLASS = 'layout-shell-sidebar-collapsed';
const ZEN_SCREEN_LABELS = {
  'dashboard': 'Dashboard',
  'ai-chat': 'AI Chat',
  'new': 'New Form',
  'history': 'History',
  'workspace': 'Active Form',
  'vault': 'Vault',
  'examples': 'Examples',
};
const ZEN_SCREEN_ICONS = {
  'dashboard': 'space_dashboard',
  'ai-chat': 'chat_bubble',
  'new': 'add_circle',
  'history': 'schedule',
  'workspace': 'description',
  'vault': 'shield',
  'examples': 'auto_stories',
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

export function isZenModeEnabled(screenId) {
  if (screenId && !isZenModeSupported(screenId)) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(ZEN_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setZenModeEnabled(screenId, enabled) {
  if (screenId && !isZenModeSupported(screenId)) {
    return false;
  }
  try {
    window.sessionStorage.setItem(ZEN_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures and continue with in-memory DOM state.
  }
  return true;
}

export function updateZenMode(screenId, enabled) {
  if (screenId && !isZenModeSupported(screenId)) {
    return false;
  }

  setZenModeEnabled(screenId, enabled);
  window.dispatchEvent(new CustomEvent(ZEN_MODE_EVENT, {
    detail: { enabled }
  }));
  return true;
}

export function toggleZenMode(screenId) {
  return updateZenMode(screenId, !isZenModeEnabled(screenId));
}

function hasActiveWorkspace() {
  return Boolean(getState().formData);
}

function isSidebarExpanded() {
  return getState().sidebarOpen !== false;
}

export function getZenModeToggleHtml(screenId, { label = 'Zen', variant = 'header' } = {}) {
  const isActive = isZenModeEnabled(screenId);
  const className = variant === 'minimal'
    ? 'zen-mode-toggle zen-mode-toggle-minimal layout-sidebar-utility-btn'
    : 'zen-mode-toggle zen-mode-toggle-header';
  const textClassName = variant === 'minimal'
    ? 'layout-zen-toggle-label layout-sidebar-utility-label'
    : 'layout-zen-toggle-label';
  const text = label ? `<span class="${textClassName}">${escapeHtml(label)}</span>` : '';

  return `
    <button
      type="button"
      class="${className}"
      data-zen-toggle-btn="true"
      data-zen-screen="${escapeHtml(screenId)}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      aria-label="${isActive ? 'Exit Zen Mode' : 'Enter Zen Mode'}"
      title="${isActive ? 'Exit Zen Mode' : 'Enter Zen Mode'}"
    >
      <span class="material-symbols-outlined">${isActive ? 'self_improvement' : 'self_improvement'}</span>
      ${text}
    </button>
  `;
}

function getZenModeExitButtonHtml(screenId) {
  const isActive = isZenModeEnabled(screenId);
  const rawTargets = [...SUPPORTED_ZEN_SCREENS]
    .filter((candidate) => candidate !== 'workspace' || hasActiveWorkspace());
  const switchTargets = rawTargets
    .filter((candidate) => candidate !== 'new')
    .concat(rawTargets.includes('new') ? ['new'] : [])
    .map((candidate) => {
      const isCurrent = candidate === screenId;
      const isPrimaryAction = candidate === 'new';
      return `
      <button
        type="button"
        class="zen-mode-menu-item ${isCurrent ? 'is-current' : ''} ${isPrimaryAction ? 'zen-mode-menu-item-primary zen-mode-menu-item-separate' : ''}"
        data-zen-target="${escapeHtml(candidate)}"
        aria-current="${isCurrent ? 'page' : 'false'}"
        aria-label="${escapeHtml(ZEN_SCREEN_LABELS[candidate] || candidate)}${isCurrent ? ' (Current)' : ''}"
      >
        <span class="material-symbols-outlined zen-mode-menu-item-icon">${escapeHtml(ZEN_SCREEN_ICONS[candidate] || 'arrow_forward')}</span>
        <span class="zen-mode-menu-item-label">${escapeHtml(ZEN_SCREEN_LABELS[candidate] || candidate)}</span>
      </button>
    `;
    })
    .join('');

  return `
    <div class="zen-mode-fab-stack ${isActive ? 'visible' : ''}" ${isActive ? '' : 'hidden'}>
      <button
        type="button"
        id="btn-zen-exit"
        class="zen-mode-exit-btn ${isActive ? 'visible' : ''}"
        data-zen-screen="${escapeHtml(screenId)}"
        aria-label="Exit Zen Mode"
      >
        <span class="material-symbols-outlined">close</span>
      </button>

      <div class="zen-mode-menu-wrap">
        <button
          type="button"
          id="btn-zen-menu"
          class="zen-mode-menu-btn"
          data-zen-screen="${escapeHtml(screenId)}"
          aria-label="Open Zen navigation"
          aria-expanded="false"
        >
          <span class="material-symbols-outlined">menu</span>
        </button>

        <div id="zen-mode-menu" class="zen-mode-menu" hidden>
          ${switchTargets}
        </div>
      </div>
    </div>
  `;
}

function getSidebarCollapseButtonHtml() {
  const expanded = isSidebarExpanded();
  const label = expanded ? 'Collapse Sidebar' : 'Expand Sidebar';
  const icon = expanded ? 'left_panel_close' : 'left_panel_open';

  return `
    <button
      type="button"
      id="btn-sidebar-toggle"
      class="layout-sidebar-utility-btn"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
      aria-pressed="${expanded ? 'false' : 'true'}"
    >
      <span class="material-symbols-outlined">${icon}</span>
      <span class="layout-sidebar-utility-label">${escapeHtml(label)}</span>
    </button>
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
    syncZenUi(Boolean(event.detail?.enabled));
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
      if (targetScreen === zenScreenId) {
        closeZenMenu();
        return;
      }
      setZenModeEnabled(zenScreenId, true);
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
  const sidebarExpanded = isSidebarExpanded();
  const activeWorkspace = hasActiveWorkspace();
  const displayName = escapeHtml(userProfile?.name || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const sidebarLinks = [
    { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard', route: 'dashboard' },
    { id: 'new', icon: 'add_circle', label: 'New Form', route: 'new' },
    activeWorkspace ? { id: 'workspace', icon: 'description', label: 'Active Form', route: 'workspace' } : null,
    { id: 'history', icon: 'schedule', label: 'History', route: 'history' },
    { id: 'ai-chat', icon: 'chat_bubble', label: 'AI Chat', route: 'ai-chat' },
    { id: 'vault', icon: 'shield', label: 'Vault', route: 'vault' },
    { id: 'examples', icon: 'auto_stories', label: 'Examples', route: 'examples' },
  ].filter(Boolean);

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
    <div class="layout-shell ${options.shellClassName || ''} ${zenModeEnabled ? 'is-zen-mode' : ''} ${sidebarExpanded ? '' : SIDEBAR_COLLAPSED_CLASS}" data-zen-shell="${options.zenMode ? 'true' : 'false'}" data-zen-screen="${options.zenMode ? escapeHtml(zenScreenId) : ''}">
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
          <input type="text" class="layout-search-input" placeholder="Search pages, actions, or support" id="layout-search" autocomplete="off" />
          <button type="button" id="btn-layout-search-clear" class="layout-search-clear" aria-label="Clear search" hidden>
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="layout-search-results" id="layout-search-results" hidden>
            <div class="layout-search-results-list" id="layout-search-results-list"></div>
          </div>
        </div>

        <div class="layout-header-actions">
          ${isAuthenticated ? `
          <button class="layout-header-primary-action" id="btn-header-new-form" aria-label="New Form">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Form</span>
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
            
            <button id="nav-support" class="layout-sidebar-link" aria-label="Open Help Center">
              <span class="material-symbols-outlined layout-sidebar-icon">menu_book</span>
              <span class="layout-sidebar-label">Help Center</span>
            </button>
          </nav>
          
          <!-- Bottom Section: Account -->
          <div class="layout-sidebar-bottom">
            <div class="layout-sidebar-collapse-row">
              ${getSidebarCollapseButtonHtml()}
            </div>
            ${supportsZenOnPage ? `
              <div class="layout-sidebar-zen-row">
                ${getZenModeToggleHtml(zenScreenId, { label: 'Zen Mode', variant: 'minimal' })}
              </div>
            ` : ''}
            <div class="layout-sidebar-account-block">
              <div class="layout-sidebar-account-shell">
                <div class="layout-sidebar-account-row">
                <button id="nav-profile-sidebar" class="layout-sidebar-user" type="button" aria-label="Open account">
                  <div class="layout-sidebar-avatar-wrap">
                    <img src="${avatarSrc}" alt="Avatar" />
                    ${tier !== 'free' ? '<div class="layout-sidebar-pro-badge"><span class="material-symbols-outlined">bolt</span></div>' : ''}
                  </div>
                  <div class="layout-sidebar-user-info">
                    <span class="layout-sidebar-user-name">${displayName}</span>
                  </div>
                </button>
                <button id="btn-sidebar-settings" class="layout-sidebar-settings-inline" type="button" aria-label="Open preferences">
                  <span class="material-symbols-outlined layout-sidebar-icon">settings</span>
                </button>
                </div>
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
    { id: 'nav-vault', route: 'vault' },
    { id: 'nav-examples', route: 'examples' },
  ];

  links.forEach(link => {
    wrapper.querySelector(`#${link.id}`)?.addEventListener('click', () => {
      navigateTo(link.route);
    });
  });

  // Help Center → docs
  wrapper.querySelector('#nav-support')?.addEventListener('click', () => {
    navigateTo('docs');
  });

  // Logo → home
  wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => {
    navigateTo(getHomeScreenForUser());
  });

  wrapper.querySelector('#btn-header-new-form')?.addEventListener('click', () => {
    navigateTo('new');
  });

  const layoutShell = wrapper.querySelector('.layout-shell');
  const sidebarToggleBtn = wrapper.querySelector('#btn-sidebar-toggle');
  const syncSidebarUi = (expanded) => {
    layoutShell?.classList.toggle(SIDEBAR_COLLAPSED_CLASS, !expanded);

    if (!sidebarToggleBtn) return;

    const label = expanded ? 'Collapse Sidebar' : 'Expand Sidebar';
    const icon = expanded ? 'left_panel_close' : 'left_panel_open';
    sidebarToggleBtn.setAttribute('aria-label', label);
    sidebarToggleBtn.setAttribute('title', label);
    sidebarToggleBtn.setAttribute('aria-pressed', expanded ? 'false' : 'true');

    const iconEl = sidebarToggleBtn.querySelector('.material-symbols-outlined');
    if (iconEl) iconEl.textContent = icon;

    const labelEl = sidebarToggleBtn.querySelector('.layout-sidebar-utility-label');
    if (labelEl) labelEl.textContent = label;
  };
  const handleSidebarToggle = () => {
    const nextExpanded = !isSidebarExpanded();
    setState({ sidebarOpen: nextExpanded });
    syncSidebarUi(nextExpanded);
  };

  sidebarToggleBtn?.addEventListener('click', handleSidebarToggle);
  syncSidebarUi(isSidebarExpanded());

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

    searchResultsList.innerHTML = activeSearchResults.map((action, index) => `
      <button
        type="button"
        class="layout-search-result ${index === 0 ? 'is-active' : ''}"
        data-action-id="${escapeHtml(action.id)}"
      >
        <span class="material-symbols-outlined layout-search-result-icon">${escapeHtml(action.icon || 'arrow_forward')}</span>
        <span class="layout-search-result-copy">
          <span class="layout-search-result-title">${escapeHtml(action.title)}</span>
          <span class="layout-search-result-description">${escapeHtml(action.description || '')}</span>
        </span>
      </button>
    `).join('');

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

  wrapper.querySelector('#btn-sidebar-settings')?.addEventListener('click', () => {
    openAccountModal('settings');
  });

  // Login button
  wrapper.querySelector('#btn-login-header')?.addEventListener('click', () => {
    navigateTo('auth');
  });

  const zenMode = options.zenMode;
  if (!zenMode) {
    return () => {
      sidebarToggleBtn?.removeEventListener('click', handleSidebarToggle);
      document.removeEventListener('click', handleDocumentClick);
      document.body.classList.remove('fm-zen-mode');
    };
  }
  const cleanupZen = bindZenModeControls(wrapper, zenMode);
  return () => {
    sidebarToggleBtn?.removeEventListener('click', handleSidebarToggle);
    document.removeEventListener('click', handleDocumentClick);
    cleanupZen?.();
  };
}
