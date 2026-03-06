# FormMate

FormMate is a lightweight AI-assisted form companion that scaffolds answers and helps users complete web forms faster while keeping human approval at every step.

## Current build

This repository now includes a runnable single-page prototype with:

- Form URL entry and simulated field discovery
- Chat-style context input (text + optional voice via Web Speech API)
- AI-like suggested answers per question
- Per-question regenerate + approval toggles
- Regenerate all, review summary, and fill-ready status checks
- Light/dark mode toggle

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173> in your browser.

## Files

- `index.html` – semantic app layout and controls
- `styles.css` – minimal Apple-inspired styling and responsive behavior
- `app.js` – UI state, interactions, and simulated suggestion flow
