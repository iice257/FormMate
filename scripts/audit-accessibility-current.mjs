import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'src');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'current-accessibility-audit.md');
const EXTENSIONS = new Set(['.ts', '.tsx']);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function findIssues(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const issues = [];

  for (const match of source.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    const hidden = /\btype=["']?hidden["']?/i.test(tag);
    const hasName = /\b(?:aria-label|aria-labelledby|id|title)=/i.test(tag);
    if (!hidden && !hasName) {
      issues.push({
        type: 'Input missing accessible name',
        line: lineNumber(source, match.index ?? 0),
        detail: tag.replace(/\s+/g, ' ').slice(0, 180),
      });
    }
  }

  for (const match of source.matchAll(/<button\b[^>]*>/gi)) {
    const tag = match[0];
    const iconOnly = /material-symbols-outlined/i.test(source.slice(match.index ?? 0, (match.index ?? 0) + 280));
    const hasName = /\b(?:aria-label|aria-labelledby|title)=/i.test(tag) || />\s*[^<\s]/.test(tag);
    if (iconOnly && !hasName) {
      issues.push({
        type: 'Icon button may be unnamed',
        line: lineNumber(source, match.index ?? 0),
        detail: tag.replace(/\s+/g, ' ').slice(0, 180),
      });
    }
  }

  for (const match of source.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\bhref=/i.test(tag) && !/\brole=["']button["']/i.test(tag)) {
      issues.push({
        type: 'Anchor missing href',
        line: lineNumber(source, match.index ?? 0),
        detail: tag.replace(/\s+/g, ' ').slice(0, 180),
      });
    }
  }

  for (const match of source.matchAll(/<(div|span)\b[^>]*(?:onclick|data-action|cursor-pointer)[^>]*>/gi)) {
    const tag = match[0];
    const hasInteractiveSemantics = /\b(role|tabindex|aria-label|aria-labelledby)=/i.test(tag);
    if (!hasInteractiveSemantics) {
      issues.push({
        type: 'Non-button interactive element needs semantics',
        line: lineNumber(source, match.index ?? 0),
        detail: tag.replace(/\s+/g, ' ').slice(0, 180),
      });
    }
  }

  return issues;
}

const rows = walk(SOURCE_DIR)
  .flatMap((filePath) => findIssues(filePath).map((issue) => ({ filePath, ...issue })))
  .sort((a, b) => relative(a.filePath).localeCompare(relative(b.filePath)) || a.line - b.line);

const grouped = new Map();
for (const issue of rows) {
  const key = issue.type;
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}

const report = [
  '# Current Accessibility Audit',
  '',
  `Generated from current TypeScript source on ${new Date().toISOString()}.`,
  '',
  `Total findings: ${rows.length}`,
  '',
  '## Summary',
  '',
  ...[...grouped.entries()].map(([type, count]) => `- ${type}: ${count}`),
  '',
  '## Findings',
  '',
  rows.length
    ? rows.map((issue) => `- ${relative(issue.filePath)}:${issue.line} - ${issue.type} - \`${issue.detail}\``).join('\n')
    : 'No heuristic findings.',
  '',
].join('\n');

writeFileSync(OUTPUT_PATH, report, 'utf8');
console.log(`Wrote ${relative(OUTPUT_PATH)} with ${rows.length} findings.`);
