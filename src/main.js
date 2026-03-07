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
import { settingsScreen } from './screens/settings.js';
import { analyticsScreen } from './screens/analytics.js';
import { pricingScreen } from './screens/pricing.js';
import { helpScreen } from './screens/help.js';

import { initCommandPalette } from './components/command-palette.js';

// Register all screens
registerScreen('auth', authScreen);
registerScreen('onboarding', onboardingScreen);
registerScreen('landing', landingScreen);
registerScreen('analyzing', analyzingScreen);
registerScreen('workspace', workspaceScreen);
registerScreen('review', reviewScreen);
registerScreen('success', successScreen);
registerScreen('accounts', accountsScreen);
registerScreen('settings', settingsScreen);
registerScreen('analytics', analyticsScreen);
registerScreen('pricing', pricingScreen);
registerScreen('help', helpScreen);

// Initialize the app
function boot() {
  initRouter();
  initCommandPalette();

  // Attach command palette bindings to search buttons
  document.body.addEventListener('click', (e) => {
    const searchBtn = e.target.closest('#btn-search-cmd');
    if (searchBtn && window.openCommandPalette) {
      window.openCommandPalette();
    }
  });
}

document.addEventListener('DOMContentLoaded', boot);

// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  boot();
}
