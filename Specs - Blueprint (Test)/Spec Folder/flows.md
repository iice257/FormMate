# FormMate Core User Flows

This file tracks the required sequential state behaviors for the primary platform use-cases.

## Flow 1: New Form AI Generation

1. **User Action**: Navigates to `/new`. Pastes a link (e.g., `https://greenhouse.io/job`). Clicks "Analyze".
2. **System Response**: Router mounts `/analyzing`.
3. **Execution Pipeline**:
   - Updates state: `STATE_PARSING`
   - Executes recursive DOM scraper (simulated).
   - Maps fields to component array.
   - Pings Vault (`localStorage.formMateState.vault`).
   - Pings Gemini proxy function.
4. **Transition**: Pipeline resolves `complete` -> Router mounts `/workspace`.
5. **View Update**: Workspace maps returned JSON struct against the layout rendering `Question Cards`.

## Flow 2: Authentication Handshake

1. **User Action**: Views marketing landing page (unauthenticated). Clicks `Get Started`.
2. **System Response**: Router hits `/auth`. Show login block.
3. **User Action**: Clicks `Create Account` -> fills Form -> Submits.
4. **Logic Trigger**: Function tests user lookup. Creates payload in memory.
5. **Route Fork**: 
   - If First Login: Routes to `/onboarding`.
   - If Existing token: Routes to `/dashboard`.

## Flow 3: Vault Editing & AI Feedback Loop

1. **Trigger Origin**: Inside `/workspace` viewing an AI generated question card ("What is your hometown?").
2. **Missing Information**: The AI hallucinated "Unknown" because it wasn't present.
3. **User Action**: Clicks `Profile` block or types `Ctrl+K`. Opens Vault modal/screen.
4. **User Action**: In Vault, adds generic key/value metric: `{ Key: "Hometown", Value: "Chicago" }`.
5. **Recycle Action**: User returns to workspace, clicks `Regenerate` on the specific card component.
6. **Result**: AI re-fetches updated active context and returns "Chicago".

## Flow 4: Copilot Overrides

1. **User Action**: Form field asks for a cover letter. Answer generated is 500 words. User clicks Copilot prompt "Make it shorter".
2. **System Response**: State locks editing array node. `generateText()` called sending current text and instruction.
3. **View Update**: Copilot writes user message bubble -> typing indicator animation.
4. **Completion Action**: Textarea in the main UI is replaced and `Badge` is altered to `User Edited/Copilot Modified`.

## Flow 5: Global Command Palette

1. **Trigger Listener**: App bounds globally bind `keydown(Ctrl+K)`.
2. **Modal Action**: Intercepts active DOM context and mounts floating search bar.
3. **Logic Map**: If typing `/` directly -> executes router location change instead of query filter. If query input, filters dynamic JSON sitemap routes.
