import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeFsmVisualizer } from './state-diagram.js';

describe('QuantumForgeFsmVisualizer', () => {
  it('initializes in QPU_IDLE state with predefined transitions', () => {
    const fsm = new QuantumForgeFsmVisualizer();
    assert.equal(fsm.currentState, 'QPU_IDLE');
    assert.ok(fsm.transitions.length > 5);
    assert.ok(fsm.states.has('QUANTUM_GATE_EXECUTION'));
    assert.ok(fsm.states.has('MEASUREMENT_COLLAPSE'));
  });

  it('transitions sequentially through the quantum execution pipeline', () => {
    const fsm = new QuantumForgeFsmVisualizer();

    let res = fsm.dispatch('INITIATE_COOLING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CRYOGENIC_COOLING');

    res = fsm.dispatch('TEMP_STABILIZED');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QUBIT_INITIALIZATION');

    res = fsm.dispatch('APPLY_GATES');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QUANTUM_GATE_EXECUTION');

    res = fsm.dispatch('MEASURE_QUBITS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MEASUREMENT_COLLAPSE');

    res = fsm.dispatch('READOUT_COMPLETE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QPU_IDLE');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new QuantumForgeFsmVisualizer();
    const res = fsm.dispatch('READOUT_COMPLETE');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'QPU_IDLE');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles decoherence fault and recovery correctly', () => {
    const fsm = new QuantumForgeFsmVisualizer();
    fsm.dispatch('INITIATE_COOLING');
    fsm.dispatch('TEMP_STABILIZED');
    fsm.dispatch('APPLY_GATES');
    const res = fsm.dispatch('DECOHERENCE_DETECTED');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DECOHERENCE_FAULT');

    const recovery = fsm.dispatch('RECALIBRATE_RETRY');
    assert.equal(recovery.success, true);
    assert.equal(fsm.currentState, 'QPU_IDLE');
  });

  it('correctly serializes FSM to Mermaid.js stateDiagram-v2 format', () => {
    const fsm = new QuantumForgeFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> QPU_IDLE'));
    assert.ok(mermaid.includes('QUANTUM_GATE_EXECUTION --> MEASUREMENT_COLLAPSE : MEASURE_QUBITS'));
  });

  it('supports custom transition definitions and full pipeline resets', () => {
    const fsm = new QuantumForgeFsmVisualizer();
    fsm.addTransition('QPU_IDLE', 'BENCHMARK_PROFILING', 'QUANTUM_GATE_EXECUTION');
    const res = fsm.dispatch('BENCHMARK_PROFILING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QUANTUM_GATE_EXECUTION');

    fsm.reset();
    assert.equal(fsm.currentState, 'QPU_IDLE');
    assert.equal(fsm.history.length, 0);
  });
});
