import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsFsmVisualizer } from './state-diagram.js';

describe('BiotechGenomicsFsmVisualizer', () => {
  it('initializes in LAB_IDLE state with predefined transitions', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();
    assert.equal(fsm.currentState, 'LAB_IDLE');
    assert.ok(fsm.transitions.length > 5);
    assert.ok(fsm.states.has('DNA_SEQUENCING'));
    assert.ok(fsm.states.has('CRISPR_ALIGNMENT'));
  });

  it('transitions sequentially along the genomic pipeline', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();

    let res = fsm.dispatch('EXTRACT_SAMPLE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'SAMPLE_EXTRACTION');

    res = fsm.dispatch('START_SEQUENCING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DNA_SEQUENCING');

    res = fsm.dispatch('ALIGN_TARGETS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CRISPR_ALIGNMENT');

    res = fsm.dispatch('ANALYZE_VARIANTS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'VARIANT_ANALYSIS');

    res = fsm.dispatch('ARCHIVE_RESULTS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'LAB_IDLE');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();
    const res = fsm.dispatch('ARCHIVE_RESULTS');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'LAB_IDLE');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles alert state and error recovery correctly', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();
    fsm.dispatch('EXTRACT_SAMPLE');
    fsm.dispatch('START_SEQUENCING');
    const res = fsm.dispatch('FLAG_CONTAMINATION');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CONTAMINATION_ALERT');

    const recovery = fsm.dispatch('STERILIZE_RETRY');
    assert.equal(recovery.success, true);
    assert.equal(fsm.currentState, 'LAB_IDLE');
  });

  it('correctly serializes FSM to Mermaid.js stateDiagram-v2 format', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> LAB_IDLE'));
    assert.ok(mermaid.includes('DNA_SEQUENCING --> CRISPR_ALIGNMENT : ALIGN_TARGETS'));
  });

  it('supports custom transition definitions and full pipeline resets', () => {
    const fsm = new BiotechGenomicsFsmVisualizer();
    fsm.addTransition('LAB_IDLE', 'CUSTOM_PROFILING', 'VARIANT_ANALYSIS');
    const res = fsm.dispatch('CUSTOM_PROFILING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'VARIANT_ANALYSIS');

    fsm.reset();
    assert.equal(fsm.currentState, 'LAB_IDLE');
    assert.equal(fsm.history.length, 0);
  });
});
