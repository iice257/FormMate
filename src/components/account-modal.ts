// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Account Modal Component
// ═══════════════════════════════════════════

import { getState, setState, updateProfile, updateSettings } from '../state';
import { signOut, deleteAccount } from '../auth/auth-service';
import { clearAll } from '../storage/local-store';
import { navigateTo } from '../router';
import { toast } from './toast';
import { escapeAttr, escapeHtml } from '../utils/escape';
import { logSettingsChanged } from '../storage/activity-logger';

let modalRoot = null;

function getAvatarSrc() {
  const { userProfile } = getState();
  return userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
}

/**
 * Initialize the modal — call once at boot.
 * Returns the opener function.
 */
export function initAccountModal() {
  modalRoot = document.createElement('div');
  modalRoot.id = 'account-modal-root';
  document.body.appendChild(modalRoot);

  return function openModal(tab = 'profile') {
    renderModal(tab);
  };
}

function renderModal(activeTab) {
  const { userProfile, settings, tier } = getState();
  const avatarSrc = getAvatarSrc();

  const tabs = [
    { id: 'profile', icon: 'person', label: 'Profile' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    { id: 'help', icon: 'help', label: 'Help' },
  ];

  const tabsHtml = tabs.map(t => `
    <button class="account-modal-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
      <span class="material-symbols-outlined">${t.icon}</span>
      ${t.label}
    </button>
  `).join('');

  modalRoot.innerHTML = `
    <div class="account-modal-overlay" id="account-modal-overlay">
      <div class="account-modal-container" style="position: relative;">
        <button class="account-modal-close" id="account-modal-close" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>

        <div class="account-modal-sidebar">
          <div class="account-modal-brand">
            <span class="material-symbols-outlined account-modal-brand-icon">auto_awesome</span>
            <span class="account-modal-brand-text">Form<span class="text-primary">Mate</span></span>
          </div>

          <div class="account-modal-tabs">
            ${tabsHtml}
          </div>

          <button class="account-modal-signout" id="account-modal-signout">
            <span class="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>

        <div class="account-modal-content" id="account-modal-content">
          ${renderTabContent(activeTab, userProfile, settings, tier, avatarSrc)}
        </div>
      </div>
    </div>
  `;

  // Wire events
  wireModalEvents(activeTab);
}

function renderTabContent(tab, userProfile, settings, tier, avatarSrc) {
  switch (tab) {
    case 'profile': return renderProfileTab(userProfile, avatarSrc);
    case 'settings': return renderSettingsTab(settings);
    case 'help': return renderHelpTab();
    default: return renderProfileTab(userProfile, avatarSrc);
  }
}

function renderProfileTab(userProfile, avatarSrc) {
  return `
    <h2 class="account-modal-title">Profile</h2>
    <p class="account-modal-subtitle">Manage your personal information and preferences.</p>

    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
      <img src="${avatarSrc}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--fm-border);" alt="Avatar" />
      <div>
        <button id="modal-change-avatar" style="padding: 0.4rem 1rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-full); background: #fff; font-size: 0.8rem; font-weight: 600; color: var(--fm-text); cursor: pointer;">Change Avatar</button>
        <p style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.35rem;">JPG, GIF or PNG. Max size 2MB.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--fm-text-secondary); margin-bottom: 0.4rem;">Full Name</label>
        <input id="modal-prof-name" type="text" value="${escapeAttr(userProfile.name || '')}" style="width: 100%; height: 40px; padding: 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; color: var(--fm-text); background: #fff;" />
      </div>
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--fm-text-secondary); margin-bottom: 0.4rem;">Email</label>
        <input id="modal-prof-email" type="email" value="${escapeAttr(userProfile.email || '')}" style="width: 100%; height: 40px; padding: 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; color: var(--fm-text); background: #fff;" />
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--fm-text-secondary); margin-bottom: 0.4rem;">Phone Number</label>
        <input id="modal-prof-phone" type="tel" value="${escapeAttr(userProfile.phone || '')}" style="width: 100%; height: 40px; padding: 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; color: var(--fm-text); background: #fff;" placeholder="+1 (555) 123-4567" />
      </div>
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--fm-text-secondary); margin-bottom: 0.4rem;">Occupation</label>
        <input id="modal-prof-occupation" type="text" value="${escapeAttr(userProfile.occupation || '')}" style="width: 100%; height: 40px; padding: 0 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; color: var(--fm-text); background: #fff;" />
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--fm-text-secondary); margin-bottom: 0.4rem;">Short Bio</label>
      <textarea id="modal-prof-bio" style="width: 100%; min-height: 90px; padding: 0.75rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); font-size: 0.85rem; color: var(--fm-text); background: #fff; resize: vertical; font-family: var(--fm-font-sans);" placeholder="Write a short introduction...">${escapeHtml(userProfile.bio || '')}</textarea>
      <p style="text-align: right; font-size: 0.7rem; color: #94a3b8; margin-top: 0.25rem;"><span id="modal-bio-count">${(userProfile.bio || '').length}</span>/150 characters</p>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
      <button id="modal-cancel" style="padding: 0.5rem 1.25rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); background: #fff; font-size: 0.85rem; font-weight: 500; color: var(--fm-text-secondary); cursor: pointer;">Cancel</button>
      <button id="modal-save-profile" style="padding: 0.5rem 1.25rem; border: none; border-radius: var(--fm-radius-md); background: var(--fm-primary-dark); font-size: 0.85rem; font-weight: 700; color: #fff; cursor: pointer;">Save Changes</button>
    </div>
  `;
}

function renderSettingsTab(settings) {
  const temp = settings?.ai?.temperature ?? 0.7;
  const verbosity = settings?.ai?.verbosity || 'balanced';

  return `
    <h2 class="account-modal-title">Settings</h2>
    <p class="account-modal-subtitle">Configure your application and AI preferences.</p>

    <section style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; font-weight: 900; color: var(--fm-text); margin-bottom: 0.25rem;">AI Behavior</h3>
      <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.25rem;">Control how the AI generates responses.</p>

      <div style="padding: 1.25rem; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); background: #fff;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--fm-text); margin-bottom: 0.75rem;">Temperature: <span id="modal-temp-val">${temp}</span></label>
        <input id="modal-set-temperature" type="range" min="0" max="1" step="0.1" value="${temp}" style="width: 100%; accent-color: var(--fm-primary);" />
        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #94a3b8; margin-top: 0.35rem;">
          <span>Precise</span><span>Creative</span>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--fm-text); margin-bottom: 0.6rem;">Verbosity</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;" id="modal-verbosity-group">
          ${['Concise', 'Balanced', 'Detailed'].map(v => {
      const val = v.toLowerCase();
      const isActive = val === verbosity;
      return `<button class="modal-verbosity-btn" data-value="${val}" style="padding: 0.55rem; border: 1px solid ${isActive ? 'var(--fm-primary)' : 'var(--fm-border)'}; border-radius: var(--fm-radius-md); background: ${isActive ? 'var(--fm-primary-50)' : '#fff'}; color: ${isActive ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'}; font-size: 0.825rem; font-weight: ${isActive ? '700' : '500'}; cursor: pointer; transition: all 0.15s;">${v}</button>`;
    }).join('')}
        </div>
      </div>
    </section>

    <section style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; font-weight: 900; color: var(--fm-text); margin-bottom: 0.25rem;">Appearance</h3>
      <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 1rem;">Customize the look and feel.</p>

      <div style="padding: 1.25rem; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); background: #fff; display: flex; flex-direction: column; gap: 1rem;">
        ${renderSettingsToggle('modal-set-compact', 'Compact Mode', 'Reduce spacing for denser layouts', settings?.ui?.compactMode)}
        ${renderSettingsToggle('modal-set-animations', 'Animations', 'Enable smooth transitions and effects', settings?.ui?.animationsEnabled !== false)}
      </div>
    </section>

    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
      <button id="modal-cancel" style="padding: 0.5rem 1.25rem; border: 1px solid var(--fm-border); border-radius: var(--fm-radius-md); background: #fff; font-size: 0.85rem; font-weight: 500; color: var(--fm-text-secondary); cursor: pointer;">Cancel</button>
      <button id="modal-save-settings" style="padding: 0.5rem 1.25rem; border: none; border-radius: var(--fm-radius-md); background: var(--fm-primary-dark); font-size: 0.85rem; font-weight: 700; color: #fff; cursor: pointer;">Save Changes</button>
    </div>
  `;
}

function renderSettingsToggle(id, label, description, checked) {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div style="font-size: 0.85rem; font-weight: 600; color: var(--fm-text);">${label}</div>
        ${description ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.15rem;">${description}</div>` : ''}
      </div>
      <label style="position: relative; width: 40px; height: 22px; cursor: pointer;">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" />
        <span style="position: absolute; inset: 0; border-radius: 11px; background: ${checked ? 'var(--fm-primary)' : '#cbd5e1'}; transition: background 0.2s;"></span>
        <span style="position: absolute; top: 2px; left: ${checked ? '20px' : '2px'}; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: left 0.2s;"></span>
      </label>
    </div>
  `;
}

function renderHelpTab() {
  return `
    <div style="padding: 1.5rem 2rem; border-radius: var(--fm-radius-xl); background: linear-gradient(135deg, var(--fm-primary), var(--fm-primary-light)); color: #fff; margin-bottom: 2rem; position: relative; overflow: hidden;">
      <div style="position: absolute; right: -30px; bottom: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>
      <h2 style="font-size: 1.4rem; font-weight: 900; margin-bottom: 0.4rem;">How can we help?</h2>
      <p style="font-size: 0.8rem; opacity: 0.9; line-height: 1.5; max-width: 320px;">Search our FAQs, check our extensive documentation, or contact support directly.</p>

      <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem; flex-wrap: wrap;">
        <button id="modal-help-docs" style="display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border: 1px solid rgba(255,255,255,0.3); border-radius: var(--fm-radius-full); background: rgba(255,255,255,0.15); color: #fff; font-size: 0.75rem; font-weight: 600; cursor: pointer; backdrop-filter: blur(4px);">
          <span class="material-symbols-outlined" style="font-size: 16px;">menu_book</span> View Documentation
        </button>
        <button id="modal-help-contact" style="display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border: 1px solid rgba(255,255,255,0.3); border-radius: var(--fm-radius-full); background: rgba(255,255,255,0.15); color: #fff; font-size: 0.75rem; font-weight: 600; cursor: pointer; backdrop-filter: blur(4px);">
          <span class="material-symbols-outlined" style="font-size: 16px;">mail</span> Contact Us
        </button>
        <button id="modal-help-feedback" style="display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border: 1px solid rgba(255,255,255,0.3); border-radius: var(--fm-radius-full); background: rgba(255,255,255,0.15); color: #fff; font-size: 0.75rem; font-weight: 600; cursor: pointer; backdrop-filter: blur(4px);">
          <span class="material-symbols-outlined" style="font-size: 16px;">rate_review</span> Review & Feedback
        </button>
      </div>
    </div>

    <h3 style="font-size: 1rem; font-weight: 800; color: var(--fm-text); margin-bottom: 1rem;">Frequently Asked Questions</h3>

    <div id="modal-faq-list" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem;">
      ${[
      { q: 'How does FormMate work?', a: 'FormMate analyzes web forms using AI to generate intelligent answers based on your stored profile data and preferences. Simply paste a form link and let the AI do the rest.' },
      { q: 'Is my data secure?', a: 'Yes. All data is stored locally in your browser by default. When you sign in, encrypted cloud sync is available. We never share your data with third parties.' },
      { q: 'Why did the AI answer a question wrong?', a: 'AI models can sometimes make mistakes. You can edit any answer manually, use the "Regenerate" button, or adjust the AI temperature in Settings for more precise results.' },
      { q: 'What is the "Vault"?', a: 'The Vault is your personal data store for frequently-used information like name, address, and credentials. FormMate uses this data to auto-fill form fields accurately.' },
    ].map((faq, i) => `
        <div class="modal-faq-item" style="border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-md); overflow: hidden;">
          <button class="modal-faq-toggle" data-faq="${i}" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: #fff; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--fm-text); text-align: left; font-family: var(--fm-font-sans);">
            ${faq.q}
            <span class="material-symbols-outlined" style="font-size: 20px; color: #94a3b8; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="modal-faq-answer" data-faq-answer="${i}" style="display: none; padding: 0 1rem 0.85rem; font-size: 0.8rem; color: #64748b; line-height: 1.6;">
            ${faq.a}
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); background: #fff;">
      <span class="material-symbols-outlined" style="font-size: 22px; color: var(--fm-primary);">update</span>
      <div style="flex: 1;">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">FormMate v0.9 (Beta Update)</div>
        <div style="font-size: 0.7rem; color: #94a3b8;">Up to date</div>
      </div>
      <a href="#" id="modal-help-changelog" style="font-size: 0.8rem; font-weight: 600; color: var(--fm-primary); text-decoration: none;">View Changelog</a>
    </div>
  `;
}

function wireModalEvents(activeTab) {
  const overlay = document.getElementById('account-modal-overlay');
  if (!overlay) return;

  // Close button
  document.getElementById('account-modal-close')?.addEventListener('click', closeModal);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Cancel button
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  // Tab switching
  overlay.querySelectorAll('.account-modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      renderModal(tab);
    });
  });

  // Sign Out
  document.getElementById('account-modal-signout')?.addEventListener('click', () => {
    signOut();
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

  // -- Profile tab events --
  if (activeTab === 'profile') {
    document.getElementById('modal-prof-bio')?.addEventListener('input', (e) => {
      const count = e.target.value.length;
      const counter = document.getElementById('modal-bio-count');
      if (counter) counter.textContent = count;
    });

    document.getElementById('modal-save-profile')?.addEventListener('click', () => {
      updateProfile({
        name: document.getElementById('modal-prof-name')?.value?.trim() || '',
        email: document.getElementById('modal-prof-email')?.value?.trim() || '',
        phone: document.getElementById('modal-prof-phone')?.value?.trim() || '',
        occupation: document.getElementById('modal-prof-occupation')?.value?.trim() || '',
        bio: document.getElementById('modal-prof-bio')?.value?.trim() || '',
      });
      toast.success('Profile saved!');
      closeModal();
    });
  }

  // -- Settings tab events --
  if (activeTab === 'settings') {
    const tempSlider = document.getElementById('modal-set-temperature');
    const tempVal = document.getElementById('modal-temp-val');
    tempSlider?.addEventListener('input', () => {
      tempVal.textContent = tempSlider.value;
    });

    document.querySelectorAll('.modal-verbosity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-verbosity-btn').forEach(b => {
          b.style.borderColor = 'var(--fm-border)';
          b.style.background = '#fff';
          b.style.color = 'var(--fm-text-secondary)';
          b.style.fontWeight = '500';
        });
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.color = 'var(--fm-primary)';
        btn.style.fontWeight = '700';
      });
    });

    // Toggle switches
    ['modal-set-compact', 'modal-set-animations'].forEach(id => {
      const checkbox = document.getElementById(id);
      const label = checkbox?.closest('label');
      if (label) {
        label.addEventListener('click', (e) => {
          if (e.target === checkbox) return;
          checkbox.checked = !checkbox.checked;
          const bg = label.querySelectorAll('span')[0];
          const dot = label.querySelectorAll('span')[1];
          if (bg) bg.style.background = checkbox.checked ? 'var(--fm-primary)' : '#cbd5e1';
          if (dot) dot.style.left = checkbox.checked ? '20px' : '2px';
        });
      }
    });

    document.getElementById('modal-save-settings')?.addEventListener('click', () => {
      const temp = parseFloat(document.getElementById('modal-set-temperature')?.value || 0.7);
      const verbosity = document.querySelector('.modal-verbosity-btn[style*="var(--fm-primary)"]')?.dataset?.value || 'balanced';
      const compact = document.getElementById('modal-set-compact')?.checked || false;
      const animations = document.getElementById('modal-set-animations')?.checked !== false;

      updateSettings('ai.temperature', temp);
      updateSettings('ai.verbosity', verbosity);
      updateSettings('ui.compactMode', compact);
      updateSettings('ui.animationsEnabled', animations);
      if (typeof logSettingsChanged === 'function') logSettingsChanged('ai');
      toast.success('Settings saved!');
      closeModal();
    });
  }

  // -- Help tab events --
  if (activeTab === 'help') {
    overlay.querySelectorAll('.modal-faq-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.faq;
        const answer = overlay.querySelector(`[data-faq-answer="${idx}"]`);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (answer) {
          const isOpen = answer.style.display !== 'none';
          answer.style.display = isOpen ? 'none' : 'block';
          if (icon) icon.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
        }
      });
    });

    document.getElementById('modal-help-docs')?.addEventListener('click', () => {
      closeModal();
      navigateTo('docs');
    });

    document.getElementById('modal-help-contact')?.addEventListener('click', () => {
      closeModal();
      navigateTo('docs');
    });

    document.getElementById('modal-help-feedback')?.addEventListener('click', () => {
      closeModal();
      navigateTo('docs');
    });
  }
}

function closeModal() {
  const overlay = document.getElementById('account-modal-overlay');
  if (overlay) {
    overlay.classList.add('closing');
    setTimeout(() => {
      if (modalRoot) modalRoot.innerHTML = '';
    }, 150);
  }
}
