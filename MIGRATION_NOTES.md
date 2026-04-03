# FormMate shadcn Luma Migration Notes

## Initial audit

### `npx shadcn@latest info --json` before initialization

```json
{
  "project": {
    "framework": "Vite",
    "frameworkName": "vite",
    "frameworkVersion": null,
    "srcDirectory": true,
    "rsc": false,
    "typescript": true,
    "tailwindVersion": null,
    "tailwindConfig": null,
    "tailwindCss": null,
    "importAlias": null
  },
  "config": null,
  "components": [],
  "links": {
    "docs": "https://ui.shadcn.com/docs",
    "components": "https://ui.shadcn.com/docs/components/radix/[component].md",
    "ui": "https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/radix/ui/[component].tsx",
    "examples": "https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/radix/examples/[component]-example.tsx",
    "schema": "https://ui.shadcn.com/schema.json"
  }
}
```

### Repo state before initialization

- The repo was not an initialized shadcn project.
- There was no `components.json`.
- There was no `src/components/ui`.
- There was no Tailwind v4 stylesheet entry.
- Theme tokens lived in `src/design-tokens.css` under `--fm-*`.
- Dark mode used `[data-fm-theme="dark"]` selectors in `src/design-tokens.css` and `src/styles.css`.
- UI rendering was still driven by HTML-string screen modules mounted from `src/legacy/bootstrap.ts`.

## Environment notes

- The shadcn preset fetch initially failed with `self-signed certificate in certificate chain`.
- Initialization succeeded only after a temporary `NODE_TLS_REJECT_UNAUTHORIZED=0` override for the CLI process.
- This workaround was limited to CLI fetches and did not change repository code or global npm config.

## Current initialized state

- `components.json` now exists and resolves to `style: "radix-luma"`.
- `npx shadcn@latest info --json` now reports:
  - Tailwind v4
  - `tailwindCss: "src/globals.css"`
  - `importAlias: "@"`
  - installed components now include:
    - `accordion`
    - `alert`
    - `avatar`
    - `badge`
    - `breadcrumb`
    - `button`
    - `card`
    - `checkbox`
    - `command`
    - `dialog`
    - `drawer`
    - `dropdown-menu`
    - `input`
    - `input-group`
    - `label`
    - `popover`
    - `progress`
    - `radio-group`
    - `scroll-area`
    - `select`
    - `separator`
    - `sheet`
    - `sidebar`
    - `skeleton`
    - `slider`
    - `sonner`
    - `switch`
    - `tabs`
    - `textarea`
    - `toggle`
    - `toggle-group`
    - `tooltip`
- `src/globals.css` contains generated Luma `:root` and `.dark` tokens.
- Scan result for `src/components/ui/*.tsx`: no direct `bg-zinc-*`, `bg-slate-*`, `text-white`, or hex-color overrides were found in the generated shadcn components.
- Generated overlays were normalized away from `bg-black/30` to token-backed `bg-foreground/20` in:
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/drawer.tsx`
  - `src/components/ui/sheet.tsx`
- The legacy account modal DOM builder has been replaced with a React host in `src/components/account-modal-host.tsx` that renders shadcn `Dialog`, `Tabs`, `Input`, `Textarea`, `Slider`, `Switch`, `Accordion`, `Button`, and related primitives.

## Remaining migration work

- Replace shared custom primitives in `src/components/ui-components.ts` with shadcn components.
- `src/components/toast.ts` now proxies `sonner`, but callers still use the legacy wrapper path.
- Replace the remaining custom modal/tabs/toggle/accordion/tooltip/empty-state/badge helpers in `src/components/ui-components.ts` and the screens that still depend on them.
- Replace raw form controls and option pickers in `src/components/question-card.ts`.
- Continue moving high-impact screens onto the hybrid React route path added in `src/router.ts` so shadcn components can be rendered directly without rewriting state and navigation storage first.
- Remove the remaining hardcoded literals concentrated in:
  - `src/styles.css`
  - `src/components/layout.ts`
  - `src/components/question-card.ts`
  - `src/components/ui-components.ts`
  - `src/screens/workspace.ts`
  - `src/screens/docs.ts`
  - `src/screens/ai-chat.ts`
  - `src/screens/history.ts`
- Replace the remaining raw buttons and form controls concentrated in:
  - `src/screens/accounts.ts`
  - `src/screens/landing.ts`
  - `src/screens/docs.ts`
  - `src/screens/workspace.ts`
  - `src/screens/auth.ts`
  - `src/components/layout.ts`
  - `src/screens/help.ts`
  - `src/screens/new-form.ts`
  - `src/screens/ai-chat.ts`
  - `src/screens/onboarding.ts`
  - `src/components/question-card.ts`
  - `src/screens/success.ts`
  - `src/screens/review.ts`
  - `src/screens/analyzing.ts`
  - `src/screens/pricing.ts`
  - `src/components/ui-components.ts`
  - `src/screens/history.ts`
  - `src/screens/analytics.ts`
  - `src/screens/capture.ts`
  - `src/screens/dashboard.ts`
  - `src/screens/vault.ts`

## Files to audit for hardcoded color/theme overrides

- `src/components/account-modal-host.tsx`
- `src/components/layout.ts`
- `src/components/question-card.ts`
- `src/components/toast.ts`
- `src/components/ui-components.ts`
- `src/styles.css`
- `src/design-tokens.css`
- `src/screens/workspace.ts`
- `src/screens/docs.ts`
- `src/screens/ai-chat.ts`
- `src/screens/history.ts`
