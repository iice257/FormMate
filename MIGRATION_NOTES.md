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
  - installed components: `button`
- `src/globals.css` contains generated Luma `:root` and `.dark` tokens.
- Scan result for `src/components/ui/*.tsx`: no direct `bg-zinc-*`, `bg-slate-*`, `text-white`, or hex-color overrides were found in the generated shadcn components.

## Remaining migration work

- Replace shared custom primitives in `src/components/ui-components.ts` with shadcn components.
- Replace the custom toast system in `src/components/toast.ts` with `sonner`.
- Replace modal, tabs, toggle, accordion, tooltip, empty-state, and badge compositions with shadcn equivalents.
- Replace raw form controls and option pickers in `src/components/question-card.ts`.
- Convert layout and screen shells away from HTML-string rendering so shadcn components can be used directly.
- Remove residual `--fm-*` color tokens and hardcoded color utilities once all screens are migrated.

## Files to audit for hardcoded color/theme overrides

- `src/components/account-modal.ts`
- `src/components/layout.ts`
- `src/components/question-card.ts`
- `src/components/toast.ts`
- `src/components/ui-components.ts`
- `src/styles.css`
- `src/design-tokens.css`
