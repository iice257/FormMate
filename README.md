# FormMate — fill any form in seconds

Paste a form link. FormMate reads every question, drafts the answers, and fills it for you. You approve before anything is submitted.

![FormMate](docs/media/hero.png)

Talk to it by voice or text, regenerate any single answer, and review the whole thing before it touches the form. Built for the tedious forms, not for spam.

**[Try it →](https://form-mate-ai.vercel.app)** · React · TypeScript · Groq · Supabase

---

## What it does

- **Reads any public form.** A URL-intake + DOM parser extracts questions, types and options, with adapters for plain HTML, captured pages and screenshots
- **Drafts answers** with an LLM, using your conversation as context
- **Voice or text.** Speak your answers; they're transcribed server-side
- **Per-field control.** Regenerate, edit or lock individual answers
- **You submit.** Nothing is sent without your review

## How it works

- `src/parser/`: URL intake, DOM parsing, normalization and provider detection that turn a form into a typed schema
- `api/ai/`: Vercel functions for chat, transcription and image context. The Groq API key lives server-side only
- `api/parser/`: image-based extraction for forms that can't be read from HTML
- Supabase for auth and saved sessions, with a local-only fallback when it isn't configured

## Run it

```bash
npm install
npm run env:pull   # pulls GROQ_API_KEY and Supabase vars from Vercel
npm run dev
```

Setup details in [AI_ENV_SETUP.md](AI_ENV_SETUP.md). Tests: `npm test` (chat contract + parser fixtures), `npm run test:e2e` (Playwright).

## Built with

React 19, TypeScript, Vite, Tailwind CSS, Vercel Functions, Groq, Supabase, Playwright.

MIT © [Kingsley Aremu](https://github.com/iice257)
