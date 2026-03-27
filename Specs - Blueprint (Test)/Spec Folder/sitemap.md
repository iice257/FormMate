# FormMate Sitemap & Routing Architecture

This schema outlines all application screens, their relative paths, and access requirements based on the custom frontend router (`src/router.js`).

## Root Handling
- `/` -> Resolves to `/dashboard` if authenticated, otherwise `/landing`.

## Public Routes (Unauthenticated Users)
- `/landing`: The `homepageScreen()` marketing entry point.
- `/auth`: The `authScreen()` for Login, Signup, and Forgot Password forms.
- `/new`: The `newFormScreen()` allowing users to paste a form link. Redirects anon users to `/auth` if they click "Sign In".
- `/examples`: The `examplesScreen()` showing pre-built form showcases.
- `/docs`: The `docsScreen()` knowledge base and help center.
- `/pricing`: The `pricingScreen()` subscription tiers.
- `/help`: The `helpScreen()` contact and FAQ page.

## Protected Routes (Authenticated Users Only)
*Note: Directly accessing these without auth state forces a redirect to `/landing`.*
- `/dashboard`: The `dashboardScreen()` user home page. Displays metrics, quick actions, and recent forms.
- `/onboarding`: The `onboardingScreen()` for new user context generation (Bio, Occupation, Values).
- `/accounts`: The `accountsScreen()` with 5 inner tabs:
  - `Profile`: Basics and photo
  - `Vault`: Saved key-value context facts
  - `History`: Previous analyzed forms
  - `Style`: Brand tone and AI behavior preferences
  - `Settings`: UI compactness and billing
- `/analyzing`: The `analyzingScreen()` interstitial loading pipeline which processes the `formUrl` via AI.
- `/workspace`: The `workspaceScreen()` form editor and Copilot chat interface.

## Flow States (Non-Routed Screens)
- **Command Palette (`Ctrl+K`)**: Interstitial global search modal triggered universally.
- **Form Capture Feedback**: Modal triggered from the `analyzing` screen specifically.
- **Logout Confirmation**: Modal triggered from `dashboard` dropdown or `accounts` profile.
