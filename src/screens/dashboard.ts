// @ts-nocheck
// FormMate - Dashboard Screen

import { getState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';

export function dashboardScreen() {
  const { userProfile, formHistory, tier, formData } = getState();
  const firstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const planLabel = tier === 'free' ? 'Basic' : 'Pro';
  const workspaceLabel = formData ? 'Active Workspace' : 'Ready Workspace';
  const workspaceRoute = formData ? 'workspace' : 'new';
  const workspaceActionLabel = formData ? 'Resume Active Form' : 'Start New Form';
  const workspaceActionIcon = formData ? 'description' : 'add_circle';

  const totalForms = formHistory.length || 0;
  const aiCredits = tier === 'free' ? 'Limited' : 'Expanded';
  const timeSaved = '-';
  const accuracy = '-';

  const stats = [
    { label: 'Total Forms', value: String(totalForms), meta: 'Forms tracked' },
    { label: 'AI Credits', value: aiCredits, meta: `${planLabel} tier` },
    { label: 'Time Saved', value: timeSaved, meta: 'Not yet measured' },
    { label: 'Accuracy', value: accuracy, meta: 'Pending telemetry' }
  ];

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
      const statusClass = status === 'completed'
        ? 'dashboard-status-active'
        : status === 'draft'
          ? 'dashboard-status-draft'
          : 'dashboard-status-closed';
      const answerCount = typeof form.answerCount === 'number' ? String(form.answerCount) : '-';

      return `
        <tr class="recent-form-row dashboard-activity-row" data-form-url="${escapeAttr(form.url || '')}">
          <td class="dashboard-table-cell dashboard-table-cell-form">
            <div class="dashboard-activity-form">
              <div class="dashboard-activity-form-icon">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div class="dashboard-activity-form-copy">
                <div class="dashboard-activity-form-title">${escapeHtml(form.title || 'Untitled Form')}</div>
                <div class="dashboard-activity-form-provider">${escapeHtml(form.provider || 'Google Forms')}</div>
              </div>
            </div>
          </td>
          <td class="dashboard-table-cell">
            <span class="dashboard-status ${statusClass}">
              ${statusLabel}
            </span>
          </td>
          <td class="dashboard-table-cell dashboard-cell-muted">${answerCount}</td>
          <td class="dashboard-table-cell dashboard-cell-muted">${new Date(form.timestamp).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="4" class="dashboard-activity-empty">
          No forms yet. Start by pasting a link to analyze your first form.
        </td>
      </tr>
    `;

  const dashboardContent = `
    <div class="app-page-scroll no-scrollbar scroll-smooth dashboard-page">
      <div class="app-page-inner dashboard-page-inner">
        <div class="app-page-stack">
          <section class="dashboard-hero">
            <div class="dashboard-hero-grid">
              <div class="dashboard-hero-copy">
                <span class="dashboard-kicker">Dashboard</span>
                <div class="dashboard-hero-copy-block">
                  <h1 class="app-title">Welcome back, ${firstName}.</h1>
                  <p class="app-copy dashboard-hero-copy-text">
                    A consolidated view of your form activity.
                  </p>
                  <p class="dashboard-hero-meta">${planLabel} Plan | ${workspaceLabel}</p>
                </div>
                <div class="dashboard-hero-actions">
                  <button id="btn-dashboard-open-history" class="app-button-secondary dashboard-secondary-action btn-press">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>Open History</span>
                  </button>
                  <button id="btn-dashboard-open-workspace" class="app-button-primary dashboard-primary-action btn-press">
                    <span class="material-symbols-outlined">${workspaceActionIcon}</span>
                    <span>${workspaceActionLabel}</span>
                  </button>
                </div>
              </div>

              <div class="dashboard-hero-aside">
                <div class="dashboard-hero-aside-top">
                  <div class="app-eyebrow">At A Glance</div>
                  <p class="dashboard-panel-copy">Track usage, plan, and workspace state without leaving the page.</p>
                </div>
                <div class="dashboard-hero-metrics">
                  <div>
                    <div class="dashboard-hero-metric-value">${totalForms}</div>
                    <div class="dashboard-hero-metric-label">Forms Touched</div>
                  </div>
                  <div>
                    <div class="dashboard-hero-metric-value">${planLabel}</div>
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

          <section class="dashboard-stats-row">
            ${stats.map(stat => `
              <article class="dashboard-stat-card">
                <div class="dashboard-stat-edge"></div>
                <div class="dashboard-stat-glow"></div>
                <div class="app-eyebrow">${stat.label}</div>
                <div class="dashboard-stat-reading">
                  <span class="dashboard-stat-value">${stat.value}</span>
                  <span class="dashboard-stat-meta">${stat.meta}</span>
                </div>
              </article>
            `).join('')}
          </section>

          <section class="dashboard-section-surface">
            <div class="dashboard-panel-header">
              <div>
                <span class="app-eyebrow">Quick Actions</span>
                <h2 class="dashboard-panel-title">Move faster with the same essentials</h2>
              </div>
            </div>
            <div class="dashboard-quick-actions-grid">
              ${quickActions.map(action => `
                <button
                  id="${action.buttonId}"
                  class="dashboard-quick-action ${action.featured ? 'dashboard-quick-action-featured' : ''}"
                >
                  <span class="dashboard-quick-action-icon">
                    <span class="material-symbols-outlined">${action.icon}</span>
                  </span>
                  <span class="dashboard-quick-action-body">
                    <span class="dashboard-quick-action-title">${action.title}</span>
                    <span class="dashboard-quick-action-copy">${action.copy}</span>
                  </span>
                  <span class="material-symbols-outlined dashboard-quick-action-arrow">north_east</span>
                </button>
              `).join('')}
            </div>
          </section>

          <section class="dashboard-activity dashboard-section-surface">
            <div class="dashboard-activity-header">
              <div>
                <span class="app-eyebrow">Recent Activity</span>
                <h2 class="dashboard-panel-title">Forms you touched recently</h2>
              </div>
              <button id="btn-dashboard-view-all" class="app-button-secondary btn-press">View All</button>
            </div>
            <div class="dashboard-activity-table-wrap">
              <table class="dashboard-activity-table">
                <thead>
                  <tr>
                    <th>Form Name</th>
                    <th>Status</th>
                    <th>Captured Answers</th>
                    <th>Last Modified</th>
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
      navigateTo(workspaceRoute);
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

  }

  return { html, init };
}
