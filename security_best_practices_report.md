# Signed-Out Surface Security Fix Report

## Executive Summary

The signed-out surface audit findings were fixed and the follow-up route/session policy was implemented:

1. API routes no longer accept same-origin browser headers as proof of authentication.
2. The assisted capture page no longer renders a URL-derived bookmarklet into an HTML `href`, and capture tokens are normalized before display/use.
3. Public/legal/docs routes remain directly usable, protected deep links resume after auth, and unknown routes render a branded 404.
4. Trusted-browser persistence is explicit through a "Remember this browser" checkbox.

## Fixed Findings

### 0. Route Discovery and Deep-Link Policy

- Severity: Defense-in-depth
- Status: Fixed
- Location: `src/router.ts`, `src/screens/auth.ts`, `src/screens/not-found.ts`
- Impact: Fresh direct hits to known or guessed SPA routes needed a clear policy that does not treat route names as secrets and does not break useful bookmarks.
- Fix: Route entry is now auth-aware. Public routes (`/`, `/auth`, `/docs`, `/help`, `/privacy`, `/terms`, `/examples`) open directly. Protected signed-out direct links store a pending route and send the user to `/auth`; after successful auth, the app resumes the pending route if it is still valid. Signed-in protected bookmarks open directly, while workflow routes without required local state fall back to dashboard. Unknown routes render the branded 404.
- Indexing mitigation: `public/robots.txt` disallows all crawling, and Vercel now sends `X-Robots-Tag: noindex, nofollow`.

### 1. Signed-Out Same-Origin API Access

- Severity: High
- Status: Fixed
- Location: `api/_shared/request-security.ts:122`, `api/_shared/request-security.ts:160`
- Impact: Signed-out users could reach AI/parser/proxy request handling from the app origin without a validated Supabase bearer token.
- Fix: `assertTrustedAppSignal()` now allows only loopback dev auth or a Supabase-validated bearer token. Same-origin browser headers alone now receive `401 AUTH_REQUIRED`.
- Regression coverage: `tests/request-security.ts:44` asserts that same-origin browser headers do not grant access, while `tests/request-security.ts:62` keeps loopback dev auth working.

### 2. Capture Bookmarklet Attribute Injection

- Severity: Medium
- Status: Fixed
- Location: `src/screens/capture.ts:15`, `src/screens/capture.ts:150`, `src/screens/capture.ts:193`
- Impact: A crafted `/capture?t=...` URL could create stray attributes on the bookmarklet anchor after HTML parsing, including CSS that visually overlaid the page. The rendered `javascript:` link was also unusable after sanitization.
- Fix: URL-provided tokens must match the expected `cap_*_*` shape or are replaced with a fresh random token. The bookmarklet is no longer rendered as an anchor `href`; the page exposes only the copy-button flow and escapes the displayed token.
- Runtime verification: A malicious `t` value no longer creates a `FormMate Capture` anchor, no red overlay is applied, and the displayed token is regenerated into the valid `cap_*_*` format.

### 3. Health Endpoint Reconnaissance

- Severity: Low
- Status: Fixed
- Location: `api/health.ts:17`, `api/health.ts:40`
- Impact: The public health endpoint exposed feature/config booleans useful for reconnaissance.
- Fix: Detailed config health is now exposed only outside production or when `FORMMATE_EXPOSE_HEALTH_CONFIG=1` is explicitly set. Production health remains a minimal liveness response.

### 4. Google Identity CSP Mismatch

- Severity: Low
- Status: Fixed
- Location: `vercel.json:9`
- Impact: Google Identity script/frame loading could be blocked by the production CSP when Google sign-in is configured.
- Fix: The CSP now allows `https://accounts.google.com` for the required Google Identity script/connect/frame sources while keeping the rest of the script policy self-restricted.

### 5. Dev Test Access Exposure

- Severity: Low
- Status: Fixed
- Location: `src/auth/auth-service.ts:112`
- Impact: Dev test access depended partly on localhost hostname, which could expose the dev panel in a production build served from a loopback host.
- Fix: Browser dev auth now depends on Vite dev mode only.

### 6. Trusted Browser Persistence

- Severity: Defense-in-depth
- Status: Fixed
- Location: `src/auth/auth-service.ts`, `src/screens/auth.ts`
- Impact: Users needed a clear distinction between a session-only browser and a trusted browser that remains signed in across browser restarts.
- Fix: Login, OTP signup completion, Google sign-in, and dev test sign-in now honor an explicit "Remember this browser" checkbox. Unchecked sessions are stored in `sessionStorage`; checked sessions use the same normalized session shape in `localStorage`. Sign-out and account deletion clear both stores and sensitive caches.

### 7. Dependency Audit

- Severity: Medium/High transitive advisories
- Status: Partially fixed
- Location: `package-lock.json`
- Impact: `npm audit` reported advisories mostly under the development-only Vercel CLI dependency tree.
- Fix: `npm audit fix` was run twice and updated available non-breaking lockfile entries. `npm audit --audit-level=moderate` still reports 30 advisories through Vercel CLI transitive packages (`@tootallnate/once`, `ajv`, `minimatch`, `path-to-regexp`, `smol-toml`, `srvx`, `tar`, `undici`). I did not run force upgrades because npm's non-force fix path was exhausted and a forced Vercel toolchain jump should be reviewed separately.

### 8. SSRF DNS Resolution Gap

- Severity: Medium
- Status: Fixed
- Location: `api/_shared/request-security.ts`, `api/proxy/scrape.ts`, `api/proxy/google-form.ts`
- Impact: URL proxy endpoints blocked obvious private hostnames/IP literals and re-checked redirects, but did not resolve public-looking hostnames before fetching. A hostname controlled by an attacker could resolve to a loopback/private/link-local address and attempt server-side access to internal resources.
- Fix: Server-side URL validation now performs DNS resolution before fetches and redirect follow-ups, rejects any resolved private, loopback, link-local, carrier-grade NAT, benchmark, multicast, or otherwise non-public IP address, and keeps protocol/hostname checks in place. Regression coverage uses an injected resolver to simulate a public-looking hostname resolving to `127.0.0.1`.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- `npm audit fix` (twice; residual Vercel CLI advisories remain)
- `npm audit --audit-level=moderate` (fails on residual Vercel CLI transitive advisories)
- Manual repo/build scan: `.env.local` contains only Supabase URL, publishable/anon key, and `VITE_STORAGE_PROVIDER`; production text bundle scan found no `GROQ_API_KEY`, service-role key, Stripe/Resend secret, database URL, private key, or webhook signing secret. Public Supabase client routes/anon headers are present by design and rely on RLS.
- Supabase schema review: `public.formmate_user_data` has RLS enabled with owner-only select/insert/update/delete policies.
- Same-origin signed-out browser/API replay: `POST /api/ai/chat` now returns `401 AUTH_REQUIRED`.
- Loopback dev auth replay: `X-FormMate-Dev-Auth: 1` still reaches route validation in local development.
- Capture DOM replay: malicious `t` parameter no longer injects overlay CSS or stray anchor attributes.
- Route replay: public direct hits to `/docs`, `/privacy`, `/terms`, and `/examples` render directly; signed-out protected `/history` routes to `/auth` and resumes after login; signed-in direct `/history` and `/ai-chat` render; signed-in direct `/workspace` without form state safely falls back to `/dashboard`; `/totally-fake` renders the branded 404.
- 404 visual check: Playwright captured `.playwright-tmp/not-found-desktop.png` and verified title `404 | FormMate`, heading `404`, badge `Lost in the form flow`, and public nav labels.
