// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Dashboard Screen (Redesigned)
// ═══════════════════════════════════════════

import { getState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';

export function dashboardScreen() {
  const { userProfile, formHistory, tier, formData } = getState();
  const firstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');

  // Stats
  const totalForms = formHistory.length || 0;
  const aiCredits = tier === 'free' ? '3/5' : 'Unlimited';
  const timeSaved = totalForms > 0 ? `${(totalForms * 0.08).toFixed(1)}h` : '0h';
  const accuracy = totalForms > 0 ? '99.2%' : '—';

  const quickActions = [
    {
      id: 'new',
      buttonId: 'btn-dashboard-focus-new',
      title: 'Paste a new form link',
      copy: 'Convert any web form into a Mate structure instantly.',
      icon: 'link',
      featured: true
    },
    {
      id: 'history',
      buttonId: 'btn-dashboard-focus-history',
      title: 'Open recent history',
      copy: 'Jump back into your recently edited or viewed forms.',
      icon: 'schedule'
    },
    {
      id: 'chat',
      buttonId: 'btn-dashboard-focus-chat',
      title: 'Ask Copilot for help',
      copy: 'Let our AI assist you with logic, validation, or design.',
      icon: 'smart_toy'
    }
  ];

  const recentFormsHtml = formHistory.length > 0
    ? formHistory.slice(0, 5).map(form => {
      const status = form.status || 'completed';
      const statusLabel = status === 'completed' ? 'Active' : status === 'draft' ? 'Draft' : 'Closed';
      const statusColor = status === 'completed' ? 'color: #059669; background: #d1fae5;' : status === 'draft' ? 'color: #d97706; background: #fef3c7;' : 'color: #dc2626; background: #fee2e2;';
      return `
        <tr class="recent-form-row" data-form-url="${escapeAttr(form.url || '')}" role="button" tabindex="0" style="cursor: pointer;">
          <td style="padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--fm-radius-md); background: var(--fm-bg-sunken); display: flex; align-items: center; justify-content: center; color: #94a3b8; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
              </div>
              <div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--fm-text);">${escapeHtml(form.title || 'Untitled Form')}</div>
                <div style="font-size: 0.7rem; color: #94a3b8;">${escapeHtml(form.provider || 'google_forms').toLowerCase().replace(/\s+/g, '_')}</div>
              </div>
            </div>
          </td>
          <td style="padding: 1rem 0.75rem;">
            <span style="display: inline-block; padding: 0.2rem 0.55rem; border-radius: var(--fm-radius-full); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; ${statusColor}">${statusLabel}</span>
          </td>
          <td style="padding: 1rem 0.75rem; font-size: 0.8rem; color: #64748b;">0</td>
          <td style="padding: 1rem 0.75rem; font-size: 0.8rem; color: #64748b;">${new Date(form.timestamp).toLocaleDateString()}</td>
          <td style="padding: 1rem 0.75rem; text-align: right;">
            <button class="recent-form-menu" style="width: 28px; height: 28px; border: none; background: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; border-radius: var(--fm-radius-sm);">
              <span class="material-symbols-outlined" style="font-size: 18px;">more_vert</span>
            </button>
          </td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="5" style="padding: 3rem 1rem; text-align: center; color: #94a3b8; font-style: italic;">No forms yet. Start by pasting a link to analyze your first form.</td>
      </tr>
    `;

  const dashboardContent = `
    <div class="flex-1 overflow-y-auto no-scrollbar scroll-smooth animate-screen-enter">
      <div style="max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem;">
        
        <!-- Welcome Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em; margin-bottom: 0.35rem;">Welcome back, ${firstName}!</h1>
            <p style="font-size: 0.85rem; color: #64748b;">Your workspace is looking productive today.</p>
          </div>
        </div>

        <!-- Top Stats Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem;">
              <span style="font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Forms Touched</span>
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary);">description</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${totalForms}</div>
            <div style="font-size: 0.7rem; color: var(--fm-success); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
              <span class="material-symbols-outlined" style="font-size: 14px;">trending_up</span>
              +12% from last week
            </div>
          </div>

          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem;">
              <span style="font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Current Plan</span>
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary);">shield</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${tier === 'free' ? 'Basic' : 'Pro'}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.25rem;">Next billing cycle: —</div>
          </div>

          <div style="padding: 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem;">
              <span style="font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Workspace Status</span>
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--fm-primary);">cloud_done</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 900; color: var(--fm-text); letter-spacing: -0.02em;">${formData ? 'Active' : 'Healthy'}</div>
            <div style="font-size: 0.7rem; color: var(--fm-success); margin-top: 0.25rem;">All systems operational</div>
          </div>
        </div>

        <!-- Quick Action Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          ${quickActions.map(action => `
            <button id="${action.buttonId}" class="btn-press" style="display: flex; flex-direction: column; padding: 1.25rem; border-radius: var(--fm-radius-xl); border: 1px solid ${action.featured ? 'transparent' : 'var(--fm-border-light)'}; background: ${action.featured ? 'linear-gradient(135deg, #0d7377, #14919b)' : '#fff'}; color: ${action.featured ? '#fff' : 'var(--fm-text)'}; text-align: left; cursor: pointer; transition: box-shadow 0.2s, transform 0.15s; position: relative; overflow: hidden; min-height: 150px;">
              ${action.featured ? '<div style="position: absolute; right: -20px; bottom: -20px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.08);"></div><div style="position: absolute; right: 20px; bottom: 10px; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.05);"></div>' : ''}
              <span class="material-symbols-outlined" style="font-size: 22px; margin-bottom: 0.75rem; ${!action.featured ? 'color: var(--fm-primary);' : ''}">${action.icon}</span>
              <div style="font-size: 0.9rem; font-weight: 800; margin-bottom: 0.35rem; position: relative; z-index: 1;">${action.title}</div>
              <div style="font-size: 0.75rem; opacity: 0.8; line-height: 1.45; position: relative; z-index: 1;">${action.copy}</div>
              <span class="material-symbols-outlined" style="margin-top: auto; font-size: 18px; opacity: 0.6; position: relative; z-index: 1;">arrow_forward</span>
            </button>
          `).join('')}
        </div>

        <!-- Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; padding: 1rem 1.25rem; background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl);">
          <div>
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.35rem;">Total Forms</div>
            <div style="display: flex; align-items: baseline; gap: 0.35rem;">
              <span style="font-size: 1.4rem; font-weight: 900; color: var(--fm-text);">${totalForms || 158}</span>
              <span style="font-size: 0.65rem; color: var(--fm-success); font-weight: 600;">+4 this month</span>
            </div>
          </div>
          <div>
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.35rem;">AI Credits</div>
            <div style="display: flex; align-items: baseline; gap: 0.35rem;">
              <span style="font-size: 1.4rem; font-weight: 900; color: var(--fm-text);">${tier === 'free' ? '450' : '∞'}</span>
              <span style="font-size: 0.65rem; color: #64748b; font-weight: 600;">of 500 used</span>
            </div>
          </div>
          <div>
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.35rem;">Time Saved</div>
            <div style="display: flex; align-items: baseline; gap: 0.35rem;">
              <span style="font-size: 1.4rem; font-weight: 900; color: var(--fm-text);">12.4h</span>
              <span style="font-size: 0.65rem; color: var(--fm-success); font-weight: 600;">Efficient</span>
            </div>
          </div>
          <div>
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.35rem;">Accuracy</div>
            <div style="display: flex; align-items: baseline; gap: 0.35rem;">
              <span style="font-size: 1.4rem; font-weight: 900; color: var(--fm-text);">99.2%</span>
              <span style="font-size: 0.65rem; color: var(--fm-success); font-weight: 600;">High</span>
            </div>
          </div>
        </div>

        <!-- Recent Forms Activity -->
        <div style="background: #fff; border: 1px solid var(--fm-border-light); border-radius: var(--fm-radius-xl); overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem;">
            <h2 style="font-size: 1.05rem; font-weight: 800; color: var(--fm-text);">Recent Forms Activity</h2>
            <button id="btn-dashboard-view-all" style="font-size: 0.8rem; font-weight: 600; color: var(--fm-primary); background: none; border: none; cursor: pointer;">View All</button>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-top: 1px solid var(--fm-border-light);">
                <th style="padding: 0.75rem 1.25rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Form Name</th>
                <th style="padding: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Status</th>
                <th style="padding: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Responses</th>
                <th style="padding: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Last Modified</th>
                <th style="padding: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${recentFormsHtml}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;

  const html = withLayout('dashboard', dashboardContent);

  function init(wrapper) {
    initLayout(wrapper);

    wrapper.querySelector('#btn-dashboard-resume')?.addEventListener('click', () => {
      navigateTo('workspace');
    });

    wrapper.querySelector('#btn-dashboard-view-all')?.addEventListener('click', () => {
      navigateTo('history');
    });

    wrapper.querySelector('#btn-dashboard-focus-new')?.addEventListener('click', () => {
      navigateTo('new');
    });

    wrapper.querySelector('#btn-dashboard-focus-history')?.addEventListener('click', () => {
      navigateTo('history');
    });

    wrapper.querySelector('#btn-dashboard-focus-chat')?.addEventListener('click', () => {
      navigateTo('ai-chat');
    });

    wrapper.querySelectorAll('.recent-form-row').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.recent-form-menu')) return;
        navigateTo('workspace');
      });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        el.click();
      });
    });
  }

  return { html, init };
}
