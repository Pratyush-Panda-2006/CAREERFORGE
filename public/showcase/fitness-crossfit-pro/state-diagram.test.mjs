import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProFsmVisualizer } from './state-diagram.js';

describe('FitnessCrossfitProFsmVisualizer', () => {
  it('initializes with default WARMUP_MOBILITY state and CrossFit transitions', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer();
    assert.equal(fsm.getState(), 'WARMUP_MOBILITY');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'MOBILITY_COMPLETE'));
  });

  it('updates state upon valid dispatched WOD lifecycle transitions', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer();
    const result1 = fsm.dispatch('MOBILITY_COMPLETE');
    assert.equal(result1.previousState, 'WARMUP_MOBILITY');
    assert.equal(result1.currentState, 'STRENGTH_SKILL');
    assert.equal(fsm.getState(), 'STRENGTH_SKILL');

    const result2 = fsm.dispatch('MAX_EFFORT_LOGGED');
    assert.equal(result2.currentState, 'WOD_BRIEFING');
    assert.equal(fsm.getState(), 'WOD_BRIEFING');

    const result3 = fsm.dispatch('COUNTDOWN_GO');
    assert.equal(result3.currentState, 'WOD_IN_PROGRESS');
    assert.equal(fsm.getState(), 'WOD_IN_PROGRESS');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('FINAL_REP_COMPLETED');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'WARMUP_MOBILITY');
  });

  it('supports custom transition additions and cyclic interval round execution', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer({
      initialState: 'TABATA_ROW',
      transitions: []
    });
    fsm.addTransition('TABATA_ROW', 'SPRINT_DONE', 'KB_SWINGS');
    fsm.addTransition('KB_SWINGS', 'ROUND_DONE', 'TABATA_ROW');

    assert.equal(fsm.getState(), 'TABATA_ROW');
    fsm.dispatch('SPRINT_DONE');
    assert.equal(fsm.getState(), 'KB_SWINGS');
    fsm.dispatch('ROUND_DONE');
    assert.equal(fsm.getState(), 'TABATA_ROW');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> WARMUP_MOBILITY'));
    assert.ok(mermaid.includes('WARMUP_MOBILITY --> STRENGTH_SKILL: MOBILITY_COMPLETE'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new FitnessCrossfitProFsmVisualizer();
    fsm.dispatch('MOBILITY_COMPLETE');
    fsm.reset();
    assert.equal(fsm.getState(), 'WARMUP_MOBILITY');
    assert.ok(fsm.getHistory().length >= 3);
  });
});
