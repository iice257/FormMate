// ═══════════════════════════════════════════
// FormMate — Accounts Center
// ═══════════════════════════════════════════

import { getState, setState, updateProfile, updateVault } from '../state.js';
import { navigateTo } from '../router.js';
import { loadFormHistory, saveVault, loadVault, saveProfile } from '../storage/local-store.js';
import { toast } from '../components/toast.js';
import { renderTabs, initTabs, renderEmptyState } from '../components/ui-components.js';

export function accountsScreen() {
  const { userProfile, vault } = getState();
  const formHistory = loadFormHistory();

  const tones = ['professional', 'friendly', 'concise', 'creative', 'formal', 'casual'];

  const vaultEntries = Object.entries(vault);

  const html = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 border-r flex-col shrink-0 hidden lg:flex" style="border-color: var(--fm-border); background: var(--fm-bg-elevated);">
        <div class="p-6 flex items-center gap-3">
          <div class="size-8 rounded-lg flex items-center justify-center text-white" style="background: var(--fm-primary);">
            <span class="material-symbols-outlined">auto_awesome</span>
          </div>
          <h1 class="text-xl font-bold tracking-tight" style="color: var(--fm-text);">FormMate</h1>
        </div>
        <nav class="flex-1 px-4 space-y-1">
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('landing')">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer" style="background: var(--fm-primary-50); color: var(--fm-primary);">
            <span class="material-symbols-outlined">person</span> Account
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('settings')">
            <span class="material-symbols-outlined">settings</span> Settings
          </a>
          <a class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" style="color: var(--fm-text-secondary);" onclick="window.__fmNav && window.__fmNav('help')">
            <span class="material-symbols-outlined">help_outline</span> Help
          </a>
        </nav>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto no-scrollbar" style="background: var(--fm-bg);">
        <!-- Header -->
        <header class="h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 glass" style="border-color: var(--fm-border);">
          <div class="flex items-center gap-3">
            <button id="btn-back" class="p-2 rounded-lg transition-colors" style="color: var(--fm-text-secondary);">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 class="text-lg font-bold" style="color: var(--fm-text);">Accounts Center</h2>
          </div>
        </header>

        <div class="max-w-3xl mx-auto p-8 space-y-8">
          <!-- Profile Header -->
          <div class="flex items-center gap-6 p-6 rounded-[var(--fm-card-radius)]" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
            <div class="size-20 rounded-[var(--fm-card-radius)] flex items-center justify-center text-3xl font-bold" style="background: var(--fm-gradient-primary); color: white;">
              ${(userProfile.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold" style="color: var(--fm-text);">${userProfile.name || 'User'}</h3>
              <p class="text-sm" style="color: var(--fm-text-tertiary);">${userProfile.email || 'No email set'}</p>
              <p class="text-xs mt-1" style="color: var(--fm-text-tertiary);">${userProfile.occupation || 'No occupation set'} • ${userProfile.experience || 'N/A'} experience</p>
            </div>
          </div>

          <!-- Tabs -->
          ${renderTabs([
    { label: 'Profile', icon: 'person' },
    { label: 'Vault', icon: 'shield' },
    { label: 'History', icon: 'history' },
    { label: 'Style', icon: 'palette' },
  ], { id: 'account-tabs' })}

          <!-- Tab Content -->
          <div id="tab-content">
            <!-- Profile Tab (default) -->
            <div id="tab-profile" class="space-y-4">
              <div class="p-6 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Full Name</label>
                    <input id="prof-name" type="text" value="${escapeAttr(userProfile.name)}" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" />
                  </div>
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                    <input id="prof-email" type="email" value="${escapeAttr(userProfile.email)}" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Phone</label>
                    <input id="prof-phone" type="tel" value="${escapeAttr(userProfile.phone)}" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" />
                  </div>
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Occupation</label>
                    <input id="prof-occupation" type="text" value="${escapeAttr(userProfile.occupation)}" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);" />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Bio</label>
                  <textarea id="prof-bio" class="w-full min-h-[80px] px-4 py-3 rounded-xl text-sm resize-none" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);">${escapeHtml(userProfile.bio || '')}</textarea>
                </div>
                <button id="btn-save-profile" class="h-10 px-6 rounded-xl text-sm font-bold text-white btn-press" style="background: var(--fm-gradient-primary);">Save Changes</button>
              </div>
            </div>

            <!-- Vault Tab (hidden) -->
            <div id="tab-vault" class="hidden space-y-4">
              <div class="p-6 rounded-xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="font-bold text-sm" style="color: var(--fm-text);">Stored Information</h4>
                    <p class="text-xs" style="color: var(--fm-text-tertiary);">Data used to auto-fill forms</p>
                  </div>
                  <button id="btn-add-vault" class="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 btn-press" style="background: var(--fm-primary-50); color: var(--fm-primary);">
                    <span class="material-symbols-outlined text-sm">add</span> Add Entry
                  </button>
                </div>
                <div id="vault-entries" class="space-y-2">
                  ${vaultEntries.length ? vaultEntries.map(([key, value]) => `
                    <div class="flex items-center gap-3 p-3 rounded-lg" style="background: var(--fm-surface);">
                      <span class="material-symbols-outlined text-sm" style="color: var(--fm-primary);">key</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold" style="color: var(--fm-text-secondary);">${escapeHtml(key)}</p>
                        <p class="text-sm truncate" style="color: var(--fm-text);">${escapeHtml(String(value))}</p>
                      </div>
                      <button class="vault-delete p-1 rounded hover:bg-red-50" data-key="${escapeAttr(key)}" style="color: var(--fm-text-tertiary);">
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  `).join('') : renderEmptyState({ icon: 'shield', title: 'Vault is empty', description: 'Add your frequently-used information for auto-fill.', actionText: 'Add first entry', actionId: 'btn-add-vault-2' })}
                </div>
              </div>
            </div>

            <!-- History Tab (hidden) -->
            <div id="tab-history" class="hidden space-y-4">
              <div class="p-6 rounded-xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                ${formHistory.length ? `
                  <div class="space-y-3">
                    ${formHistory.slice(0, 20).map(h => `
                      <div class="flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer" style="background: var(--fm-surface);">
                        <div class="size-10 rounded-lg flex items-center justify-center" style="background: var(--fm-primary-50); color: var(--fm-primary);">
                          <span class="material-symbols-outlined text-sm">description</span>
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-semibold" style="color: var(--fm-text);">${escapeHtml(h.title || 'Untitled Form')}</p>
                          <p class="text-xs" style="color: var(--fm-text-tertiary);">${h.questionCount || '?'} questions • ${new Date(h.timestamp).toLocaleDateString()}</p>
                        </div>
                        <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style="background: var(--fm-success-light); color: var(--fm-success);">Completed</span>
                      </div>
                    `).join('')}
                  </div>
                ` : renderEmptyState({ icon: 'history', title: 'No form history', description: 'Your completed forms will appear here.' })}
              </div>
            </div>

            <!-- Style Tab (hidden) -->
            <div id="tab-style" class="hidden space-y-4">
              <div class="p-6 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                <div>
                  <h4 class="font-bold text-sm mb-1" style="color: var(--fm-text);">Preferred Writing Tone</h4>
                  <p class="text-xs mb-3" style="color: var(--fm-text-tertiary);">This affects how AI generates answers.</p>
                  <div class="grid grid-cols-3 gap-2" id="style-tones">
                    ${tones.map(t => `
                      <button class="style-tone-btn h-10 rounded-xl text-xs font-semibold capitalize transition-all btn-press ${t === userProfile.preferredTone ? '' : ''}" data-tone="${t}"
                        style="border: 1px solid ${t === userProfile.preferredTone ? 'var(--fm-primary)' : 'var(--fm-border)'}; background: ${t === userProfile.preferredTone ? 'var(--fm-primary-50)' : ''}; color: ${t === userProfile.preferredTone ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'};">
                        ${t}
                      </button>
                    `).join('')}
                  </div>
                </div>
                <div>
                  <h4 class="font-bold text-sm mb-1" style="color: var(--fm-text);">Response Preview</h4>
                  <div class="p-4 rounded-lg text-sm leading-relaxed" style="background: var(--fm-surface); color: var(--fm-text-secondary); border: 1px solid var(--fm-border);" id="style-preview">
                    ${getStylePreview(userProfile.preferredTone)}
                  </div>
                </div>
                <button id="btn-save-style" class="h-10 px-6 rounded-xl text-sm font-bold text-white btn-press" style="background: var(--fm-gradient-primary);">Save Preference</button>
              </div>

              <!-- Data Export -->
              <div class="p-6 rounded-xl" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                <h4 class="font-bold text-sm mb-1" style="color: var(--fm-text);">Export Your Data</h4>
                <p class="text-xs mb-3" style="color: var(--fm-text-tertiary);">Download all your stored information as JSON.</p>
                <button id="btn-export" class="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 btn-press" style="border: 1px solid var(--fm-border); color: var(--fm-text);">
                  <span class="material-symbols-outlined text-sm">download</span> Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  function init(wrapper) {
    // Navigation
    window.__fmNav = (screen) => navigateTo(screen);
    wrapper.querySelector('#btn-back').addEventListener('click', () => navigateTo('landing'));

    // Tabs
    const tabIds = ['tab-profile', 'tab-vault', 'tab-history', 'tab-style'];
    initTabs(wrapper, 'account-tabs', (index) => {
      tabIds.forEach((id, i) => {
        wrapper.querySelector(`#${id}`).classList.toggle('hidden', i !== index);
      });
    });

    // Save profile
    wrapper.querySelector('#btn-save-profile').addEventListener('click', () => {
      updateProfile({
        name: wrapper.querySelector('#prof-name').value.trim(),
        email: wrapper.querySelector('#prof-email').value.trim(),
        phone: wrapper.querySelector('#prof-phone').value.trim(),
        occupation: wrapper.querySelector('#prof-occupation').value.trim(),
        bio: wrapper.querySelector('#prof-bio').value.trim(),
      });
      toast.success('Profile saved!');
    });

    // Vault delete
    wrapper.querySelectorAll('.vault-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const v = { ...getState().vault };
        delete v[key];
        setState({ vault: v });
        saveVault(v);
        btn.closest('div').remove();
        toast.info(`"${key}" removed from vault.`);
      });
    });

    // Add vault entry
    const addVault = () => {
      const key = prompt('Entry name (e.g., "Full Name", "Company"):');
      if (!key) return;
      const value = prompt(`Value for "${key}":`);
      if (value === null) return;
      updateVault(key, value);
      toast.success(`"${key}" added to vault.`);
      navigateTo('accounts'); // Refresh
    };
    wrapper.querySelector('#btn-add-vault')?.addEventListener('click', addVault);
    wrapper.querySelector('#btn-add-vault-2')?.addEventListener('click', addVault);

    // Style tone selection
    let selectedTone = getState().userProfile.preferredTone || 'professional';
    wrapper.querySelectorAll('.style-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTone = btn.dataset.tone;
        wrapper.querySelectorAll('.style-tone-btn').forEach(b => {
          b.style.borderColor = 'var(--fm-border)';
          b.style.background = '';
          b.style.color = 'var(--fm-text-secondary)';
        });
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.color = 'var(--fm-primary)';
        wrapper.querySelector('#style-preview').textContent = getStylePreview(selectedTone);
      });
    });

    wrapper.querySelector('#btn-save-style')?.addEventListener('click', () => {
      updateProfile({ preferredTone: selectedTone });
      setState({ personality: selectedTone });
      toast.success('Writing style saved!');
    });

    // Export
    wrapper.querySelector('#btn-export')?.addEventListener('click', () => {
      const data = {
        profile: getState().userProfile,
        vault: getState().vault,
        settings: getState().settings,
        formHistory: loadFormHistory(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formmate-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    });

    return () => { delete window.__fmNav; };
  }

  return { html, init };
}

function getStylePreview(tone) {
  const previews = {
    professional: 'I bring 5+ years of design experience with a proven track record in enterprise product development and cross-functional team leadership.',
    friendly: 'Hey! I\'ve been designing products for over 5 years now and absolutely love collaborating with teams to create great user experiences! 😊',
    concise: '5+ years design experience. Enterprise products. Team leadership.',
    creative: 'Picture this: half a decade of crafting digital experiences that don\'t just look good—they transform how people work and connect.',
    formal: 'I possess over five years of professional experience in product design, with particular expertise in enterprise application development.',
    casual: 'So I\'ve been doing design stuff for like 5 years, mostly working on big enterprise apps and leading design teams.',
  };
  return previews[tone] || previews.professional;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
