# Reusable Components — FormMate Design System

> Defined **once**. Referenced by all page specs. Do not redefine in page-level documents.

---

## 1. Buttons

### 1.1 Primary Button

- **Structure**: `<button>` with optional leading `<span class="material-symbols-outlined">` icon
- **Visual Traits**:
  - Background: `var(--fm-gradient-primary)` → `linear-gradient(135deg, #1b7aad 0%, #2298da 50%, #4fafe7 100%)`
  - Text: White (`#ffffff`), `font-bold`, `text-sm` (14px)
  - Border-radius: `rounded-xl` (1.25rem) or `rounded-full` (pill)
  - Shadow: `var(--fm-shadow-primary)` → `0 4px 14px rgba(34,152,218,0.2)`
  - Height: `h-12` (48px, default), `h-14` (56px, hero), `h-8`/`h-10` (compact)
  - Padding: `px-5` to `px-8` depending on context
- **States**:
  - Default: Gradient background, primary shadow
  - Hover: `hover:brightness-110`, shadow intensifies to `var(--fm-shadow-primary-hover)`
  - Active: `btn-press` class → slight scale-down animation
  - Disabled: `opacity-50`, `cursor-not-allowed`
  - Loading: Icon replaced with `<span class="animate-spin">sync</span>` + "Signing in..." text
- **Behavior**: Click triggers navigation or form submission. Enter key triggers same action.

### 1.2 Secondary Button

- **Visual Traits**:
  - Background: `bg-slate-100` / `bg-white/70 backdrop-blur-sm`
  - Text: `text-slate-700`, `font-bold`, `text-sm`
  - Border: `border border-slate-200`
  - Border-radius: `rounded-full` (pill variant) or `rounded-xl`
  - Shadow: `shadow-sm`
- **States**:
  - Hover: `hover:bg-slate-200` or `hover:bg-white hover:border-primary/30`
  - Active: `btn-press` scale animation
- **Used in**: "Examples", "Chat", "Help Center" pill buttons; footer links

### 1.3 Ghost / Text Button

- **Visual Traits**:
  - Background: transparent
  - Text: `text-slate-600` or `text-primary`, `font-semibold`
  - No border, no shadow
- **States**:
  - Hover: `hover:bg-slate-100` or `hover:underline`
- **Used in**: "Forgot password?", "Create one", "Skip for now →", "Sign in" toggle links

### 1.4 Dark Button

- **Visual Traits**:
  - Background: `bg-slate-900`
  - Text: White, `font-bold`, `text-sm`
  - Border-radius: `rounded-full`
  - Shadow: `shadow-lg` → `0 10px 15px rgba(0,0,0,0.07)`
- **States**:
  - Hover: `hover:bg-slate-800`, `hover:-translate-y-0.5`
- **Used in**: "Sign In" (unauthenticated), "Back" button

### 1.5 Social Login Button

- **Visual Traits**:
  - Background: `var(--fm-bg-elevated)` (white)
  - Border: `1px solid var(--fm-border)` (#e2e8f0)
  - Height: `h-11` (44px)
  - Border-radius: `rounded-xl`
  - Text: `text-xs font-semibold`, color: `var(--fm-text)`
  - Icon: Inline SVG (Google multicolor / Apple monochrome), `w-4 h-4`
  - Layout: `grid grid-cols-2 gap-3` (side by side)
- **States**:
  - Hover: subtle background shift via `transition-colors`
  - Active: `btn-press` animation

---

## 2. Inputs

### 2.1 Standard Text Input

- **Structure**: `<label>` + `<input>` stacked vertically
- **Visual Traits**:
  - Label: `text-xs font-semibold uppercase tracking-wider`, color: `var(--fm-text-secondary)` (#475569), `mb-1.5`
  - Input: `w-full h-12 px-4 rounded-xl text-sm`
  - Border: `1px solid var(--fm-border)` (#e2e8f0)
  - Background: `var(--fm-bg-elevated)` (#ffffff)
  - Text color: `var(--fm-text)` (#0f172a)
  - Placeholder: `text-slate-400`
- **States**:
  - Focus: `focus-glow` class → `var(--fm-focus-glow)` ring + border becomes `var(--fm-focus-border)`
  - Error: `ring-2 ring-red-500` + `animate-shake-horizontal`
- **Used in**: Auth page (Email, Password, Full Name), Forgot password

### 2.2 Hero URL Input (Landing / New Form)

- **Structure**: Outer container with icon + input + button
- **Visual Traits**:
  - Outer wrapper: `bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem]`
  - Shadow: `shadow-xl shadow-primary/10`
  - Border: `border border-slate-200`
  - Icon: `material-symbols-outlined "link"` positioned absolute left
  - Input: `pl-14 pr-4 h-14 rounded-full border-none bg-transparent text-base font-medium`
  - Placeholder: "Paste your form link here..."
  - Inline button: Primary style `bg-primary text-white px-5 h-14 rounded-full`
- **States**:
  - Hover (wrapper): `hover:shadow-2xl hover:shadow-primary/20`
  - Focus-within: `focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary`
  - Error: Input gets `ring-2 ring-red-500`, button turns red with error icon + message

### 2.3 Chat Textarea

- **Structure**: `<textarea>` with send button overlay
- **Visual Traits**:
  - Textarea: `rounded-xl border border-slate-200 bg-slate-50 text-sm py-3 pl-4 pr-12`
  - Min-height: 48px, max-height: 120px (auto-resizing)
  - Send button: `size-8 bg-primary text-white rounded-full` positioned absolute right
- **States**:
  - Focus: `focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary`
  - Send disabled: `disabled:opacity-50` when empty

---

## 3. Cards

### 3.1 Premium Card (`card-premium`)

- **Visual Traits**:
  - Background: White (`var(--fm-card-bg)`)
  - Border: `var(--fm-card-border)` → `2px solid #ffffff`
  - Border-radius: `var(--fm-card-radius)` → 1.25rem (20px)
  - Shadow: `shadow-sm` → `0 1px 3px rgba(0,0,0,0.06)`
  - Padding: `p-6` to `p-8`
- **States**:
  - Hover: `hover:shadow-md` → elevated shadow
- **Used in**: Feature cards, Example cards, Testimonial cards

### 3.2 Testimonial Card

- **Visual Traits**:
  - `p-6 rounded-2xl bg-white border border-slate-200 shadow-sm`
  - Quote text: `text-slate-700 text-sm leading-relaxed`
  - Author avatar: `size-10 rounded-full bg-primary/10 text-primary font-bold text-xs` (initials)
  - Author name: `text-sm font-bold text-slate-900`
  - Author role: `text-[11px] text-slate-500 font-medium`
- **Layout**: Flex column, quote on top, author info at bottom with `mt-auto`

### 3.3 Workspace Preview Card (Browser Mockup)

- **Visual Traits**:
  - Outer: `bg-white/90 backdrop-blur-md rounded-[var(--fm-card-radius)] shadow-2xl border border-slate-200`
  - Chrome bar: `bg-slate-100/50 border-b border-slate-200/60`, three dots (`.size-3 rounded-full bg-slate-300`), URL bar
  - Hover: `hover:shadow-[0_20px_60px_-15px_rgba(91,19,236,0.15)]`
  - Transition: `duration-500`

---

## 4. Navigation

### 4.1 Landing Page Nav Bar

- **Structure**: `<nav>` pill bar centered in header
- **Visual Traits**:
  - Container: `bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-full px-2.5 py-2`
  - Items: `<button>` elements, `px-6 py-2 rounded-full text-[15px] font-bold text-slate-500`
  - Hidden on mobile: `hidden md:flex`
- **States**:
  - Hover: `hover:bg-slate-100 hover:text-slate-900`

### 4.2 Sidebar Navigation (Layout)

- **Structure**: `<aside>` with stacked `<button>` nav items
- **Visual Traits**:
  - Sidebar: `w-16 lg:w-[264px]`, glassmorphism panel, `rounded-[var(--fm-card-radius)]`
  - Shadow: `shadow-[0_18px_40px_rgba(15,23,42,0.06)]`
  - Nav items: `layout-nav-pill`, `px-3 py-3 rounded-xl`, icons from Material Symbols
- **States**:
  - Active: White bg, shadow, left accent bar (primary color), icon turns primary, text turns `font-black`
  - Hover (inactive): `hover:bg-white hover:shadow-[...] hover:text-slate-900`
  - Collapsed (mobile): Icons only, labels hidden

### 4.3 Profile Pill (Header)

- **Structure**: `<button>` with avatar image + name
- **Visual Traits**:
  - `bg-slate-100/80 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full border border-slate-200`
  - Avatar: `size-7 rounded-full object-cover`
  - Name: `truncate max-w-[100px]`
- **States**:
  - Hover: `hover:bg-slate-200`
- **Behavior**: Click navigates to Accounts page

---

## 5. Modals

### 5.1 Generic Modal (`renderModal`)

- **Structure**: Fixed overlay + centered content panel
- **Visual Traits**:
  - Overlay: `bg-black/40 backdrop-blur-sm`
  - Panel: `bg-[var(--fm-bg-elevated)] rounded-2xl shadow-2xl`
  - Header: `p-6 pb-4`, title `text-xl font-bold`, close button with × icon
  - Content area: `px-6 pb-6 max-h-[70vh] overflow-y-auto`
  - Sizes: sm (max-w-sm), md (max-w-md), lg (max-w-lg), xl (max-w-xl), full (max-w-3xl)
- **States**:
  - Enter: `screenFadeIn 0.25s ease-out`
  - Exit: `screenFadeOut 0.15s ease-out`
- **Behavior**: Click overlay closes. Click × closes. ESC key closes.

### 5.2 Command Palette

- **Structure**: Fixed overlay + search panel at 15vh from top
- **Visual Traits**:
  - Overlay: `bg-slate-900/40 backdrop-blur-sm`
  - Panel: `max-w-xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200`
  - Search input: `h-14 text-lg font-medium`, search icon left, ESC kbd badge right
  - Results: List of `cmd-item` buttons with icon, title, description, chevron
  - Result items: `p-3 rounded-xl`, hover: `hover:bg-slate-100`, icon changes to primary on hover
- **Trigger**: `Ctrl+K` / `Cmd+K`
- **Behavior**: Type to filter commands. Click item to navigate. ESC or overlay click closes.

---

## 6. Tabs

### 6.1 Tab Bar (`renderTabs`)

- **Structure**: Horizontal button group in a sunken container
- **Visual Traits**:
  - Container: `flex gap-1 p-1 rounded-xl`, background: `var(--fm-bg-sunken)` (#f0f0f3)
  - Tab buttons: `flex-1 px-4 py-2 text-sm font-semibold rounded-lg`
  - Active tab: `bg-white shadow-sm`, text: `var(--fm-text)`
  - Inactive tab: no bg, text: `var(--fm-text-tertiary)`, `hover:bg-white/50`
- **Behavior**: Click switches active tab. `onChange` callback fires with index.
- **Used in**: Accounts page (Profile / Settings tabs)

---

## 7. Badges

- **Variants**:
  - Default: `bg-slate-100 text-slate-600`
  - Primary: `bg-primary/10 text-primary`
  - Success: `bg-emerald-50 text-emerald-600`
  - Warning: `bg-amber-50 text-amber-600`
  - Error: `bg-red-50 text-red-600`
  - Info: `bg-blue-50 text-blue-600`
- **Visual Traits**: `px-2 py-0.5 rounded-full text-[10px] font-bold`, optional leading icon
- **Used in**: "AI GENERATED" badge, "AUTOFILLED" badge, "VERIFIED" badge, "Active" status

---

## 8. Toast Notifications

- **Structure**: Global toast system via `toast.js`
- **Visual Traits**: Appears at top-right, auto-dismisses
- **Variants**: `toast.success()`, `toast.error()`, `toast.info()`
- **Behavior**: Appears on actions (sign in, error, regeneration). Auto-hide after timeout.

---

## 9. Accordion

- **Structure**: Stacked panels with trigger buttons
- **Visual Traits**:
  - Container: `rounded-xl border`, bg: `var(--fm-bg-elevated)`
  - Trigger: `p-4`, title `text-sm font-semibold`, expand icon rotates 180° on open
  - Content: `px-4 pb-4`, text `text-sm leading-relaxed`
- **Behavior**: Click toggle open/closed. Icon rotates.
- **Used in**: Help center FAQ sections

---

## 10. Toggle Switch

- **Structure**: Label wrapping a hidden checkbox + visual track
- **Visual Traits**:
  - Track: `w-10 h-6 rounded-full`, off: `bg-slate-300`, on: `bg-primary`
  - Thumb: `w-5 h-5 rounded-full bg-white shadow-sm`, translates right when checked
- **Used in**: Settings toggles (animations, notifications, etc.)

---

## 12. Workspace Utilities

### Question Cards (`#questions-container .bg-white`)
- **Default Structure**: White card, slate-200 border, slate-50 header block with badge, white body block with input/textarea.
- **Header Badges**:
  - **Autofilled**: Green-50 background, Green-700 text.
  - **AI Generated**: Primary-10 background, Primary text.
  - **User Edited**: Slate-200 background, Slate-600 text.
- **Interactions**:
  - Focus within input triggers border highlight (Primary color).
  - "AI Generated" cards have floating quick actions (`Shorten`, `Professional`, `Regenerate`).

### Filter Pills (`.filter-pill`)
- **Structure**: Rounded-full, white background, slate-700 text, 1.5px border, flex with 14px material icon.
- **Count Box**: Right-aligned `bg-slate-100/50` box for numbers.
- **Active State (`data-active="true"`)**: Transforms to `bg-slate-800`, text `white`, border `slate-800`.
- **Hover Pattern**: Non-active tabs flip to `bg-slate-50`, border `slate-300`.

---

## 13. Dashboard & Examples Cards

### Stat Card (`dashboard`)
- **Structure**: Border-slate-100, shadow-sm, bg-white. Left icon (colored background), right stacked text.
- **Sizing**: Icon `size-10`, text base/large.
- **Visual Mapping**: e.g., Green text for active items, Primary background for icons.

### Quick Action Card (`.action-card`)
- **Structure**: Flex col, centered, gap-2, bg-slate-50, hover:bg-white, hover:border-primary/30.
- **Animation**: `group-hover:scale-110` transform on the icon container, `transition-all duration-300` on card shadow (`hover:shadow-lg`).

### Demo Card (`.demo-card`)
- **Structure**: `rounded-2xl`, internal tag pills for categories, bottom URL bar in `font-mono`.
- **Interactions**: Arrow translates `1px` on group hover, card floats `-1px` on Y axis.
- **Color Coding**: Dynamic background/border classes from JS map (emerald, sky, rose, etc.).

---

## 14. Steppers & Sliders

### Progress Stepper (`analyzing`)
- **Structure**: Vertical flex list in the analyzing pipeline modal.
- **Visuals**: Primary color for active/completed, slate-200 for queued.
- **Interactions**: Features a continuous spinner `animate-spin` on the active item icon.

### Range Slider (`settings`)
- **Structure**: Standard HTML `<input type="range">`.
- **Visuals**: Overridden thumb (Primary color blob) and track (Slate-200). Background fills dynamically between 0 and selected value using Primary color gradient.

### Star Rating (`docs`)
- **Structure**: Group of 5 `material-symbols-outlined text-3xl`.
- **Interactions**: Default `text-slate-300`. Hover and active selection shifts to `text-amber-400`.
- **Logic**: Left-to-right filling logic (clicking star 3 fills 1, 2, and 3).

- **Variants**: `text` (stacked bars) and `card` (full card placeholder)
- **Visual Traits**: `animate-pulse`, bars with `bg-[var(--fm-bg-sunken)]`, rounded-full
- **Used in**: Loading states during data fetch

---

## Design Token Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--fm-primary` | `#2298da` | Button bg, active accents, links |
| `--fm-bg` | `#eef0f6` | Page background |
| `--fm-bg-elevated` | `#ffffff` | Cards, inputs, modals |
| `--fm-text` | `#0f172a` | Primary text |
| `--fm-text-secondary` | `#475569` | Labels, descriptions |
| `--fm-text-tertiary` | `#94a3b8` | Placeholders, hints |
| `--fm-border` | `#e2e8f0` | Default borders |
| `--fm-card-radius` | `1.25rem` (20px) | Card corners |
| `--fm-font-sans` | `'Inter', system-ui, ...` | All text |
| `--fm-transition-normal` | `250ms cubic-bezier(0.16,1,0.3,1)` | Standard animations |
| `--fm-glass-blur` | `16px` | Glassmorphism blur |
