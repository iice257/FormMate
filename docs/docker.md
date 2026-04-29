# Docker

Docker gives FormMate one local contract for the Vite frontend, local API routes, auth-related environment variables, and AI proxy configuration.

## Install Docker Desktop

If `docker --version` is not available on Windows, install Docker Desktop from an elevated PowerShell:

```powershell
winget install --id Docker.DockerDesktop --exact --source winget --accept-package-agreements --accept-source-agreements
```

After installation, start Docker Desktop once so it can finish WSL setup, then open a new terminal.

## Development

Create or update `.env.local` from `.env.example`, then run:

```powershell
docker compose up --build formmate
```

Open:

- Frontend: http://localhost:5173
- Local API health: http://localhost:3000/api/health

The dev container runs the same stack as `npm run dev:stack`: the local API starts on port `3000`, then Vite starts on port `5173` and proxies `/api` requests to the API process.

## Production-like Container

Build and run the production profile:

```powershell
docker compose --profile prod up --build formmate-prod
```

Open:

- App and API: http://localhost:8080
- Health: http://localhost:8080/api/health

This profile builds the static Vite app and serves it with the same API handlers behind one Node process. It is useful for checking deployment parity before shipping.

## Environment

The compose file reads `.env.local`. Keep real secrets out of git. The important values are:

- `GROQ_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STORAGE_PROVIDER`

If auth or AI looks unavailable, check `/api/health`; in development it reports whether Groq, Supabase, auth, sync, and image parsing are configured.
