import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingFsmVisualizer } from './state-diagram.js';

describe('AgritechPrecisionFarmingFsmVisualizer', () => {
  it('initializes with default SOIL_SAMPLING state and agronomic transitions', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer();
    assert.equal(fsm.getState(), 'SOIL_SAMPLING');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'MOISTURE_VERIFIED'));
  });

  it('updates state upon valid dispatched agronomic transitions', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer();
    const result1 = fsm.dispatch('MOISTURE_VERIFIED');
    assert.equal(result1.previousState, 'SOIL_SAMPLING');
    assert.equal(result1.currentState, 'SEEDING_PREPARATION');
    assert.equal(fsm.getState(), 'SEEDING_PREPARATION');

    const result2 = fsm.dispatch('PLANTING_COMPLETE');
    assert.equal(result2.currentState, 'IRRIGATION_ACTIVE');
    assert.equal(fsm.getState(), 'IRRIGATION_ACTIVE');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('DOSING_FINISHED');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'SOIL_SAMPLING');
  });

  it('supports custom transition additions and cyclic graph execution', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer({
      initialState: 'GREENHOUSE_SEEDLING',
      transitions: []
    });
    fsm.addTransition('GREENHOUSE_SEEDLING', 'TRANSPLANT', 'OUTDOOR_BED');
    fsm.addTransition('OUTDOOR_BED', 'SEASON_RESET', 'GREENHOUSE_SEEDLING');

    assert.equal(fsm.getState(), 'GREENHOUSE_SEEDLING');
    fsm.dispatch('TRANSPLANT');
    assert.equal(fsm.getState(), 'OUTDOOR_BED');
    fsm.dispatch('SEASON_RESET');
    assert.equal(fsm.getState(), 'GREENHOUSE_SEEDLING');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> SOIL_SAMPLING'));
    assert.ok(mermaid.includes('SOIL_SAMPLING --> SEEDING_PREPARATION: MOISTURE_VERIFIED'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new AgritechPrecisionFarmingFsmVisualizer();
    fsm.dispatch('MOISTURE_VERIFIED');
    fsm.reset();
    assert.equal(fsm.getState(), 'SOIL_SAMPLING');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
