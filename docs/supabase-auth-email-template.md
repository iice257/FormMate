# Supabase Auth Email Template

FormMate uses an in-app OTP verification screen for new account creation. The Supabase email template must expose the one-time code so users do not land on a Supabase-branded confirmation page.

## Confirmation / Magic Link Template

Use a short branded template in Supabase Auth email settings and include the token directly:

```html
<h2>Verify your FormMate account</h2>
<p>Use this code to finish creating your account:</p>
<p style="font-size: 28px; font-weight: 800; letter-spacing: 0.24em;">{{ .Token }}</p>
<p>This code expires soon. If you did not request it, you can ignore this email.</p>
```

Keep the action link available only as a fallback if needed:

```html
<p style="font-size: 12px; color: #64748b;">
  If the code does not work, use this secure fallback link:
  <a href="{{ .ConfirmationURL }}">Verify account</a>
</p>
```

Do not use Supabase's default branded copy in production.
