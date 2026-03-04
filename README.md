# FormMate

FormMate is a lightweight AI-assisted form companion that scaffolds answers and helps users complete tedious web forms faster. Users paste a form URL, converse via voice or text, and the AI suggests or fills responses that the user can review, regenerate, or edit. It’s designed for productivity and controlled automation, not bulk submission or spam.

The focus is on:

* reducing repetitive typing
* maintaining user oversight
* working with dynamic web forms
* clean, minimal web UI
* AI-driven suggestion and scaffolding

## Design Ideas

### Visual Style

* Apple-inspired minimalism
* lots of whitespace
* subtle shadows and card layouts
* dark/light mode toggle (but default light for simplicity)
* rounded corners and gentle micro-interactions

### UX Flow

1. paste form URL
2. form questions load (parsed dynamically)
3. AI scaffolds answers
4. user reviews or edits
5. fill fields
6. submit (user initiated)

### Interaction Patterns

* voice input (optional)
* chat-style conversation
* regenerate single fields or entire response sets
* one-click field suggestions
* preview before fill

### Accessibility

* keyboard friendly
* screen reader considerations
* high contrast options
* simple typography

## Tech Stack

### Frontend

* React (or lightweight alternative)
* Tailwind (or simple CSS)
* Playwright (for form DOM interaction)
* Web Speech API (voice, optional)

### AI Layer

* Gemini 3 Flash API (primary)
* fallback to Gemini 2.5 or open-weight model if rate limited
* prompt scaffolding with structured outputs

### Architecture

* browser automation for field discovery
* DOM parsing for question extraction
* user approval layer
* no server-heavy persistence (privacy focused)

### Data

* session-based only
* no long-term storage by default
* user controls submission

## Features (MVP)

* form URL input
* dynamic question detection
* AI answer suggestions
* regenerate per field
* voice or text input
* review step before fill
* clean responsive UI

## Design Notes

* keep it small
* avoid feature bloat
* prioritize reliability
* user always in control
* no bulk automation

## Future Ideas

* templates for common forms
* answer history (opt-in)
* collaborative form filling
* exportable data sets
* plugin system

---

