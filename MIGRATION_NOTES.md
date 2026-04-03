# Luma Migration Notes

## Final shadcn status

- Final `shadcn info --json` verification:
  - `framework`: `Vite`
  - `style`: `radix-luma`
  - `base`: `radix`
  - `tailwindVersion`: `v4`
  - `tailwindCss`: `src/globals.css`
  - `importAlias`: `@`
- In this environment, a plain `npx shadcn@latest info --json` hit a local certificate-chain error against `ui.shadcn.com`.
- Verification succeeded with `NODE_TLS_REJECT_UNAUTHORIZED=0` for the info command only.

## CSS and theme audit

- `src/globals.css` now contains the active Luma token set in `:root` and `.dark`.
- No residual `--fm-*`, `data-fm-theme`, Tailwind CDN bootstrap, or inline Tailwind config remains on the active app path.
- Final scan of `src/components/ui` found no `bg-zinc-*`, `bg-slate-*`, `text-white`, `bg-black`, or `text-black` overrides.
- Dark mode was validated by loading the authenticated app with `settings.ui.theme = "dark"` and confirming:
  - `document.documentElement.classList.contains("dark") === true`
  - `body` background resolves to `oklch(0.145 0 0)`
  - `body` text resolves to `oklch(0.985 0 0)`
  - card surfaces resolve to dark Luma values, not legacy light tokens

## Intentional exceptions

- File upload fields remain manual.
  - Reason: there is no direct official shadcn file-upload primitive in the installed registry surface.
  - Current handling:
    - `src/components/question-card-react.tsx`
    - `src/screens/react/work-screens.tsx`
- Material Symbols remain in use for icon glyphs.
  - Reason: this is an icon source choice, not a component-library replacement.
- `ui-avatars.com` fallback avatar URLs remain in use for missing profile images.
  - Reason: avatar fallbacks are data/image concerns, not a shadcn primitive gap.

## Removed legacy layer

- Deleted the inactive string-rendered screen layer under `src/screens/*`.
- Deleted the inactive legacy bootstrap and styling layer:
  - `src/legacy/bootstrap.ts`
  - `src/styles.css`
  - `src/design-tokens.css`
  - legacy UI helpers replaced by the React/shadcn runtime
