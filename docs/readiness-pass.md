# Readiness Pass

## Branch

Work branch: `codex-work-readiness-pass`

Base branch: `origin/codex-work`

## Configuration State

Local API health reports:

- API reachable: yes
- Supabase configured: yes
- Auth available: yes
- Sync available: yes
- Storage mode: `supabase`
- Groq configured: no
- Image parser configured: no

The app should therefore run in a partial/degraded mode until `GROQ_API_KEY` is available.

## Changes Started

1. Branch cleanup
   - Created a real work branch from `origin/codex-work`.
   - Left the earlier empty push-test branch out of the product work.

2. Current accessibility audit
   - Added `npm run audit:a11y`.
   - The script scans current `src/**/*.ts` and `src/**/*.tsx` files instead of stale generated `.js` paths.
   - Current heuristic count after initial fixes: 55 findings.
   - Wrote the latest report to `docs/current-accessibility-audit.md`.

3. Degraded mode without API keys
   - Runtime health now marks missing Groq as degraded mode.
   - Shared app layout shows a readiness banner when AI, image parsing, API, or sync capabilities are missing.
   - AI chat copy and controls now communicate missing `GROQ_API_KEY` instead of inviting failed requests.
   - Image attachment and voice controls are disabled when the required AI capability is unavailable.

4. README/setup documentation
   - Replaced the concept-only README with current setup, script, env, and capability docs.
   - Documented what works without provider keys and what requires Groq/Supabase.

5. Smoke pass
   - Confirmed frontend responds at `http://localhost:5173/`.
- Confirmed local API responds at `http://127.0.0.1:3000/api/health`.
- Confirmed health now reports `degradedMode: true` when Groq is missing.
- Confirmed landing page renders.
- Confirmed docs page renders.
- Confirmed the docs feedback rating stars render as keyboard-focusable buttons.
- Observed expected local auth/provider console noise: identity provider account list is empty.

## Remaining Work

- Fix the remaining current accessibility findings, starting with real icon-only buttons and any remaining unlabeled form controls.
- Decide whether public/gated AI routes should show a non-authenticated preview of degraded mode or stay behind auth.
- Add a persistent shared quota store before multi-instance production if server-side AI quota accuracy matters across deployments.
