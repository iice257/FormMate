import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');

Object.defineProperty(globalThis, 'window', {
  value: dom.window,
  configurable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: dom.window.document,
  configurable: true,
});

const { safeHttpUrl } = await import('./src/utils/escape');
const { createSafeHtmlFragment } = await import('./src/utils/safe-html');

const fragment = createSafeHtmlFragment(`
  <div onclick="alert('xss')" data-id="safe" style="color:red">
    <a id="bad-link" href="javascript:alert('xss')">Bad</a>
    <a id="bad-protocol-relative" href="//evil.example/path">Bad relative</a>
    <a id="bad-data-link" href="data:text/html,<script>alert(1)</script>">Bad data</a>
    <a id="good-link" href="/docs">Good</a>
    <img id="bad-image" src="data:text/html,<svg/onload=alert(1)>" />
    <button id="action" data-action-id="open-help">Open</button>
    <script>window.__ran = true;</script>
  </div>
`);

const host = document.createElement('div');
host.appendChild(fragment);

assert.equal(host.querySelector('script'), null, 'script tags should be removed');
assert.equal(host.firstElementChild?.getAttribute('onclick'), null, 'inline event handlers should be removed');
assert.equal(host.querySelector('#bad-link')?.getAttribute('href'), null, 'javascript: href should be removed');
assert.equal(host.querySelector('#bad-protocol-relative')?.getAttribute('href'), null, 'protocol-relative href should be removed');
assert.equal(host.querySelector('#bad-data-link')?.getAttribute('href'), null, 'data href should be removed');
assert.equal(host.querySelector('#bad-image')?.getAttribute('src'), null, 'dangerous data URLs should be removed');
assert.equal(host.querySelector('#good-link')?.getAttribute('href'), '/docs', 'safe href should remain');
assert.equal(host.querySelector('#action')?.getAttribute('data-action-id'), 'open-help', 'data attributes should remain');
assert.equal(host.firstElementChild?.getAttribute('style'), 'color:red', 'style attributes should remain available');

assert.equal(safeHttpUrl('//evil.example/avatar.png'), '', 'protocol-relative URLs should not pass safeHttpUrl');
assert.equal(safeHttpUrl('/avatars/me.png'), '/avatars/me.png', 'same-origin paths should pass safeHttpUrl');
assert.equal(safeHttpUrl('https://example.com/avatar.png'), 'https://example.com/avatar.png', 'https URLs should pass safeHttpUrl');

console.log('test-safe-html: ok');
