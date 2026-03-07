// ═══════════════════════════════════════════
// FormMate — Settings Center
// ═══════════════════════════════════════════

import { getState, setState, updateSettings, getSetting } from '../state.js';
import { navigateTo } from '../router.js';
import { clearAll, getDefaultSettings } from '../storage/local-store.js';
import { signOut, deleteAccount } from '../auth/auth-service.js';
import { toast } from '../components/toast.js';
import { renderToggle } from '../components/ui-components.js';
import { MODELS, TASK_ROUTES } from '../ai/ai-service.js';
import { logSettingsChanged } from '../storage/activity-logger.js';

export function settingsScreen() {
  const { settings } = getState();

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
        <nav id="settings-nav" class="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          ${[
      { id: 'ai', icon: 'neurology', label: 'AI Behavior' },
      { id: 'ui', icon: 'palette', label: 'Appearance' },
      { id: 'personal', icon: 'tune', label: 'Personalization' },
      { id: 'notif', icon: 'notifications', label: 'Notifications' },
      { id: 'privacy', icon: 'security', label: 'Privacy' },
      { id: 'models', icon: 'memory', label: 'AI Models' },
      { id: 'format', icon: 'format_align_left', label: 'Formatting' },
      { id: 'shortcuts', icon: 'keyboard', label: 'Shortcuts' },
      { id: 'account', icon: 'manage_accounts', label: 'Account' },
    ].map((item, i) => `
            <a class="settings-nav-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors" data-section="${item.id}"
              style="${i === 0 ? 'background: var(--fm-primary-50); color: var(--fm-primary); font-weight: 600;' : 'color: var(--fm-text-secondary);'}">
              <span class="material-symbols-outlined text-lg">${item.icon}</span> ${item.label}
            </a>
          `).join('')}
        </nav>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto no-scrollbar" style="background: var(--fm-bg);">
        <header class="h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 glass" style="border-color: var(--fm-border);">
          <div class="flex items-center gap-3">
            <button id="btn-back" class="p-2 rounded-lg transition-colors" style="color: var(--fm-text-secondary);">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 class="text-lg font-bold" style="color: var(--fm-text);">Settings</h2>
          </div>
        </header>

        <div class="max-w-2xl mx-auto p-8 space-y-8">

          <!-- AI Behavior -->
          <section id="section-ai" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">AI Behavior</h3>
              <p class="text-xs" style="color: var(--fm-text-tertiary);">Control how the AI generates responses.</p>
            </div>
            <div class="p-5 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div>
                <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Temperature: <span id="temp-val">${settings.ai.temperature}</span></label>
                <input id="set-temperature" type="range" min="0" max="1" step="0.1" value="${settings.ai.temperature}" class="w-full accent-[var(--fm-primary)]" />
                <div class="flex justify-between text-[10px] mt-1" style="color: var(--fm-text-tertiary);"><span>Precise</span><span>Creative</span></div>
              </div>
              <div>
                <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Verbosity</label>
                <div class="grid grid-cols-3 gap-2">
                  ${['concise', 'balanced', 'detailed'].map(v => `
                    <button class="set-verbosity h-9 rounded-lg text-xs font-semibold capitalize btn-press" data-value="${v}"
                      style="border: 1px solid ${settings.ai.verbosity === v ? 'var(--fm-primary)' : 'var(--fm-border)'}; background: ${settings.ai.verbosity === v ? 'var(--fm-primary-50)' : ''}; color: ${settings.ai.verbosity === v ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'};">
                      ${v}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div>
                <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Default Personality</label>
                <select id="set-personality" class="w-full h-11 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);">
                  ${['professional', 'friendly', 'concise', 'creative', 'formal'].map(p => `<option value="${p}" ${settings.ai.defaultPersonality === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
                </select>
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
              <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--fm-surface);">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined" style="color: var(--fm-primary);">dark_mode</span>
                  <div class="flex-1">
                    <p class="text-sm font-medium" style="color: var(--fm-text);">Theme</p>
                    <p class="text-xs" style="color: var(--fm-text-tertiary);">Interface color preference.</p>
                  </div>
                </div>
                <select id="set-theme" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-transparent focus:ring-0 cursor-pointer outline-none transition-colors hover:border-primary/20" style="background: var(--fm-primary-50); color: var(--fm-primary);">
                  <option value="auto" ${settings.ui.theme === 'auto' || !settings.ui.theme ? 'selected' : ''}>System Auto</option>
                  <option value="light" ${settings.ui.theme === 'light' ? 'selected' : ''}>Always Light</option>
                  <option value="dark" ${settings.ui.theme === 'dark' ? 'selected' : ''}>Always Dark</option>
                </select>
              </div>
              ${renderToggle('set-compact', { label: 'Compact Mode', description: 'Reduce spacing for denser layouts', checked: settings.ui.compactMode })}
              ${renderToggle('set-animations', { label: 'Animations', description: 'Enable smooth transitions and effects', checked: settings.ui.animationsEnabled })}
              ${renderToggle('set-sidebar', { label: 'Show Sidebar by Default', checked: settings.ui.sidebarDefault })}
              ${renderToggle('set-chat-panel', { label: 'Show Chat Panel by Default', checked: settings.ui.chatPanelDefault })}
            </div>
          </section>

          <!-- Personalization -->
          <section id="section-personal" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">Personalization</h3>
              <p class="text-xs" style="color: var(--fm-text-tertiary);">Tailor FormMate to your preferences.</p>
            </div>
            <div class="p-5 rounded-xl space-y-4" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              ${renderToggle('set-autosave', { label: 'Auto-Save Answers', description: 'Automatically save edits as you type', checked: settings.personalization.autoSave })}
              ${renderToggle('set-autofill', { label: 'Auto-Fill Personal Data', description: 'Use vault data to pre-fill personal fields', checked: settings.personalization.autoFillPersonal })}
            </div>
          </section>

          <!-- Notifications -->
          <section id="section-notif" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">Notifications</h3>
            </div>
            <div class="p-5 rounded-xl space-y-4" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              ${renderToggle('set-toasts', { label: 'Toast Notifications', description: 'Show feedback popups for actions', checked: settings.notifications.toasts })}
              ${renderToggle('set-sounds', { label: 'Sound Effects', description: 'Play sounds on completion events', checked: settings.notifications.sounds })}
            </div>
          </section>

          <!-- Privacy -->
          <section id="section-privacy" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">Privacy & Data</h3>
            </div>
            <div class="p-5 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div>
                <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Data Retention: <span id="retention-val">${settings.privacy.dataRetentionDays}</span> days</label>
                <input id="set-retention" type="range" min="7" max="365" step="7" value="${settings.privacy.dataRetentionDays}" class="w-full accent-[var(--fm-primary)]" />
              </div>
              ${renderToggle('set-analytics-opt', { label: 'Analytics Opt-Out', description: 'Disable anonymous usage analytics', checked: settings.privacy.analyticsOptOut })}
              <button id="btn-clear-data" class="h-9 px-5 rounded-lg text-xs font-bold flex items-center gap-2 btn-press" style="background: var(--fm-error-light); color: var(--fm-error);">
                <span class="material-symbols-outlined text-sm">delete_forever</span> Clear All Stored Data
              </button>
            </div>
          </section>

          <!-- AI Models -->
          <section id="section-models" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">AI Model Selection</h3>
              <p class="text-xs" style="color: var(--fm-text-tertiary);">Configure which models are used for each task.</p>
            </div>
            <div class="p-5 rounded-xl space-y-3" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              ${Object.entries(TASK_ROUTES).map(([task, route]) => `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--fm-surface);">
                  <span class="text-xs font-medium" style="color: var(--fm-text-secondary);">${task.replace(/_/g, ' ')}</span>
                  <span class="text-xs font-mono font-bold" style="color: var(--fm-text);">${route.model}</span>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- Formatting -->
          <section id="section-format" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">Response Formatting</h3>
            </div>
            <div class="p-5 rounded-xl space-y-5" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              <div>
                <label class="text-xs font-semibold mb-2 block" style="color: var(--fm-text-secondary);">Response Length</label>
                <div class="grid grid-cols-3 gap-2">
                  ${['short', 'medium', 'long'].map(v => `
                    <button class="set-length h-9 rounded-lg text-xs font-semibold capitalize btn-press" data-value="${v}"
                      style="border: 1px solid ${settings.formatting.responseLength === v ? 'var(--fm-primary)' : 'var(--fm-border)'}; background: ${settings.formatting.responseLength === v ? 'var(--fm-primary-50)' : ''}; color: ${settings.formatting.responseLength === v ? 'var(--fm-primary)' : 'var(--fm-text-secondary)'};">
                      ${v}
                    </button>
                  `).join('')}
                </div>
              </div>
              ${renderToggle('set-bullets', { label: 'Prefer Bullet Points', description: 'Use bullets in long responses', checked: settings.formatting.preferBullets })}
            </div>
          </section>

          <!-- Keyboard Shortcuts -->
          <section id="section-shortcuts" class="settings-section space-y-5">
            <div>
              <h3 class="text-lg font-bold" style="color: var(--fm-text);">Keyboard Shortcuts</h3>
            </div>
            <div class="p-5 rounded-xl space-y-2" style="background: var(--fm-bg-elevated); border: 1px solid var(--fm-border);">
              ${[
      { keys: 'Ctrl + K', action: 'Open Command Palette' },
      { keys: 'Ctrl + Enter', action: 'Submit / Fill Form' },
      { keys: 'Ctrl + Z', action: 'Undo Answer' },
      { keys: 'Ctrl + Shift + Z', action: 'Redo Answer' },
      { keys: 'Escape', action: 'Close Modal / Panel' },
      { keys: 'Tab', action: 'Next Question' },
    ].map(s => `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--fm-surface);">
                  <span class="text-xs" style="color: var(--fm-text-secondary);">${s.action}</span>
                  <kbd class="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style="background: var(--fm-bg-sunken); color: var(--fm-text);">${s.keys}</kbd>
                </div>
              `).join('')}
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

          <div class="h-16"></div>
        </div>
      </main>
    </div>
  `;

  function init(wrapper) {
    wrapper.querySelector('#btn-back').addEventListener('click', () => navigateTo('landing'));

    // Sidebar nav scroll-to-section
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

    // Temperature
    const tempSlider = wrapper.querySelector('#set-temperature');
    const tempVal = wrapper.querySelector('#temp-val');
    tempSlider?.addEventListener('input', () => {
      tempVal.textContent = tempSlider.value;
      updateSettings('ai.temperature', parseFloat(tempSlider.value));
      logSettingsChanged('ai');
    });

    // Verbosity
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
        logSettingsChanged('ai');
      });
    });

    // Personality
    wrapper.querySelector('#set-personality')?.addEventListener('change', (e) => {
      updateSettings('ai.defaultPersonality', e.target.value);
      setState({ personality: e.target.value });
      logSettingsChanged('ai');
    });

    // Theme
    const themeSelect = wrapper.querySelector('#set-theme');
    themeSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      updateSettings('ui.theme', val);
      document.body.classList.remove('dark-mode-override', 'light-mode-override', 'dark');
      if (val === 'dark') document.body.classList.add('dark', 'dark-mode-override');
      if (val === 'light') document.body.classList.add('light-mode-override');
      if (val === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.body.classList.add('dark');
        }
      }
      logSettingsChanged('ui');
    });

    // Toggles
    const toggleMap = {
      'set-compact': 'ui.compactMode',
      'set-animations': 'ui.animationsEnabled',
      'set-sidebar': 'ui.sidebarDefault',
      'set-chat-panel': 'ui.chatPanelDefault',
      'set-autosave': 'personalization.autoSave',
      'set-autofill': 'personalization.autoFillPersonal',
      'set-toasts': 'notifications.toasts',
      'set-sounds': 'notifications.sounds',
      'set-analytics-opt': 'privacy.analyticsOptOut',
      'set-bullets': 'formatting.preferBullets',
    };

    Object.entries(toggleMap).forEach(([id, path]) => {
      const el = wrapper.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', () => {
          updateSettings(path, el.checked);
          logSettingsChanged(path.split('.')[0]);
        });
      }
    });

    // Retention
    const retSlider = wrapper.querySelector('#set-retention');
    const retVal = wrapper.querySelector('#retention-val');
    retSlider?.addEventListener('input', () => {
      retVal.textContent = retSlider.value;
      updateSettings('privacy.dataRetentionDays', parseInt(retSlider.value));
    });

    // Response length
    wrapper.querySelectorAll('.set-length').forEach(btn => {
      btn.addEventListener('click', () => {
        wrapper.querySelectorAll('.set-length').forEach(b => {
          b.style.borderColor = 'var(--fm-border)';
          b.style.background = '';
          b.style.color = 'var(--fm-text-secondary)';
        });
        btn.style.borderColor = 'var(--fm-primary)';
        btn.style.background = 'var(--fm-primary-50)';
        btn.style.color = 'var(--fm-primary)';
        updateSettings('formatting.responseLength', btn.dataset.value);
      });
    });

    // Clear data
    wrapper.querySelector('#btn-clear-data')?.addEventListener('click', () => {
      if (confirm('This will delete ALL stored data (profile, vault, history, settings). Are you sure?')) {
        clearAll();
        toast.warning('All data cleared.');
        navigateTo('auth');
      }
    });

    // Sign out
    wrapper.querySelector('#btn-signout')?.addEventListener('click', () => {
      signOut();
      setState({ isAuthenticated: false, authUser: null });
      toast.info('Signed out.');
      navigateTo('auth');
    });

    // Delete account
    wrapper.querySelector('#btn-delete-account')?.addEventListener('click', async () => {
      if (confirm('This will permanently delete your account and all data. This action cannot be undone.')) {
        await deleteAccount();
        clearAll();
        toast.warning('Account deleted.');
        navigateTo('auth');
      }
    });
  }

  return { html, init };
}
