# Auth Provider Setup

## Supabase Email OTP

Use Supabase Auth with FormMate's in-app OTP screen.

Required Supabase settings:

- Authentication > Providers > Email: enable Email provider.
- Authentication > Email Templates: update the Confirm signup or Magic Link template to show `{{ .Token }}`.
- Authentication > SMTP Settings: configure a production SMTP provider before launch.
- Authentication > URL Configuration:
  - Site URL: `https://form-mate-ai.vercel.app`
  - Redirect URLs: `https://form-mate-ai.vercel.app/auth`
  - Local Redirect URL: `http://localhost:5173/auth`

The app accepts either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Google OAuth

Do not use the Supabase OAuth Server page for Google login. That page is for making Supabase act as an OAuth provider for third-party apps.

Use this path instead:

1. Google Cloud Console > APIs & Services > OAuth consent screen:
   - Configure the app name, support email, authorized domains, and publishing status.
2. Google Cloud Console > APIs & Services > Credentials:
   - Create an OAuth Client ID.
   - Application type: Web application.
   - Authorized JavaScript origins:
     - `https://form-mate-ai.vercel.app`
     - `http://localhost:5173`
   - Authorized redirect URI:
     - `https://chrrljkxnpuqdhhptntc.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers > Google:
   - Enable Google.
   - Paste the Google OAuth Client ID.
   - Paste the Google OAuth Client Secret.
   - Save.
4. Supabase Dashboard > Authentication > URL Configuration:
   - Ensure `https://form-mate-ai.vercel.app/auth` and `http://localhost:5173/auth` are allowed redirect URLs.

If Google returns `Unsupported provider: provider is not enabled`, the app is working but Supabase's Google provider is not enabled or is missing its Google Client ID/Secret.

## Google One Tap and Automatic Sign-In

FormMate also supports Google Identity Services:

- Landing page: automatic Google sign-in is requested with One Tap `auto_select`.
- Auth page: Google One Tap is shown without automatic selection.
- Sign-out calls Google's `disableAutoSelect()` hook to prevent immediate re-login loops.

Required app env:

- `VITE_GOOGLE_CLIENT_ID`: the same Google Web OAuth Client ID configured in Supabase's Google provider.

Required Google Cloud OAuth client settings:

- Authorized JavaScript origins:
  - `https://form-mate-ai.vercel.app`
  - `http://localhost:5173`
- Authorized redirect URI:
  - `https://chrrljkxnpuqdhhptntc.supabase.co/auth/v1/callback`

If `VITE_GOOGLE_CLIENT_ID` is missing, One Tap/automatic sign-in is skipped silently and standard email/Google redirect sign-in remains available.

## Provider Decision

Keep Supabase Auth for now. It supports custom OTP screens, custom email templates, custom SMTP, and Send Email Hooks. If we later need fully controlled transactional auth emails outside Supabase's template system, use Supabase Send Email Hook with Resend/Postmark rather than replacing the whole auth provider.
