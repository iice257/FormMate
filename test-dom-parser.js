import fs from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { JSDOM } from 'jsdom';

// Polyfills for Node environment
global.DOMParser = new JSDOM().window.DOMParser;
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  get length() { return Object.keys(mockStorage).length; },
  key: (i) => Object.keys(mockStorage)[i] || null
};

const { parseDOM } = await import('./src/parser/dom-parser.js');
const { categorizeField } = await import('./src/ai/field-classifier.js');
const { setState } = await import('./src/state.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

setState({
  userProfile: {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    phone: '555-0100',
    occupation: 'Software Engineer',
    commonInfo: {
      location: 'New York, NY',
      company: 'TechCorp'
    }
  },
  settings: {
    personalization: { autoFillPersonal: true }
  }
});

const mockHtmlPath = resolve(__dirname, 'mock-google-form.html');
const authWallPath = resolve(__dirname, 'fixtures', 'auth-wall.html');
const jsShellPath = resolve(__dirname, 'fixtures', 'js-shell.html');
const labelForPath = resolve(__dirname, 'fixtures', 'label-for-form.html');
const groupedInputsPath = resolve(__dirname, 'fixtures', 'grouped-inputs-form.html');
const ariaFallbackPath = resolve(__dirname, 'fixtures', 'aria-fallback-form.html');
const sharedContainerPath = resolve(__dirname, 'fixtures', 'shared-container-form.html');
const shellStrayInputPath = resolve(__dirname, 'fixtures', 'js-shell-stray-input.html');
const requiredSelectPath = resolve(__dirname, 'fixtures', 'required-select-form.html');

function assert(condition, message) {
  if (condition) return;
  console.error(`ASSERTION FAILED: ${message}`);
  process.exitCode = 1;
}

async function runTests() {
  console.log('--- FORM PARSER STRESS TEST ---');
  try {
    const html = fs.readFileSync(mockHtmlPath, 'utf8');
    console.log(`\nParsing Local File: mock-google-form.html (${html.length} bytes)`);

    const startParse = Date.now();
    const result = parseDOM(html);
    console.log(`Parse completed in ${Date.now() - startParse}ms\n`);

    console.log(`TITLE: ${result.title}`);
    console.log(`DESC:  ${result.description}`);
    console.log(`QUESTIONS FOUND: ${result.questions.length}\n`);

    assert(result.questions.length > 0, 'mock-google-form.html should produce questions');
    assert(result.requiresAuth !== true, 'mock-google-form.html should not be requiresAuth');

    if (result.questions.length > 0) {
      result.questions.forEach((q, i) => {
        const classification = categorizeField(q);
        const reqStr = q.required ? '*' : '';
        console.log(`${i + 1}. [${q.type}] "${q.text.substring(0, 50)}" ${reqStr}`);
        console.log(`   -> Category: ${classification.category.toUpperCase()} (Hint: ${classification.interpretationTag})`);
        if (classification.category === 'autofillable') {
          console.log(`   -> Autofill match: ${classification.match}`);
        }
        if (q.options && q.options.length > 0) {
          console.log(`   -> Options: ${q.options.join(', ')}`);
        }
        console.log('');
      });
    } else {
      console.warn('WARNING: Deterministic parser found 0 questions. This will trigger the AI fallback.');
    }

    const authHtml = fs.readFileSync(authWallPath, 'utf8');
    const authResult = parseDOM(authHtml);
    console.log(`\nAUTH WALL FIXTURE: requiresAuth=${authResult.requiresAuth}, questions=${authResult.questions.length}`);
    assert(authResult.requiresAuth === true, 'auth-wall.html should be requiresAuth');
    assert(authResult.questions.length === 0, 'auth-wall.html should have 0 questions');

    const shellHtml = fs.readFileSync(jsShellPath, 'utf8');
    const shellResult = parseDOM(shellHtml);
    console.log(`JS SHELL FIXTURE: requiresRender=${shellResult.requiresRender}, questions=${shellResult.questions.length}`);
    assert(shellResult.requiresRender === true, 'js-shell.html should be requiresRender');

    const labelForHtml = fs.readFileSync(labelForPath, 'utf8');
    const labelForResult = parseDOM(labelForHtml);
    const fullNameQuestion = labelForResult.questions.find((q) => q.text === 'Full Name');
    const emailQuestion = labelForResult.questions.find((q) => q.text === 'Email Address');
    console.log(`LABEL-FOR FIXTURE: questions=${labelForResult.questions.length}`);
    assert(Boolean(fullNameQuestion), 'label-for-form.html should include "Full Name"');
    assert(fullNameQuestion?.required === true, '"Full Name" should be required');
    assert(emailQuestion?.type === 'email', '"Email Address" should be parsed as email');

    const groupedHtml = fs.readFileSync(groupedInputsPath, 'utf8');
    const groupedResult = parseDOM(groupedHtml);
    const radioGroup = groupedResult.questions.find((q) => q.type === 'radio');
    const checkboxGroup = groupedResult.questions.find((q) => q.type === 'checkbox');
    console.log(`GROUPED INPUTS FIXTURE: questions=${groupedResult.questions.length}`);
    assert(groupedResult.questions.length === 2, 'grouped-inputs-form.html should produce 2 grouped questions');
    assert(radioGroup?.options?.length === 2, 'radio group should contain 2 options');
    assert(checkboxGroup?.options?.length === 2, 'checkbox group should contain 2 options');

    const ariaHtml = fs.readFileSync(ariaFallbackPath, 'utf8');
    const ariaResult = parseDOM(ariaHtml);
    const portfolioQuestion = ariaResult.questions.find((q) => q.text === 'Portfolio URL');
    const motivationQuestion = ariaResult.questions.find((q) => q.text === 'Share your motivation');
    console.log(`ARIA FALLBACK FIXTURE: questions=${ariaResult.questions.length}`);
    assert(Boolean(portfolioQuestion), 'aria-fallback-form.html should use aria-label as question text');
    assert(portfolioQuestion?.type === 'short_text', 'aria-label text input should map to short_text');
    assert(motivationQuestion?.type === 'long_text', 'textarea placeholder should map to long_text');

    const sharedContainerHtml = fs.readFileSync(sharedContainerPath, 'utf8');
    const sharedContainerResult = parseDOM(sharedContainerHtml);
    console.log(`SHARED CONTAINER FIXTURE: questions=${sharedContainerResult.questions.length}`);
    assert(sharedContainerResult.questions.length === 2, 'shared-container-form.html should split stacked controls into separate questions');
    assert(sharedContainerResult.questions[0]?.text === 'First Name', 'first stacked control should preserve its label');
    assert(sharedContainerResult.questions[1]?.type === 'url', 'second stacked control should preserve url type');

    const shellStrayHtml = fs.readFileSync(shellStrayInputPath, 'utf8');
    const shellStrayResult = parseDOM(shellStrayHtml);
    console.log(`JS SHELL STRAY INPUT FIXTURE: requiresRender=${shellStrayResult.requiresRender}, questions=${shellStrayResult.questions.length}`);
    assert(shellStrayResult.requiresRender === true, 'js-shell-stray-input.html should still be requiresRender');
    assert(shellStrayResult.questions.length === 0, 'js-shell-stray-input.html should ignore stray hidden-ish inputs');

    const requiredSelectHtml = fs.readFileSync(requiredSelectPath, 'utf8');
    const requiredSelectResult = parseDOM(requiredSelectHtml);
    const companyQuestion = requiredSelectResult.questions.find((q) => q.text === 'Company Name');
    const countryQuestion = requiredSelectResult.questions.find((q) => q.text === 'Country');
    console.log(`REQUIRED/SELECT FIXTURE: questions=${requiredSelectResult.questions.length}`);
    assert(companyQuestion?.required === true, 'required-select-form.html should strip "(required)" and keep required=true');
    assert(countryQuestion?.type === 'dropdown', 'Country should parse as dropdown');
    assert(countryQuestion?.options?.join('|') === 'Nigeria|Kenya', 'select placeholder option should be removed');
  } catch (err) {
    console.error('Error processing file:', err);
    process.exitCode = 1;
  }
}

runTests();
