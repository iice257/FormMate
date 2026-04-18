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
- Local stack defaults `NODE_TLS_REJECT_UNAUTHORIZED=0` when unset so Groq calls can run behind the current corporate/self-signed TLS chain.
- Active Supabase project ref for FormMate is `chrrljkxnpuqdhhptntc` (URL base: `https://chrrljkxnpuqdhhptntc.supabase.co`).

## Security and UX Hardening Decisions
- AI scope policy is enforced server-side as `Balanced adjacent`; unrelated general-purpose inference should be rejected.
- Sensitive browser data (profile, vault, answers, parse/form states, history) is session-scoped and should be purged on sign-out/idle expiry.
- Session lifecycle target is a 15-minute inactivity timeout with explicit session-expired UX and cleanup.
- Runtime degraded mode (Supabase unavailable) must be explicit in UX; do not imply cloud sync when backend config is missing.
- Account modal settings/profile edits should be draft-only until explicit save, with discard confirmation on close/tab-switch/cancel.
- Product should operate as a free offering for now: remove pricing/tier/billing surfaces and references sitewide until billing is intentionally scaffolded later.

## Chat Interaction Contract
- Sitewide AI chats should expose two suggested follow-up chips directly above each chat input.
- Assistant responses can include interactive blocks with `[fm-item ...]...[/fm-item]` and follow-up chip hints with `[fm-suggest]...[/fm-suggest]`.
- Legacy answer-list lines in the format `[id] label | value` should be treated as interactive/editable items in the UI.
- User clicks/edits on interactive items or follow-up chips must be sent in the next request via a tagged context block: `[fm-ui-context] ... [/fm-ui-context]`.
