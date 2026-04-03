// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Accounts Center
// ═══════════════════════════════════════════

import { getState, setState, updateProfile, updateVault, updateSettings } from '../state';
import { navigateTo, goBack } from '../router';
import { loadFormHistory, loadVault, clearAll } from '../storage/local-store';
import { signOut, deleteAccount } from '../auth/auth-service';
import { toast } from '../components/toast';
import { renderTabs, initTabs, renderEmptyState, renderToggle } from '../components/ui-components';
import { logSettingsChanged } from '../storage/activity-logger';

export function accountsScreen() {
  const { userProfile, vault, settings, tier = 'free' } = getState();
  const formHistory = loadFormHistory();

  const tones = ['professional', 'friendly', 'concise', 'creative', 'formal', 'casual'];

  const vaultEntries = Object.entries(vault);

  const html = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 border-r flex-col shrink-0 hidden lg:flex" style="border-color: var(--fm-border); background: var(--fm-bg-elevated);">
        <button type="button" class="p-6 flex items-center gap-3 cursor-pointer bg-transparent border-0 text-left" id="btn-accounts-home">
          <div class="size-8 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
          </div>
          <h1 class="text-xl font-black tracking-tighter" style="color: var(--fm-text);">Form<span class="text-primary">Mate</span></h1>
        </button>
        <nav class="flex-1 px-4 space-y-1">
          <button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="dashboard">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium cursor-pointer w-full text-left" style="background: var(--fm-primary-50); color: var(--fm-primary);" aria-current="page">
            <span class="material-symbols-outlined">person</span> Account
          </button>
          <button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" id="sidebar-nav-settings">
            <span class="material-symbols-outlined">settings</span> Preferences
          </button>
          <button type="button" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" style="color: var(--fm-text-secondary);" data-nav="docs">
            <span class="material-symbols-outlined">help_outline</span> Help
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto no-scrollbar" style="background: var(--fm-bg);">
        <!-- Header -->
        <header class="h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 glass" style="border-color: var(--fm-border);">
          <div class="flex-1 flex justify-start">
            <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
          </div>
          <div class="flex-1 flex justify-center items-center gap-2">
            <div class="size-8 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span></span>
          </div>
          <div class="flex-1 flex justify-end">
            <button id="btn-user-badge" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
              <img src="${userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
              <span class="truncate max-w-[100px]">${userProfile?.name?.split(' ')[0] || 'User'}</span>
              <span class="w-px h-4 bg-slate-300"></span>
              <span class="text-xs font-bold ${tier === 'free' ? 'text-slate-400' : 'text-primary'} uppercase tracking-tight">${tier === 'free' ? 'Free' : 'Pro'}</span>
            </button>
          </div>
        </header>

        <div class="max-w-3xl mx-auto p-8 space-y-8">
          <!-- Profile Header -->
          <div class="flex items-center gap-6 p-6 rounded-[var(--fm-card-radius)]" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
            <div class="size-20 rounded-[var(--fm-card-radius)] flex items-center justify-center text-3xl font-bold" style="background: var(--fm-gradient-primary); color: white;">
              ${(userProfile.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="flex-1">
            <h3 class="text-xl font-bold" style="color: var(--fm-text);">${escapeHtml(userProfile.name || 'User')}</h3>
            <p class="text-sm" style="color: var(--fm-text-tertiary);">${escapeHtml(userProfile.email || 'No email set')}</p>
            <p class="text-xs mt-1" style="color: var(--fm-text-tertiary);">${escapeHtml(userProfile.occupation || 'No occupation set')} • ${escapeHtml(userProfile.experience || 'N/A')} experience</p>
            </div>
          </div>

          <!-- Tabs -->
          ${renderTabs([
    { label: 'Profile', icon: 'person' },
    { label: 'Vault', icon: 'shield' },
    { label: 'History', icon: 'history' },
    { label: 'Style', icon: 'palette' },
    { label: 'Preferences', icon: 'settings' },
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
                      <div class="flex items-center gap-4 p-3 rounded-lg transition-colors" style="background: var(--fm-surface);">
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

            <!-- Settings Tab (hidden) -->
            <div id="tab-settings" class="hidden h-[650px] flex flex-row gap-6">
              
              <!-- Main Settings Content -->
              <div class="flex-1 overflow-y-auto no-scrollbar pr-4 space-y-8 pb-16">
                <!-- AI Behavior -->
                <section id="section-ai" class="settings-section space-y-5">
                  <div>
                    <h3 class="text-lg font-bold" style="color: var(--fm-text);">AI Behavior</h3>
                    <p class="text-xs" style="color: var(--fm-text-tertiary);">Control how the AI generates responses.</p>
                  </div>
                  <div class="p-5 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                    <div>
                      <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Temperature: <span id="temp-val">${settings?.ai?.temperature || 0.7}</span></label>
                      <input id="set-temperature" type="range" min="0" max="1" step="0.1" value="${settings?.ai?.temperature || 0.7}" class="w-full accent-[var(--fm-primary)]" />
                      <div class="flex justify-between text-[10px] mt-1" style="color: var(--fm-text-tertiary);"><span>Precise</span><span>Creative</span></div>
                    </div>
                    <div>
                      <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Verbosity</label>
                      <div class="grid grid-cols-3 gap-2">
                        ${['concise', 'balanced', 'detailed'].map(v => `
                          <button class="set-verbosity h-9 rounded-lg text-xs font-semibold capitalize btn-press" data-value="${v}"
                            style="border: 1px solid ${(settings?.ai?.verbosity || 'balanced') === v ? 'var(--fm-primary)' : 'var(--fm-border)'}; background: ${(settings?.ai?.verbosity || 'balanced') === v ? 'var(--fm-primary-50)' : ''}; color: ${(settings?.ai?.verbosity || 'balanced') === v ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'};">
                            ${v}
                          </button>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Appearance -->
                <section id="section-ui" class="settings-section space-y-5">
                  <div>
                    <h3 class="text-lg font-bold" style="color: var(--fm-text);">Appearance</h3>
                    <p class="text-xs" style="color: var(--fm-text-tertiary);">Customize the look and feel.</p>
                  </div>
                  <div class="p-5 rounded-xl space-y-4" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                    ${renderToggle('set-compact', { label: 'Compact Mode', description: 'Reduce spacing for denser layouts', checked: settings?.ui?.compactMode })}
                    ${renderToggle('set-animations', { label: 'Animations', description: 'Enable smooth transitions and effects', checked: settings?.ui?.animationsEnabled })}
                    ${renderToggle('set-sidebar', { label: 'Show Sidebar by Default', checked: settings?.ui?.sidebarDefault })}
                    ${renderToggle('set-chat-panel', { label: 'Show Chat Panel by Default', checked: settings?.ui?.chatPanelDefault })}
                  </div>
                </section>

                <!-- Account -->
                <section id="section-account" class="settings-section space-y-5">
                  <div>
                    <h3 class="text-lg font-bold" style="color: var(--fm-text);">Account Management</h3>
                  </div>
                  <div class="p-5 rounded-xl space-y-4" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
                    <button id="btn-signout" class="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-press" style="border: 1px solid var(--fm-border); color: var(--fm-text);">
                      <span class="material-symbols-outlined text-sm">logout</span> Sign Out
                    </button>
                    <button id="btn-delete-account" class="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-press" style="background: var(--fm-error-light); color: var(--fm-error);">
                      <span class="material-symbols-outlined text-sm">delete</span> Delete Account
                    </button>
                  </div>
                </section>

                <!-- Help Link in Settings -->
                <section class="p-6 rounded-xl text-center space-y-3" style="background: var(--fm-primary-50); border: 1px dashed var(--fm-primary-200);">
                   <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                     <span class="material-symbols-outlined">quiz</span>
                   </div>
                   <div>
                     <h4 class="font-bold text-sm" style="color: var(--fm-text);">Got more questions?</h4>
                     <p class="text-xs mt-1" style="color: var(--fm-text-tertiary);">Visit our Help Center for detailed guides and FAQs.</p>
                   </div>
                  <button id="btn-accounts-help" class="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all btn-press shadow-sm">
                    Visit Help Center
                  </button>
                </section>
              </div>

              <!-- Subtabs (Right Side) -->
              <aside class="w-48 shrink-0 flex flex-col border-l pl-4 overflow-y-auto no-scrollbar" style="border-color: var(--fm-border);">
                <nav id="settings-nav" class="space-y-1">
                  ${[
      { id: 'ai', icon: 'neurology', label: 'AI Behavior' },
      { id: 'ui', icon: 'palette', label: 'Appearance' },
      { id: 'account', icon: 'manage_accounts', label: 'Account' },
    ].map((item, i) => `
                    <button type="button" class="settings-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors w-full text-left" data-section="${item.id}"
                      style="${i === 0 ? 'background: var(--fm-primary-50); color: var(--fm-primary); font-weight: 600;' : 'color: var(--fm-text-secondary);'}">
                      <span class="material-symbols-outlined text-base">${item.icon}</span> <span class="text-xs">${item.label}</span>
                    </button>
                  `).join('')}
                </nav>
              </aside>

            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  function init(wrapper) {
    // Navigation
    wrapper.querySelector('#btn-back').addEventListener('click', () => goBack());

    wrapper.querySelector('#btn-accounts-home')?.addEventListener('click', () => navigateTo('dashboard'));
    wrapper.querySelectorAll('button[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
    });

    wrapper.querySelector('#btn-accounts-help')?.addEventListener('click', () => navigateTo('docs'));

    wrapper.querySelector('#sidebar-nav-settings')?.addEventListener('click', () => {
      const settingsTabBtn = wrapper.querySelector('[data-tab-index="4"]');
      if (settingsTabBtn) settingsTabBtn.click();
    });

    // Tabs
    const tabIds = ['tab-profile', 'tab-vault', 'tab-history', 'tab-style', 'tab-settings'];
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

    // --- Settings Tab Logic ---
    wrapper.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = `section-${item.dataset.section}`;
        const section = wrapper.querySelector(`#${sectionId}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        wrapper.querySelectorAll('.settings-nav-item').forEach(n => {
          n.style.background = '';
          n.style.color = 'var(--fm-text-secondary)';
          n.style.fontWeight = '';
        });
        item.style.background = 'var(--fm-primary-50)';
        item.style.color = 'var(--fm-primary)';
        item.style.fontWeight = '600';
      });
    });

    const tempSlider = wrapper.querySelector('#set-temperature');
    const tempVal = wrapper.querySelector('#temp-val');
    tempSlider?.addEventListener('input', () => {
      tempVal.textContent = tempSlider.value;
      updateSettings('ai.temperature', parseFloat(tempSlider.value));
      if (typeof logSettingsChanged === 'function') logSettingsChanged('ai');
    });

    wrapper.querySelectorAll('.set-verbosity').forEach(btn => {
      btn.addEventListener('click', () => {
        wrapper.querySelectorAll('.set-verbosity').forEach(b => {
          b.style.borderColor = 'var(--fm-border)';
          b.style.background = '';
          b.style.color = 'var(--fm-text-secondary)';
        });
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.color = 'var(--fm-primary)';
        updateSettings('ai.verbosity', btn.dataset.value);
        if (typeof logSettingsChanged === 'function') logSettingsChanged('ai');
      });
    });

    const toggleMap = {
      'set-compact': 'ui.compactMode',
      'set-animations': 'ui.animationsEnabled',
      'set-sidebar': 'ui.sidebarDefault',
      'set-chat-panel': 'ui.chatPanelDefault'
    };

    Object.entries(toggleMap).forEach(([id, path]) => {
      const el = wrapper.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', () => {
          updateSettings(path, el.checked);
          if (typeof logSettingsChanged === 'function') logSettingsChanged(path.split('.')[0]);
        });
      }
    });

    wrapper.querySelector('#btn-signout')?.addEventListener('click', () => {
      signOut();
      setState({
        isAuthenticated: false,
        authUser: null,
        tier: 'free',
        currentScreen: 'auth',
        userProfile: {
          name: '',
          email: '',
          phone: '',
          occupation: '',
          bio: '',
          experience: '',
          preferredTone: 'professional',
          avatar: ''
        }
      });
      toast.info('Signed out.');
      navigateTo('auth');
    });

    wrapper.querySelector('#btn-delete-account')?.addEventListener('click', async () => {
      if (confirm('This will permanently delete your account and all data. This action cannot be undone.')) {
        await deleteAccount();
        clearAll();
        setState({
          isAuthenticated: false,
          authUser: null,
          tier: 'free',
          currentScreen: 'auth',
          userProfile: {
            name: '',
            email: '',
            phone: '',
            occupation: '',
            bio: '',
            experience: '',
            preferredTone: 'professional',
            avatar: ''
          }
        });
        toast.warning('Account deleted.');
        navigateTo('auth');
      }
    });

    return () => { };
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
