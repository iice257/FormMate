// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLTemplateElement = dom.window.HTMLTemplateElement;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

const { parseFormUrl, parseHtmlSnapshot } = await import('../src/parser/form-parser.ts');

const datasetPath = path.resolve(process.cwd(), 'docs/live-public-form-review-dataset.md');
const markdown = fs.readFileSync(datasetPath, 'utf8');

const rows = markdown
  .split(/\r?\n/)
  .filter((line) => /^\|\s*\d+\s*\|/.test(line))
  .map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    return {
      id: Number(cells[0]),
      category: cells[1],
      url: cells[2],
      expectedStatus: cells[4],
    };
  });

function warningCodes(envelope) {
  return Array.isArray(envelope?.outcome?.warnings)
    ? envelope.outcome.warnings.map((warning) => warning.code).filter(Boolean)
    : [];
}

function bucketSummary(envelope) {
  return envelope?.compatibility?.fillPlanSummary || {
    total: 0,
    profileFillable: 0,
    aiDraftable: 0,
    manual: 0,
    uncertain: 0,
  };
}

function isDocumentContent(contentType) {
  const normalized = String(contentType || '').toLowerCase();
  return normalized.includes('application/pdf')
    || normalized.includes('application/msword')
    || normalized.includes('application/vnd.openxmlformats-officedocument')
    || normalized.includes('application/vnd.ms-');
}

async function parseLiveUrl(row) {
  const url = row.url;

  if (/docs\.google\.com\/forms|forms\.(office|microsoft)\.com|workdayjobs\.com|\/documentcenter\/view/i.test(url) || /\.(pdf|docx?|xlsx?|pptx?)(?:[?#].*)?$/i.test(url)) {
    return parseFormUrl(url);
  }

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'FormMate live parser review (+https://github.com/iice257/FormMate)',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (isDocumentContent(contentType)) {
    return parseFormUrl(url);
  }

  const html = await response.text();
  return parseHtmlSnapshot({
    sourceUrl: url,
    normalizedUrl: url,
    finalUrl: response.url || url,
    html,
    fetchStrategy: 'live_public_fetch',
    httpStatus: response.status,
  });
}

const results = [];

for (const row of rows) {
  try {
    const envelope = await parseLiveUrl(row);
    results.push({
      id: row.id,
      category: row.category,
      url: row.url,
      expectedStatus: row.expectedStatus,
      provider: envelope?.acquisition?.provider,
      status: envelope?.outcome?.status,
      completeness: envelope?.outcome?.completeness,
      nextAction: envelope?.outcome?.nextAction,
      buckets: bucketSummary(envelope),
      warnings: warningCodes(envelope),
      questionCount: envelope?.compatibility?.questions?.length || 0,
      title: envelope?.compatibility?.title || '',
    });
  } catch (error) {
    const cause = error?.cause;
    const detail = cause?.code || cause?.message || '';
    results.push({
      id: row.id,
      category: row.category,
      url: row.url,
      expectedStatus: row.expectedStatus,
      status: 'error',
      error: [error?.message || String(error), detail].filter(Boolean).join(': '),
    });
  }
}

for (const result of results) {
  const buckets = result.buckets || {};
  console.log([
    `#${result.id}`,
    result.status,
    result.nextAction || 'none',
    `q=${result.questionCount || 0}`,
    `profile=${buckets.profileFillable || 0}`,
    `ai=${buckets.aiDraftable || 0}`,
    `manual=${buckets.manual || 0}`,
    `uncertain=${buckets.uncertain || 0}`,
    result.warnings?.length ? `warnings=${result.warnings.join(',')}` : 'warnings=none',
    result.error ? `error=${result.error}` : '',
  ].filter(Boolean).join(' | '));
}

console.log(JSON.stringify(results, null, 2));
