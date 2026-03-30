# FormMate Design Tokens

This document serves as the master reference for all design tokens used across the FormMate application. It maps directly to `src/design-tokens.css`.

## 1. Color Palette

### Primary (Blue)
- `--fm-primary`: `#2298da` (Base brand color)
- `--fm-primary-light`: `#4fafe7`
- `--fm-primary-dark`: `#1b7aad`
- `--fm-primary-50` to `--fm-primary-900`: Full tint/shade scale defined in CSS for hover states and backgrounds.

### Secondary / Accent
- **Cyan**: `--fm-accent` (`#06b6d4`), `--fm-accent-light`, `--fm-accent-dark`
- **Success**: `--fm-success` (`#10b981`), `--fm-success-light` (`#d1fae5`)
- **Warning**: `--fm-warning` (`#f59e0b`), `--fm-warning-light` (`#fef3c7`)
- **Error**: `--fm-error` (`#ef4444`), `--fm-error-light` (`#fee2e2`)
- **Info**: `--fm-info` (`#3b82f6`), `--fm-info-light` (`#dbeafe`)

### Surfaces & Backgrounds
- `--fm-bg`: `#eef0f6` (Main app background, off-white/gray)
- `--fm-bg-elevated`: `#ffffff` (Cards, panels, modals)
- `--fm-bg-sunken`: `#f0f0f3` (Inset areas, inactive tabs)
- `--fm-bg-overlay`: `rgba(0, 0, 0, 0.4)` (Modal backdrops)
- `--fm-surface`: `#ffffff`
- `--fm-surface-hover`: `#f8f8fa`
- `--fm-surface-active`: `#f0f0f5`

### Text
- `--fm-text`: `#0f172a` (Slate 900 - Primary headings and body)
- `--fm-text-secondary`: `#475569` (Slate 600 - Subtitles, descriptions)
- `--fm-text-tertiary`: `#94a3b8` (Slate 400 - Placeholders, disabled text)
- `--fm-text-inverse`: `#ffffff`
- `--fm-text-on-primary`: `#ffffff`
- `--fm-text-link`: `var(--fm-primary)`

### Borders
- `--fm-border`: `#e2e8f0` (Slate 200 - Default card borders)
- `--fm-border-light`: `#f1f5f9` (Slate 100 - Dividers)
- `--fm-border-strong`: `#cbd5e1` (Slate 300 - Input borders)
- `--fm-border-primary`: `rgba(34, 152, 218, 0.15)` (Focus rings, active states)

---

## 2. Shadows & Elevation

The system relies heavily on soft, diffused shadows to separate interactive cards from the `--fm-bg` background.

- `--fm-shadow-xs`: `0 1px 2px rgba(0, 0, 0, 0.04)`
- `--fm-shadow-sm`: `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)`
- `--fm-shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)`
- `--fm-shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.04)` (Modals, dropdowns)
- `--fm-shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`
- **Primary Glows**:
  - `--fm-shadow-primary`: `0 4px 14px rgba(34, 152, 218, 0.2)`
  - `--fm-shadow-primary-lg`: `0 10px 25px rgba(34, 152, 218, 0.25)`

---

## 3. Gradients & Glassmorphism

- **Primary**: `--fm-gradient-primary` (`linear-gradient(135deg, #1b7aad, #2298da, #4fafe7)`)
- **Accent**: `--fm-gradient-accent` (`linear-gradient(135deg, #06b6d4, #3b82f6)`)
- **Mesh/Aurora**: `--fm-gradient-mesh` (Radial gradient composition for landing and new-form backgrounds)
- **Glass**: 
  - `--fm-glass-bg`: `rgba(255, 255, 255, 0.7)`
  - `--fm-glass-border`: `rgba(255, 255, 255, 0.3)`
  - `--fm-glass-blur`: `16px`

---

## 4. Typography

### Font Families
- **Sans**: `--fm-font-sans` (`'Inter', system-ui, sans-serif`)
- **Mono**: `--fm-font-mono` (`'JetBrains Mono', monospace` - Used for URLs, code snippets)

### Sizing Scale (Standardized)
- `--fm-text-xs`: `0.6875rem` (11px)
- `--fm-text-sm`: `0.8125rem` (13px)
- `--fm-text-base`: `0.9375rem` (15px)
- `--fm-text-lg`: `1.125rem` (18px)
- `--fm-text-xl`: `1.3125rem` (21px)
- `--fm-text-2xl`: `1.625rem` (26px)
- `--fm-text-3xl`: `2rem` (32px)
- `--fm-text-4xl`: `2.5rem` (40px)
- `--fm-text-5xl`: `3.25rem` (52px)

### Leading (Line-Height)
- `--fm-leading-tight`: `1.15` (Headings)
- `--fm-leading-snug`: `1.3`
- `--fm-leading-normal`: `1.55` (Body copy)
- `--fm-leading-relaxed`: `1.7` (Long-form content)

### Tracking (Letter Spacing)
- `--fm-tracking-tight`: `-0.02em` (Large display headings)
- `--fm-tracking-widest`: `0.1em` (Uppercase subheadings / tags)

---

## 5. Spacing & Radii (The "Bubble" Aesthetic)

The UI relies on generous interior padding and high-radius rounding.

### Corner Radii
- `--fm-radius-sm`: `0.75rem`
- `--fm-radius-md`: `0.875rem`
- `--fm-radius-lg`: `1rem`
- `--fm-card-radius`: `1.25rem` (Standard for containers/panels)
- `--fm-radius-2xl`/`3xl`/`full`: For pills, avatars, rounded buttons.

### Spacing Scale
Follows standard Tailwind scale 1-24 mappings (`0.25rem` up to `6rem`).

---

## 6. Animation & Interaction

### Transitions
- `--fm-transition-fast`: `150ms cubic-bezier(0.16, 1, 0.3, 1)` (Hover color changes)
- `--fm-transition-normal`: `250ms cubic-bezier(0.16, 1, 0.3, 1)` (Dropdowns)
- `--fm-transition-slow`: `400ms cubic-bezier(0.16, 1, 0.3, 1)`
- `--fm-transition-spring`: `500ms cubic-bezier(0.34, 1.56, 0.64, 1)` (Modals entering, `.btn-press` scaling)

### Generic Utility Class `btn-press`
Commonly applied to all buttons in the app. Triggers a down-scale transform on `:active` state.
