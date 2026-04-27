# Signed-Out Surface Security Fix Report

## Executive Summary

Two signed-out surface findings were fixed:

1. API routes no longer accept same-origin browser headers as proof of authentication.
2. The assisted capture page no longer renders a URL-derived bookmarklet into an HTML `href`, and capture tokens are normalized before display/use.

## Fixed Findings

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

## Verification

- `npm run typecheck`
- `npm test`
- Same-origin signed-out browser/API replay: `POST /api/ai/chat` now returns `401 AUTH_REQUIRED`.
- Loopback dev auth replay: `X-FormMate-Dev-Auth: 1` still reaches route validation in local development.
- Capture DOM replay: malicious `t` parameter no longer injects overlay CSS or stray anchor attributes.
