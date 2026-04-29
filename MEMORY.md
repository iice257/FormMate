# FormMate Working Memory

## Parser Direction (User Preferences)
- `docs/parser-engine-rfc.md` is the implementation authority for parser v1 work.
- Acquisition mode should remain read-only; no active interaction during URL parsing.
- Screenshot/image parsing should remain a separate, lightweight service boundary.
- Parser evidence in product UX should be balanced: enough context for autofill/AI behavior, not full diagnostics exposed to users.
- Provider adapters should use URL-first routing with DOM signature fallback as a failsafe.
- Google Forms should trigger an immediate screenshot-first gate in analyzing flow (open-form link + upload/paste screenshots) before parsing.

## Repository Workflow Preferences
- Commit and push after major tasks/changes.
- Keep this memory file updated when new critical preferences or decisions are introduced.
- Treat API keys/secrets as local-only runtime config; never commit or expose them in plaintext.

## Operational Notes
- On this workstation/network, outbound TLS to some hosts can fail with `self-signed certificate in certificate chain` until local trust is configured.
- Local development uses an internal API server (`scripts/dev-api-server.ts`) on `127.0.0.1:3000` via `npm run dev`/`npm run dev:stack`; this avoids `vercel dev` proxy drift for `/api/*`.
- Local API now forces insecure TLS mode by default for this environment unless `FORMMATE_STRICT_TLS=1`, so Groq calls remain stable behind the current corporate/self-signed TLS chain.
- Local API health now exposes `apiVersion` (`2026-04-18.1`), and `dev:stack` validates compatibility before wiring Vite proxy.
- `dev:stack` can now auto-select fallback API ports (`3001-3003`) if `3000` is occupied/incompatible, preventing silent frontend/backend contract drift.
- Active Supabase project ref for FormMate is `chrrljkxnpuqdhhptntc` (URL base: `https://chrrljkxnpuqdhhptntc.supabase.co`).
- Current Vercel `development` env is missing `VITE_SUPABASE_ANON_KEY`; env pulls will keep local Supabase auth/sync degraded until this key is added in Vercel project settings.
- Vercel preview/production builds now enforce an env gate (`scripts/check-required-env.mjs`) for `GROQ_API_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

## Security and UX Hardening Decisions
- AI scope policy is enforced server-side as `Balanced adjacent`; unrelated general-purpose inference should be rejected.
- Sensitive browser data (profile, vault, answers, parse/form states, history) is session-scoped and should be purged on sign-out/idle expiry.
- Session lifecycle target is a 15-minute inactivity timeout with explicit session-expired UX and cleanup.
- Runtime degraded mode (Supabase unavailable) must be explicit in UX; do not imply cloud sync when backend config is missing.
- Degraded sync warning UI (banner/toast) is dev-only; do not show this notice in live production.
- Account modal settings/profile edits should be draft-only until explicit save, with discard confirmation on close/tab-switch/cancel.
- Product should operate as a free offering for now: remove pricing/tier/billing surfaces and references sitewide until billing is intentionally scaffolded later.
- Global motion should feel premium and native-like: full-page forward/back route changes use fast directional slide + fade + light blur, while sidebar section switches keep the shell anchored and animate only the content region with subtle upward refresh motion plus softer right-panel fade/blur.
- Sidebar menu page transitions should be direction-true and consistent: forward sidebar navigation uses zoom-in + slight slide-up, and back to the immediate previous sidebar page uses the reverse motion (no mixed zoom directions).
- Dark mode is fully removed by product decision; do not add dark-theme colors, selectors, toggles, or runtime theme hooks back into the app.
- Content redesign passes should preserve the existing sidebar and top-bar shell unless the user explicitly asks to change shell chrome; focus redesign work on the main content area.
- Back buttons sitewide should use the softer white outlined treatment while preserving each screen's existing corner roundness.
- New account creation should use FormMate's in-app OTP verification screen, not a Supabase-branded confirmation page; Supabase email templates should expose `{{ .Token }}` for the custom code-entry flow.
- Supabase browser config should accept the newer publishable key naming (`VITE_SUPABASE_PUBLISHABLE_KEY`) as an alias for `VITE_SUPABASE_ANON_KEY`.
- Google OAuth for FormMate must be enabled under Supabase Authentication > Providers > Google, not Supabase OAuth Server.
- Google Identity Services should auto-sign-in on the landing page (`auto_select`) and show One Tap on the auth screen without auto-select; sign-out must call `disableAutoSelect()` to prevent re-login loops.
- Google One Tap requires `VITE_GOOGLE_CLIENT_ID` with the same Google Web OAuth Client ID configured in Supabase.
- Public docs/legal navigation is explicit: the main docs back button always returns to landing, while privacy/terms back routes return to docs and browser-back from legal pages should resolve back into docs instead of cycling legal tabs.
- The primary web Google sign-in path should use Google Identity Services credentials (`signInWithIdToken`) for the visible auth flow; Supabase redirect OAuth remains fallback-only.
- Mobile app shell should expose a hamburger beside `New Form` that opens a full-screen left menu with push-style page motion; account modal should also be full-screen on mobile.
- Zen mode should reuse the subtle new-form background image treatment across zen screens only (same image and very low-opacity overlay), without changing non-zen screens.
- Zen mode controls should stay compact: the floating menu must open only on click, not expand on hover; zen navigation should group New Form separately, page links together, and profile/settings/help together.
- Cloud sync degraded banners/notices should be hidden sitewide (including auth and layout-level warning surfaces).
- Docs and examples should remain publicly browsable while signed out, but AI usage and example launches must require sign-in with explicit UI messaging.
- Legal pages should live as lightweight direct-link surfaces (`privacy`, `terms`) accessible from the docs-style navigation.
- Public pages must never render the private app shell or expose sidebar/dashboard/workspace affordances while signed out.
- Router auth gating must run before account-modal shortcut handling so `accounts`, `settings`, and `help` cannot bypass sign-in.

## Chat Interaction Contract
- Sitewide AI chats should expose two suggested follow-up chips directly above each chat input.
- Main chat and workspace now use a hybrid response contract: natural language first, then an optional `<fm-ui>...</fm-ui>` block, then short `[fm-suggest]...[/fm-suggest]` follow-up hints.
- Docs chat stays text-first and should ignore `<fm-ui>` blocks if they appear.
- Assistant rich text for main chat/workspace should render markdown-style formatting (bold, lists, tables, code, etc.) instead of showing raw symbols; single-hyphen wrappers (`-text-`) are treated as underline alias in rendered assistant prose.
- Legacy answer-list lines in the format `[id] label | value` should be treated as interactive/editable items in the UI.
- User clicks/edits on interactive items or follow-up chips must be sent in the next request via a tagged context block: `[fm-ui-context] ... [/fm-ui-context]`.
