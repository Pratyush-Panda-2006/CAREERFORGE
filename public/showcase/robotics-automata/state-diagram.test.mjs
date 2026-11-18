import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataFsmVisualizer } from './state-diagram.js';

describe('RoboticsAutomataFsmVisualizer', () => {
  it('initializes with default IDLE state and transitions', () => {
    const fsm = new RoboticsAutomataFsmVisualizer();
    assert.equal(fsm.getState(), 'IDLE');
    assert.ok(fsm.getTransitions().length >= 9);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'START_CALIBRATION'));
  });

  it('updates state upon valid dispatched transitions', () => {
    const fsm = new RoboticsAutomataFsmVisualizer();
    const result1 = fsm.dispatch('START_CALIBRATION');
    assert.equal(result1.previousState, 'IDLE');
    assert.equal(result1.currentState, 'CALIBRATING');
    assert.equal(fsm.getState(), 'CALIBRATING');

    const result2 = fsm.dispatch('CALIBRATION_OK');
    assert.equal(result2.currentState, 'AUTONOMOUS_NAV');
    assert.equal(fsm.getState(), 'AUTONOMOUS_NAV');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new RoboticsAutomataFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('CALIBRATION_OK');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'IDLE');
  });

  it('supports custom transition addition and cyclic graph flow', () => {
    const fsm = new RoboticsAutomataFsmVisualizer({
      initialState: 'STANDBY',
      transitions: []
    });
    fsm.addTransition('STANDBY', 'ACTIVATE', 'RUNNING');
    fsm.addTransition('RUNNING', 'DEACTIVATE', 'STANDBY');

    assert.equal(fsm.getState(), 'STANDBY');
    fsm.dispatch('ACTIVATE');
    assert.equal(fsm.getState(), 'RUNNING');
    fsm.dispatch('DEACTIVATE');
    assert.equal(fsm.getState(), 'STANDBY');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new RoboticsAutomataFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> IDLE'));
    assert.ok(mermaid.includes('IDLE --> CALIBRATING: START_CALIBRATION'));
  });

  it('maintains transition audit trail and resets correctly', () => {
    const fsm = new RoboticsAutomataFsmVisualizer();
    fsm.dispatch('START_CALIBRATION');
    fsm.reset();
    assert.equal(fsm.getState(), 'IDLE');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
