import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasFsmVisualizer } from './state-diagram.js';

describe('WeatherRadarAtlasFsmVisualizer', () => {
  it('initializes with default IDLE_SURVEILLANCE state and radar transitions', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    assert.equal(fsm.getState(), 'IDLE_SURVEILLANCE');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'BEGIN_SCAN'));
  });

  it('updates state upon valid dispatched radar transitions', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    const result1 = fsm.dispatch('BEGIN_SCAN');
    assert.equal(result1.previousState, 'IDLE_SURVEILLANCE');
    assert.equal(result1.currentState, 'VOLUME_SCAN');
    assert.equal(fsm.getState(), 'VOLUME_SCAN');

    const result2 = fsm.dispatch('ECHO_DETECTED');
    assert.equal(result2.currentState, 'PRECIPITATION_DETECTED');
    assert.equal(fsm.getState(), 'PRECIPITATION_DETECTED');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('ROTATION_SIGNATURE');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'IDLE_SURVEILLANCE');
  });

  it('supports custom transition additions and cyclic graph execution', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer({
      initialState: 'CLEAR_SKY',
      transitions: []
    });
    fsm.addTransition('CLEAR_SKY', 'STORM_FRONT', 'STORM');
    fsm.addTransition('STORM', 'FRONT_PASSES', 'CLEAR_SKY');

    assert.equal(fsm.getState(), 'CLEAR_SKY');
    fsm.dispatch('STORM_FRONT');
    assert.equal(fsm.getState(), 'STORM');
    fsm.dispatch('FRONT_PASSES');
    assert.equal(fsm.getState(), 'CLEAR_SKY');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> IDLE_SURVEILLANCE'));
    assert.ok(mermaid.includes('IDLE_SURVEILLANCE --> VOLUME_SCAN: BEGIN_SCAN'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    fsm.dispatch('BEGIN_SCAN');
    fsm.reset();
    assert.equal(fsm.getState(), 'IDLE_SURVEILLANCE');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
