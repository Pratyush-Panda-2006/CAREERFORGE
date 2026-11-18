import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceFsmVisualizer } from './state-diagram.js';

describe('NeurotechInterfaceFsmVisualizer', () => {
  it('initializes with default NEURAL_DISCONNECTED state and neural states', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'NEURAL_DISCONNECTED');
    assert.ok(fsm.states.has('ACTIVE_BCI_STREAM'));
    assert.ok(fsm.states.has('SYNAPTIC_CALIBRATION'));
    assert.ok(fsm.states.has('ARTIFACT_SUPPRESSION'));
  });

  it('executes valid sequential transitions along BCI pipeline lifecycle', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();

    const res1 = fsm.dispatch('CONNECT_HEADSET');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'ELECTRODE_IMPEDANCE_CHECK');

    const res2 = fsm.dispatch('IMPEDANCE_PASS');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'SYNAPTIC_CALIBRATION');

    const res3 = fsm.dispatch('CALIBRATION_SYNC');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'ACTIVE_BCI_STREAM');

    const res4 = fsm.dispatch('DETECT_OCULAR_ARTIFACT');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'ARTIFACT_SUPPRESSION');

    const res5 = fsm.dispatch('FILTER_CLEARED');
    assert.strictEqual(res5.success, true);
    assert.strictEqual(fsm.currentState, 'ACTIVE_BCI_STREAM');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'NEURAL_DISCONNECTED');

    const invalid = fsm.dispatch('CALIBRATION_SYNC');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'NEURAL_DISCONNECTED');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    fsm.addTransition('NEURAL_DISCONNECTED', 'SIMULATION_MODE', 'VIRTUAL_SYNAPSE_SIM');
    fsm.addTransition('VIRTUAL_SYNAPSE_SIM', 'STOP_SIM', 'NEURAL_DISCONNECTED');

    const res1 = fsm.dispatch('SIMULATION_MODE');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'VIRTUAL_SYNAPSE_SIM');

    const res2 = fsm.dispatch('STOP_SIM');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'NEURAL_DISCONNECTED');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> NEURAL_DISCONNECTED'));
    assert.ok(mermaid.includes('NEURAL_DISCONNECTED --> ELECTRODE_IMPEDANCE_CHECK : CONNECT_HEADSET'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new NeurotechInterfaceFsmVisualizer();
    fsm.dispatch('CONNECT_HEADSET');
    fsm.dispatch('IMPEDANCE_PASS');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'NEURAL_DISCONNECTED');
    assert.strictEqual(fsm.history.length, 0);
  });
});
