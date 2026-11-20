import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreFsmVisualizer as FSM } from './state-diagram.js';

test('dispatch only follows an event from the current state and records rejected attempts', () => {
  const m = new FSM('Brief').addTransition('Brief', 'Start', 'Design').addTransition('Design', 'Review', 'Review');
  assert.equal(m.dispatch('Review').accepted, false);
  assert.equal(m.currentState, 'Brief');
  assert.deepEqual(m.dispatch('Start'), { from: 'Brief', event: 'Start', to: 'Design', accepted: true, reason: 'Transition completed.' });
  assert.equal(m.dispatch('Start').accepted, false);
  assert.equal(m.history.length, 3);
});
test('guards fail closed without state changes, and a changed condition can allow retry', () => {
  let approved = false;
  const m = new FSM('Review').addTransition('Review', 'Deliver', 'Done', () => approved, 'approval');
  assert.match(m.dispatch('Deliver').reason, /Guard blocked/);
  assert.equal(m.currentState, 'Review');
  approved = true;
  assert.equal(m.dispatch('Deliver').to, 'Done');
  const broken = new FSM('A').addTransition('A', 'Go', 'B', () => { throw new Error('bad guard'); });
  assert.equal(broken.dispatch('Go').accepted, false);
  assert.equal(broken.currentState, 'A');
});
test('duplicate event rejects ambiguity and invalid definitions never mutate the diagram', () => {
  const m = new FSM('A').addTransition('A', 'Go', 'B');
  assert.throws(() => m.addTransition('A', 'Go', 'C'), /unique/);
  for (const name of ['', '  ', null, 'a\nb', 'a'.repeat(65)]) assert.throws(() => m.addTransition('A', name, 'B'));
  assert.throws(() => m.addTransition('A', 'Other', 'C', false));
  assert.equal(m.transitions.length, 1);
});
test('cycles and self loops serialize deterministically using stable node identifiers', () => {
  const m = new FSM('Brief').addTransition('Brief', 'Start', 'Design').addTransition('Design', 'Back', 'Brief').addTransition('Design', 'Stay', 'Design');
  assert.equal(m.exportMermaid(), 'stateDiagram-v2\n  state "Brief" as s0\n  state "Design" as s1\n  [*] --> s0\n  s0 --> s1 : Start\n  s1 --> s0 : Back\n  s1 --> s1 : Stay');
  m.dispatch('Start'); m.dispatch('Stay'); m.dispatch('Back');
  assert.equal(m.currentState, 'Brief');
});
test('untrusted names cannot introduce Mermaid directives or HTML', () => {
  const m = new FSM('A"</script>').addTransition('A"</script>', 'x: --> "B', 'B[evil]');
  const output = m.exportMermaid();
  assert.ok(!output.includes('</script>'));
  assert.ok(!output.includes('B[evil]'));
  assert.equal(output.split('\n').length, 5);
  assert.match(output, /#34;/);
  assert.match(output, /#60;/);
});
test('history and transitions are isolated copies; reset and bounds remain stable', () => {
  const m = new FSM('A').addTransition('A', 'Stay', 'A');
  for (let i = 0; i < 105; i++) m.dispatch('Stay');
  assert.equal(m.history.length, 100);
  m.history[0].to = 'tampered'; m.transitions[0].to = 'tampered';
  assert.equal(m.history[0].to, 'A'); assert.equal(m.transitions[0].to, 'A');
  for (let i = 1; i < 8; i++) m.addTransition('A', `Go ${i}`, `State ${i}`);
  assert.throws(() => m.addTransition('A', 'Ninth', 'Ninth'), /8 states/);
  m.reset(); assert.equal(m.currentState, 'A'); assert.deepEqual(m.history, []);
});
