// ═══════════════════════════════════════════
// FormMate — Application Entry Point
// ═══════════════════════════════════════════

// Self-hosted fonts (bundled by Vite — no CDN dependency)
import 'material-symbols/outlined.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';

// Design system & styles
import './design-tokens.css';
import './styles.css';

// Core
import { registerScreen, initRouter } from './router.js';

// Screens
import { authScreen } from './screens/auth.js';
import { onboardingScreen } from './screens/onboarding.js';
import { landingScreen } from './screens/landing.js';
import { analyzingScreen } from './screens/analyzing.js';
import { workspaceScreen } from './screens/workspace.js';
import { reviewScreen } from './screens/review.js';
import { successScreen } from './screens/success.js';
import { accountsScreen } from './screens/accounts.js';
import { analyticsScreen } from './screens/analytics.js';
import { docsScreen } from './screens/docs.js';
import { pricingScreen } from './screens/pricing.js';
import { helpScreen } from './screens/help.js';
import { examplesScreen } from './screens/examples.js';
import { newFormScreen } from './screens/new-form.js';


// Register all screens
registerScreen('auth', authScreen);
registerScreen('onboarding', onboardingScreen);
registerScreen('landing', landingScreen);
registerScreen('analyzing', analyzingScreen);
registerScreen('workspace', workspaceScreen);
registerScreen('review', reviewScreen);
registerScreen('success', successScreen);
registerScreen('accounts', accountsScreen);
registerScreen('analytics', analyticsScreen);
registerScreen('docs', docsScreen);
registerScreen('pricing', pricingScreen);
registerScreen('help', helpScreen);
registerScreen('examples', examplesScreen);
registerScreen('new-form', newFormScreen);



// Global hiding header logic
function initHidingHeader() {
  let lastScrollY = window.scrollY;
  // We attach to window scroll
  window.addEventListener('scroll', () => {
    const headers = document.querySelectorAll('header');
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      // Scrolling down
      headers.forEach(h => {
        h.style.transform = 'translateY(-100%)';
        h.style.opacity = '0';
      });
    } else {
      // Scrolling up
      headers.forEach(h => {
        h.style.transform = 'translateY(0)';
        h.style.opacity = '1';
      });
    }
    lastScrollY = currentScrollY;
  }, { passive: true });

  // Add transitional styling dynamically to make sure existing styles don't conflict, though transition-all should be on most headers
  const style = document.createElement('style');
  style.textContent = `
    header {
      transition: transform 0.3s ease, opacity 0.3s ease !important;
      will-change: transform, opacity;
    }
  `;
  document.head.appendChild(style);
}

// Initialize the app
function boot() {
  initRouter();
  initHidingHeader();
}

document.addEventListener('DOMContentLoaded', boot);

// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  boot();
}
