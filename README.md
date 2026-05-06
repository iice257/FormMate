# FormMate

FormMate is an AI-assisted form workspace for importing public forms, extracting questions, drafting answers, and letting the user review or edit everything before use. The current app is a React/Vite frontend with local API handlers for AI chat, voice transcription, image parsing, Google Form scraping, auth health, and security checks.

## Current Status

- Frontend: React 19, Vite, Tailwind, legacy DOM-rendered screens mounted inside React.
- API: local Node/Vercel-compatible handlers under `api/`.
- Storage/auth: Supabase-backed sync when configured, with local browser fallback paths.
- AI: Groq-backed chat, transcription, and vision/image parsing when `GROQ_API_KEY` is set.
- Deployment: Vercel and Docker paths exist.
- Tests: parser fixtures, parser buckets, chat contract, request security, safe HTML, and Playwright e2e.

The app is intentionally useful without AI keys: users can still navigate, authenticate when Supabase is configured, import/review stored form data, edit answers, and use non-AI screens. AI-only controls now explain when `GROQ_API_KEY` is missing instead of failing silently.

## Local Development

```bash
npm install
npm run dev
```

The dev stack starts:

- Frontend: `http://localhost:5173/`
- Local API: `http://127.0.0.1:3000/api/health`

Useful checks:

```bash
npm run typecheck
npm test
npm run audit:a11y
```

`npm run audit:a11y` writes `docs/current-accessibility-audit.md` from the current TypeScript source. It is a heuristic audit, not a full accessibility certification.

## Environment

Copy `.env.example` to `.env.local` for local work.

Required for AI features:

- `GROQ_API_KEY`: enables chat, answer generation, voice transcription, image parsing, and vision context.

Optional AI model overrides:

- `FORMMATE_IMAGE_MODEL`
- `FORMMATE_IMAGE_MODELS`
- `FORMMATE_CHAT_VISION_MODEL`
- `FORMMATE_CHAT_VISION_MODELS`

Required for Supabase auth/sync:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STORAGE_PROVIDER=supabase`

Local API proxy:

- `VITE_API_PROXY_TARGET=http://127.0.0.1:3000`
- `FORMMATE_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

## What Works Without API Keys

- Landing, docs, examples, dashboard, and navigation.
- Manual form URL intake and non-AI review flows.
- Local storage fallback when Supabase is not selected.
- Current-source accessibility audit.
- Typecheck and unit/security test suite.

## What Needs Provider Keys

- AI chat and generated answers need `GROQ_API_KEY`.
- Voice transcription needs `GROQ_API_KEY`.
- Screenshot/image form extraction needs `GROQ_API_KEY` and a vision-capable model.
- Supabase auth/sync needs Supabase URL and anon key.

## Product Guardrails

FormMate is built for user-supervised productivity, not bulk submission or spam. Keep the review step explicit, avoid automatic submission until the real automation path is safe, and keep server-side limits in place for AI and proxy routes.
