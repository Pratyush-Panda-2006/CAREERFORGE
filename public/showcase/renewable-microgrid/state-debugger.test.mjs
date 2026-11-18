import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridStateDebugger } from './state-debugger.js';

test('RenewableMicrogridStateDebugger - clones state deeply to guarantee immutability', () => {
  const dbg = new RenewableMicrogridStateDebugger();
  const originalState = { count: 1, user: { name: 'Alpha' } };

  dbg.recordSnapshot('TEST_ACTION', originalState);
  originalState.count = 999;
  originalState.user.name = 'Hacked';

  const snapshot = dbg.getCurrentSnapshot();
  assert.strictEqual(snapshot.state.count, 1);
  assert.strictEqual(snapshot.state.user.name, 'Alpha');
});

test('RenewableMicrogridStateDebugger - clamps step indexing within bounds', () => {
  const dbg = new RenewableMicrogridStateDebugger();
  dbg.recordSnapshot('STEP_1', { val: 10 });
  dbg.recordSnapshot('STEP_2', { val: 20 });
  dbg.recordSnapshot('STEP_3', { val: 30 });

  const jumpNeg = dbg.jumpToStep(-5);
  assert.strictEqual(jumpNeg.index, 0);

  const jumpExcess = dbg.jumpToStep(99);
  assert.strictEqual(jumpExcess.index, 2);
});

test('RenewableMicrogridStateDebugger - accurately computes state JSON diffs', () => {
  const dbg = new RenewableMicrogridStateDebugger();
  const s1 = { unchanged: true, oldKey: 42, counter: 5 };
  const s2 = { unchanged: true, newKey: 'added', counter: 6 };

  const diff = dbg.computeDiff(s1, s2);
  assert.strictEqual(diff.additions.length, 1);
  assert.strictEqual(diff.additions[0].key, 'newKey');

  assert.strictEqual(diff.deletions.length, 1);
  assert.strictEqual(diff.deletions[0].key, 'oldKey');

  assert.strictEqual(diff.modifications.length, 1);
  assert.strictEqual(diff.modifications[0].key, 'counter');
  assert.strictEqual(diff.modifications[0].oldValue, 5);
  assert.strictEqual(diff.modifications[0].newValue, 6);
});

test('RenewableMicrogridStateDebugger - exports and imports replay data successfully', () => {
  const dbg1 = new RenewableMicrogridStateDebugger();
  dbg1.recordSnapshot('ACT_1', { mode: 'active' });
  dbg1.recordSnapshot('ACT_2', { mode: 'paused' });

  const json = dbg1.exportReplay();
  const dbg2 = new RenewableMicrogridStateDebugger();
  const importedCount = dbg2.importReplay(json);

  assert.strictEqual(importedCount, 2);
  assert.strictEqual(dbg2.getCurrentSnapshot().action, 'ACT_2');
});
