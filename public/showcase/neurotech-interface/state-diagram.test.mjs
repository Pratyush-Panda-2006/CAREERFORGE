import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceFsmVisualizer } from './state-diagram.js';

describe('NeurotechInterfaceFsmVisualizer', () => {
  it('initializes with default STANDBY state and synaptic transitions', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    assert.equal(fsm.getState(), 'STANDBY');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'INIT_CALIBRATION'));
  });

  it('updates state upon valid dispatched synaptic transitions', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    const result1 = fsm.dispatch('INIT_CALIBRATION');
    assert.equal(result1.previousState, 'STANDBY');
    assert.equal(result1.currentState, 'CALIBRATING_SENSORS');
    assert.equal(fsm.getState(), 'CALIBRATING_SENSORS');

    const result2 = fsm.dispatch('IMPEDANCE_CHECK_PASS');
    assert.equal(result2.currentState, 'SYNAPTIC_SYNC');
    assert.equal(fsm.getState(), 'SYNAPTIC_SYNC');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('SYNC_LOCKED');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'STANDBY');
  });

  it('supports custom transition additions and cyclic graph execution', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer({
      initialState: 'DORMANT',
      transitions: []
    });
    fsm.addTransition('DORMANT', 'WAKE', 'ACTIVE');
    fsm.addTransition('ACTIVE', 'SLEEP', 'DORMANT');

    assert.equal(fsm.getState(), 'DORMANT');
    fsm.dispatch('WAKE');
    assert.equal(fsm.getState(), 'ACTIVE');
    fsm.dispatch('SLEEP');
    assert.equal(fsm.getState(), 'DORMANT');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> STANDBY'));
    assert.ok(mermaid.includes('STANDBY --> CALIBRATING_SENSORS: INIT_CALIBRATION'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    fsm.dispatch('INIT_CALIBRATION');
    fsm.reset();
    assert.equal(fsm.getState(), 'STANDBY');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
