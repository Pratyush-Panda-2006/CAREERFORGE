import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansDiffInspector } from './diff-viewer.js';

test('CharityMicroloansDiffInspector - detects loan term line insertions accurately', () => {
  const inspector = new CharityMicroloansDiffInspector();
  const orig = 'loan_id: LN-401\nprincipal: 500\napr: 0%';
  const mod = 'loan_id: LN-401\nprincipal: 500\nsubsidy_credit: 50\napr: 0%';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'subsidy_credit: 50'));
});

test('CharityMicroloansDiffInspector - detects loan term line deletions accurately', () => {
  const inspector = new CharityMicroloansDiffInspector();
  const orig = 'status: Active\npenalty_fee_usd: 15\ninterest: 0%\ncur: USD';
  const mod = 'status: Active\ninterest: 0%\ncur: USD';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'penalty_fee_usd: 15'));
});

test('CharityMicroloansDiffInspector - zero-change idempotency', () => {
  const inspector = new CharityMicroloansDiffInspector();
  const text = 'grant_type: SeedAgri\nbeneficiary: WomenCoop\nstatus: Disbursed';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('CharityMicroloansDiffInspector - generates unified view format', () => {
  const inspector = new CharityMicroloansDiffInspector();
  const orig = 'clauseA\nclauseB';
  const mod = 'clauseA\nclauseB_amended';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  clauseA'));
  assert.ok(unified.includes('- clauseB'));
  assert.ok(unified.includes('+ clauseB_amended'));
});
