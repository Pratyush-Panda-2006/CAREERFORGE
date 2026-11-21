import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultStateDebugger } from './state-debugger.js';

describe('FintechVaultStateDebugger (Issue #1056)', () => {
  it('initializes with empty history or optional initialState', () => {
    const emptyDebugger = new FintechVaultStateDebugger();
    assert.equal(emptyDebugger.getHistory().length, 0);
    assert.equal(emptyDebugger.currentIndex, -1);
    assert.equal(emptyDebugger.getCurrentState(), null);

    const initDebugger = new FintechVaultStateDebugger({ vaultId: 'vlt_001', balance: 100000 });
    assert.equal(initDebugger.getHistory().length, 1);
    assert.equal(initDebugger.currentIndex, 0);
    assert.deepEqual(initDebugger.getCurrentState(), { vaultId: 'vlt_001', balance: 100000 });
  });

  it('records snapshots with deep isolation and rejects invalid actions', () => {
    const dbg = new FintechVaultStateDebugger();
    const originalState = { account: 'acc_01', signers: ['pub_1', 'pub_2'] };
    dbg.recordSnapshot({ type: 'ADD_SIGNERS' }, originalState);

    // Mutate original object externally
    originalState.signers.push('pub_3');
    const recordedState = dbg.getCurrentState();

    assert.equal(recordedState.signers.length, 2);
    assert.deepEqual(recordedState.signers, ['pub_1', 'pub_2']);

    // Should throw on invalid action
    assert.throws(() => {
      dbg.recordSnapshot(null, {});
    }, /Action must be an object/);
  });

  it('navigates timeline via jumpToStep, stepForward, and stepBackward', () => {
    const dbg = new FintechVaultStateDebugger();
    dbg.recordSnapshot({ type: 'STEP_0' }, { step: 0 });
    dbg.recordSnapshot({ type: 'STEP_1' }, { step: 1 });
    dbg.recordSnapshot({ type: 'STEP_2' }, { step: 2 });

    assert.equal(dbg.currentIndex, 2);

    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { step: 1 });

    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 0);
    assert.deepEqual(dbg.getCurrentState(), { step: 0 });

    // Step backward at boundary
    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 0);

    dbg.stepForward();
    assert.equal(dbg.currentIndex, 1);

    dbg.jumpToStep(2);
    assert.equal(dbg.currentIndex, 2);
  });

  it('discards future timeline when recording a new snapshot after stepping back', () => {
    const dbg = new FintechVaultStateDebugger();
    dbg.recordSnapshot({ type: 'S1' }, { bal: 100 });
    dbg.recordSnapshot({ type: 'S2' }, { bal: 200 });
    dbg.recordSnapshot({ type: 'S3' }, { bal: 300 });

    dbg.jumpToStep(0);
    dbg.recordSnapshot({ type: 'BRANCH' }, { bal: 950 });

    assert.equal(dbg.getHistory().length, 2);
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { bal: 950 });
  });

  it('computes structured state diffs identifying added, removed, and modified keys', () => {
    const dbg = new FintechVaultStateDebugger();
    const stateA = { status: 'LOCKED', quorum: 3, feeRate: 0.001 };
    const stateB = { status: 'UNLOCKED', quorum: 2, bonusYield: 0.05 };

    const diff = dbg.computeDiff(stateA, stateB);
    assert.equal(diff.changes.length, 4);

    const modified = diff.changes.find((c) => c.key === 'status');
    assert.equal(modified.type, 'MODIFIED');
    assert.equal(modified.oldValue, 'LOCKED');
    assert.equal(modified.newValue, 'UNLOCKED');

    const added = diff.changes.find((c) => c.key === 'bonusYield');
    assert.equal(added.type, 'ADDED');
    assert.equal(added.newValue, 0.05);

    const removed = diff.changes.find((c) => c.key === 'feeRate');
    assert.equal(removed.type, 'REMOVED');
    assert.equal(removed.oldValue, 0.001);
  });

  it('exports and imports replay JSON bundles accurately', () => {
    const dbg = new FintechVaultStateDebugger();
    dbg.recordSnapshot({ type: 'DEPOSIT' }, { tx: 'tx_01', amount: 50000 });
    dbg.recordSnapshot({ type: 'SETTLE' }, { tx: 'tx_01', settled: true });

    const exported = dbg.exportReplay();
    assert.ok(typeof exported === 'string');

    const targetDebugger = new FintechVaultStateDebugger();
    const success = targetDebugger.importReplay(exported);
    assert.ok(success);
    assert.equal(targetDebugger.getHistory().length, 2);
    assert.deepEqual(targetDebugger.getCurrentState(), { tx: 'tx_01', settled: true });

    // Invalid payload
    assert.equal(targetDebugger.importReplay('invalid json'), false);
  });
});
