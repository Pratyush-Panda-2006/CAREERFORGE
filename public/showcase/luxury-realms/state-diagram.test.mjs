import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsFsmVisualizer } from './state-diagram.js';

describe('LuxuryRealmsFsmVisualizer', () => {
  it('initializes in ESTATE_LISTED state with predefined transitions', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();
    assert.equal(fsm.currentState, 'ESTATE_LISTED');
    assert.ok(fsm.transitions.length > 5);
    assert.ok(fsm.states.has('PRIVATE_SHOWING'));
    assert.ok(fsm.states.has('ESCROW_DEPOSIT'));
  });

  it('transitions sequentially through estate negotiation and closing lifecycle', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();

    let res = fsm.dispatch('SCHEDULE_SHOWING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'PRIVATE_SHOWING');

    res = fsm.dispatch('SUBMIT_BID');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'OFFER_NEGOTIATION');

    res = fsm.dispatch('ACCEPT_OFFER');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ESCROW_DEPOSIT');

    res = fsm.dispatch('VERIFY_FUNDS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DEED_CONVEYANCE');

    res = fsm.dispatch('CLOSE_TRANSACTION');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ESTATE_LISTED');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();
    const res = fsm.dispatch('CLOSE_TRANSACTION');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'ESTATE_LISTED');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles due diligence title encumbrance dispute and resolution correctly', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();
    fsm.dispatch('SCHEDULE_SHOWING');
    fsm.dispatch('SUBMIT_BID');
    fsm.dispatch('ACCEPT_OFFER');
    const res = fsm.dispatch('TITLE_ENCUMBRANCE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DUE_DILIGENCE_DISPUTE');

    const recovery = fsm.dispatch('RESOLVE_COVENANTS');
    assert.equal(recovery.success, true);
    assert.equal(fsm.currentState, 'ESTATE_LISTED');
  });

  it('correctly serializes FSM to Mermaid.js stateDiagram-v2 format', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> ESTATE_LISTED'));
    assert.ok(mermaid.includes('ESCROW_DEPOSIT --> DEED_CONVEYANCE : VERIFY_FUNDS'));
  });

  it('supports custom transition definitions and full pipeline resets', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();
    fsm.addTransition('ESTATE_LISTED', 'SOVEREIGN_DIRECT_GRANT', 'DEED_CONVEYANCE');
    const res = fsm.dispatch('SOVEREIGN_DIRECT_GRANT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DEED_CONVEYANCE');

    fsm.reset();
    assert.equal(fsm.currentState, 'ESTATE_LISTED');
    assert.equal(fsm.history.length, 0);
  });
});
