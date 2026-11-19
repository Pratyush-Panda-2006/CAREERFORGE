import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreStateDebugger as Recorder } from './state-debugger.js';
const recorder = (extra = {}) => new Recorder({ clock: () => '2026-11-19T05:00:00.000Z', ...extra });

test('recorded states and all read APIs are detached from caller mutations', () => {
  const r = recorder(), source = { aero: { wing: 12 }, torque: [40, 60] };
  const returned = r.recordSnapshot(' SETUP ', source); source.aero.wing = 99; source.torque[0] = 0; returned.state.aero.wing = 44;
  const history = r.history; history[0].state.torque.push(5); history.pop();
  assert.deepEqual(r.current.state, { aero: { wing: 12 }, torque: [40, 60] }); assert.equal(r.current.action, 'SETUP'); assert.equal(r.length, 1);
});
test('jump indexing rejects every invalid boundary without moving the playhead', () => {
  const r = recorder(); assert.equal(r.index, -1); assert.equal(r.current, null); assert.throws(() => r.jumpToStep(0), RangeError);
  r.recordSnapshot('a', 1); r.recordSnapshot('b', 2);
  for (const index of [-1, 2, 0.5, NaN, Infinity, '1', null]) { assert.throws(() => r.jumpToStep(index), RangeError); assert.equal(r.index, 1); }
  assert.equal(r.jumpToStep(0).state, 1); assert.equal(r.jumpToStep(1).state, 2);
});
test('recording from the past truncates only the abandoned future', () => {
  const r = recorder(); [1, 2, 3].forEach(value => r.recordSnapshot('step', value)); r.jumpToStep(0); r.recordSnapshot('branch', 4);
  assert.deepEqual(r.history.map(row => row.state), [1, 4]); assert.equal(r.index, 1);
});
test('retention evicts the oldest snapshot and keeps the retained playhead valid', () => {
  const r = recorder({ maxSnapshots: 3 }); [0, 1, 2, 3, 4].forEach(value => r.recordSnapshot('step', value));
  assert.deepEqual(r.history.map(row => row.state), [2, 3, 4]); assert.equal(r.index, 2); assert.equal(r.jumpToStep(0).state, 2);
  for (const maxSnapshots of [0, 501, 0.5, Infinity]) assert.throws(() => recorder({ maxSnapshots }), RangeError);
});
test('diffs expose nested additions, removals, replacements and escaped JSON Pointer paths', () => {
  const r = recorder(), before = { 'a/b': { '~t': 1 }, remove: null, arr: [3, 4], oldType: {} }, after = { 'a/b': { '~t': 2 }, add: false, arr: [3, 5, 6], oldType: [] };
  const initial = JSON.stringify([before, after]);
  assert.deepEqual(r.computeDiff(before, after), [
    { type: 'changed', path: '/a~1b/~0t', before: 1, after: 2 }, { type: 'added', path: '/add', after: false },
    { type: 'changed', path: '/arr/1', before: 4, after: 5 }, { type: 'added', path: '/arr/2', after: 6 },
    { type: 'changed', path: '/oldType', before: {}, after: [] }, { type: 'removed', path: '/remove', before: null },
  ]);
  assert.equal(JSON.stringify([before, after]), initial);
});
test('diff distinguishes absence from null, handles array removal and primitive/root changes', () => {
  const r = recorder(); assert.deepEqual(r.computeDiff({ x: null }, {}), [{ type: 'removed', path: '/x', before: null }]);
  assert.deepEqual(r.computeDiff([1, 2], [1]), [{ type: 'removed', path: '/1', before: 2 }]);
  assert.deepEqual(r.computeDiff(null, false), [{ type: 'changed', path: '', before: null, after: false }]);
  assert.deepEqual(r.computeDiff({ a: [1, null] }, { a: [1, null] }), []); assert.deepEqual(r.computeDiff(-0, 0), []);
});
test('finite JSON validation rejects cycles, holes, functions and unsupported object prototypes', () => {
  const r = recorder(), cycle = {}; cycle.self = cycle;
  const sparse = new Array(3); sparse[0] = 1; sparse[2] = 3;
  for (const state of [undefined, NaN, Infinity, 1n, () => 0, new Date(), new Map(), cycle, sparse, { x: undefined }, { toJSON: () => 1 }, new Array(1_000_000)]) assert.throws(() => r.recordSnapshot('bad', state));
  assert.equal(r.length, 0);
});
test('accessors are rejected without executing getter or toJSON code', () => {
  const r = recorder(); let executions = 0;
  const getter = Object.defineProperty({}, 'a', { get() { executions++; return 1; }, enumerable: true });
  const array = [1]; Object.defineProperty(array, '0', { get() { executions++; return 1; } });
  for (const state of [getter, array, { toJSON() { executions++; return {}; } }]) assert.throws(() => r.recordSnapshot('unsafe', state));
  assert.equal(executions, 0);
});
test('magic object keys remain data and cannot pollute object prototypes', () => {
  const r = recorder(), state = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}');
  r.recordSnapshot('keys', state); assert.equal(Object.prototype.polluted, undefined); assert.equal(Object.prototype.x, undefined);
  assert.equal(Object.hasOwn(r.current.state, '__proto__'), true);
  assert.deepEqual(r.current.state, state); assert.equal(r.computeDiff({}, state)[0].path, '/__proto__');
});
test('export/import round trip preserves every state, metadata and a historical playhead', () => {
  const r = recorder(); r.recordSnapshot('<img onerror=alert(1)>', { text: '雪 😀', root: null }); r.recordSnapshot('change', [true, false]); r.jumpToStep(0);
  const target = recorder(); target.importReplay(r.exportReplay());
  assert.equal(target.exportReplay(), r.exportReplay()); assert.equal(target.index, 0); assert.equal(target.length, 2);
  target.recordSnapshot('independent', {}); assert.equal(r.current.action, '<img onerror=alert(1)>');
});
test('empty replay imports exactly, with only a -1 playhead', () => {
  const r = recorder(), empty = r.exportReplay(); r.recordSnapshot('a', {}); r.importReplay(empty); assert.equal(r.length, 0); assert.equal(r.index, -1);
  assert.throws(() => r.importReplay('{"version":1,"playhead":0,"snapshots":[]}'));
});
test('malformed and partially invalid imports leave the complete existing session intact', () => {
  const r = recorder(); r.recordSnapshot('keep', { a: 1 }); const original = r.exportReplay(), valid = JSON.parse(original);
  const bad = [null, '{', JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, playhead: -2 }), JSON.stringify({ ...valid, playhead: 4 }), JSON.stringify({ ...valid, extra: true }), JSON.stringify({ ...valid, snapshots: [...valid.snapshots, { action: '', at: 'bad', state: {} }] }), JSON.stringify({ ...valid, snapshots: [{ ...valid.snapshots[0], state: undefined }] })];
  for (const text of bad) { assert.throws(() => r.importReplay(text)); assert.equal(r.exportReplay(), original); }
  const limited = recorder({ maxSnapshots: 1 }); assert.throws(() => limited.importReplay(JSON.stringify({ ...valid, snapshots: [valid.snapshots[0], valid.snapshots[0]] }))); assert.equal(limited.length, 0);
});
test('size and depth limits reject atomically even when recording from the past', () => {
  const r = recorder(); r.recordSnapshot('one', {}); r.recordSnapshot('two', {}); r.jumpToStep(0); const before = r.exportReplay();
  let nested = {}; for (let i = 0; i < 50; i++) nested = { nested };
  for (const value of [nested, '😀'.repeat(260000)]) { assert.throws(() => r.recordSnapshot('too-large', value), RangeError); assert.equal(r.exportReplay(), before); }
  assert.throws(() => r.importReplay(' '.repeat(1_000_001)), RangeError); assert.equal(r.exportReplay(), before);
});
test('the canonical export itself always fits the import byte limit', () => {
  const r = recorder(); const state = Object.fromEntries(Array.from({ length: 8000 }, (_, i) => [String(i), 0]));
  let accepted = 0;
  for (let i = 0; i < 10; i++) { try { r.recordSnapshot(String(i), state); accepted++; } catch (error) { assert(error instanceof RangeError); break; } }
  assert(accepted > 0 && accepted < 10); assert(new TextEncoder().encode(r.exportReplay()).length <= 1_000_000);
  const restored = recorder(); restored.importReplay(r.exportReplay()); assert.equal(restored.length, accepted);
});
test('bad action and invalid clock reject before changing the history', () => {
  const r = recorder(); for (const action of ['', ' ', 'a'.repeat(121), null, 3]) assert.throws(() => r.recordSnapshot(action, {})); assert.equal(r.length, 0);
  const broken = recorder({ clock: () => 'invalid' }); assert.throws(() => broken.recordSnapshot('a', {})); assert.equal(broken.length, 0);
});
