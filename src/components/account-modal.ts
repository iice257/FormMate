// @ts-nocheck
import { getState, setState, updateProfile, updateSettings } from '../state';
import { signOut } from '../auth/auth-service';
import { navigateTo } from '../router';
import { toast } from './toast';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { logSettingsChanged } from '../storage/activity-logger';
import { isZenModeEnabled, isZenModeSupported, updateZenMode } from './layout';
import { applyTheme, normalizeTheme } from '../theme';

let modalRoot = null;
let activeTab = 'profile';
let escapeHandler = null;

function getAvatarSrc() {
  const { userProfile } = getState();
  return userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
}

export function initAccountModal() {
  modalRoot = document.createElement('div');
  modalRoot.id = 'account-modal-root';
  document.body.appendChild(modalRoot);

  return function openModal(tab = 'profile') {
    activeTab = tab;
    renderModal();
  };
}

function renderModal() {
  if (!modalRoot) return;

  const { userProfile } = getState();
  const avatarSrc = getAvatarSrc();
  const tabs = [
    { id: 'profile', icon: 'person', label: 'Profile' },
    { id: 'settings', icon: 'settings', label: 'Preferences' },
    { id: 'help', icon: 'help', label: 'Help' },
  ];

  modalRoot.innerHTML = `
    <div class="account-modal-overlay" id="account-modal-overlay">
      <div class="account-modal-container">
        <button class="account-modal-close" id="account-modal-close" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>

        <aside class="account-modal-sidebar">
          <div class="account-modal-brand">
            <span class="material-symbols-outlined account-modal-brand-icon">auto_awesome</span>
            <span class="account-modal-brand-text">Form<span class="text-primary">Mate</span></span>
          </div>

          <div style="display:flex; align-items:center; gap:0.9rem; margin:0 1rem 1.35rem; padding:0.9rem 1rem; border:1px solid var(--fm-border-light); border-radius:1.15rem; background:rgba(255,255,255,0.78); overflow:hidden;">
            <img src="${avatarSrc}" alt="Avatar" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1px solid var(--fm-border-light);" />
            <div style="min-width:0;">
              <div style="font-size:0.9rem; font-weight:800; color:var(--fm-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(userProfile?.name || 'User')}</div>
              <div style="font-size:0.73rem; color:#94a3b8; margin-top:0.12rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(userProfile?.email || 'Signed in account')}</div>
            </div>
          </div>

          <nav class="account-modal-tabs" id="account-modal-tabs">
            ${tabs.map((tab) => `
              <button class="account-modal-tab ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}" type="button">
                <span class="material-symbols-outlined">${tab.icon}</span>
                <span>${tab.label}</span>
              </button>
            `).join('')}
          </nav>

          <button class="account-modal-vault-bar" id="account-modal-open-vault" type="button">
            <span class="account-modal-vault-bar-label">
              <span class="material-symbols-outlined">inventory_2</span>
              <span>Vault</span>
            </span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>

          <button class="account-modal-signout" id="account-modal-signout" type="button">
            <span class="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </aside>

        <section class="account-modal-content" id="account-modal-content"></section>
      </div>
    </div>
  `;

  renderActiveTab();
  wireModalShellEvents();
}

function renderActiveTab() {
  const content = document.getElementById('account-modal-content');
  if (!content) return;

  const { userProfile, settings } = getState();
  const avatarSrc = getAvatarSrc();

  if (activeTab === 'profile') {
    content.innerHTML = renderProfileTab(userProfile, avatarSrc);
    wireProfileEvents();
    return;
  }

  if (activeTab === 'settings') {
    content.innerHTML = renderSettingsTab(settings);
    wireSettingsEvents();
    return;
  }

  content.innerHTML = renderHelpTab();
  wireHelpEvents();
}

function renderProfileTab(userProfile, avatarSrc) {
  return `
    <div style="display:flex; flex-direction:column; gap:1.1rem;">
      <div>
        <h2 class="account-modal-title">Profile</h2>
        <p class="account-modal-subtitle" style="margin-bottom:1.15rem;">Manage the information that follows your signed-in account.</p>
      </div>

      <div style="display:flex; align-items:center; gap:1rem; padding:0.9rem 1rem; border:1px solid var(--fm-border-light); border-radius:1rem; background:rgba(248,250,252,0.82);">
        <img src="${avatarSrc}" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.9);" alt="Avatar" />
        <div>
          <div style="font-size:0.92rem; font-weight:700; color:var(--fm-text);">Account avatar</div>
          <p style="font-size:0.74rem; color:#94a3b8; margin-top:0.2rem;">Avatar changes follow your current account profile data.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--fm-text-secondary); margin-bottom:0.45rem;">Full Name</label>
          <input id="modal-prof-name" type="text" value="${escapeAttr(userProfile?.name || '')}" style="width:100%; height:42px; padding:0 0.85rem; border:1px solid var(--fm-border); border-radius:0.85rem; font-size:0.85rem; color:var(--fm-text); background:#fff;" />
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--fm-text-secondary); margin-bottom:0.45rem;">Email</label>
          <input id="modal-prof-email" type="email" value="${escapeAttr(userProfile?.email || '')}" style="width:100%; height:42px; padding:0 0.85rem; border:1px solid var(--fm-border); border-radius:0.85rem; font-size:0.85rem; color:var(--fm-text); background:#fff;" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--fm-text-secondary); margin-bottom:0.45rem;">Phone Number</label>
          <input id="modal-prof-phone" type="tel" value="${escapeAttr(userProfile?.phone || '')}" style="width:100%; height:42px; padding:0 0.85rem; border:1px solid var(--fm-border); border-radius:0.85rem; font-size:0.85rem; color:var(--fm-text); background:#fff;" placeholder="+1 (555) 123-4567" />
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--fm-text-secondary); margin-bottom:0.45rem;">Occupation</label>
          <input id="modal-prof-occupation" type="text" value="${escapeAttr(userProfile?.occupation || '')}" style="width:100%; height:42px; padding:0 0.85rem; border:1px solid var(--fm-border); border-radius:0.85rem; font-size:0.85rem; color:var(--fm-text); background:#fff;" />
        </div>
      </div>

      <div>
        <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--fm-text-secondary); margin-bottom:0.45rem;">Short Bio</label>
        <textarea id="modal-prof-bio" style="width:100%; min-height:112px; padding:0.9rem; border:1px solid var(--fm-border); border-radius:1rem; font-size:0.85rem; color:var(--fm-text); background:#fff; resize:vertical; font-family:var(--fm-font-sans);" placeholder="Write a short introduction...">${escapeHtml(userProfile?.bio || '')}</textarea>
        <p style="text-align:right; font-size:0.7rem; color:#94a3b8; margin-top:0.3rem;"><span id="modal-bio-count">${(userProfile?.bio || '').length}</span>/150 characters</p>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button id="modal-cancel" type="button" style="padding:0.58rem 1.25rem; border:1px solid var(--fm-border); border-radius:0.85rem; background:#fff; font-size:0.85rem; font-weight:600; color:var(--fm-text-secondary); cursor:pointer;">Cancel</button>
        <button id="modal-save-profile" type="button" style="padding:0.58rem 1.25rem; border:none; border-radius:0.85rem; background:var(--fm-primary-dark); font-size:0.85rem; font-weight:700; color:#fff; cursor:pointer;">Save Profile</button>
      </div>
    </div>
  `;
}

function renderSettingsTab(settings) {
  const temp = settings?.ai?.temperature ?? 0.7;
  const verbosity = settings?.ai?.verbosity || 'balanced';
  const personality = settings?.ai?.defaultPersonality || 'professional';
  const theme = normalizeTheme(settings?.ui?.theme);
  const currentScreen = getState().currentScreen;
  const zenSupported = isZenModeSupported(currentScreen);
  const zenEnabled = zenSupported ? isZenModeEnabled(currentScreen) : false;

  return `
    <div style="display:flex; flex-direction:column; gap:1.1rem;">
      <div>
        <h2 class="account-modal-title">Preferences</h2>
        <p class="account-modal-subtitle" style="margin-bottom:1.15rem;">These preferences are saved against your signed-in account when remote storage is configured.</p>
      </div>

      <section style="display:flex; flex-direction:column; gap:0.9rem; padding:1rem 1.05rem; border:1px solid var(--fm-border-light); border-radius:1rem; background:#fff;">
        <div>
          <h3 style="font-size:1rem; font-weight:800; color:var(--fm-text); margin-bottom:0.2rem;">AI Behavior</h3>
          <p style="font-size:0.77rem; color:#64748b;">Control how responses are generated.</p>
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--fm-text); margin-bottom:0.75rem;">Creativity: <span id="modal-temp-val">${temp}</span></label>
          <input id="modal-set-temperature" type="range" min="0" max="1" step="0.1" value="${temp}" style="width:100%; accent-color:var(--fm-primary);" />
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#94a3b8; margin-top:0.35rem;">
            <span>Precise</span><span>Creative</span>
          </div>
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--fm-text); margin-bottom:0.6rem;">Verbosity</label>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;" id="modal-verbosity-group">
            ${['concise', 'balanced', 'detailed'].map((value) => {
              const active = value === verbosity;
              const label = value.charAt(0).toUpperCase() + value.slice(1);
              return `<button class="modal-verbosity-btn ${active ? 'is-active' : ''}" data-value="${value}" type="button" style="padding:0.6rem; border:1px solid ${active ? 'var(--fm-primary)' : 'var(--fm-border)'}; border-radius:0.85rem; background:${active ? 'var(--fm-primary-50)' : '#fff'}; color:${active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'}; font-size:0.82rem; font-weight:${active ? '700' : '500'}; cursor:pointer;">${label}</button>`;
            }).join('')}
          </div>
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--fm-text); margin-bottom:0.6rem;">Personality</label>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.5rem;" id="modal-personality-group">
            ${[
              ['professional', 'Professional'],
              ['friendly', 'Friendly'],
              ['confident', 'Confident'],
              ['concise', 'Concise'],
            ].map(([value, label]) => {
              const active = value === personality;
              return `<button class="modal-personality-btn ${active ? 'is-active' : ''}" data-value="${value}" type="button" style="padding:0.6rem 0.5rem; border:1px solid ${active ? 'var(--fm-primary)' : 'var(--fm-border)'}; border-radius:0.85rem; background:${active ? 'var(--fm-primary-50)' : '#fff'}; color:${active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'}; font-size:0.78rem; font-weight:${active ? '700' : '600'}; cursor:pointer;">${label}</button>`;
            }).join('')}
          </div>
        </div>
      </section>

      <section style="display:flex; flex-direction:column; gap:0.9rem; padding:1rem 1.05rem; border:1px solid var(--fm-border-light); border-radius:1rem; background:#fff;">
        <div>
          <h3 style="font-size:1rem; font-weight:800; color:var(--fm-text); margin-bottom:0.2rem;">Theme</h3>
          <p style="font-size:0.77rem; color:#64748b;">Pick a single app theme. Light stays the default.</p>
        </div>
        <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0.6rem;" id="modal-theme-group">
          ${['light', 'dark'].map((value) => {
            const active = value === theme;
            const label = value.charAt(0).toUpperCase() + value.slice(1);
            const icon = value === 'light' ? 'light_mode' : 'dark_mode';
            return `
              <button
                class="modal-theme-btn ${active ? 'is-active' : ''}"
                data-theme="${value}"
                type="button"
                style="display:flex; align-items:center; justify-content:center; gap:0.45rem; min-height:44px; padding:0.72rem 0.9rem; border:1px solid ${active ? 'var(--fm-primary)' : 'var(--fm-border)'}; border-radius:0.9rem; background:${active ? 'var(--fm-primary-50)' : '#fff'}; color:${active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'}; font-size:0.82rem; font-weight:${active ? '700' : '600'}; cursor:pointer;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">${icon}</span>
                <span>${label}</span>
              </button>
            `;
          }).join('')}
        </div>
      </section>

      <section style="display:flex; flex-direction:column; gap:0.8rem; padding:1rem 1.05rem; border:1px solid var(--fm-border-light); border-radius:1rem; background:#fff; ${zenSupported ? '' : 'opacity:0.65;'}">
        ${renderToggleRow('modal-set-zen', 'Zen Mode', zenSupported ? `Focus the current ${escapeHtml(currentScreen)} screen.` : 'Available on AI Chat, New Form, History, and Active Form only.', zenEnabled, !zenSupported)}
      </section>

      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button id="modal-cancel" type="button" style="padding:0.58rem 1.25rem; border:1px solid var(--fm-border); border-radius:0.85rem; background:#fff; font-size:0.85rem; font-weight:600; color:var(--fm-text-secondary); cursor:pointer;">Cancel</button>
        <button id="modal-save-settings" type="button" style="padding:0.58rem 1.25rem; border:none; border-radius:0.85rem; background:var(--fm-primary-dark); font-size:0.85rem; font-weight:700; color:#fff; cursor:pointer;">Save Preferences</button>
      </div>
    </div>
  `;
}

function renderToggleRow(id, label, description, checked, disabled = false) {
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
      <div>
        <div style="font-size:0.85rem; font-weight:700; color:var(--fm-text);">${label}</div>
        <div style="font-size:0.72rem; color:#94a3b8; margin-top:0.15rem;">${description}</div>
      </div>
      <label style="position:relative; width:42px; height:24px; cursor:${disabled ? 'not-allowed' : 'pointer'};">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="opacity:0; width:0; height:0;" />
        <span style="position:absolute; inset:0; border-radius:999px; background:${checked ? 'var(--fm-primary)' : '#cbd5e1'}; transition:background-color 120ms ease;"></span>
        <span style="position:absolute; top:2px; left:${checked ? '20px' : '2px'}; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.18); transition:left 120ms ease;"></span>
      </label>
    </div>
  `;
}

function renderHelpTab() {
  return `
    <div style="display:flex; flex-direction:column; gap:1.2rem;">
      <div style="padding:1.4rem 1.5rem; border-radius:1.1rem; background:linear-gradient(135deg, var(--fm-primary), var(--fm-primary-light)); color:#fff; position:relative; overflow:hidden;">
        <div style="position:absolute; right:-24px; bottom:-24px; width:108px; height:108px; border-radius:50%; background:rgba(255,255,255,0.12);"></div>
        <h2 style="font-size:1.35rem; font-weight:900; margin-bottom:0.35rem;">How can we help?</h2>
        <p style="font-size:0.8rem; opacity:0.92; line-height:1.5; max-width:340px;">Use the docs, jump to contact, or open the feedback section without leaving this account center.</p>
        <div style="display:flex; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
          <button id="modal-help-docs" type="button" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:rgba(255,255,255,0.15); color:#fff; font-size:0.75rem; font-weight:700; cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:16px;">menu_book</span> Docs
          </button>
          <button id="modal-help-contact" type="button" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:rgba(255,255,255,0.15); color:#fff; font-size:0.75rem; font-weight:700; cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:16px;">mail</span> Contact
          </button>
          <button id="modal-help-feedback" type="button" style="display:flex; align-items:center; gap:0.35rem; padding:0.45rem 0.85rem; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:rgba(255,255,255,0.15); color:#fff; font-size:0.75rem; font-weight:700; cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:16px;">rate_review</span> Feedback
          </button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        <h3 style="font-size:1rem; font-weight:800; color:var(--fm-text);">Frequently Asked Questions</h3>
        ${[
          { q: 'How does FormMate work?', a: 'FormMate analyzes forms, maps fields, and helps you review answers based on your account data and current workspace context.' },
          { q: 'Is my data secure?', a: 'When Supabase is configured, authenticated accounts can sync profile, preferences, vault data, and history to the configured backend. Otherwise the app falls back to local browser storage.' },
          { q: 'Why did the AI answer a question wrong?', a: 'AI can still miss context. Review, edit, or regenerate answers, and tune Preferences for more precise output.' },
          { q: 'Where do I update my profile and preferences?', a: 'Right here. Profile, Preferences, and Help all live inside this single account modal.' },
        ].map((faq, index) => `
          <div class="modal-faq-item" style="border:1px solid var(--fm-border-light); border-radius:0.95rem; overflow:hidden; background:#fff;">
            <button class="modal-faq-toggle" data-faq="${index}" type="button" style="width:100%; display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1rem; background:#fff; border:none; cursor:pointer; font-size:0.84rem; font-weight:700; color:var(--fm-text); text-align:left;">
              <span>${faq.q}</span>
              <span class="material-symbols-outlined" style="font-size:20px; color:#94a3b8; transition:transform 120ms ease;">expand_more</span>
            </button>
            <div class="modal-faq-answer" data-faq-answer="${index}" style="display:none; padding:0 1rem 0.95rem; font-size:0.78rem; color:#64748b; line-height:1.6;">
              ${faq.a}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="padding-top:0.15rem; font-size:0.72rem; font-weight:700; letter-spacing:0.04em; color:#94a3b8;">
        Version 0.6.35
      </div>
    </div>
  `;
}

function wireModalShellEvents() {
  const overlay = document.getElementById('account-modal-overlay');
  if (!overlay) return;

  document.getElementById('account-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });

  overlay.querySelectorAll('.account-modal-tab').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab || 'profile';
      overlay.querySelectorAll('.account-modal-tab').forEach((tabButton) => {
        tabButton.classList.toggle('active', tabButton === button);
      });
      renderActiveTab();
    });
  });

  document.getElementById('account-modal-open-vault')?.addEventListener('click', () => {
    closeModal();
    navigateTo('vault');
  });

  document.getElementById('account-modal-signout')?.addEventListener('click', async () => {
    await signOut();
    setState({
      isAuthenticated: false,
      authUser: null,
      tier: 'free',
      currentScreen: 'auth',
      userProfile: { name: '', email: '', phone: '', occupation: '', bio: '', experience: '', preferredTone: 'professional', avatar: '' }
    });
    closeModal();
    toast.info('Signed out.');
    navigateTo('auth');
  });

  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
  }
  escapeHandler = (event) => {
    if (event.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escapeHandler);
}

function wireProfileEvents() {
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-prof-bio')?.addEventListener('input', (event) => {
    const counter = document.getElementById('modal-bio-count');
    if (counter) counter.textContent = String(event.target.value.length);
  });

  document.getElementById('modal-save-profile')?.addEventListener('click', () => {
    updateProfile({
      name: document.getElementById('modal-prof-name')?.value?.trim() || '',
      email: document.getElementById('modal-prof-email')?.value?.trim() || '',
      phone: document.getElementById('modal-prof-phone')?.value?.trim() || '',
      occupation: document.getElementById('modal-prof-occupation')?.value?.trim() || '',
      bio: document.getElementById('modal-prof-bio')?.value?.trim() || '',
    });
    toast.success('Profile saved to this account.');
    closeModal();
  });
}

function wireSettingsEvents() {
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  const tempSlider = document.getElementById('modal-set-temperature');
  const tempVal = document.getElementById('modal-temp-val');
  tempSlider?.addEventListener('input', () => {
    if (tempVal) tempVal.textContent = tempSlider.value;
  });

  document.querySelectorAll('.modal-verbosity-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.modal-verbosity-btn').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.style.borderColor = active ? 'var(--fm-primary)' : 'var(--fm-border)';
        candidate.style.background = active ? 'var(--fm-primary-50)' : '#fff';
        candidate.style.color = active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)';
        candidate.style.fontWeight = active ? '700' : '500';
      });
    });
  });

  document.querySelectorAll('.modal-personality-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.modal-personality-btn').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.style.borderColor = active ? 'var(--fm-primary)' : 'var(--fm-border)';
        candidate.style.background = active ? 'var(--fm-primary-50)' : '#fff';
        candidate.style.color = active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)';
        candidate.style.fontWeight = active ? '700' : '600';
      });
    });
  });

  ['modal-set-zen'].forEach((id) => {
    const checkbox = document.getElementById(id);
    const label = checkbox?.closest('label');
    if (!checkbox || !label || checkbox.disabled) return;
    label.addEventListener('click', (event) => {
      if (event.target === checkbox) return;
      event.preventDefault();
      checkbox.checked = !checkbox.checked;
      syncToggle(label, checkbox.checked, id === 'modal-set-zen' ? 20 : 20);
      if (id === 'modal-set-zen') {
        updateZenMode(getState().currentScreen, checkbox.checked);
      }
    });
    checkbox.addEventListener('change', () => {
      syncToggle(label, checkbox.checked, id === 'modal-set-zen' ? 20 : 20);
      if (id === 'modal-set-zen') {
        updateZenMode(getState().currentScreen, checkbox.checked);
      }
    });
  });

  document.querySelectorAll('.modal-theme-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.modal-theme-btn').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.style.borderColor = active ? 'var(--fm-primary)' : 'var(--fm-border)';
        candidate.style.background = active ? 'var(--fm-primary-50)' : '#fff';
        candidate.style.color = active ? 'var(--fm-primary)' : 'var(--fm-text-secondary)';
        candidate.style.fontWeight = active ? '700' : '600';
      });

      const nextTheme = button.dataset.theme || 'light';
      updateSettings('ui.theme', nextTheme);
      applyTheme(nextTheme);
    });
  });

  document.getElementById('modal-save-settings')?.addEventListener('click', () => {
    const temp = parseFloat(document.getElementById('modal-set-temperature')?.value || '0.7');
    const verbosity = document.querySelector('.modal-verbosity-btn.is-active')?.dataset?.value || 'balanced';
    const personality = document.querySelector('.modal-personality-btn.is-active')?.dataset?.value || 'professional';
    updateSettings('ai.temperature', temp);
    updateSettings('ai.verbosity', verbosity);
    updateSettings('ai.defaultPersonality', personality);
    if (typeof logSettingsChanged === 'function') logSettingsChanged('ai');
    toast.success('Preferences saved to this account.');
    closeModal();
  });
}

function wireHelpEvents() {
  document.getElementById('modal-help-docs')?.addEventListener('click', () => {
    closeModal();
    navigateTo('docs');
  });
  document.getElementById('modal-help-contact')?.addEventListener('click', () => {
    closeModal();
    navigateTo('docs');
    setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 250);
  });
  document.getElementById('modal-help-feedback')?.addEventListener('click', () => {
    closeModal();
    navigateTo('docs');
    setTimeout(() => document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' }), 250);
  });
  document.querySelectorAll('.modal-faq-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.faq;
      const answer = document.querySelector(`[data-faq-answer="${id}"]`);
      const icon = button.querySelector('.material-symbols-outlined');
      const open = answer?.style.display !== 'none';
      if (answer) answer.style.display = open ? 'none' : 'block';
      if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  });
}

function syncToggle(label, checked) {
  const spans = label.querySelectorAll('span');
  if (spans[0]) spans[0].style.background = checked ? 'var(--fm-primary)' : '#cbd5e1';
  if (spans[1]) spans[1].style.left = checked ? '20px' : '2px';
}

function closeModal() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
}
