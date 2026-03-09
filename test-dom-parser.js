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

// Now import the modules using dynamic import so globals are set first
const { parseDOM } = await import('./src/parser/dom-parser.js');
const { categorizeField } = await import('./src/ai/field-classifier.js');
const { getState, setState } = await import('./src/state.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the state logic since we don't have the browser's localStorage
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
      console.warn('⚠️ WARNING: Deterministic parser found 0 questions. This will trigger the AI Fallback.');
    }
  } catch (err) {
    console.error(`Error processing file:`, err);
  }
}

runTests();
