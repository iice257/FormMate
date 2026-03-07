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
import { landingScreen } from './screens/landing.js';
import { analyzingScreen } from './screens/analyzing.js';
import { workspaceScreen } from './screens/workspace.js';
import { reviewScreen } from './screens/review.js';
import { successScreen } from './screens/success.js';

// Register all screens
registerScreen('landing', landingScreen);
registerScreen('analyzing', analyzingScreen);
registerScreen('workspace', workspaceScreen);
registerScreen('review', reviewScreen);
registerScreen('success', successScreen);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
});

// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  initRouter();
}
