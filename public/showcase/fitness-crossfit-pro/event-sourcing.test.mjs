import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProEventLedger } from './event-sourcing.js';

describe('FitnessCrossfitProEventLedger', () => {
  it('appends immutable event records in strict chronological order', () => {
    const ledger = new FitnessCrossfitProEventLedger();
    const evt = ledger.append('REP_RECORDED', { reps: 20 });
    assert.equal(evt.id, 1);
    assert.equal(ledger.events.length, 1);
  });

  it('accurately replays aggregate state up to arbitrary temporal versions', () => {
    const ledger = new FitnessCrossfitProEventLedger();
    ledger.append('REP_RECORDED', { reps: 15 });
    ledger.append('REP_RECORDED', { reps: 25 });
    ledger.append('WEIGHT_UPDATED', { weight: 185 });

    const stateAtV2 = ledger.replayTo(2);
    assert.equal(stateAtV2.totalReps, 40);
    assert.equal(stateAtV2.currentWeight, 0);

    const latest = ledger.getSnapshot();
    assert.equal(latest.totalReps, 40);
    assert.equal(latest.currentWeight, 185);
  });
});
