# AI Environment Setup

FormMate keeps `GROQ_API_KEY` server-side only through the Vercel function layer in `api/ai/*`.
Supabase auth/storage is enabled only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

## One-time project setup

1. Link the repo to the correct Vercel project:
   - `vercel link`
2. Add the secret to Vercel environments:
   - `vercel env add GROQ_API_KEY development`
   - `vercel env add GROQ_API_KEY preview`
   - `vercel env add GROQ_API_KEY production`
3. Add Supabase client env vars to Vercel environments:
   - `vercel env add VITE_SUPABASE_URL development --value "https://<project_ref>.supabase.co"`
   - `vercel env add VITE_SUPABASE_URL preview --value "https://<project_ref>.supabase.co"`
   - `vercel env add VITE_SUPABASE_URL production --value "https://<project_ref>.supabase.co"`
   - `vercel env add VITE_SUPABASE_ANON_KEY development`
   - `vercel env add VITE_SUPABASE_ANON_KEY preview`
   - `vercel env add VITE_SUPABASE_ANON_KEY production`
   - `vercel env add VITE_STORAGE_PROVIDER development --value "supabase"`
   - `vercel env add VITE_STORAGE_PROVIDER preview --value "supabase"`
   - `vercel env add VITE_STORAGE_PROVIDER production --value "supabase"`
4. Pull the server envs to your local machine:
   - `npm run env:pull`

## Local development

- Start the full stack with Vercel functions + Vite proxy:
  - `npm run dev:stack`
- Vite proxies `/api/*` to `http://127.0.0.1:3000` by default.
- If the secret changes on Vercel, re-run `npm run env:pull`.
- If Supabase auth behaves as degraded/local mode, verify `VITE_SUPABASE_ANON_KEY` is present in both local `.env.local` and Vercel envs.

## Important rules

- Do not create any `VITE_GROQ_API_KEY` or browser-exposed secret.
- Do not commit `.env.local` or `.vercel`.
- Deployment reads `GROQ_API_KEY` from Vercel runtime envs, not from client code.
