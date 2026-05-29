import assert from 'node:assert/strict';
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

const { AI_SURFACES } = await import('../src/ai/ai-service.ts');
const { parseAssistantResponse, buildMessageWithUiContext, buildNextFollowUps } = await import('../src/ai/chat-interactions.ts');
const { renderAssistantRichText } = await import('../src/actions/action-rich-text.ts');

function expectIncludes(haystack: string, needle: string, message: string) {
  assert.ok(haystack.includes(needle), message);
}

function runChatContractTests() {
  const prose = renderAssistantRichText('Hello **bold** and *italic* and ~~strike~~ and -underline-.');
  expectIncludes(prose, '<strong>bold</strong>', 'bold markdown should render');
  expectIncludes(prose, '<em>italic</em>', 'italic markdown should render');
  expectIncludes(prose, '<s>strike</s>', 'strikethrough markdown should render');
  expectIncludes(prose, '<u>underline</u>', 'underline alias should render');

  const documentFormatting = renderAssistantRichText(
    '# Header\n\n> Quote\n\n1. One\n2. Two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[Link](https://example.com)',
  );
  expectIncludes(documentFormatting, '<h1>Header</h1>', 'heading markdown should render');
  expectIncludes(documentFormatting, '<blockquote>', 'blockquote markdown should render');
  expectIncludes(documentFormatting, '<ol>', 'ordered list markdown should render');
  expectIncludes(documentFormatting, '<a href="https://example.com"', 'links should render');
  expectIncludes(documentFormatting, 'target="_blank"', 'links should open in a new tab');

  const nestedFormatting = renderAssistantRichText('***Strong emphasis*** with `inline` and <script>alert(1)</script>');
  expectIncludes(nestedFormatting, '<em><strong>Strong emphasis</strong></em>', 'nested emphasis should render');
  expectIncludes(nestedFormatting, '<code>inline</code>', 'inline code should render');
  assert.ok(!nestedFormatting.includes('<script>'), 'raw HTML should not render');

  const hyphenated = renderAssistantRichText('A state-of-the-art system should stay plain text.');
  assert.ok(!hyphenated.includes('<u>state-of-the-art</u>'), 'hyphenated prose should not trigger underline alias');

  const table = renderAssistantRichText('| A | B |\n| --- | --- |\n| 1 | 2 |');
  expectIncludes(table, '<table>', 'GFM table should render');
  expectIncludes(table, '<td>1</td>', 'table cell should render');

  const fenced = renderAssistantRichText('```ts\nconst value = 1;\n```');
  expectIncludes(fenced, '<pre><code class="language-ts">const value = 1;', 'fenced code should render with language class');

  const inlineCode = renderAssistantRichText('Inline code `a*b` stays literal.');
  expectIncludes(inlineCode, '<code>a*b</code>', 'inline code should remain literal');

  const parsedInteractive = parseAssistantResponse(
    'Body text\n<fm-ui><text id="q1" label="Answer" editable="true">Draft</text></fm-ui>\n[fm-suggest]Fix tone[/fm-suggest]',
  );
  assert.equal(parsedInteractive.text, 'Body text', 'fm-ui block should be removed from prose body');
  assert.deepEqual(parsedInteractive.followUps, ['Fix tone'], 'follow-up tag should be extracted');
  assert.equal(parsedInteractive.interactiveParts.length, 1, 'interactive part should be parsed');
  assert.equal(parsedInteractive.interactiveParts[0].id, 'q1', 'interactive part id should be preserved');

  const malformedInteractive = parseAssistantResponse('Intro <fm-ui><text id="q1">Draft');
  assert.equal(malformedInteractive.interactiveParts.length, 0, 'malformed fm-ui should degrade without controls');
  assert.ok(
    malformedInteractive.diagnostics.some((entry: { code: string }) => entry.code === 'fm_ui_unclosed'),
    'malformed fm-ui should emit diagnostics',
  );

  const orphanClose = parseAssistantResponse('Plain prose </fm-ui> after orphan close.');
  assert.equal(orphanClose.interactiveParts.length, 0, 'orphan closing tag should not create interactive controls');
  assert.ok(
    orphanClose.diagnostics.some((entry: { code: string }) => entry.code === 'fm_ui_orphan_close'),
    'orphan closing tag should emit diagnostics',
  );

  const docsMode = parseAssistantResponse('Docs body <fm-ui><text id="q1">Ignored</text></fm-ui>', { interactive: false });
  assert.equal(docsMode.interactiveParts.length, 0, 'docs/text-first mode should ignore fm-ui controls');
  assert.equal(docsMode.text, 'Docs body', 'docs/text-first mode should still keep prose body');

  const legacyInteractive = renderAssistantRichText('[1] Why are you interested? | I love the mission');
  expectIncludes(legacyInteractive, 'data-item-id="1"', 'legacy interactive lines should still normalize');
  expectIncludes(legacyInteractive, 'Why are you interested?', 'legacy interactive label should render');

  const blockedLegacyNormalization = renderAssistantRichText('> [1] Quoted | value');
  assert.ok(!blockedLegacyNormalization.includes('ai-interactive-item'), 'blockquote content should not normalize into legacy interactive UI');

  const mixedContent = renderAssistantRichText('Mixed [fm-item id="x" label="Field"]Value[/fm-item] after prose');
  expectIncludes(mixedContent, '<p>Mixed</p>', 'prose before fm-item should remain prose');
  expectIncludes(mixedContent, 'data-item-id="x"', 'inline fm-item should render interactive UI');
  expectIncludes(mixedContent, '<p>after prose</p>', 'prose after fm-item should remain prose');

  const contextBlock = buildMessageWithUiContext('Refine this', [
    { kind: 'interactive_text_edit', itemId: 'q1', label: 'Answer', value: 'Updated' },
    { kind: 'followup_click', prompt: 'Improve this answer' },
  ]);
  expectIncludes(contextBlock, '[fm-ui-context]', 'ui context wrapper should be emitted');
  expectIncludes(contextBlock, 'interactive_text_edit', 'text edit event should serialize');
  expectIncludes(contextBlock, 'followup_click', 'follow-up click event should serialize');

  const followUps = buildNextFollowUps({
    surface: AI_SURFACES.AI_CHAT,
    responseText: [
      'Response text',
      '[fm-suggest]Improve tone[/fm-suggest]',
      '[fm-suggest]Improve tone[/fm-suggest]',
      '[fm-suggest]Add metrics and outcome detail for this answer[/fm-suggest]',
      '[fm-suggest]This third suggestion should be dropped[/fm-suggest]',
    ].join('\n'),
    formTitle: 'Designer',
  });
  assert.deepEqual(
    followUps,
    ['Improve tone', 'Add metrics and outcome detail for this answer'.slice(0, 72)],
    'follow-ups should dedupe and cap at the surface limit',
  );

  const workspaceFollowUps = buildNextFollowUps({
    surface: AI_SURFACES.WORKSPACE,
    responseText: 'No suggestions here.',
    formTitle: 'Application',
  });
  assert.equal(workspaceFollowUps.length, 1, 'workspace should always collapse to a single suggestion');

  console.log('Chat contract tests passed.');
}

async function runChatContextTests() {
  const { processChatMessage } = await import('../src/ai/ai-actions.ts');
  const { setState } = await import('../src/state.ts');

  let capturedContext: any = null;
  setState({
    answers: { q1: { text: 'Drafted answer', source: 'ai', confidence: 0.9 } },
    userProfile: { name: 'Ada Lovelace', occupation: 'Engineer', experience: 'Forms', bio: 'Builder' },
    personality: 'professional',
    settings: { ai: { provider: 'mock' } },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url: any, init: any) => {
    const body = JSON.parse(init?.body || '{}');
    capturedContext = body.formContext;
    return new Response(JSON.stringify({ text: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await processChatMessage('What should I do next?', {
      title: 'Application',
      fillPlanSummary: { total: 1, profileFillable: 0, aiDraftable: 1, manual: 0, uncertain: 0 },
      questions: [{
        id: 'q1',
        text: 'Why do you want this role?',
        type: 'long_text',
        parserHints: {
          fillBucket: 'ai_draftable',
          bucketReason: 'Open-ended answer is useful for AI drafting.',
          bucketConfidence: 0.86,
        },
      }],
    }, [], 'q1', { surface: AI_SURFACES.WORKSPACE });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedContext?.fillPlanSummary?.aiDraftable, 1, 'chat context should include fill-plan summary');
  assert.equal(capturedContext?.formQuestions?.[0]?.fillBucket, 'ai_draftable', 'chat context should include parser bucket');
  assert.equal(capturedContext?.formQuestions?.[0]?.bucketReason, 'Open-ended answer is useful for AI drafting.', 'chat context should include bucket reason');
}

async function runActionSearchTests() {
  const { getActionById, getActionIndex, searchActions } = await import('../src/actions/action-index.ts');
  const allActions = getActionIndex();

  assert.ok(allActions.length > 0, 'action index should expose actions');
  assert.equal(getActionById('WORKSPACE-SUBMIT')?.id, 'workspace-submit', 'action lookup should be case-insensitive');

  const [firstGenerate] = searchActions('generate answers', { limit: 1 });
  assert.equal(firstGenerate?.id, 'workspace-generate-all', 'search should still rank exact action intent first');

  const featured = searchActions('', { limit: 3 });
  assert.equal(featured.length, 3, 'empty search should return featured actions capped by limit');
  assert.ok(featured.every((action: { featured?: boolean }) => action.featured), 'empty search should return featured actions only');
}

async function runServerPolicyTests() {
  const { isBalancedAdjacentScopeAllowed } = await import('../api/_shared/ai-policy.ts');

  assert.equal(
    isBalancedAdjacentScopeAllowed('copilot_chat', [{ role: 'user', content: 'Help rewrite this application answer' }]),
    true,
    'FormMate-adjacent chat requests should remain allowed',
  );
  assert.equal(
    isBalancedAdjacentScopeAllowed('docs_chat', [{ role: 'user', content: 'Tell me a recipe' }]),
    false,
    'Unrelated docs chat requests should remain out of scope',
  );
  assert.equal(
    isBalancedAdjacentScopeAllowed('form_parsing', [{ role: 'user', content: 'unrelated text' }]),
    true,
    'parser tasks should remain allowed without keyword scope checks',
  );
}

runChatContractTests();
await runChatContextTests();
await runActionSearchTests();
await runServerPolicyTests();
