import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

globalThis.window = dom.window as typeof globalThis.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLTemplateElement = dom.window.HTMLTemplateElement;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator as Navigator,
  configurable: true,
});

const { parseFormUrl, parseHtmlSnapshot, parseImageArtifacts } = await import('../src/parser/form-parser.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

type ParserCase = {
  id: string;
  mode: 'html' | 'provider_gate' | 'image';
  fixture?: string;
  url: string;
  expected: string;
};

const cases: ParserCase[] = [
  { id: 'plain-html-contact', mode: 'html', fixture: 'plain-html-contact.html', url: 'https://example.com/contact', expected: 'plain-html-contact.expected.json' },
  { id: 'label-for', mode: 'html', fixture: 'label-for-form.html', url: 'https://example.com/label-for', expected: 'label-for.expected.json' },
  { id: 'grouped-inputs', mode: 'html', fixture: 'grouped-inputs-form.html', url: 'https://example.com/grouped', expected: 'grouped-inputs.expected.json' },
  { id: 'auth-wall', mode: 'html', fixture: 'auth-wall.html', url: 'https://example.com/auth-wall', expected: 'auth-wall.expected.json' },
  { id: 'js-shell', mode: 'html', fixture: 'js-shell.html', url: 'https://example.com/js-shell', expected: 'js-shell.expected.json' },
  { id: 'hidden-conditional', mode: 'html', fixture: 'hidden-conditional-form.html', url: 'https://example.com/hidden-conditional', expected: 'hidden-conditional.expected.json' },
  { id: 'file-upload', mode: 'html', fixture: 'file-upload-form.html', url: 'https://example.com/upload', expected: 'file-upload.expected.json' },
  { id: 'malformed', mode: 'html', fixture: 'malformed-form.html', url: 'https://example.com/malformed', expected: 'malformed.expected.json' },
  { id: 'image-derived-partial', mode: 'image', fixture: 'image-derived-partial.response.json', url: 'https://example.com/screenshot-flow', expected: 'image-derived-partial.expected.json' },
  { id: 'google-gate', mode: 'provider_gate', url: 'https://docs.google.com/forms/d/e/example/viewform', expected: 'google-gate.expected.json' },
  { id: 'workday-gate', mode: 'provider_gate', url: 'https://company.myworkdayjobs.com/en-US/recruiting/job/123', expected: 'workday-gate.expected.json' },
];

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'parser-fixtures', relativePath), 'utf8'));
}

function readFixture(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, 'fixtures', relativePath), 'utf8');
}

function readFixtureJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures', relativePath), 'utf8'));
}

function normalizeEnvelopeForSnapshot(envelope: any) {
  return {
    acquisition: {
      provider: envelope?.acquisition?.provider || null,
      adapterKey: envelope?.acquisition?.adapterKey || null,
      sourceType: envelope?.acquisition?.sourceType || null,
      fetchStrategy: envelope?.acquisition?.fetchStrategy || null,
    },
    outcome: {
      status: envelope?.outcome?.status || null,
      completeness: envelope?.outcome?.completeness || null,
      blockedReason: envelope?.outcome?.blockedReason || null,
      unsupportedReasons: Array.isArray(envelope?.outcome?.unsupportedReasons) ? envelope.outcome.unsupportedReasons : [],
      nextAction: envelope?.outcome?.nextAction || null,
      nextStepRequired: Boolean(envelope?.outcome?.nextStepRequired),
      nextStepHint: envelope?.outcome?.nextStepHint || '',
      warningCodes: Array.isArray(envelope?.outcome?.warnings) ? envelope.outcome.warnings.map((warning: any) => warning.code) : [],
    },
    compatibility: envelope?.compatibility
      ? {
        title: envelope.compatibility.title,
        questionCount: Array.isArray(envelope.compatibility.questions) ? envelope.compatibility.questions.length : 0,
        questions: Array.isArray(envelope.compatibility.questions)
          ? envelope.compatibility.questions.map((question: any) => ({
            text: question.text,
            type: question.type,
            required: Boolean(question.required),
            options: Array.isArray(question.options) ? question.options : [],
          }))
          : [],
      }
      : null,
    diagnostics: {
      parseStrategy: envelope?.diagnostics?.parseStrategy || null,
      authSignal: Boolean(envelope?.diagnostics?.authSignal),
      renderSignal: Boolean(envelope?.diagnostics?.renderSignal),
      aiFallbackUsed: Boolean(envelope?.diagnostics?.aiFallbackUsed),
    },
  };
}

async function executeCase(testCase: ParserCase) {
  if (testCase.mode === 'provider_gate') {
    return parseFormUrl(testCase.url);
  }

  if (testCase.mode === 'image') {
    const mockResponse = readFixtureJson(testCase.fixture!);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    try {
      return parseImageArtifacts({
        sourceUrl: testCase.url,
        imageArtifacts: ['data:image/png;base64,AAAA'],
        imageServiceUrl: 'https://formmate.test/api/parser/image-extract',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  const html = readFixture(testCase.fixture!);
  return parseHtmlSnapshot({
    sourceUrl: testCase.url,
    normalizedUrl: testCase.url,
    finalUrl: testCase.url,
    html,
    fetchStrategy: 'fixture_html',
    httpStatus: 200,
  });
}

async function run() {
  for (const testCase of cases) {
    const envelope = await executeCase(testCase);
    const snapshot = normalizeEnvelopeForSnapshot(envelope);
    const expected = readJson(testCase.expected);
    assert.deepEqual(snapshot, expected, `Parser fixture failed: ${testCase.id}`);
  }

  console.log(`Parser fixture tests passed (${cases.length} cases).`);
}

void run();
