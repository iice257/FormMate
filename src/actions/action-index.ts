// @ts-nocheck
import { getState } from '../state';
import { getHomeScreenForUser, navigateTo } from '../router';

const ACTION_FOLLOWUP_DELAY_MS = 320;
const ACTION_ANCHOR_DELAY_MS = 420;

const ACTIONS = [
  {
    id: 'home',
    title: 'Go Home',
    description: 'Return to the FormMate home screen.',
    icon: 'home',
    keywords: ['landing', 'start', 'homepage', 'main'],
    featured: true,
    kind: 'route',
    getRoute: () => getHomeScreenForUser(),
  },
  {
    id: 'dashboard',
    title: 'Open Dashboard',
    description: 'View your main workspace overview.',
    icon: 'space_dashboard',
    keywords: ['overview', 'home base', 'workspace overview'],
    featured: true,
    kind: 'route',
    route: 'dashboard',
  },
  {
    id: 'new-form',
    title: 'Create New Form',
    description: 'Paste a form link and start a new analysis.',
    icon: 'add_circle',
    keywords: ['analyze', 'paste link', 'start form', 'create form'],
    featured: true,
    kind: 'route',
    route: 'new',
  },
  {
    id: 'active-form',
    title: 'Open Active Form',
    description: 'Return to the current form workspace.',
    icon: 'description',
    keywords: ['workspace', 'editor', 'current form'],
    featured: true,
    kind: 'route',
    route: 'workspace',
  },
  {
    id: 'history',
    title: 'Open History',
    description: 'Review previously analyzed forms.',
    icon: 'schedule',
    keywords: ['past forms', 'table', 'previous'],
    featured: true,
    kind: 'route',
    route: 'history',
  },
  {
    id: 'ai-chat',
    title: 'Open AI Chat',
    description: 'Jump into the standalone AI chat workspace.',
    icon: 'chat_bubble',
    keywords: ['copilot', 'assistant', 'chat page'],
    featured: true,
    kind: 'route',
    route: 'ai-chat',
  },
  {
    id: 'examples',
    title: 'Browse Examples',
    description: 'Open the example forms gallery.',
    icon: 'auto_stories',
    keywords: ['templates', 'sample forms', 'gallery'],
    kind: 'route',
    route: 'examples',
  },
  {
    id: 'pricing',
    title: 'Open Pricing',
    description: 'Review plans and billing information.',
    icon: 'sell',
    keywords: ['billing', 'plans', 'subscription'],
    kind: 'route',
    route: 'pricing',
  },
  {
    id: 'docs',
    title: 'Open Documentation',
    description: 'Read product guides and support docs.',
    icon: 'menu_book',
    keywords: ['documentation', 'guides', 'manual'],
    kind: 'route',
    route: 'docs',
  },
  {
    id: 'account-profile',
    title: 'Open Profile',
    description: 'Manage profile details in the account module.',
    icon: 'person',
    keywords: ['account', 'profile', 'identity'],
    featured: true,
    kind: 'modal',
    tab: 'profile',
  },
  {
    id: 'account-settings',
    title: 'Open Preferences',
    description: 'Manage preferences, animations, and Zen Mode.',
    icon: 'settings',
    keywords: ['preferences', 'appearance', 'zen', 'config'],
    featured: true,
    kind: 'modal',
    tab: 'settings',
  },
  {
    id: 'account-help',
    title: 'Open Help',
    description: 'Open help and support inside the account module.',
    icon: 'help',
    keywords: ['support', 'faq', 'contact'],
    featured: true,
    kind: 'modal',
    tab: 'help',
  },
  {
    id: 'docs-getting-started',
    title: 'Docs: Getting Started',
    description: 'Jump to the getting started guide.',
    icon: 'rocket_launch',
    keywords: ['first form', 'onboarding', 'guide'],
    kind: 'anchor',
    route: 'docs',
    anchor: 'first-form',
  },
  {
    id: 'docs-copilot',
    title: 'Docs: AI Copilot',
    description: 'Jump to the AI copilot guide.',
    icon: 'smart_toy',
    keywords: ['copilot', 'ai help', 'chat guide'],
    kind: 'anchor',
    route: 'docs',
    anchor: 'copilot',
  },
  {
    id: 'docs-faqs',
    title: 'Docs: FAQs',
    description: 'Jump to common questions and answers.',
    icon: 'quiz',
    keywords: ['faqs', 'questions', 'answers'],
    kind: 'anchor',
    route: 'docs',
    anchor: 'faqs',
  },
  {
    id: 'contact-support',
    title: 'Contact Support',
    description: 'Jump to the support contact form.',
    icon: 'mail',
    keywords: ['support', 'contact us', 'email'],
    featured: true,
    kind: 'anchor',
    route: 'docs',
    anchor: 'contact',
  },
  {
    id: 'review-feedback',
    title: 'Leave Feedback',
    description: 'Jump to the feedback form.',
    icon: 'rate_review',
    keywords: ['feedback', 'review', 'rate'],
    kind: 'anchor',
    route: 'docs',
    anchor: 'feedback',
  },
  {
    id: 'history-export',
    title: 'Export History',
    description: 'Export the form history list.',
    icon: 'download',
    keywords: ['download history', 'export forms', 'csv'],
    kind: 'selector',
    route: 'history',
    selector: '#btn-export-all',
  },
  {
    id: 'history-open-latest',
    title: 'Open Latest History Item',
    description: 'Open the latest analyzed form from history.',
    icon: 'history',
    keywords: ['latest form', 'recent history'],
    kind: 'selector',
    route: 'history',
    selector: '.btn-open-history',
  },
  {
    id: 'workspace-generate-all',
    title: 'Generate All Answers',
    description: 'Run AI generation for the whole active form.',
    icon: 'auto_awesome',
    keywords: ['generate answers', 'fill form', 'autofill'],
    kind: 'selector',
    route: 'workspace',
    selector: '#btn-generate-all',
  },
  {
    id: 'workspace-review-all',
    title: 'Review All Answers',
    description: 'Open the full active form review action.',
    icon: 'checklist',
    keywords: ['review answers', 'audit form'],
    kind: 'selector',
    route: 'workspace',
    selector: '#btn-review-all',
  },
  {
    id: 'workspace-submit',
    title: 'Submit Active Form',
    description: 'Open the submit flow for the current active form.',
    icon: 'send',
    keywords: ['review and submit', 'finish form', 'submit application'],
    featured: true,
    kind: 'selector',
    route: 'workspace',
    selector: '#btn-review-bottom',
  },
  {
    id: 'workspace-ai-chat',
    title: 'Show Workspace AI Chat',
    description: 'Open the AI chat panel inside the active form workspace.',
    icon: 'chat_bubble',
    keywords: ['chat panel', 'copilot panel'],
    kind: 'selector',
    route: 'workspace',
    selector: '#toggle-ai-chat',
  },
  {
    id: 'workspace-ai-actions',
    title: 'Show Workspace AI Actions',
    description: 'Open the AI actions panel inside the active form workspace.',
    icon: 'bolt',
    keywords: ['actions panel', 'automation', 'ai tools'],
    kind: 'selector',
    route: 'workspace',
    selector: '#toggle-ai-actions',
  },
  {
    id: 'chat-new-session',
    title: 'Start New Chat',
    description: 'Reset the standalone AI chat conversation.',
    icon: 'add_comment',
    keywords: ['new chat', 'fresh conversation', 'reset chat'],
    kind: 'selector',
    route: 'ai-chat',
    selector: '#btn-new-chat',
  },
  {
    id: 'dashboard-open-history',
    title: 'Dashboard: View History',
    description: 'Open the history section from the dashboard.',
    icon: 'schedule',
    keywords: ['dashboard history', 'recent forms'],
    kind: 'selector',
    route: 'dashboard',
    selector: '#btn-dashboard-open-history',
  },
  {
    id: 'dashboard-open-workspace',
    title: 'Dashboard: Resume Active Form',
    description: 'Re-open the current active form from the dashboard.',
    icon: 'description',
    keywords: ['resume form', 'dashboard workspace'],
    kind: 'selector',
    route: 'dashboard',
    selector: '#btn-dashboard-open-workspace',
  },
];

function getActionRoute(action) {
  return typeof action.getRoute === 'function' ? action.getRoute() : action.route;
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSearchBlob(action) {
  return normalizeSearchValue([
    action.id,
    action.title,
    action.description,
    ...(action.keywords || []),
  ].join(' '));
}

function scrollToAnchor(anchorId) {
  const target = document.getElementById(anchorId);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

function scheduleSelectorClick(selector, attempt = 0) {
  const target = document.querySelector(selector);
  if (target) {
    target.click();
    return true;
  }
  if (attempt >= 10) return false;
  window.setTimeout(() => scheduleSelectorClick(selector, attempt + 1), 90);
  return false;
}

function openAccountTab(tab, options = {}) {
  const opener = options.openAccountModal || window.__fmOpenAccountModalTab;
  if (typeof opener === 'function') {
    opener(tab);
    return true;
  }
  return false;
}

export function getActionIndex() {
  return ACTIONS.map((action) => ({ ...action, route: getActionRoute(action) }));
}

export function getActionById(id) {
  if (!id) return null;
  const key = String(id).trim().toLowerCase();
  const action = ACTIONS.find((entry) => entry.id === key);
  return action ? { ...action, route: getActionRoute(action) } : null;
}

export function searchActions(query = '', options = {}) {
  const limit = options.limit || 8;
  const normalizedQuery = normalizeSearchValue(query);
  const actions = getActionIndex();

  if (!normalizedQuery) {
    return actions.filter((action) => action.featured).slice(0, limit);
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);

  return actions
    .map((action) => {
      const blob = getSearchBlob(action);
      let score = 0;

      if (blob.includes(normalizedQuery)) score += 12;
      if (normalizeSearchValue(action.title).startsWith(normalizedQuery)) score += 8;
      if (action.id === normalizedQuery) score += 14;

      for (const token of tokens) {
        if (blob.includes(token)) score += 3;
        if (normalizeSearchValue(action.title).includes(token)) score += 2;
      }

      return { action, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.action.title.localeCompare(right.action.title);
    })
    .slice(0, limit)
    .map((entry) => entry.action);
}

export function executeAction(actionOrId, options = {}) {
  const action = typeof actionOrId === 'string' ? getActionById(actionOrId) : actionOrId;
  if (!action) return false;

  const currentScreen = options.currentScreen || getState().currentScreen;
  const route = getActionRoute(action);

  if (action.kind === 'modal' && action.tab) {
    return openAccountTab(action.tab, options);
  }

  if (action.kind === 'anchor' && action.anchor) {
    if (route && currentScreen !== route) {
      navigateTo(route);
      window.setTimeout(() => scrollToAnchor(action.anchor), ACTION_ANCHOR_DELAY_MS);
      return true;
    }
    return scrollToAnchor(action.anchor);
  }

  if (action.kind === 'selector' && action.selector) {
    if (route && currentScreen !== route) {
      navigateTo(route);
      window.setTimeout(() => scheduleSelectorClick(action.selector), ACTION_FOLLOWUP_DELAY_MS);
      return true;
    }
    return scheduleSelectorClick(action.selector);
  }

  if (route) {
    navigateTo(route);
    return true;
  }

  return false;
}

export function getAiActionInstructionText() {
  const actions = getActionIndex()
    .map((action) => `- ${action.id}: ${action.title}`)
    .join('\n');

  return `When suggesting a product action, you may include clickable action tags using the exact format [fm-action id="action-id"]Label[/fm-action].
Only use actions from this list, and only when they genuinely help the user complete the task:
${actions}
Do not invent action ids. Keep action labels short and natural.`;
}
