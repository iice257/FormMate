// @ts-nocheck
// FormMate - Dashboard Screen

import { getState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';

export function dashboardScreen() {
  const { userProfile, formHistory, tier, formData } = getState();
  const firstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');

  const totalForms = formHistory.length || 0;
  const aiCredits = tier === 'free' ? 'Limited' : 'Expanded';
  const timeSaved = '—';
  const accuracy = '—';

  const quickActions = [
    {
      buttonId: 'btn-dashboard-focus-new',
      title: 'Paste a new form link',
      copy: 'Convert any web form into a FormMate workspace instantly.',
      icon: 'link',
      featured: true
    },
    {
      buttonId: 'btn-dashboard-focus-history',
      title: 'Open recent history',
      copy: 'Jump back into recently analyzed forms without losing context.',
      icon: 'schedule'
    },
    {
      buttonId: 'btn-dashboard-focus-chat',
      title: 'Ask Copilot for help',
      copy: 'Use AI for rewriting, logic checks, and draft support.',
      icon: 'smart_toy'
    }
  ];

  const recentFormsHtml = formHistory.length > 0
    ? formHistory.slice(0, 5).map(form => {
      const status = form.status || 'completed';
      const statusLabel = status === 'completed' ? 'Active' : status === 'draft' ? 'Draft' : 'Closed';
      const statusColor = status === 'completed'
        ? 'color: #059669; background: #d1fae5;'
        : status === 'draft'
          ? 'color: #d97706; background: #fef3c7;'
          : 'color: #dc2626; background: #fee2e2;';

      return `
        <tr class="recent-form-row dashboard-activity-row" data-form-url="${escapeAttr(form.url || '')}" style="border-top: 1px solid var(--fm-border-light);">
          <td style="padding: 1rem 1.35rem;">
            <div style="display: flex; align-items: center; gap: 0.8rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.95rem; background: var(--fm-bg-sunken); display: flex; align-items: center; justify-content: center; color: #94a3b8; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 18px;">description</span>
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 750; color: var(--fm-text);">${escapeHtml(form.title || 'Untitled Form')}</div>
                <div style="font-size: 0.7rem; color: #94a3b8;">${escapeHtml(form.provider || 'Google Forms')}</div>
              </div>
            </div>
          </td>
          <td style="padding: 1rem 0.75rem;">
            <span class="dashboard-status" style="display: inline-flex; align-items: center; padding: 0.24rem 0.58rem; border-radius: var(--fm-radius-full); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; ${statusColor}">
              ${statusLabel}
            </span>
          </td>
          <td style="padding: 1rem 0.75rem; font-size: 0.82rem; color: #64748b;">—</td>
          <td style="padding: 1rem 0.75rem; font-size: 0.82rem; color: #64748b;">${new Date(form.timestamp).toLocaleDateString()}</td>
          <td style="padding: 1rem 1.35rem 1rem 0.75rem; text-align: right;">
            <button class="recent-form-menu" aria-label="No actions available yet" disabled style="width: 2rem; height: 2rem; border: none; background: transparent; color: #cbd5e1; display: inline-flex; align-items: center; justify-content: center; border-radius: 0.7rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">more_horiz</span>
            </button>
          </td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="5" style="padding: 3.5rem 1rem; text-align: center; color: #94a3b8; font-style: italic;">
          No forms yet. Start by pasting a link to analyze your first form.
        </td>
      </tr>
    `;

  const dashboardContent = `
    <div class="app-page-scroll no-scrollbar scroll-smooth animate-screen-enter dashboard-page">
      <div class="app-page-inner" style="padding-top: 1.5rem;">
        <div class="app-page-stack">
          <section class="dashboard-hero">
            <div style="display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.85fr); gap: 1.5rem; align-items: stretch;">
              <div class="dashboard-hero-copy" style="display: flex; flex-direction: column; gap: 1rem;">
                <span class="dashboard-kicker">Dashboard</span>
                <div style="display: flex; flex-direction: column; gap: 0.7rem;">
                  <h1 class="app-title">Welcome back, ${firstName}.</h1>
                  <p class="app-copy" style="max-width: 560px;">
                    Everything important is grouped into calmer, larger surfaces so you can get moving quickly without the dashboard feeling noisy.
                  </p>
                </div>
                <div class="dashboard-hero-actions" style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                  <button id="btn-dashboard-open-history" class="app-button-primary btn-press">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>Open History</span>
                  </button>
                  <button id="btn-dashboard-open-workspace" class="app-button-secondary btn-press">
                    <span class="material-symbols-outlined">description</span>
                    <span>${formData ? 'Resume Active Form' : 'Open Workspace'}</span>
                  </button>
                </div>
              </div>

              <div class="dashboard-hero-aside dashboard-section-surface" style="padding: 1.2rem 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="app-eyebrow">At A Glance</div>
                <div class="dashboard-hero-metrics" style="border-top: none; padding-top: 1rem;">
                  <div>
                    <div class="dashboard-hero-metric-value">${totalForms}</div>
                    <div class="dashboard-hero-metric-label">Forms Touched</div>
                  </div>
                  <div>
                    <div class="dashboard-hero-metric-value">${tier === 'free' ? 'Basic' : 'Pro'}</div>
                    <div class="dashboard-hero-metric-label">Plan</div>
                  </div>
                  <div>
                    <div class="dashboard-hero-metric-value">${formData ? 'Active' : 'Ready'}</div>
                    <div class="dashboard-hero-metric-label">Workspace</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="dashboard-stats-row" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem;">
            <article class="dashboard-stat-card">
              <div class="dashboard-stat-edge"></div>
              <div class="dashboard-stat-glow"></div>
              <div class="app-eyebrow">Total Forms</div>
              <div style="margin-top: 0.55rem; display: flex; align-items: baseline; gap: 0.45rem;">
                <span style="font-size: 1.55rem; font-weight: 900; color: var(--fm-text);">${totalForms}</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #64748b;">Observed usage</span>
              </div>
            </article>
            <article class="dashboard-stat-card">
              <div class="dashboard-stat-edge"></div>
              <div class="dashboard-stat-glow"></div>
              <div class="app-eyebrow">AI Credits</div>
              <div style="margin-top: 0.55rem; display: flex; align-items: baseline; gap: 0.45rem;">
                <span style="font-size: 1.55rem; font-weight: 900; color: var(--fm-text);">${aiCredits}</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #64748b;">Tier state</span>
              </div>
            </article>
            <article class="dashboard-stat-card">
              <div class="dashboard-stat-edge"></div>
              <div class="dashboard-stat-glow"></div>
              <div class="app-eyebrow">Time Saved</div>
              <div style="margin-top: 0.55rem; display: flex; align-items: baseline; gap: 0.45rem;">
                <span style="font-size: 1.55rem; font-weight: 900; color: var(--fm-text);">${timeSaved}</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #64748b;">Not yet measured</span>
              </div>
            </article>
            <article class="dashboard-stat-card">
              <div class="dashboard-stat-edge"></div>
              <div class="dashboard-stat-glow"></div>
              <div class="app-eyebrow">Accuracy</div>
              <div style="margin-top: 0.55rem; display: flex; align-items: baseline; gap: 0.45rem;">
                <span style="font-size: 1.55rem; font-weight: 900; color: var(--fm-text);">${accuracy}</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #64748b;">Pending telemetry</span>
              </div>
            </article>
          </section>

          <section class="dashboard-section-surface">
            <div style="margin-bottom: 1rem;">
              <span class="app-eyebrow">Quick Actions</span>
              <h2 style="margin: 0.35rem 0 0; font-size: 1.12rem; font-weight: 850; color: var(--fm-text);">
                Move faster without the dashboard feeling crowded
              </h2>
            </div>
            <div class="dashboard-quick-actions-grid" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem;">
              ${quickActions.map(action => `
                <button
                  id="${action.buttonId}"
                  class="dashboard-quick-action ${action.featured ? 'dashboard-quick-action-featured' : ''}"
                  style="${action.featured ? 'background: linear-gradient(145deg, #0f172a, #163452); color: #fff; border-color: rgba(15, 23, 42, 0.08); box-shadow: 0 22px 44px rgba(15, 23, 42, 0.14);' : ''}"
                >
                  <span class="dashboard-quick-action-icon" style="${action.featured ? 'background: rgba(255,255,255,0.12); color: #fff; box-shadow: none;' : ''}">
                    <span class="material-symbols-outlined">${action.icon}</span>
                  </span>
                  <span>
                    <span class="dashboard-quick-action-eyebrow" style="${action.featured ? 'color: rgba(255,255,255,0.72);' : ''}">${action.featured ? 'Featured' : 'Shortcut'}</span>
                    <span class="dashboard-quick-action-title" style="${action.featured ? 'color: #fff;' : ''}">${action.title}</span>
                    <span class="dashboard-quick-action-copy" style="${action.featured ? 'color: rgba(255,255,255,0.78);' : ''}">${action.copy}</span>
                  </span>
                  <span class="material-symbols-outlined dashboard-quick-action-arrow" style="${action.featured ? 'color: rgba(255,255,255,0.52);' : ''}">north_east</span>
                </button>
              `).join('')}
            </div>
          </section>

          <section class="dashboard-activity dashboard-section-surface" style="padding: 0; overflow: hidden;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.35rem 1.35rem 1rem;">
              <div>
                <span class="app-eyebrow">Recent Activity</span>
                <h2 style="margin: 0.35rem 0 0; font-size: 1.08rem; font-weight: 850; color: var(--fm-text);">Forms you touched recently</h2>
              </div>
              <button id="btn-dashboard-view-all" class="app-button-secondary btn-press">View All</button>
            </div>
            <div style="overflow-x: auto;">
              <table class="dashboard-activity-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-top: 1px solid var(--fm-border-light);">
                    <th style="padding: 0.8rem 1.35rem; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Form Name</th>
                    <th style="padding: 0.8rem 0.75rem; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Status</th>
                    <th style="padding: 0.8rem 0.75rem; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Captured Answers</th>
                    <th style="padding: 0.8rem 0.75rem; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Last Modified</th>
                    <th style="padding: 0.8rem 1.35rem 0.8rem 0.75rem; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentFormsHtml}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  const html = withLayout('dashboard', dashboardContent, {
    zenMode: { screenId: 'dashboard' },
    shellClassName: 'zen-layout-shell',
    contentClassName: 'zen-layout-content'
  });

  function init(wrapper) {
    initLayout(wrapper, { zenMode: { screenId: 'dashboard' } });

    wrapper.querySelector('#btn-dashboard-open-history')?.addEventListener('click', () => {
      navigateTo('history');
    });

    wrapper.querySelector('#btn-dashboard-open-workspace')?.addEventListener('click', () => {
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
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.style.cursor = 'default';
    });
  }

  return { html, init };
}
