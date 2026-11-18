import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixStateDebugger } from './state-debugger.js';

test('DefiYieldMatrixStateDebugger - records immutable snapshots and deep-clones state', () => {
  const initialState = { balance: 1000, pools: ['USDC-ETH'] };
  const dbg = new DefiYieldMatrixStateDebugger(initialState);

  // Mutating original object should not affect recorded snapshot
  initialState.balance = 99999;
  initialState.pools.push('MUTATION');

  const curr = dbg.getCurrentState();
  assert.strictEqual(curr.balance, 1000);
  assert.strictEqual(curr.pools.length, 1);

  dbg.recordSnapshot('DEPOSIT', { balance: 1500, pools: ['USDC-ETH', 'WBTC'] });
  assert.strictEqual(dbg.getHistory().length, 2);
  assert.strictEqual(dbg.getCurrentState().balance, 1500);
});

test('DefiYieldMatrixStateDebugger - computes granular diffs between states accurately', () => {
  const stateA = { a: 1, b: 'old', c: true };
  const stateB = { a: 1, b: 'new', d: 42 };

  const diff = DefiYieldMatrixStateDebugger.computeDiff(stateA, stateB);

  // modified: b
  assert.strictEqual(diff.modified.length, 1);
  assert.strictEqual(diff.modified[0].key, 'b');
  assert.strictEqual(diff.modified[0].oldValue, 'old');
  assert.strictEqual(diff.modified[0].newValue, 'new');

  // added: d
  assert.strictEqual(diff.added.length, 1);
  assert.strictEqual(diff.added[0].key, 'd');
  assert.strictEqual(diff.added[0].value, 42);

  // deleted: c
  assert.strictEqual(diff.deleted.length, 1);
  assert.strictEqual(diff.deleted[0].key, 'c');
  assert.strictEqual(diff.deleted[0].oldValue, true);
});

test('DefiYieldMatrixStateDebugger - jumps across steps and clamps index bounds', () => {
  const dbg = new DefiYieldMatrixStateDebugger({ step: 0 });
  dbg.recordSnapshot('STEP_1', { step: 1 });
  dbg.recordSnapshot('STEP_2', { step: 2 });

  // Jump backward to step 1
  const res1 = dbg.jumpToStep(1);
  assert.strictEqual(res1.snapshot.state.step, 1);
  assert.strictEqual(dbg.getCurrentState().step, 1);

  // Jump to step 0
  const res0 = dbg.jumpToStep(0);
  assert.strictEqual(res0.snapshot.state.step, 0);

  // Clamps out of bound indices
  const clamped = dbg.jumpToStep(999);
  assert.strictEqual(clamped.snapshot.state.step, 2);
});

test('DefiYieldMatrixStateDebugger - exports and imports replay JSON preserving history', () => {
  const dbg = new DefiYieldMatrixStateDebugger({ token: 'ETH' });
  dbg.recordSnapshot('STAKE', { token: 'ETH', staked: 10 });

  const jsonStr = dbg.exportReplay();
  assert.ok(typeof jsonStr === 'string');

  const newDbg = new DefiYieldMatrixStateDebugger();
  const success = newDbg.importReplay(jsonStr);
  assert.strictEqual(success, true);
  assert.strictEqual(newDbg.getHistory().length, 2);
  assert.strictEqual(newDbg.getCurrentState().staked, 10);
});
