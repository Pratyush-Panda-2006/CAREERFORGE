import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsFsmVisualizer } from './state-diagram.js';

describe('SupplyChainLogisticsFsmVisualizer', () => {
  it('initializes with default ORDER_RECEIVED state and logistics transitions', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer();
    assert.equal(fsm.getState(), 'ORDER_RECEIVED');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'VERIFY_STOCK'));
  });

  it('updates state upon valid dispatched logistics transitions', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer();
    const result1 = fsm.dispatch('VERIFY_STOCK');
    assert.equal(result1.previousState, 'ORDER_RECEIVED');
    assert.equal(result1.currentState, 'INVENTORY_ALLOCATION');
    assert.equal(fsm.getState(), 'INVENTORY_ALLOCATION');

    const result2 = fsm.dispatch('RELEASE_TO_WAREHOUSE');
    assert.equal(result2.currentState, 'PICKING_PACKING');
    assert.equal(fsm.getState(), 'PICKING_PACKING');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('SIGNATURE_CAPTURED');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'ORDER_RECEIVED');
  });

  it('supports custom transition additions and cyclic graph execution', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer({
      initialState: 'DOCK_WAIT',
      transitions: []
    });
    fsm.addTransition('DOCK_WAIT', 'ASSIGN_BAY', 'LOADING');
    fsm.addTransition('LOADING', 'SEAL_CONTAINER', 'DOCK_WAIT');

    assert.equal(fsm.getState(), 'DOCK_WAIT');
    fsm.dispatch('ASSIGN_BAY');
    assert.equal(fsm.getState(), 'LOADING');
    fsm.dispatch('SEAL_CONTAINER');
    assert.equal(fsm.getState(), 'DOCK_WAIT');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> ORDER_RECEIVED'));
    assert.ok(mermaid.includes('ORDER_RECEIVED --> INVENTORY_ALLOCATION: VERIFY_STOCK'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new SupplyChainLogisticsFsmVisualizer();
    fsm.dispatch('VERIFY_STOCK');
    fsm.reset();
    assert.equal(fsm.getState(), 'ORDER_RECEIVED');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
