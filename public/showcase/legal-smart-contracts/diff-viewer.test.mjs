import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsDiffInspector } from './diff-viewer.js';

test('LegalSmartContractsDiffInspector - detects clause line insertions accurately', () => {
  const inspector = new LegalSmartContractsDiffInspector();
  const orig = 'contract Escrow {\n  address public owner;\n}';
  const mod = 'contract Escrow {\n  address public owner;\n  bool public locked;\n}';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === '  bool public locked;'));
});

test('LegalSmartContractsDiffInspector - detects clause line deletions accurately', () => {
  const inspector = new LegalSmartContractsDiffInspector();
  const orig = 'modifier valid() {\n  require(msg.value > 0);\n  require(tx.origin == msg.sender);\n  _;\n}';
  const mod = 'modifier valid() {\n  require(msg.value > 0);\n  _;\n}';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 4);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === '  require(tx.origin == msg.sender);'));
});

test('LegalSmartContractsDiffInspector - zero-change idempotency', () => {
  const inspector = new LegalSmartContractsDiffInspector();
  const text = 'function dispute(bytes32 id) external payable {}';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 1);
});

test('LegalSmartContractsDiffInspector - formats unified view with diff prefixes', () => {
  const inspector = new LegalSmartContractsDiffInspector();
  const orig = 'val1\nval2';
  const mod = 'val1\nval3';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  val1'));
  assert.ok(unified.includes('- val2'));
  assert.ok(unified.includes('+ val3'));
});
