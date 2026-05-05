import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

globalThis.window = dom.window as typeof globalThis.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator as Navigator,
  configurable: true,
});

const { classifyFillBucket, enrichLegacyFormDataWithFillPlan } = await import('../src/parser/fill-plan.ts');
const { parseFormUrl, parseHtmlSnapshot } = await import('../src/parser/form-parser.ts');
const { categorizeField } = await import('../src/ai/field-classifier.ts');
const { generateAnswers } = await import('../src/ai/ai-actions.ts');
const { setState } = await import('../src/state.ts');

function bucket(question: any) {
  return classifyFillBucket(question).fillBucket;
}

assert.equal(bucket({ text: 'Email address', type: 'email' }), 'profile_fillable');
assert.equal(bucket({ text: 'Full name', type: 'short_text' }), 'profile_fillable');
assert.equal(bucket({ text: 'Name', type: 'short_text' }), 'profile_fillable');
assert.equal(bucket({ text: 'Phone number', type: 'phone' }), 'profile_fillable');
assert.equal(bucket({ text: 'LinkedIn profile', type: 'url' }), 'profile_fillable');

assert.equal(bucket({ text: 'Why are you interested in this role?', type: 'long_text' }), 'ai_draftable');
assert.equal(bucket({ text: 'Describe your experience', type: 'long_text' }), 'ai_draftable');
assert.equal(bucket({ text: 'Cover letter', type: 'long_text' }), 'ai_draftable');

assert.equal(bucket({ text: 'Upload your resume', type: 'file_upload' }), 'manual');
assert.equal(bucket({ text: 'Expected salary', type: 'short_text' }), 'manual');
assert.equal(bucket({ text: 'I agree to the terms', type: 'checkbox' }), 'manual');
assert.equal(bucket({ text: 'Start date', type: 'date' }), 'manual');
assert.equal(bucket({ text: 'Choose a department', type: 'dropdown', options: ['Sales', 'Support'] }), 'manual');
assert.equal(bucket({ text: 'Are you eligible to work?', type: 'radio', options: ['Yes', 'No'] }), 'manual');

assert.equal(bucket({ text: 'Question 1', type: 'short_text', parserHints: { generatedLabel: true } }), 'uncertain');
assert.equal(bucket({ text: '', type: 'unknown_type' }), 'uncertain');

const compatibility = enrichLegacyFormDataWithFillPlan({
  title: 'Bucket Test',
  questions: [
    { id: '1', text: 'Email', type: 'email' },
    { id: '2', text: 'Why should we choose you?', type: 'long_text' },
    { id: '3', text: 'Upload resume', type: 'file_upload' },
    { id: '4', text: 'Question 4', type: 'short_text', parserHints: { generatedLabel: true } },
  ],
});

assert.equal(compatibility.questions.length, 4);
assert.deepEqual(compatibility.fillPlanSummary, {
  total: 4,
  profileFillable: 1,
  aiDraftable: 1,
  manual: 1,
  uncertain: 1,
  warnings: [],
});

setState({
  userProfile: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101', commonInfo: {} },
  vault: {},
  settings: { personalization: { autoFillPersonal: true }, parser: { useAiAmbiguityJudge: false }, ai: { temperature: 0.2 } },
});

const profileAnalysis = categorizeField(compatibility.questions[0]);
assert.equal(profileAnalysis.category, 'autofillable');
assert.equal(profileAnalysis.match, 'ada@example.com');

const aiAnalysis = categorizeField(compatibility.questions[1]);
assert.equal(aiAnalysis.category, 'generatable');

const manualAnalysis = categorizeField(compatibility.questions[2]);
assert.equal(manualAnalysis.category, 'manual_only');

const uncertainAnalysis = categorizeField(compatibility.questions[3]);
assert.equal(uncertainAnalysis.category, 'manual_only');

const noAiForm = enrichLegacyFormDataWithFillPlan({
  title: 'Skip AI',
  description: '',
  questions: [
    { id: '1', text: 'Expected salary', type: 'short_text' },
    { id: '2', text: 'Question 2', type: 'short_text', parserHints: { generatedLabel: true } },
  ],
});
const generated = await generateAnswers(noAiForm, undefined);
assert.equal(generated.diagnostics.aiEligible, 0);
assert.equal(generated.answers['1'].source, 'manual');
assert.equal(generated.answers['2'].source, 'manual');

const parsedHtml = await parseHtmlSnapshot({
  sourceUrl: 'https://example.com/bucket-form',
  normalizedUrl: 'https://example.com/bucket-form',
  finalUrl: 'https://example.com/bucket-form',
  fetchStrategy: 'fixture_html',
  httpStatus: 200,
  html: `
    <form>
      <label for="email">Email address</label><input id="email" type="email" />
      <label for="why">Why do you want to volunteer?</label><textarea id="why"></textarea>
      <label for="resume">Upload resume</label><input id="resume" type="file" />
    </form>
  `,
});
assert.equal(parsedHtml.compatibility.questions.length, 3);
assert.equal(parsedHtml.compatibility.fillPlanSummary.profileFillable, 1);
assert.equal(parsedHtml.compatibility.fillPlanSummary.aiDraftable, 1);
assert.equal(parsedHtml.compatibility.fillPlanSummary.manual, 1);

const googleGate = await parseFormUrl('https://docs.google.com/forms/d/e/example/viewform');
assert.equal(googleGate.outcome.status, 'blocked');
assert.equal(googleGate.outcome.nextAction, 'upload_screenshots');

const workdayGate = await parseFormUrl('https://company.myworkdayjobs.com/en-US/recruiting/job/123');
assert.equal(workdayGate.outcome.status, 'blocked');
assert.equal(workdayGate.outcome.nextAction, 'use_capture');

const documentGate = await parseFormUrl('https://example.com/application.pdf');
assert.equal(documentGate.outcome.status, 'unsupported');
assert.equal(documentGate.outcome.nextAction, 'upload_screenshots');
assert.equal(documentGate.outcome.warnings[0].code, 'DOCUMENT_URL_UNSUPPORTED');

console.log('Parser bucket tests passed.');
