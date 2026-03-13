// ═══════════════════════════════════════════
// FormMate — Vault Screen
// ═══════════════════════════════════════════

import { getState, updateVault } from '../state.js';
import { withLayout, initLayout } from '../components/layout.js';
import { toast } from '../components/toast.js';
import { escapeAttr } from '../utils/escape.js';

export function vaultScreen() {
  const { vault } = getState();

  const sections = [
    { id: 'personal', title: 'Personal Info', icon: 'person', fields: [
      { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
      { key: 'email', label: 'Email Address', placeholder: 'john@example.com' },
      { key: 'phone', label: 'Phone Number', placeholder: '+1 234 567 890' },
      { key: 'address', label: 'Home Address', placeholder: '123 Main St, London' },
    ]},
    { id: 'professional', title: 'Professional Info', icon: 'work', fields: [
      { key: 'jobTitle', label: 'Current Job Title', placeholder: 'Senior Developer' },
      { key: 'company', label: 'Current Company', placeholder: 'Tech Corp' },
      { key: 'experience', label: 'Years of Experience', placeholder: '8' },
      { key: 'skills', label: 'Key Skills (comma separated)', placeholder: 'React, Node.js, AI' },
    ]},
    { id: 'education', title: 'Education', icon: 'school', fields: [
      { key: 'degree', label: 'Highest Degree', placeholder: 'BSc Computer Science' },
      { key: 'university', label: 'University', placeholder: 'Stanford' },
    ]},
  ];

  const vaultContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter">
      <div class="max-w-5xl mx-auto px-6 py-10">
        <div class="flex items-center justify-between mb-10">
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">Your Data Vault</h1>
            <p class="text-sm text-slate-500 mt-1">Manage information used to intelligently fill your forms.</p>
          </div>
          <div class="size-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-sm border border-amber-100/50">
             <span class="material-symbols-outlined text-2xl">lock</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          ${sections.map(section => `
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:p-8">
              <div class="flex items-center gap-3 mb-6">
                 <div class="size-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                    <span class="material-symbols-outlined">${section.icon}</span>
                 </div>
                 <h3 class="font-bold text-slate-900">${section.title}</h3>
              </div>
              
              <div class="space-y-5">
                ${section.fields.map(field => `
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">${field.label}</label>
                    <input aria-label="${escapeAttr(field.label)}"
                      type="text" 
                      data-vault-key="${field.key}" 
                      value="${escapeAttr(vault[field.key] || '')}" 
                      placeholder="${field.placeholder}"
                      class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:bg-white transition-all outline-none"
                    />
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}

          <div class="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl border border-primary/10 p-8 flex flex-col items-center justify-center text-center">
             <div class="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-3xl">auto_awesome</span>
             </div>
             <h3 class="text-lg font-bold text-slate-900 mb-2">Smart Auto-Detection</h3>
             <p class="text-xs text-slate-500 leading-relaxed max-w-xs">The vault learns as you fill forms. If you correct a field during review, we'll ask to save it here for next time.</p>
             <button class="mt-6 text-[11px] font-black uppercase tracking-widest text-primary hover:underline transition-all">Enable Auto-Sync</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('vault', vaultContent);

  function init(wrapper) {
    initLayout(wrapper);

    wrapper.querySelectorAll('input[data-vault-key]').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.vaultKey;
        const value = e.target.value;
        updateVault(key, value);
        toast.success('Vault updated');
      });
    });
  }

  return { html, init };
}
