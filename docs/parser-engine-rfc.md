# FormMate Parser Engine RFC

## Status

Proposed

## Purpose

Define a versioned parsing contract and rollout plan for FormMate's form understanding engine so the parser can evolve beyond the current `formData.questions[]` model without breaking the existing analysis, workspace, and answer-generation flows.

This RFC is implementation-oriented. It is meant to be specific enough to code against in this repository.

## Current repo reality

The current parser contract is simple and tightly coupled:

- [`src/parser/form-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\form-parser.ts) returns a flat `{ title, description, questions[] }` shape with some extra metadata.
- [`src/parser/dom-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\dom-parser.ts) does deterministic field extraction.
- [`src/parser/capture-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\capture-parser.ts) converts bookmarklet capture payloads into the same flat shape.
- [`src/ai/field-classifier.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\ai\field-classifier.ts) mixes semantic inference with fillability decisions.
- [`src/ai/ai-actions.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\ai\ai-actions.ts) assumes every field is a legacy `question`.
- [`src/state.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\state.ts), [`src/screens/analyzing.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\screens\analyzing.ts), and [`src/screens/workspace.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\screens\workspace.ts) persist and render that flat model directly.

That contract is good enough for the current UI, but not good enough for:

- blocked vs unsupported vs partial outcomes
- multi-step or conditional forms
- stable field identity across reruns
- provenance-heavy classification
- provider adapters
- image-derived parsing
- gradual rollout of richer semantics without breaking the workspace

## Goals

The new parser contract must:

- represent full, partial, blocked, and unsupported outcomes explicitly
- separate observed structure from inferred semantics and fill policy
- keep enough compatibility for the existing workspace to keep running
- support provider-specific adapters without forking the whole pipeline
- preserve evidence and confidence for major conclusions
- support image/capture-derived parses as first-class acquisition modes
- allow benchmark-driven iteration

## Non-goals

This RFC does not define:

- browser automation for filling fields
- final submission automation
- model prompts for answer generation
- long-term storage design for screenshots or PII
- every possible semantic category on day 1

## Design principles

1. Parser truth first.
   The parser should record what was actually observed before it records what it thinks a field means.

2. Controlled degradation.
   Partial success is valid. False confidence is not.

3. Compatibility before rewrite.
   The richer schema should ship behind an adapter that still emits the current `questions[]` shape until the rest of the app is migrated.

4. Evidence over magic.
   Semantic decisions should be explainable from labels, attributes, nearby text, options, structure, or model inference.

5. Provider-agnostic core.
   Adapters should improve extraction, not replace the canonical model.

## Proposed parser contract

The parser should return a versioned parse envelope instead of returning the form object directly.

```ts
export type ParserSchemaVersion = 'parser.v1';

export type ParseStatus =
  | 'success'
  | 'partial'
  | 'blocked'
  | 'unsupported'
  | 'no_form'
  | 'error';

export type CompletenessStatus =
  | 'complete'
  | 'visible_step_only'
  | 'future_steps_unknown'
  | 'blocked_before_form'
  | 'partial_structure'
  | 'empty';

export type SourceType =
  | 'html'
  | 'capture'
  | 'image'
  | 'adapter'
  | 'demo';

export type ProviderType =
  | 'google_forms'
  | 'typeform'
  | 'jotform'
  | 'tally'
  | 'surveymonkey'
  | 'qualtrics'
  | 'workday'
  | 'plain_html'
  | 'custom_unknown'
  | 'demo';

export type BlockedReason =
  | 'auth_required'
  | 'paywall'
  | 'captcha'
  | 'network_block'
  | 'cross_origin_iframe'
  | 'interaction_required'
  | 'access_denied'
  | 'unknown';

export type UnsupportedReason =
  | 'unsupported_widget'
  | 'insufficient_structure'
  | 'unparseable_markup'
  | 'provider_not_supported'
  | 'image_incomplete'
  | 'future_steps_not_visible'
  | 'ambiguous_fields'
  | 'unknown';

export type NextAction =
  | 'none'
  | 'use_capture'
  | 'upload_screenshots'
  | 'continue_to_next_step'
  | 'manual_review'
  | 'provide_file'
  | 'retry';

export interface ParseEnvelopeV1 {
  schemaVersion: ParserSchemaVersion;
  parseId: string;
  createdAt: string;
  acquisition: ParseAcquisition;
  outcome: ParseOutcome;
  form: CanonicalForm | null;
  compatibility: LegacyFormData | null;
  diagnostics: ParseDiagnostics;
}

export interface ParseDiagnostics {
  httpStatus?: number;
  authSignal: boolean;
  renderSignal: boolean;
  aiFallbackUsed: boolean;
  extractionWarnings: string[];
  timingsMs?: Record<string, number>;
}
```

## Acquisition model

```ts
export interface ParseAcquisition {
  sourceType: SourceType;
  sourceUrl?: string;
  normalizedUrl?: string;
  finalUrl?: string;
  provider: ProviderType;
  adapterKey: string;
  fetchStrategy?: string;
  artifactIds?: string[];
  pageHash?: string;
  imageCount?: number;
}
```

This folds together the metadata currently spread across `source`, `parseStrategy`, and `diagnostics`.

## Outcome model

```ts
export interface ParseOutcome {
  status: ParseStatus;
  completeness: CompletenessStatus;
  blockedReason?: BlockedReason;
  unsupportedReasons: UnsupportedReason[];
  warnings: ParserMessage[];
  nextAction: NextAction;
  nextStepRequired: boolean;
  nextStepHint?: string;
  confidence: ConfidenceSummary;
}

export interface ParserMessage {
  code: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  fieldId?: string;
  sectionId?: string;
}

export interface ConfidenceSummary {
  overall: number;
  fieldDetection: number;
  uiClassification: number;
  semanticClassification: number;
  fillPolicy: number;
  completeness: number;
}
```

`overall` is allowed, but it must be derived from lower-level confidence dimensions, not invented on its own.

## Canonical form model

```ts
export interface CanonicalForm {
  id: string;
  title: string;
  description?: string;
  sections: CanonicalSection[];
  visibilityRules: VisibilityRule[];
  locator: FormLocator;
  metrics: FormMetrics;
}

export interface CanonicalSection {
  id: string;
  title?: string;
  description?: string;
  order: number;
  fields: CanonicalField[];
  visibilityRules: VisibilityRule[];
  confidence: number;
}

export interface CanonicalField {
  id: string;
  stableKey: string;
  order: number;
  label: string;
  normalizedLabel: string;
  rawTexts: string[];
  observed: ObservedField;
  inferred: InferredField;
  fillPolicy: FillPolicy;
  visibilityRules: VisibilityRule[];
  warnings: ParserMessage[];
  unsupportedReason?: UnsupportedReason;
}
```

### Observed field layer

```ts
export type UIType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multi_select'
  | 'file'
  | 'rating'
  | 'matrix'
  | 'custom_widget'
  | 'unknown';

export interface ObservedField {
  uiType: UIType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options: FieldOption[];
  validationRules: ValidationRule[];
  locatorHints: FieldLocator;
  provenance: Evidence[];
  confidence: {
    detected: number;
    uiType: number;
  };
}

export interface FieldOption {
  value?: string;
  label: string;
  order: number;
  selected?: boolean;
}

export interface ValidationRule {
  type:
    | 'required'
    | 'min_length'
    | 'max_length'
    | 'min'
    | 'max'
    | 'pattern'
    | 'email'
    | 'tel'
    | 'url'
    | 'file_type'
    | 'file_size'
    | 'custom';
  value?: string | number | boolean;
  source: EvidenceSource;
}
```

### Inferred field layer

```ts
export type SemanticCategory =
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'gender'
  | 'address'
  | 'country'
  | 'company'
  | 'role'
  | 'salary_expectation'
  | 'availability'
  | 'experience_years'
  | 'cover_letter'
  | 'resume_upload'
  | 'portfolio_url'
  | 'linkedin_url'
  | 'free_text_bio'
  | 'consent'
  | 'unknown';

export interface InferredField {
  semanticCategory: SemanticCategory;
  semanticCandidates: SemanticCandidate[];
  confidence: {
    semanticCategory: number;
  };
}

export interface SemanticCandidate {
  category: SemanticCategory;
  score: number;
  evidenceIds: string[];
}
```

### Fill policy layer

This intentionally replaces the earlier overloaded `answerStrategy`.

```ts
export type FillSource =
  | 'profile'
  | 'vault'
  | 'ai'
  | 'user'
  | 'file'
  | 'unsupported';

export type FillMode =
  | 'auto'
  | 'suggest'
  | 'manual';

export interface FillPolicy {
  source: FillSource;
  mode: FillMode;
  requiresConfirmation: boolean;
  rationale: string;
  confidence: {
    fillPolicy: number;
  };
}
```

Interpretation:

- `source` answers where the data should come from
- `mode` answers how the product should behave
- `requiresConfirmation` is a guardrail, not a strategy

## Provenance and evidence

Every major inference should be backed by evidence entries.

```ts
export type EvidenceSource =
  | 'input_type'
  | 'autocomplete'
  | 'name_attr'
  | 'id_attr'
  | 'label_text'
  | 'placeholder'
  | 'nearby_text'
  | 'section_context'
  | 'option_text'
  | 'aria'
  | 'adapter'
  | 'model';

export interface Evidence {
  id: string;
  source: EvidenceSource;
  value: string;
  weight: number;
  notes?: string;
}
```

The parser should never emit semantic or fillability conclusions without storing at least one evidence record.

## Locators and stable identity

Field identity must survive reruns better than `id: "1"`.

```ts
export interface FieldLocator {
  css?: string[];
  xpath?: string[];
  labelPath?: string[];
  framePath?: string[];
  controlName?: string;
  controlId?: string;
  adapterNodeId?: string;
}

export interface FormLocator {
  css?: string[];
  framePath?: string[];
  adapterNodeId?: string;
}
```

`stableKey` should be a deterministic fingerprint derived from:

- normalized label
- control name or id when present
- section title
- option signature for choice fields
- provider/adapter context

It should not depend only on array order.

## Conditional and multi-step model

```ts
export interface VisibilityRule {
  type: 'show_if' | 'hide_if' | 'step_gate' | 'unknown';
  dependsOnFieldId?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'present' | 'absent';
  value?: string;
  notes?: string;
}

export interface FormMetrics {
  detectedFieldCount: number;
  actionableFieldCount: number;
  visibleFieldCount: number;
  hiddenFieldCount: number;
  sectionCount: number;
}
```

If future steps are inferred but not visible:

- `outcome.status` should usually be `partial`
- `outcome.completeness` should be `visible_step_only` or `future_steps_unknown`
- `outcome.nextStepRequired` should be `true`
- `outcome.nextAction` should be `continue_to_next_step` or `upload_screenshots`

## Legacy compatibility contract

The existing app still expects this shape:

```ts
export interface LegacyFormData {
  title: string;
  description?: string;
  url?: string;
  source?: string;
  parseStrategy?: string;
  authRequired?: boolean;
  supportState?: string;
  diagnostics?: Record<string, unknown>;
  questions: LegacyQuestion[];
}

export interface LegacyQuestion {
  id: string;
  text: string;
  type: string;
  required?: boolean;
  options?: string[];
}
```

Phase 1 must preserve this shape through a dedicated compatibility adapter:

```ts
export function toLegacyFormData(parse: ParseEnvelopeV1): LegacyFormData
```

Compatibility mapping rules:

- top-level `title`, `description`, `url`, `source`, `parseStrategy` come from `form` plus `acquisition`
- `questions[]` is a flattened projection of all visible canonical fields
- `LegacyQuestion.id` should use `CanonicalField.id`
- `LegacyQuestion.text` maps from `label`
- `LegacyQuestion.type` maps from `observed.uiType`
- `options[]` maps from `observed.options[].label`
- `authRequired` is derived from `outcome.blockedReason === 'auth_required'`

## Recommended module layout

Add parser-specific types and adapters instead of growing the existing files indefinitely.

```txt
src/parser/
  schema.ts
  status.ts
  compat.ts
  normalize.ts
  evidence.ts
  adapters/
    google-forms.ts
    plain-html.ts
    capture.ts
    image.ts
```

Suggested responsibilities:

- `schema.ts`: canonical types and enums
- `status.ts`: outcome builders and user-facing parser messages
- `compat.ts`: conversion into current `formData.questions[]`
- `normalize.ts`: stable keys, label normalization, option normalization
- `evidence.ts`: evidence creation helpers and confidence aggregation
- `adapters/*`: provider-specific extraction

## Parser pipeline in this repo

### Phase A: acquisition

Current owners:

- `parseFormUrl` in [`src/parser/form-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\form-parser.ts)
- scrape proxy in [`api/proxy/scrape.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\api\proxy\scrape.ts)
- Google proxy in `api/proxy/google-form.ts`
- capture intake in [`src/screens/capture.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\screens\capture.ts)

Required upgrade:

- acquisition must return structured metadata even when parsing fails
- blocked states should be generated here when possible

### Phase B: detection and adapter routing

Current owner:

- `detectFormPlatform` in [`src/parser/form-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\form-parser.ts)

Required upgrade:

- separate provider detection from adapter selection
- allow adapters to declare confidence and fallback order

### Phase C: structural extraction

Current owner:

- [`src/parser/dom-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\parser\dom-parser.ts)

Required upgrade:

- emit sections, stable keys, locators, evidence, and validation clues
- detect repeated groups, hidden sections, choice groups, and partial visibility

### Phase D: semantic inference

Current owner:

- [`src/ai/field-classifier.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\ai\field-classifier.ts)

Required upgrade:

- split semantic classification from fill policy mapping
- emit top-k semantic candidates
- store evidence references

### Phase E: compatibility and UI delivery

Current owners:

- [`src/screens/analyzing.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\screens\analyzing.ts)
- [`src/state.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\state.ts)
- [`src/screens/workspace.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\src\screens\workspace.ts)

Required upgrade:

- state should eventually store both `parseResult` and `formData`
- the workspace should keep using `formData` until canonical rendering is ready

## Migration plan

### Phase 0: type introduction

Deliverables:

- add `src/parser/schema.ts`
- add `src/parser/compat.ts`
- define `ParseEnvelopeV1`
- no UI changes yet

Acceptance:

- no behavior regression in the current analyze-to-workspace flow

### Phase 1: wrap existing parser results

Deliverables:

- make `parseFormUrl` return `ParseEnvelopeV1`
- generate `compatibility` using `toLegacyFormData`
- update `analyzing.ts` to store both:
  - `parseResult`
  - `formData: parseResult.compatibility`

Acceptance:

- `workspace.ts` and `question-card.ts` continue to render without schema awareness
- blocked and partial states are surfaced from `outcome` instead of ad hoc error codes

### Phase 2: upgrade structural extraction

Deliverables:

- refactor `dom-parser.ts` to emit canonical sections and fields
- derive stable keys and locator hints
- create evidence records from HTML attributes and text sources

Acceptance:

- current fixtures still pass
- new tests assert section counts, evidence presence, and stable key generation

### Phase 3: semantic inference split

Deliverables:

- replace `categorizeField(question)` with:
  - semantic inference over canonical fields
  - fill policy mapping over semantic results plus profile/vault
- keep a legacy shim for `workspace.ts` until that screen is migrated

Acceptance:

- AI-generation routing still works
- manual-only vs autofill vs AI-suggest remains stable or improves on fixture corpus

### Phase 4: blocked, partial, and next-step UX

Deliverables:

- `analyzing.ts` reads `ParseEnvelopeV1.outcome`
- capture/image prompts are driven by `nextAction`
- partial parses store warnings and next-step hints in history/state

Acceptance:

- auth walls, JS shells, and partial forms no longer rely on string-matching UI behavior

### Phase 5: native canonical consumers

Deliverables:

- workspace, review, and history consume canonical fields directly
- legacy `questions[]` becomes optional

Acceptance:

- compatibility adapter can be removed only after all current consumers are migrated

## Benchmark and test plan

The benchmark must move from demos to gold fixtures.

### Current baseline

- HTML fixtures in [`fixtures`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\fixtures)
- parser stress script in [`test-dom-parser.ts`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\test-dom-parser.ts)
- demo status file in [`docs/parsing-example-status.json`](C:\Users\ngaremuki\OneDrive - NESTLE\Documents\Misc\Code files\Repositories\FormMate\docs\parsing-example-status.json)

### Required additions

Add fixture groups for:

- plain HTML contact forms
- job applications
- Google Forms public
- blocked auth walls
- JS-only shells
- multi-step visible-step-only forms
- conditional reveal forms
- file upload forms
- screenshot-derived forms
- malformed HTML forms

Add gold outputs for each fixture:

```txt
fixtures/
  parser/
    plain-html-contact.html
    plain-html-contact.expected.json
    workday-auth-wall.html
    workday-auth-wall.expected.json
```

### Metrics to track

- field detection precision and recall
- label extraction accuracy
- UI type accuracy
- semantic top-1 and top-3 accuracy
- blocked/unsupported classification accuracy
- false confidence rate
- partial-parse usefulness

False confidence rate matters more than raw coverage. A confidently wrong parser is worse than a partial parser with explicit warnings.

## Acceptance criteria

The parser RFC is considered implemented for `parser.v1` when all of the following are true:

1. `parseFormUrl` returns a versioned parse envelope for URL, capture, and demo flows.
2. The envelope distinguishes `success`, `partial`, `blocked`, `unsupported`, `no_form`, and `error`.
3. Canonical fields include stable identity, locators, evidence, UI type, semantic inference, and fill policy.
4. A compatibility adapter produces the current `formData.questions[]` shape without breaking the existing workspace.
5. `analyzing.ts` uses structured outcome data instead of only thrown error codes for blocked and render-required flows.
6. Existing fixtures continue to pass.
7. New gold-fixture tests cover blocked, partial, conditional, and file-upload cases.
8. The parser stores enough metadata for history and debugging to explain why a parse was partial or blocked.

## Implementation notes for this repo

- `src/state.ts` should eventually store `parseResult` separately from `formData`.
- `src/storage/local-store.ts` will need backward-compatible persistence keys or migration logic once `parseResult` is added.
- `src/components/question-card.ts` currently assumes a small legacy type set. It should stay on the compatibility adapter until canonical rendering is ready.
- `src/ai/ai-actions.ts` should not operate directly on canonical fields until the semantic and fill-policy split is complete.

## Open questions

These should be resolved before Phase 2 starts:

1. Should FormMate ever perform light interaction during acquisition, or should it stay read-only and rely on capture/image fallback?
2. Do we want screenshot parsing in the same pipeline package, or behind a separate image service boundary?
3. How much parser evidence should be surfaced in the product UI versus kept for diagnostics only?
4. Should provider adapters be selected only by URL, or also by DOM signatures?

## Recommended immediate next steps

1. Add `src/parser/schema.ts` and `src/parser/compat.ts`.
2. Refactor `parseFormUrl` to return `ParseEnvelopeV1`.
3. Update `analyzing.ts` to store both `parseResult` and `formData`.
4. Expand fixture coverage before semantic work gets deeper.
