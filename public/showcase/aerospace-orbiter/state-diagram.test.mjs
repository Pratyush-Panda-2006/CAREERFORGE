import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterFsmVisualizer } from './state-diagram.js';

test('dispatches valid mission events and records ordered history', () => {
  const machine = new AerospaceOrbiterFsmVisualizer('Standby');
  machine.addTransition('Standby', 'power on', 'Preflight');
  machine.addTransition('Preflight', 'abort', 'Standby');
  assert.deepEqual(machine.availableEvents(), ['power on']);
  assert.deepEqual(machine.dispatch('power on'), { from: 'Standby', event: 'power on', to: 'Preflight', step: 1 });
  assert.equal(machine.currentState, 'Preflight');
  machine.dispatch('abort');
  assert.equal(machine.currentState, 'Standby');
  assert.equal(machine.history.length, 2);
});

test('guards invalid and ambiguous transitions without changing state', () => {
  const machine = new AerospaceOrbiterFsmVisualizer();
  machine.addTransition('Standby', 'ignite', 'Ascent');
  assert.throws(() => machine.dispatch('land'), /No 'land' transition/);
  assert.throws(() => machine.addTransition('Standby', 'ignite', 'Orbit'), /only one target/);
  assert.throws(() => machine.addTransition('', 'event', 'Orbit'), /nonempty/);
  assert.equal(machine.currentState, 'Standby');
  assert.equal(machine.history.length, 0);
});

test('exports cyclic graph with safe generated Mermaid identifiers', () => {
  const machine = new AerospaceOrbiterFsmVisualizer('Standby');
  machine.addTransition('Standby', 'launch', 'Orbit');
  machine.addTransition('Orbit', 'return', 'Standby');
  const diagram = machine.exportMermaid();
  assert.match(diagram, /^stateDiagram-v2/);
  assert.match(diagram, /s0 --> s1: launch/);
  assert.match(diagram, /s1 --> s0: return/);
  machine.dispatch('launch');
  machine.reset();
  assert.equal(machine.currentState, 'Standby');
  assert.deepEqual(machine.history, []);
});
