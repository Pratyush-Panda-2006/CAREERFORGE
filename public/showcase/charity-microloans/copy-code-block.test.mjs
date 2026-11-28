import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharityMicroloansCodeBlockWidget } from './copy-code-block.js';

test('numbers lines without inventing one for the final newline', () => {
  const widget = new CharityMicroloansCodeBlockWidget({ clipboard: null });
  assert.deepEqual(widget.formatLineNumbers('a\r\n\nb\n'), [
    { number: 1, text: 'a' },
    { number: 2, text: '' },
    { number: 3, text: 'b' },
  ]);
});

test('highlighting keeps every character of the line', () => {
  const widget = new CharityMicroloansCodeBlockWidget({ clipboard: null });
  const line = 'const total = 12.5; // return 3';
  const parts = widget.tokenize(line);
  assert.equal(parts.map((part) => part.text).join(''), line);
  assert.deepEqual(parts.filter((part) => part.kind).map((part) => part.kind), ['keyword', 'number', 'comment']);
});

test('copies the exact text and reports it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const copied = [];
  const messages = [];
  const widget = new CharityMicroloansCodeBlockWidget({
    clipboard: { writeText: async (text) => copied.push(text) },
    onFeedback: (message) => messages.push(message),
  });
  assert.equal(await widget.copySnippet('  x = 1\n'), true);
  t.mock.timers.tick(2000);
  assert.deepEqual(copied, ['  x = 1\n']);
  assert.deepEqual(messages, ['Copied', '']);
});

test('says so when the clipboard is blocked or missing', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const clipboard of [null, { writeText: async () => { throw new Error('denied'); } }]) {
    const messages = [];
    const widget = new CharityMicroloansCodeBlockWidget({ clipboard, onFeedback: (m) => messages.push(m) });
    assert.equal(await widget.copySnippet('x'), false);
    assert.match(messages[0], /Copy failed/);
  }
});
