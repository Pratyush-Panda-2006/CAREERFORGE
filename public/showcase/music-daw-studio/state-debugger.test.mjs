import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioStateDebugger } from './state-debugger.js';

describe('MusicDawStudioStateDebugger (Issue #1163)', () => {
  it('initializes with empty history or optional initialState', () => {
    const emptyDebugger = new MusicDawStudioStateDebugger();
    assert.equal(emptyDebugger.getHistory().length, 0);
    assert.equal(emptyDebugger.currentIndex, -1);
    assert.equal(emptyDebugger.getCurrentState(), null);

    const initDebugger = new MusicDawStudioStateDebugger({ id: 'init_test', value: 42 });
    assert.equal(initDebugger.getHistory().length, 1);
    assert.equal(initDebugger.currentIndex, 0);
    assert.deepEqual(initDebugger.getCurrentState(), { id: 'init_test', value: 42 });
  });

  it('records snapshots with deep isolation and rejects invalid actions', () => {
    const dbg = new MusicDawStudioStateDebugger();
    const originalState = { scope: 'test', items: ['a', 'b'] };
    dbg.recordSnapshot({ type: 'TEST_ACTION' }, originalState);

    // Mutate original object externally
    originalState.items.push('c');
    const recordedState = dbg.getCurrentState();

    assert.equal(recordedState.items.length, 2);
    assert.deepEqual(recordedState.items, ['a', 'b']);

    // Should throw on invalid action
    assert.throws(() => {
      dbg.recordSnapshot(null, {});
    }, /Action must be an object/);
  });

  it('navigates timeline via jumpToStep, stepForward, and stepBackward', () => {
    const dbg = new MusicDawStudioStateDebugger();
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

    dbg.stepForward();
    assert.equal(dbg.currentIndex, 1);

    dbg.jumpToStep(999);
    assert.equal(dbg.currentIndex, 2);

    dbg.jumpToStep(-5);
    assert.equal(dbg.currentIndex, 0);
  });

  it('computes recursive structural diff accurately between states', () => {
    const dbg = new MusicDawStudioStateDebugger();
    const stateA = { active: true, count: 5, list: [1, 2] };
    const stateB = { active: false, count: 5, list: [1, 2, 3], tag: 'new' };

    const diff = dbg.computeDiff(stateA, stateB);
    assert.equal(diff.totalChanges, 3);

    const modified = diff.changes.find((c) => c.key === 'active');
    assert.equal(modified.kind, 'MODIFIED');
    assert.equal(modified.prev, true);
    assert.equal(modified.current, false);

    const added = diff.changes.find((c) => c.key === 'tag');
    assert.equal(added.kind, 'ADDED');
    assert.equal(added.current, 'new');
  });

  it('exports and imports timeline replays accurately', () => {
    const dbg1 = new MusicDawStudioStateDebugger();
    dbg1.recordSnapshot({ type: 'ACTION_A' }, { val: 10 });
    dbg1.recordSnapshot({ type: 'ACTION_B' }, { val: 20 });

    const serialized = dbg1.exportReplay();
    assert.ok(typeof serialized === 'string');

    const dbg2 = new MusicDawStudioStateDebugger();
    const count = dbg2.importReplay(serialized);
    assert.equal(count, 2);
    assert.equal(dbg2.currentIndex, 1);
    assert.deepEqual(dbg2.getCurrentState(), { val: 20 });
  });
});
