# AI Environment Setup

FormMate keeps `GROQ_API_KEY` server-side only through the Vercel function layer in `api/ai/*`.

## One-time project setup

1. Link the repo to the correct Vercel project:
   - `vercel link`
2. Add the secret to Vercel environments:
   - `vercel env add GROQ_API_KEY development`
   - `vercel env add GROQ_API_KEY preview`
   - `vercel env add GROQ_API_KEY production`
3. Pull the server envs to your local machine:
   - `npm run env:pull`

## Local development

- Start the full stack with Vercel functions + Vite proxy:
  - `npm run dev:stack`
- Vite proxies `/api/*` to `http://127.0.0.1:3000` by default.
- If the secret changes on Vercel, re-run `npm run env:pull`.

## Important rules

- Do not create any `VITE_GROQ_API_KEY` or browser-exposed secret.
- Do not commit `.env.local` or `.vercel`.
- Deployment reads `GROQ_API_KEY` from Vercel runtime envs, not from client code.
