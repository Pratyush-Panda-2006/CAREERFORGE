import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalStateDebugger } from './state-debugger.js';

describe('DocsPortalStateDebugger (Issue #1044)', () => {
  it('initializes with empty history or optional initialState', () => {
    const emptyDebugger = new DocsPortalStateDebugger();
    assert.equal(emptyDebugger.getHistory().length, 0);
    assert.equal(emptyDebugger.currentIndex, -1);
    assert.equal(emptyDebugger.getCurrentState(), null);

    const initDebugger = new DocsPortalStateDebugger({ docId: 'quickstart', theme: 'dark' });
    assert.equal(initDebugger.getHistory().length, 1);
    assert.equal(initDebugger.currentIndex, 0);
    assert.deepEqual(initDebugger.getCurrentState(), { docId: 'quickstart', theme: 'dark' });
  });

  it('records snapshots with deep isolation and rejects invalid actions', () => {
    const dbg = new DocsPortalStateDebugger();
    const originalState = { docId: 'api-reference', toc: ['intro', 'auth'] };
    dbg.recordSnapshot({ type: 'LOAD_DOC' }, originalState);

    // Mutate original object externally
    originalState.toc.push('endpoints');
    const recordedState = dbg.getCurrentState();

    assert.equal(recordedState.toc.length, 2);
    assert.deepEqual(recordedState.toc, ['intro', 'auth']);

    // Should throw on invalid action
    assert.throws(() => {
      dbg.recordSnapshot(null, {});
    }, /Action must be an object/);
  });

  it('navigates timeline via jumpToStep, stepForward, and stepBackward', () => {
    const dbg = new DocsPortalStateDebugger();
    dbg.recordSnapshot({ type: 'STEP_0' }, { page: 0 });
    dbg.recordSnapshot({ type: 'STEP_1' }, { page: 1 });
    dbg.recordSnapshot({ type: 'STEP_2' }, { page: 2 });

    assert.equal(dbg.currentIndex, 2);

    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { page: 1 });

    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 0);
    assert.deepEqual(dbg.getCurrentState(), { page: 0 });

    // Step backward at boundary
    dbg.stepBackward();
    assert.equal(dbg.currentIndex, 0);

    dbg.stepForward();
    assert.equal(dbg.currentIndex, 1);

    dbg.jumpToStep(2);
    assert.equal(dbg.currentIndex, 2);
  });

  it('discards future timeline when recording a new snapshot after stepping back', () => {
    const dbg = new DocsPortalStateDebugger();
    dbg.recordSnapshot({ type: 'S1' }, { v: 1 });
    dbg.recordSnapshot({ type: 'S2' }, { v: 2 });
    dbg.recordSnapshot({ type: 'S3' }, { v: 3 });

    dbg.jumpToStep(0);
    dbg.recordSnapshot({ type: 'BRANCH' }, { v: 99 });

    assert.equal(dbg.getHistory().length, 2);
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { v: 99 });
  });

  it('computes structured state diffs identifying added, removed, and modified keys', () => {
    const dbg = new DocsPortalStateDebugger();
    const stateA = { doc: 'home', mode: 'reader', count: 1 };
    const stateB = { doc: 'home', mode: 'editor', extra: true };

    const diff = dbg.computeDiff(stateA, stateB);
    assert.equal(diff.changes.length, 3);

    const modified = diff.changes.find((c) => c.key === 'mode');
    assert.equal(modified.type, 'MODIFIED');
    assert.equal(modified.oldValue, 'reader');
    assert.equal(modified.newValue, 'editor');

    const added = diff.changes.find((c) => c.key === 'extra');
    assert.equal(added.type, 'ADDED');
    assert.equal(added.newValue, true);

    const removed = diff.changes.find((c) => c.key === 'count');
    assert.equal(removed.type, 'REMOVED');
    assert.equal(removed.oldValue, 1);
  });

  it('exports and imports replay JSON bundles accurately', () => {
    const dbg = new DocsPortalStateDebugger();
    dbg.recordSnapshot({ type: 'ACTION_A' }, { step: 'A' });
    dbg.recordSnapshot({ type: 'ACTION_B' }, { step: 'B' });

    const exported = dbg.exportReplay();
    assert.ok(typeof exported === 'string');

    const targetDebugger = new DocsPortalStateDebugger();
    const success = targetDebugger.importReplay(exported);
    assert.ok(success);
    assert.equal(targetDebugger.getHistory().length, 2);
    assert.deepEqual(targetDebugger.getCurrentState(), { step: 'B' });

    // Invalid payload
    assert.equal(targetDebugger.importReplay('invalid json'), false);
  });
});
