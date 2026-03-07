// ═══════════════════════════════════════════
// FormMate — Router
// ═══════════════════════════════════════════

import { getState, setState, subscribe } from './state.js';

const routes = {};
let currentCleanup = null;

export function registerScreen(name, renderFn) {
  routes[name] = renderFn;
}

export function navigateTo(screen) {
  const app = document.getElementById('app');

  // Exit animation
  const currentContent = app.firstElementChild;
  if (currentContent) {
    currentContent.classList.remove('screen-enter');
    currentContent.classList.add('screen-exit');
  }

  setTimeout(() => {
    // Cleanup previous screen
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    setState({ currentScreen: screen });

    if (routes[screen]) {
      app.innerHTML = '';
      const { html, init } = routes[screen]();
      const wrapper = document.createElement('div');
      wrapper.className = 'screen-enter';
      wrapper.innerHTML = html;
      app.appendChild(wrapper);

      if (init) {
        currentCleanup = init(wrapper) || null;
      }
    }
  }, currentContent ? 200 : 0);
}

export function initRouter() {
  // Start with landing
  navigateTo('landing');
}
