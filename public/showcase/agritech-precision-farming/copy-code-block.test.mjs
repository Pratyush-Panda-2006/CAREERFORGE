import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingCodeBlockWidget } from './copy-code-block.js';

test('AgritechPrecisionFarmingCodeBlockWidget - formatLineNumbers splits lines and assigns sequential line numbers', () => {
  const widget = new AgritechPrecisionFarmingCodeBlockWidget();
  const sample = 'line 1\nline 2\nline 3';
  const lines = widget.formatLineNumbers(sample);

  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { lineNumber: 1, lineContent: 'line 1' });
  assert.deepEqual(lines[1], { lineNumber: 2, lineContent: 'line 2' });
  assert.deepEqual(lines[2], { lineNumber: 3, lineContent: 'line 3' });
});

test('AgritechPrecisionFarmingCodeBlockWidget - formatLineNumbers throws on non-string input', () => {
  const widget = new AgritechPrecisionFarmingCodeBlockWidget();
  assert.throws(() => widget.formatLineNumbers(null), TypeError);
  assert.throws(() => widget.formatLineNumbers(123), TypeError);
});

test('AgritechPrecisionFarmingCodeBlockWidget - copySnippet writes text to mock clipboard', async () => {
  let written = '';
  const mockClipboard = {
    writeText: async (t) => { written = t; }
  };
  const widget = new AgritechPrecisionFarmingCodeBlockWidget(mockClipboard);

  const res = await widget.copySnippet('print("soil moisture")');
  assert.equal(res, true);
  assert.equal(written, 'print("soil moisture")');
});

test('AgritechPrecisionFarmingCodeBlockWidget - triggerCopyFeedback returns valid feedback object', () => {
  const widget = new AgritechPrecisionFarmingCodeBlockWidget();
  const feedback = widget.triggerCopyFeedback();
  assert.equal(feedback.copied, true);
  assert.ok(feedback.message.includes('Copied'));
});
