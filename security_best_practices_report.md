# FormMate Code Review And Security Audit

## Executive Summary

This audit found and fixed security issues across the API trust boundary, Docker production runtime, client rendering, auth/session handling, file intake, and repository hygiene. The most important fixes were strict TLS in Docker production, server-side monthly AI usage enforcement, safer auth/rate-limit handling, session token storage hardening, account-scoped data isolation, raster-only image imports, safer dynamic selectors, and broader security regression tests.

Ignored local `.env` files contain real development secrets/tokens and remain untracked. Rotate any value that has been shared outside this machine. No secret values are quoted in this report.

## Fixed Findings

### 1. Production Docker Disabled TLS Verification

- Severity: High
- Location: `scripts/docker-prod-server.ts`
- Impact: The production Docker server disabled Node TLS certificate validation unless explicitly overridden, allowing upstream Groq/Supabase/API traffic to be intercepted or tampered with by a network attacker.
- Fix: Docker production now verifies TLS by default. Insecure TLS bypass is limited to an explicit non-production-only `FORMMATE_ALLOW_INSECURE_TLS=1` escape hatch.

### 2. Docker Runtime Missing Vercel Security Headers

- Severity: Medium
- Location: `scripts/docker-prod-server.ts`, `vercel.json`
- Impact: Self-hosted Docker deployments lacked the CSP, `Permissions-Policy`, and `X-Robots-Tag` defense-in-depth already configured for Vercel.
- Fix: Docker production now mirrors the Vercel CSP and related security headers.

### 3. Production Image Included Dev Tooling And Ran As Root

- Severity: Medium
- Location: `Dockerfile`, `package.json`, `package-lock.json`
- Impact: The production image installed dev dependencies, including the Vercel CLI tree with known transitive audit findings, and ran the Node process as root.
- Fix: `tsx` was moved to production dependencies, the production image now runs `npm ci --omit=dev`, and the container runs as the built-in unprivileged `node` user.

### 4. API Rate Limits Trusted Spoofable Forwarded Headers

- Severity: Medium
- Location: `api/_shared/request-security.ts`, API route files under `api/`
- Impact: Docker/direct deployments could have rate limits bypassed with spoofed `X-Forwarded-For` values.
- Fix: API routes now use a shared trusted IP helper. Forwarded IP headers are trusted only on Vercel or when `FORMMATE_TRUST_PROXY=1` is explicitly configured.

### 5. Bearer Token Validation Was Not Pre-Throttled

- Severity: Medium
- Location: `api/_shared/request-security.ts`
- Impact: Random bearer-token requests could force outbound Supabase validation calls before route-level rate limiting.
- Fix: `assertTrustedAppSignal()` now applies a pre-auth limiter before Supabase token validation.

### 6. AI Usage Quotas Were Client-Enforced Only

- Severity: High
- Location: `api/_shared/server-usage.ts`, `api/ai/*`, `api/parser/image-extract.ts`, `src/storage/usage-gate.ts`
- Impact: Authenticated users could call AI endpoints directly and bypass local client usage counters, creating cost-abuse risk.
- Fix: AI endpoints now enforce a server-side monthly usage counter keyed by authenticated user/session. This is an in-process guard; a persistent shared quota store is still recommended for multi-instance production.

### 7. Transcription Accepted Arbitrary Content Types

- Severity: Low/Medium
- Location: `api/ai/transcribe.ts`
- Impact: Authenticated callers could relay arbitrary 10 MB request bodies/content types to the upstream transcription provider.
- Fix: The endpoint now accepts only `multipart/form-data` uploads from the expected browser flow.

### 8. Persistent Browser Tokens Were JS-Readable

- Severity: High
- Location: `src/auth/auth-service.ts`, `tests/e2e/smoke.spec.ts`
- Impact: "Remember this browser" stored full Supabase sessions, including refresh tokens, in `localStorage`, increasing token theft persistence after XSS or extension compromise.
- Fix: Full sessions are now stored only in `sessionStorage`; `localStorage` keeps only the remember preference. Existing persistent token cache entries are removed on read.

### 9. Account Data Could Bleed Across Users

- Severity: High
- Location: `src/screens/auth.ts`, `src/storage/storage-provider.ts`
- Impact: New login state merged with the previous profile and remote hydration could fall back to generic local/session account caches, risking cross-user profile/vault/history bleed in the same browser tab.
- Fix: Login state resets account-scoped working data, and remote hydration now returns empty defaults for missing remote fields instead of falling back to generic local caches.

### 10. Dynamic Selectors Used Unescaped IDs

- Severity: Medium
- Location: `src/parser/dom-parser.ts`, `src/screens/workspace.ts`, `src/screens/review.ts`, `src/components/question-card.ts`
- Impact: Parsed form IDs/question IDs containing selector metacharacters could throw `SyntaxError` and break import/workspace/review flows. Unescaped IDs in generated attributes also increased markup injection risk.
- Fix: Selector fragments now use `CSS.escape()` with a fallback, and generated `data-*` attributes escape untrusted IDs.

### 11. Image Import Allowed Any `image/*`

- Severity: Medium
- Location: `src/utils/file-validation.ts`, `src/screens/analyzing.ts`, `src/screens/capture.ts`, `src/screens/ai-chat.ts`, `src/screens/workspace.ts`
- Impact: SVG and unusual active image formats could enter screenshot/attachment flows.
- Fix: Image intake now accepts only PNG, JPEG, and WebP and checks file signatures before reading data URLs.

### 12. URL Sanitization Allowed Edge-Case Schemes

- Severity: Medium
- Location: `src/utils/escape.ts`, `src/utils/safe-html.ts`, `test-safe-html.ts`
- Impact: Protocol-relative URLs and non-web/data URL edge cases could survive some sanitizer paths.
- Fix: URL attributes now use an allowlist for safe protocols, protocol-relative URLs are rejected, and tests cover those cases.

### 13. Security Regression Tests Were Not Fully Wired

- Severity: Medium
- Location: `package.json`, `test-request-security.ts`, `test-safe-html.ts`
- Impact: Root-level security helper tests were not part of `npm test`; one async redirect assertion was not awaited.
- Fix: Added `test:security-helpers` to `npm test` and fixed the async redirect assertion.

### 14. Generated Logs And Vite Cache Were Tracked

- Severity: Low
- Location: `.gitignore`, `.vite/deps/*`, `*.log`, `*.err`
- Impact: Tracked generated artifacts polluted searches and could mask current diagnostics.
- Fix: `.vite/` is ignored and tracked Vite cache/log artifacts were removed from the git index.

## Residual Risks

- `npm audit --audit-level=moderate` still reports dev-toolchain advisories through the Vercel CLI tree. `npm audit --omit=dev` is expected to be the production-focused gate after the Docker omit-dev fix.
- The URL proxy still has residual DNS rebinding/TOCTOU risk because `fetch()` resolves hostnames after validation. Stronger mitigation needs a host allowlist, connection-time private-range enforcement, or infrastructure egress controls.
- Server-side monthly usage enforcement is in-process. For horizontally scaled production, move usage counters to a server-owned durable store.
- Browser Supabase sessions remain JS-readable for the active tab/session. The stronger long-term design is a backend-for-frontend with HttpOnly cookies.

## Verification

- `npm install tsx@^4.21.0 --save-prod`
- `git rm --cached` for tracked generated Vite/log artifacts
- `npm run typecheck` passed.
- `npm test` passed, including the newly wired security helper tests.
- `npm audit --omit=dev --audit-level=moderate` passed with 0 production vulnerabilities.
- `npm run build` passed. Vite still reports existing chunk-size/dynamic-import warnings.
- `npm run test:e2e` passed 14/14. The local Vite test server logged expected API proxy `ECONNREFUSED` messages because the serverless API was not running locally during the browser smoke tests.
- `npm audit --audit-level=moderate` still fails on dev-only Vercel CLI transitive advisories; `npm audit fix` reported the lockfile was already up to date.
