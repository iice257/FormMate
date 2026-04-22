// @ts-nocheck
// FormMate - Dashboard Screen

import { getState, setState } from '../state';
import { withLayout, initLayout } from '../components/layout';
import { navigateTo } from '../router';
import { escapeAttr, escapeHtml } from '../utils/escape';

export function dashboardScreen() {
  const { userProfile, formHistory, formData } = getState();
  const firstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const workspaceLabel = formData ? 'Active Workspace' : 'Ready Workspace';
  const workspaceRoute = formData ? 'workspace' : 'new';
  const workspaceActionLabel = formData ? 'Resume Active Form' : 'Start New Form';
  const workspaceActionIcon = formData ? 'description' : 'add_circle';

  const totalForms = formHistory.length || 0;

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
      const fieldCount = typeof form.fields === 'number'
        ? String(form.fields)
        : typeof form.answerCount === 'number'
          ? String(form.answerCount)
          : '-';

      return `
        <tr
          class="recent-form-row dashboard-activity-row"
          data-form-url="${escapeAttr(form.url || '')}"
          data-form-title="${escapeAttr(form.title || 'Untitled Form')}"
          role="button"
          tabindex="0"
          aria-label="Reopen ${escapeAttr(form.title || 'Untitled Form')}"
        >
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
          <td class="dashboard-table-cell dashboard-cell-muted">${fieldCount}</td>
          <td class="dashboard-table-cell dashboard-cell-muted">${new Date(form.timestamp).toLocaleDateString()}</td>
          <td class="dashboard-table-cell dashboard-table-cell-actions">
            <button
              type="button"
              class="dashboard-row-action btn-press"
              data-open-form-url="${escapeAttr(form.url || '')}"
              ${form.url ? '' : 'disabled aria-disabled="true"'}
            >
              Reopen
            </button>
          </td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="5" class="dashboard-activity-empty">
          <div class="dashboard-empty-state">
            <p>No forms yet. Start by pasting a link to analyze your first form.</p>
            <button type="button" id="btn-dashboard-empty-new" class="app-button-primary btn-press">Start New Form</button>
          </div>
        </td>
      </tr>
    `;

  const dashboardContent = `
    <div class="app-page-scroll no-scrollbar scroll-smooth dashboard-page" data-fm-transition-main="true" data-fm-scroll-region="main">
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
                  <p class="dashboard-hero-meta">${workspaceLabel}</p>
                </div>
                <div class="dashboard-hero-actions">
                  <button id="btn-dashboard-open-workspace" class="app-button-primary dashboard-primary-action btn-press">
                    <span class="material-symbols-outlined">${workspaceActionIcon}</span>
                    <span>${workspaceActionLabel}</span>
                  </button>
                  <button id="btn-dashboard-open-history" class="app-button-secondary dashboard-secondary-action btn-press">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>Open History</span>
                  </button>
                </div>
              </div>

              <div class="dashboard-hero-visual" aria-hidden="true">
                <div class="dashboard-hero-visual-stage">
                  <div class="dashboard-hero-visual-glow"></div>
                  <div class="dashboard-hero-device dashboard-hero-device-back"></div>
                  <div class="dashboard-hero-device dashboard-hero-device-front">
                    <div class="dashboard-hero-device-ring"></div>
                    <div class="dashboard-hero-device-header">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div class="dashboard-hero-chart">
                      <div class="dashboard-hero-chart-line"></div>
                      <div class="dashboard-hero-chart-bars">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="dashboard-hero-aside">
                <div class="dashboard-hero-aside-top">
                  <div class="dashboard-glance-label">
                    <span class="app-eyebrow">At A Glance</span>
                    <span class="material-symbols-outlined">info</span>
                  </div>
                  <p class="dashboard-panel-copy">Track your recent form activity and workspace status in one place.</p>
                </div>
                <div class="dashboard-hero-metrics">
                  <div>
                    <div class="dashboard-hero-metric-value">${totalForms}</div>
                    <div class="dashboard-hero-metric-label">Forms Touched</div>
                  </div>
                  <div>
                    <div class="dashboard-hero-metric-value">${Math.min(formHistory.length, 5)}</div>
                    <div class="dashboard-hero-metric-label">Recent Items</div>
                  </div>
                  <div>
                    <div class="dashboard-hero-metric-value">${formData ? 'Active' : 'Ready'}</div>
                    <div class="dashboard-hero-metric-label">Workspace</div>
                  </div>
                </div>
              </div>
            </div>
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
                    <th>Fields</th>
                      <th>Last Modified</th>
                      <th class="dashboard-table-head-actions">Action</th>
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
    const cleanupLayout = initLayout(wrapper, { zenMode: { screenId: 'dashboard' } });

    const openRecentForm = (formUrl) => {
      if (!formUrl) return;
      setState({ formUrl, capturePayload: null, imageArtifacts: null, parseResult: null, formData: null });
      navigateTo('analyzing');
    };

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

    wrapper.querySelector('#btn-dashboard-empty-new')?.addEventListener('click', () => {
      navigateTo('new');
    });

    wrapper.querySelectorAll('[data-open-form-url]').forEach((button) => {
      button.addEventListener('click', () => openRecentForm(button.dataset.openFormUrl));
    });

    wrapper.querySelectorAll('.recent-form-row').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        openRecentForm(row.dataset.formUrl);
      });
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openRecentForm(row.dataset.formUrl);
      });
    });

    return () => {
      cleanupLayout?.();
    };
  }

  return { html, init };
}
