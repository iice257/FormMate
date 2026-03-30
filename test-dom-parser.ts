// @ts-nocheck
import fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

global.DOMParser = new JSDOM().window.DOMParser;
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = String(value); },
  removeItem: (key) => { delete mockStorage[key]; },
  get length() { return Object.keys(mockStorage).length; },
  key: (index) => Object.keys(mockStorage)[index] || null,
};

const { parseDOM } = await import('./src/parser/dom-parser');
const { categorizeField } = await import('./src/ai/field-classifier');
const { setState } = await import('./src/state');

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);

setState({
  userProfile: {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    phone: '555-0100',
    occupation: 'Software Engineer',
    commonInfo: {
      location: 'New York, NY',
      company: 'TechCorp',
    },
  },
  settings: {
    personalization: { autoFillPersonal: true },
  },
});

const mockHtmlPath = resolve(directory, 'mock-google-form.html');
const authWallPath = resolve(directory, 'fixtures', 'auth-wall.html');
const jsShellPath = resolve(directory, 'fixtures', 'js-shell.html');
const labelForPath = resolve(directory, 'fixtures', 'label-for-form.html');
const groupedInputsPath = resolve(directory, 'fixtures', 'grouped-inputs-form.html');
const ariaFallbackPath = resolve(directory, 'fixtures', 'aria-fallback-form.html');
const sharedContainerPath = resolve(directory, 'fixtures', 'shared-container-form.html');
const shellStrayInputPath = resolve(directory, 'fixtures', 'js-shell-stray-input.html');
const requiredSelectPath = resolve(directory, 'fixtures', 'required-select-form.html');

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
      result.questions.forEach((question, index) => {
        const classification = categorizeField(question);
        const required = question.required ? '*' : '';
        console.log(`${index + 1}. [${question.type}] "${question.text.substring(0, 50)}" ${required}`);
        console.log(`   -> Category: ${classification.category.toUpperCase()} (Hint: ${classification.interpretationTag})`);
        if (classification.category === 'autofillable') {
          console.log(`   -> Autofill match: ${classification.match}`);
        }
        if (question.options && question.options.length > 0) {
          console.log(`   -> Options: ${question.options.join(', ')}`);
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
    const fullNameQuestion = labelForResult.questions.find((question) => question.text === 'Full Name');
    const emailQuestion = labelForResult.questions.find((question) => question.text === 'Email Address');
    console.log(`LABEL-FOR FIXTURE: questions=${labelForResult.questions.length}`);
    assert(Boolean(fullNameQuestion), 'label-for-form.html should include "Full Name"');
    assert(fullNameQuestion?.required === true, '"Full Name" should be required');
    assert(emailQuestion?.type === 'email', '"Email Address" should be parsed as email');

    const groupedHtml = fs.readFileSync(groupedInputsPath, 'utf8');
    const groupedResult = parseDOM(groupedHtml);
    const radioGroup = groupedResult.questions.find((question) => question.type === 'radio');
    const checkboxGroup = groupedResult.questions.find((question) => question.type === 'checkbox');
    console.log(`GROUPED INPUTS FIXTURE: questions=${groupedResult.questions.length}`);
    assert(groupedResult.questions.length === 2, 'grouped-inputs-form.html should produce 2 grouped questions');
    assert(radioGroup?.options?.length === 2, 'radio group should contain 2 options');
    assert(checkboxGroup?.options?.length === 2, 'checkbox group should contain 2 options');

    const ariaHtml = fs.readFileSync(ariaFallbackPath, 'utf8');
    const ariaResult = parseDOM(ariaHtml);
    const portfolioQuestion = ariaResult.questions.find((question) => question.text === 'Portfolio URL');
    const motivationQuestion = ariaResult.questions.find((question) => question.text === 'Share your motivation');
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
    const companyQuestion = requiredSelectResult.questions.find((question) => question.text === 'Company Name');
    const countryQuestion = requiredSelectResult.questions.find((question) => question.text === 'Country');
    console.log(`REQUIRED/SELECT FIXTURE: questions=${requiredSelectResult.questions.length}`);
    assert(companyQuestion?.required === true, 'required-select-form.html should strip "(required)" and keep required=true');
    assert(countryQuestion?.type === 'dropdown', 'Country should parse as dropdown');
    assert(countryQuestion?.options?.join('|') === 'Nigeria|Kenya', 'select placeholder option should be removed');
  } catch (error) {
    console.error('Error processing file:', error);
    process.exitCode = 1;
  }
}

void runTests();
