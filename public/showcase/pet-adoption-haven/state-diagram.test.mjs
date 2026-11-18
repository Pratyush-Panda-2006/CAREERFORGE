import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenFsmVisualizer } from './state-diagram.js';

describe('PetAdoptionHavenFsmVisualizer', () => {
  it('initializes with default SHELTER_INTAKE state and adoption transitions', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer();
    assert.equal(fsm.getState(), 'SHELTER_INTAKE');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'START_HEALTH_CHECK'));
  });

  it('updates state upon valid dispatched adoption pipeline transitions', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer();
    const result1 = fsm.dispatch('START_HEALTH_CHECK');
    assert.equal(result1.previousState, 'SHELTER_INTAKE');
    assert.equal(result1.currentState, 'VET_EXAMINATION');
    assert.equal(fsm.getState(), 'VET_EXAMINATION');

    const result2 = fsm.dispatch('HEALTH_CLEARED');
    assert.equal(result2.currentState, 'BEHAVIORAL_ASSESSMENT');
    assert.equal(fsm.getState(), 'BEHAVIORAL_ASSESSMENT');

    const result3 = fsm.dispatch('TEMPERAMENT_APPROVED');
    assert.equal(result3.currentState, 'ADOPTION_READY');
    assert.equal(fsm.getState(), 'ADOPTION_READY');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('FINALIZE_ADOPTION');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'SHELTER_INTAKE');
  });

  it('supports custom transition additions and cyclic foster recovery graph execution', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer({
      initialState: 'SPECIAL_DIET_RECOVERY',
      transitions: []
    });
    fsm.addTransition('SPECIAL_DIET_RECOVERY', 'GAIN_WEIGHT', 'VET_RECHECK');
    fsm.addTransition('VET_RECHECK', 'REQUIRE_MORE_TIME', 'SPECIAL_DIET_RECOVERY');

    assert.equal(fsm.getState(), 'SPECIAL_DIET_RECOVERY');
    fsm.dispatch('GAIN_WEIGHT');
    assert.equal(fsm.getState(), 'VET_RECHECK');
    fsm.dispatch('REQUIRE_MORE_TIME');
    assert.equal(fsm.getState(), 'SPECIAL_DIET_RECOVERY');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> SHELTER_INTAKE'));
    assert.ok(mermaid.includes('SHELTER_INTAKE --> VET_EXAMINATION: START_HEALTH_CHECK'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new PetAdoptionHavenFsmVisualizer();
    fsm.dispatch('START_HEALTH_CHECK');
    fsm.reset();
    assert.equal(fsm.getState(), 'SHELTER_INTAKE');
    assert.ok(fsm.getHistory().length >= 3);
  });
});
