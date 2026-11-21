import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroStateDebugger } from './state-debugger.js';

describe('CulinaryBistroStateDebugger (Issue #1048)', () => {
  it('initializes with empty history or optional initialState', () => {
    const emptyDebugger = new CulinaryBistroStateDebugger();
    assert.equal(emptyDebugger.getHistory().length, 0);
    assert.equal(emptyDebugger.currentIndex, -1);
    assert.equal(emptyDebugger.getCurrentState(), null);

    const initDebugger = new CulinaryBistroStateDebugger({ table: 2, guests: 4 });
    assert.equal(initDebugger.getHistory().length, 1);
    assert.equal(initDebugger.currentIndex, 0);
    assert.deepEqual(initDebugger.getCurrentState(), { table: 2, guests: 4 });
  });

  it('records snapshots with deep isolation and rejects invalid actions', () => {
    const dbg = new CulinaryBistroStateDebugger();
    const originalState = { orderId: 'ord_99', courses: ['Appetizer', 'Entree'] };
    dbg.recordSnapshot({ type: 'CREATE_ORDER' }, originalState);

    // Mutate original object externally
    originalState.courses.push('Dessert');
    const recordedState = dbg.getCurrentState();

    assert.equal(recordedState.courses.length, 2);
    assert.deepEqual(recordedState.courses, ['Appetizer', 'Entree']);

    // Should throw on invalid action
    assert.throws(() => {
      dbg.recordSnapshot(null, {});
    }, /Action must be an object/);
  });

  it('navigates timeline via jumpToStep, stepForward, and stepBackward', () => {
    const dbg = new CulinaryBistroStateDebugger();
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
    const dbg = new CulinaryBistroStateDebugger();
    dbg.recordSnapshot({ type: 'S1' }, { total: 20 });
    dbg.recordSnapshot({ type: 'S2' }, { total: 40 });
    dbg.recordSnapshot({ type: 'S3' }, { total: 60 });

    dbg.jumpToStep(0);
    dbg.recordSnapshot({ type: 'BRANCH' }, { total: 95 });

    assert.equal(dbg.getHistory().length, 2);
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { total: 95 });
  });

  it('computes structured state diffs identifying added, removed, and modified keys', () => {
    const dbg = new CulinaryBistroStateDebugger();
    const stateA = { table: 3, guests: 2, wine: 'Chianti' };
    const stateB = { table: 3, guests: 4, dessert: 'Tiramisu' };

    const diff = dbg.computeDiff(stateA, stateB);
    assert.equal(diff.changes.length, 3);

    const modified = diff.changes.find((c) => c.key === 'guests');
    assert.equal(modified.type, 'MODIFIED');
    assert.equal(modified.oldValue, 2);
    assert.equal(modified.newValue, 4);

    const added = diff.changes.find((c) => c.key === 'dessert');
    assert.equal(added.type, 'ADDED');
    assert.equal(added.newValue, 'Tiramisu');

    const removed = diff.changes.find((c) => c.key === 'wine');
    assert.equal(removed.type, 'REMOVED');
    assert.equal(removed.oldValue, 'Chianti');
  });

  it('exports and imports replay JSON bundles accurately', () => {
    const dbg = new CulinaryBistroStateDebugger();
    dbg.recordSnapshot({ type: 'SEAT_GUEST' }, { table: 5 });
    dbg.recordSnapshot({ type: 'SERVE_MAINS' }, { table: 5, served: true });

    const exported = dbg.exportReplay();
    assert.ok(typeof exported === 'string');

    const targetDebugger = new CulinaryBistroStateDebugger();
    const success = targetDebugger.importReplay(exported);
    assert.ok(success);
    assert.equal(targetDebugger.getHistory().length, 2);
    assert.deepEqual(targetDebugger.getCurrentState(), { table: 5, served: true });

    // Invalid payload
    assert.equal(targetDebugger.importReplay('invalid json'), false);
  });
});
