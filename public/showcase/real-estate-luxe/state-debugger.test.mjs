import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeStateDebugger } from './state-debugger.js';

describe('RealEstateLuxeStateDebugger (Issue #1052)', () => {
  it('initializes with empty history or optional initialState', () => {
    const emptyDebugger = new RealEstateLuxeStateDebugger();
    assert.equal(emptyDebugger.getHistory().length, 0);
    assert.equal(emptyDebugger.currentIndex, -1);
    assert.equal(emptyDebugger.getCurrentState(), null);

    const initDebugger = new RealEstateLuxeStateDebugger({ city: 'Miami', maxPrice: 5000000 });
    assert.equal(initDebugger.getHistory().length, 1);
    assert.equal(initDebugger.currentIndex, 0);
    assert.deepEqual(initDebugger.getCurrentState(), { city: 'Miami', maxPrice: 5000000 });
  });

  it('records snapshots with deep isolation and rejects invalid actions', () => {
    const dbg = new RealEstateLuxeStateDebugger();
    const originalState = { listingId: 'villa_lux_1', amenities: ['pool', 'helipad'] };
    dbg.recordSnapshot({ type: 'VIEW_LISTING' }, originalState);

    // Mutate original object externally
    originalState.amenities.push('wine-cellar');
    const recordedState = dbg.getCurrentState();

    assert.equal(recordedState.amenities.length, 2);
    assert.deepEqual(recordedState.amenities, ['pool', 'helipad']);

    // Should throw on invalid action
    assert.throws(() => {
      dbg.recordSnapshot(null, {});
    }, /Action must be an object/);
  });

  it('navigates timeline via jumpToStep, stepForward, and stepBackward', () => {
    const dbg = new RealEstateLuxeStateDebugger();
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
    const dbg = new RealEstateLuxeStateDebugger();
    dbg.recordSnapshot({ type: 'S1' }, { price: 1000000 });
    dbg.recordSnapshot({ type: 'S2' }, { price: 2000000 });
    dbg.recordSnapshot({ type: 'S3' }, { price: 3000000 });

    dbg.jumpToStep(0);
    dbg.recordSnapshot({ type: 'BRANCH' }, { price: 9500000 });

    assert.equal(dbg.getHistory().length, 2);
    assert.equal(dbg.currentIndex, 1);
    assert.deepEqual(dbg.getCurrentState(), { price: 9500000 });
  });

  it('computes structured state diffs identifying added, removed, and modified keys', () => {
    const dbg = new RealEstateLuxeStateDebugger();
    const stateA = { zip: '90210', beds: 4, pool: true };
    const stateB = { zip: '90210', beds: 6, tennisCourt: true };

    const diff = dbg.computeDiff(stateA, stateB);
    assert.equal(diff.changes.length, 3);

    const modified = diff.changes.find((c) => c.key === 'beds');
    assert.equal(modified.type, 'MODIFIED');
    assert.equal(modified.oldValue, 4);
    assert.equal(modified.newValue, 6);

    const added = diff.changes.find((c) => c.key === 'tennisCourt');
    assert.equal(added.type, 'ADDED');
    assert.equal(added.newValue, true);

    const removed = diff.changes.find((c) => c.key === 'pool');
    assert.equal(removed.type, 'REMOVED');
    assert.equal(removed.oldValue, true);
  });

  it('exports and imports replay JSON bundles accurately', () => {
    const dbg = new RealEstateLuxeStateDebugger();
    dbg.recordSnapshot({ type: 'FAVORITE' }, { estateId: 'est_77' });
    dbg.recordSnapshot({ type: 'OFFER' }, { estateId: 'est_77', offer: 4200000 });

    const exported = dbg.exportReplay();
    assert.ok(typeof exported === 'string');

    const targetDebugger = new RealEstateLuxeStateDebugger();
    const success = targetDebugger.importReplay(exported);
    assert.ok(success);
    assert.equal(targetDebugger.getHistory().length, 2);
    assert.deepEqual(targetDebugger.getCurrentState(), { estateId: 'est_77', offer: 4200000 });

    // Invalid payload
    assert.equal(targetDebugger.importReplay('invalid json'), false);
  });
});
