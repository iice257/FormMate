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
