import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingStateDebugger } from './state-debugger.js';

const recorder = () => new AgritechPrecisionFarmingStateDebugger();

test('empty recorder exports and imports a valid empty replay', () => {
  const engine = recorder();
  assert.equal(engine.currentIndex, -1);
  assert.equal(engine.length, 0);
  assert.deepEqual(JSON.parse(engine.exportReplay()), { version: 1, currentIndex: -1, snapshots: [] });
  assert.equal(engine.importReplay(engine.exportReplay()), 0);
});

test('input, returned snapshots and history summaries cannot mutate stored state', () => {
  const engine = recorder();
  const input = { sensor: { moisture: 30 }, samples: [1, 2] };
  const saved = engine.recordSnapshot('Reading', input);
  input.sensor.moisture = 0; input.samples.push(3);
  saved.state.sensor.moisture = 999;
  engine.getHistory()[0].action = 'Changed';
  const loaded = engine.jumpToStep(0);
  assert.deepEqual(loaded.state, { sensor: { moisture: 30 }, samples: [1, 2] });
  assert.equal(loaded.action, 'Reading');
  loaded.state.samples[0] = 9;
  assert.equal(engine.getSnapshot(0).state.samples[0], 1);
});

test('navigation checks boundaries without changing the current selection', () => {
  const engine = recorder(); engine.recordSnapshot('One', { n: 1 }); engine.recordSnapshot('Two', { n: 2 });
  assert.equal(engine.jumpToStep(0).state.n, 1);
  for (const index of [-1, 2, 0.5, '0', NaN]) assert.throws(() => engine.jumpToStep(index), /existing snapshot/);
  assert.equal(engine.currentIndex, 0);
  engine.getSnapshot(1);
  assert.equal(engine.currentIndex, 0);
});

test('recording while inspecting an earlier step appends without deleting future snapshots', () => {
  const engine = recorder(); engine.recordSnapshot('One', 1); engine.recordSnapshot('Two', 2); engine.jumpToStep(0);
  engine.recordSnapshot('Branch reading', 3);
  assert.equal(engine.length, 3);
  assert.equal(engine.getSnapshot(1).state, 2);
  assert.equal(engine.currentIndex, 2);
});

test('structural diffs handle additions, removals, nested changes and array indexes', () => {
  const diff = recorder().computeDiff({ sensor: { n: 1 }, gone: true, list: [1, 2] }, { sensor: { n: 2 }, added: null, list: [1, 3, 4] });
  assert.deepEqual(diff, [
    { path: '/added', kind: 'added', after: null },
    { path: '/gone', kind: 'removed', before: true },
    { path: '/list/1', kind: 'changed', before: 2, after: 3 },
    { path: '/list/2', kind: 'added', after: 4 },
    { path: '/sensor/n', kind: 'changed', before: 1, after: 2 },
  ]);
});

test('diffs use escaped JSON Pointers and distinguish null, primitive and container types', () => {
  const engine = recorder();
  assert.deepEqual(engine.computeDiff({ 'a/b': { '~x': 1 } }, { 'a/b': { '~x': 2 } })[0].path, '/a~1b/~0x');
  assert.deepEqual(engine.computeDiff(null, []), [{ path: '', kind: 'changed', before: null, after: [] }]);
  assert.equal(engine.computeDiff(1, '1').length, 1);
  assert.deepEqual(engine.computeDiff({ a: 1, b: 2 }, { b: 2, a: 1 }), []);
});

test('diff results do not expose mutable references into input state', () => {
  const engine = recorder(); const before = {}; const after = { added: { n: 1 } };
  engine.computeDiff(before, after)[0].after.n = 5;
  assert.equal(after.added.n, 1);
});

test('export/import preserves every snapshot and the selected timeline position', () => {
  const a = recorder(); a.recordSnapshot('One', { n: 1 }); a.recordSnapshot('Two', { n: 2 }); a.jumpToStep(0);
  const b = recorder(); assert.equal(b.importReplay(a.exportReplay()), 2);
  assert.equal(b.currentIndex, 0);
  assert.equal(b.exportReplay(), a.exportReplay());
});

test('invalid replay schemas and timestamps are rejected atomically', () => {
  const engine = recorder(); engine.recordSnapshot('Keep', { n: 1 });
  const old = engine.exportReplay();
  const valid = JSON.parse(old);
  const invalid = ['{', 'null', '[]', JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, currentIndex: 10 }), JSON.stringify({ ...valid, extra: true }), JSON.stringify({ ...valid, snapshots: [{ ...valid.snapshots[0], createdAt: '2026-02-30T00:00:00.000Z' }] }), JSON.stringify({ ...valid, snapshots: [{ ...valid.snapshots[0], extra: true }] })];
  for (const text of invalid) { assert.throws(() => engine.importReplay(text)); assert.equal(engine.exportReplay(), old); }
});

test('bad later records cannot partially replace valid history', () => {
  const engine = recorder(); engine.recordSnapshot('Keep', 1); const old = engine.exportReplay();
  const incoming = JSON.parse(old); incoming.snapshots.push({ action: '', createdAt: incoming.snapshots[0].createdAt, state: 2 });
  assert.throws(() => engine.importReplay(JSON.stringify(incoming)), /action label/);
  assert.equal(engine.exportReplay(), old);
});

test('non-JSON values, sparse arrays, cycles and accessors are rejected without executing getters', () => {
  const engine = recorder();
  const cycle = {}; cycle.self = cycle;
  const sparse = Array(2); sparse[1] = 1;
  for (const state of [undefined, NaN, Infinity, () => 1, 1n, new Date(), new Map(), sparse, cycle, { n: undefined }]) assert.throws(() => engine.recordSnapshot('Bad', state));
  let called = false;
  assert.throws(() => engine.recordSnapshot('Bad', Object.defineProperty({}, 'x', { enumerable: true, get() { called = true; return 1; } })), /data properties/);
  assert.equal(called, false);
  assert.equal(engine.length, 0);
});

test('shared input objects are copied independently and JSON prototype-like keys stay data', () => {
  const engine = recorder(); const shared = { n: 1 };
  const snapshot = engine.recordSnapshot('Shared', { a: shared, b: shared });
  snapshot.state.a.n = 5;
  assert.equal(snapshot.state.b.n, 1);
  const state = JSON.parse('{"__proto__":{"polluted":true},"constructor":4}');
  engine.recordSnapshot('Data', state);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(engine.getSnapshot(1).state, '__proto__'), true);
});

test('action and state resource limits reject without losing recorded history', () => {
  const engine = recorder(); engine.recordSnapshot('Keep', 1); const old = engine.exportReplay();
  for (const label of ['', ' ', 'a'.repeat(81), 'bad\nlabel']) assert.throws(() => engine.recordSnapshot(label, 2));
  assert.throws(() => engine.recordSnapshot('Large', 'x'.repeat(64001)), /64 KB/);
  assert.throws(() => engine.recordSnapshot('Unicode', '🌾'.repeat(16000)), /64 KB/);
  assert.throws(() => engine.recordSnapshot('Complex', Array(2048).fill(0)), /complex/);
  assert.throws(() => engine.recordSnapshot('Long key', { ['k'.repeat(129)]: 1 }), /128 characters/);
  let deep = 1; for (let index = 0; index < 25; index++) deep = { child: deep };
  assert.throws(() => engine.recordSnapshot('Deep', deep), /complex/);
  assert.equal(engine.exportReplay(), old);
});

test('history count and aggregate replay size have bounded, non-destructive failures', () => {
  const engine = recorder(); for (let index = 0; index < 100; index++) engine.recordSnapshot('Reading', index);
  const old = engine.exportReplay(); assert.throws(() => engine.recordSnapshot('Overflow', 100), /100 snapshots/); assert.equal(engine.exportReplay(), old);
  const large = recorder(); let previous;
  assert.throws(() => { for (let index = 0; index < 100; index++) { previous = large.exportReplay(); large.recordSnapshot('Reading', 'x'.repeat(60000)); } }, /2 MB/);
  assert.equal(large.exportReplay(), previous);
  assert.throws(() => large.importReplay(' '.repeat(2000001)), /2 MB/);
});

test('clearing resets selection and removes all private history', () => {
  const engine = recorder(); engine.recordSnapshot('Reading', 1); engine.clearHistory();
  assert.equal(engine.length, 0); assert.equal(engine.currentIndex, -1); assert.deepEqual(engine.getHistory(), []);
  assert.throws(() => engine.getSnapshot(0));
});
