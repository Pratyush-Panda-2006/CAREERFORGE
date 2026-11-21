import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProFsmVisualizer } from './state-diagram.js';

describe('CryptoExchangeProFsmVisualizer', () => {
  it('initializes in ORDER_CREATED state with predefined transitions', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();
    assert.equal(fsm.currentState, 'ORDER_CREATED');
    assert.ok(fsm.transitions.length > 5);
    assert.ok(fsm.states.has('ORDERBOOK_ROUTING'));
    assert.ok(fsm.states.has('MATCHING_FILLED'));
  });

  it('transitions sequentially through order placement and fill lifecycle', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();

    let res = fsm.dispatch('VALIDATE_MARGIN');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MARGIN_CHECK');

    res = fsm.dispatch('ROUTE_ORDERBOOK');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ORDERBOOK_ROUTING');

    res = fsm.dispatch('EXECUTE_FILL');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MATCHING_FILLED');

    res = fsm.dispatch('SETTLE_TRADES');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CLEARING_SETTLEMENT');

    res = fsm.dispatch('COMPLETE_CYCLE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ORDER_CREATED');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();
    const res = fsm.dispatch('SETTLE_TRADES');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'ORDER_CREATED');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles liquidation margin halt and collateral recovery correctly', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();
    fsm.dispatch('VALIDATE_MARGIN');
    const res = fsm.dispatch('MARGIN_DEFICIT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'LIQUIDATION_HALT');

    const recovery = fsm.dispatch('INJECT_COLLATERAL');
    assert.equal(recovery.success, true);
    assert.equal(fsm.currentState, 'ORDER_CREATED');
  });

  it('correctly serializes FSM to Mermaid.js stateDiagram-v2 format', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> ORDER_CREATED'));
    assert.ok(mermaid.includes('ORDERBOOK_ROUTING --> MATCHING_FILLED : EXECUTE_FILL'));
  });

  it('supports custom transition definitions and full pipeline resets', () => {
    const fsm = new CryptoExchangeProFsmVisualizer();
    fsm.addTransition('ORDER_CREATED', 'FAST_OTC_SWAP', 'CLEARING_SETTLEMENT');
    const res = fsm.dispatch('FAST_OTC_SWAP');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CLEARING_SETTLEMENT');

    fsm.reset();
    assert.equal(fsm.currentState, 'ORDER_CREATED');
    assert.equal(fsm.history.length, 0);
  });
});
