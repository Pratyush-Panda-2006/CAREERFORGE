import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixFsmVisualizer } from './state-diagram.js';

describe('DefiYieldMatrixFsmVisualizer', () => {
  it('initializes with default WALLET_IDLE state and DeFi states', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');
    assert.ok(fsm.states.has('LIQUIDITY_ROUTING'));
    assert.ok(fsm.states.has('FLASH_LOAN_EXECUTING'));
    assert.ok(fsm.states.has('YIELD_HARVESTING'));
  });

  it('executes valid sequential transitions along yield farming lifecycle', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();

    const res1 = fsm.dispatch('INITIATE_SWAP');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'LIQUIDITY_ROUTING');

    const res2 = fsm.dispatch('TRIGGER_FLASH_LOAN');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'FLASH_LOAN_EXECUTING');

    const res3 = fsm.dispatch('LOAN_REPAID');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'YIELD_HARVESTING');

    const res4 = fsm.dispatch('REBALANCE');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'COLLATERAL_REBALANCING');

    const res5 = fsm.dispatch('REBALANCE_COMPLETE');
    assert.strictEqual(res5.success, true);
    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');

    const invalid = fsm.dispatch('TRIGGER_FLASH_LOAN');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();
    fsm.addTransition('WALLET_IDLE', 'BRIDGE_TRANSFER', 'CROSS_CHAIN_BRIDGE');
    fsm.addTransition('CROSS_CHAIN_BRIDGE', 'BRIDGE_CONFIRMED', 'WALLET_IDLE');

    const res1 = fsm.dispatch('BRIDGE_TRANSFER');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'CROSS_CHAIN_BRIDGE');

    const res2 = fsm.dispatch('BRIDGE_CONFIRMED');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> WALLET_IDLE'));
    assert.ok(mermaid.includes('WALLET_IDLE --> LIQUIDITY_ROUTING : INITIATE_SWAP'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();
    fsm.dispatch('INITIATE_SWAP');
    fsm.dispatch('TRIGGER_FLASH_LOAN');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'WALLET_IDLE');
    assert.strictEqual(fsm.history.length, 0);
  });
});
