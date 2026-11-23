import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenStateDebugger } from './state-debugger.js';

describe('PetAdoptionHavenStateDebugger', () => {
  it('records snapshots with deep isolation', () => {
    const dbg = new PetAdoptionHavenStateDebugger();
    const st = { items: [1, 2] };
    dbg.recordSnapshot({ type: 'ADD' }, st);
    st.items.push(3);
    assert.deepEqual(dbg.getCurrentState().items, [1, 2]);
  });

  it('navigates history frames', () => {
    const dbg = new PetAdoptionHavenStateDebugger();
    dbg.recordSnapshot({ type: 'A' }, { step: 1 });
    dbg.recordSnapshot({ type: 'B' }, { step: 2 });
    dbg.stepBackward();
    assert.equal(dbg.getCurrentState().step, 1);
    dbg.stepForward();
    assert.equal(dbg.getCurrentState().step, 2);
  });

  it('computes diffs between states', () => {
    const dbg = new PetAdoptionHavenStateDebugger();
    const diff = dbg.computeDiff({ val: 1 }, { val: 2, newKey: 'x' });
    assert.equal(diff.totalChanges, 2);
  });

  it('exports and imports replays', () => {
    const dbg = new PetAdoptionHavenStateDebugger();
    dbg.recordSnapshot({ type: 'A' }, { val: 10 });
    const serialized = dbg.exportReplay();
    const dbg2 = new PetAdoptionHavenStateDebugger();
    dbg2.importReplay(serialized);
    assert.deepEqual(dbg2.getCurrentState(), { val: 10 });
  });
});
