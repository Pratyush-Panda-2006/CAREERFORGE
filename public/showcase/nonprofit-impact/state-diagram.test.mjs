import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactFsmVisualizer as Fsm } from './state-diagram.js';
const cycle = () => { const m = new Fsm('Idle'); m.addTransition('Idle', 'GO', 'Running'); m.addTransition('Running', 'STOP', 'Idle'); return m; };

test('initial state is declared and empty graphs reject dispatch without mutation', () => {
  const m = new Fsm('Idle'); assert.equal(m.currentState, 'Idle'); assert.deepEqual(m.states, ['Idle']); assert.deepEqual(m.availableEvents, []);
  assert.throws(() => m.dispatch('GO'), RangeError); assert.equal(m.sequence, 0); assert.deepEqual(m.history, []);
});
test('valid event transitions update current state and record exact ordered metadata', () => {
  const m = cycle(); assert.deepEqual(m.availableEvents, ['GO']);
  assert.deepEqual(m.dispatch('GO'), { step: 1, from: 'Idle', event: 'GO', to: 'Running' });
  assert.equal(m.currentState, 'Running'); assert.deepEqual(m.availableEvents, ['STOP']);
  m.dispatch('STOP'); assert.equal(m.currentState, 'Idle'); assert.equal(m.history[1].step, 2);
});
test('invalid or case-mismatched events preserve state, history and export exactly', () => {
  const m = cycle(); m.dispatch('GO'); const before = m.exportMermaid(), history = m.history;
  for (const event of ['GO', 'stop', 'UNKNOWN', '', ' ', null, 0, '<script>', 'STOP\nGO']) {
    assert.throws(() => m.dispatch(event)); assert.equal(m.currentState, 'Running'); assert.equal(m.exportMermaid(), before); assert.deepEqual(m.history, history); assert.equal(m.sequence, 1);
  }
});
test('duplicate edges are idempotent and ambiguous targets are rejected atomically', () => {
  const m = cycle(), before = m.exportMermaid();
  assert.deepEqual(m.addTransition(' Idle ', ' GO ', ' Running '), { from: 'Idle', event: 'GO', to: 'Running' }); assert.equal(m.transitions.length, 2);
  assert.throws(() => m.addTransition('Idle', 'GO', 'Other')); assert.deepEqual(m.states, ['Idle', 'Running']); assert.equal(m.exportMermaid(), before);
});
test('cycles and self-loops dispatch deterministically without recursive graph traversal', () => {
  const m = cycle(); m.addTransition('Running', 'WAIT', 'Running');
  m.dispatch('GO'); m.dispatch('WAIT'); m.dispatch('WAIT'); assert.equal(m.currentState, 'Running'); m.dispatch('STOP');
  assert.equal(m.currentState, 'Idle'); assert.deepEqual(m.history.map(x => x.event), ['GO', 'WAIT', 'WAIT', 'STOP']);
  assert.match(m.exportMermaid(), /s1 --> s1: WAIT/); assert.match(m.exportMermaid(), /s1 --> s0: STOP/);
});
test('all read APIs and returned records are detached from later caller edits', () => {
  const m = cycle(); const edge = m.addTransition('Running', 'WAIT', 'Running'); edge.to = 'Other';
  const states = m.states, transitions = m.transitions, events = m.availableEvents; states.push('Other'); transitions[0].event = 'WRONG'; events[0] = 'WRONG';
  const result = m.dispatch('GO'); result.to = 'Other'; const history = m.history; history[0].to = 'Other'; history.pop();
  assert.equal(m.currentState, 'Running'); assert.equal(m.history[0].to, 'Running'); assert.equal(m.transitions[0].event, 'GO'); assert.deepEqual(m.states, ['Idle', 'Running']);
});
test('history retains exactly the latest 200 accepted events with monotonic sequence numbers', () => {
  const m = cycle(); for (let i = 0; i < 500; i++) m.dispatch(i % 2 ? 'STOP' : 'GO');
  assert.equal(m.sequence, 500); assert.equal(m.history.length, 200); assert.equal(m.history[0].step, 301); assert.equal(m.history.at(-1).step, 500); assert.equal(m.currentState, 'Idle');
});
test('reset clears the run while preserving the transition graph and initial state', () => {
  const m = cycle(), graph = m.transitions; m.dispatch('GO'); m.reset();
  assert.equal(m.currentState, 'Idle'); assert.equal(m.sequence, 0); assert.deepEqual(m.history, []); assert.deepEqual(m.transitions, graph); assert.equal(m.dispatch('GO').step, 1);
});
test('12-state limit is atomic and existing transitions still work at capacity', () => {
  const m = new Fsm('Start'); for (let i = 1; i < 12; i++) m.addTransition('Start', `E${i}`, `State${i}`);
  const before = m.exportMermaid(); assert.throws(() => m.addTransition('NewFrom', 'NEW', 'NewTo'), RangeError); assert.equal(m.exportMermaid(), before); assert.equal(m.states.length, 12);
  m.dispatch('E11'); assert.equal(m.currentState, 'State11');
});
test('64-transition limit is atomic; duplicate definitions remain idempotent at capacity', () => {
  const m = new Fsm('Start'); for (let i = 0; i < 64; i++) m.addTransition('Start', `E${i}`, 'Start');
  const before = m.exportMermaid(); assert.throws(() => m.addTransition('Start', 'EXTRA', 'Other'), RangeError); assert.equal(m.exportMermaid(), before); assert.equal(m.states.length, 1);
  m.addTransition('Start', 'E0', 'Start'); assert.equal(m.transitions.length, 64); assert.equal(m.dispatch('E63').to, 'Start');
});
test('name validation rejects DSL and markup injection at every mutation boundary', () => {
  const bad = ['', ' ', null, {}, 1, '9start', 'A'.repeat(41), 'Bad\nState', 'Bad\tState', 'A:OTHER', 'A;B', 'A"B', '<img>', 'A[choice]', 'café'];
  for (const value of bad) {
    assert.throws(() => new Fsm(value)); const m = cycle(), before = m.exportMermaid();
    for (const tuple of [[value, 'EVENT', 'Target'], ['Source', value, 'Target'], ['Source', 'EVENT', value]]) { assert.throws(() => m.addTransition(...tuple)); assert.equal(m.exportMermaid(), before); }
  }
  const m = new Fsm('A'.repeat(40)); m.addTransition('A'.repeat(40), 'Valid event-2', 'Other_state'); assert.equal(m.dispatch('Valid event-2').to, 'Other_state');
});
test('safe generated aliases preserve reserved words and export every directed event deterministically', () => {
  const m = new Fsm('end'); m.addTransition('end', 'state', 'constructor'); m.addTransition('constructor', 'GO BACK', 'end');
  assert.equal(m.exportMermaid(), 'stateDiagram-v2\n  direction LR\n  %% Current state: end\n  state "end" as s0\n  state "constructor" as s1\n  [*] --> s0\n  s0 --> s1: state\n  s1 --> s0: GO BACK\n');
  const before = m.exportMermaid(); assert.equal(m.exportMermaid(), before); m.dispatch('state'); assert.match(m.exportMermaid(), /%% Current state: constructor/);
});
