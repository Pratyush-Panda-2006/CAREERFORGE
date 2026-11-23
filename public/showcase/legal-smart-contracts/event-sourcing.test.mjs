import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsEventSourcingLedger as Ledger } from './event-sourcing.js';
const initial = { contract: 'Standard Agreement', clauses: 1, status: 'draft' };

test('empty ledger and any initial historical query return fresh genesis state', () => {
  const ledger = new Ledger(); assert.deepEqual(ledger.getEvents(), []); assert.deepEqual(ledger.getMaterializedState(), initial);
  const past = ledger.replayToTimestamp(0); past.clauses = 999; assert.deepEqual(ledger.getMaterializedState(), initial);
});
test('ordered event mutations produce a deterministic current materialization', () => {
  const ledger = new Ledger({ now: () => 100 });
  ledger.appendEvent('CONTRACT_RENAMED', { title: 'Enterprise NDA' }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 2 }); ledger.appendEvent('STATUS_CHANGED', { status: 'reviewed' });
  assert.deepEqual(ledger.getMaterializedState(), { contract: 'Enterprise NDA', clauses: 3, status: 'reviewed' });
  assert.deepEqual(ledger.getEvents().map(event => event.sequence), [1, 2, 3]);
  assert.deepEqual(ledger.replayToTimestamp(102), ledger.getMaterializedState());
});
test('replay includes the exact timestamp and preserves earlier boundaries', () => {
  let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 2 }); now = 200; ledger.appendEvent('STATUS_CHANGED', { status: 'reviewed' });
  assert.deepEqual(ledger.replayToTimestamp(99), initial); assert.deepEqual(ledger.replayToTimestamp(100), { ...initial, clauses: 3 });
  assert.deepEqual(ledger.replayToTimestamp(199), { ...initial, clauses: 3 }); assert.deepEqual(ledger.replayToTimestamp(200), { ...initial, clauses: 3, status: 'reviewed' });
  assert.deepEqual(ledger.replayToTimestamp(Number.MAX_SAFE_INTEGER), ledger.getMaterializedState());
});
test('same-time and backward clocks preserve strict local ordering', () => {
  let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 }); now = 80; ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 });
  assert.deepEqual(ledger.getEvents().map(event => event.timestamp), [100, 101, 102]);
});
test('rewinding never truncates history or changes the live append target', () => {
  const ledger = new Ledger({ now: () => 100 }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 4 }); ledger.appendEvent('STATUS_CHANGED', { status: 'reviewed' });
  assert.deepEqual(ledger.replayToTimestamp(0), initial); const before = ledger.getEvents(); ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 });
  assert.deepEqual(ledger.getEvents().slice(0, 2), before); assert.equal(ledger.getMaterializedState().clauses, 6); assert.equal(ledger.getEvents().length, 3);
});
test('input payloads, returned events and exported ledger copies cannot edit stored events', () => {
  const ledger = new Ledger(), payload = { title: 'Safe' }; const returned = ledger.appendEvent('CONTRACT_RENAMED', payload);
  payload.title = 'changed'; returned.payload.title = 'returned'; returned.sequence = 999;
  const copy = ledger.getEvents(); copy[0].payload.title = 'exported'; copy.push({ type: 'fake' });
  assert.equal(ledger.getEvents()[0].payload.title, 'Safe'); assert.equal(ledger.getEvents()[0].sequence, 1); assert.equal(ledger.getEvents().length, 1);
});
test('current and historical state copies remain isolated from later appends', () => {
  const ledger = new Ledger(); const old = ledger.getMaterializedState(); ledger.appendEvent('CLAUSES_CHANGED', { delta: 2 });
  const current = ledger.getMaterializedState(); current.status = 'fake'; const past = ledger.replayToTimestamp(0); past.contract = 'fake';
  assert.deepEqual(old, initial); assert.deepEqual(ledger.getMaterializedState(), { ...initial, clauses: 3 });
});
test('invalid types, fields, prototypes and non-JSON values leave all state intact', () => {
  const ledger = new Ledger(); ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 }); const before = ledger.getEvents(), state = ledger.getMaterializedState();
  const bad = [['UNKNOWN', {}], ['__proto__', {}], ['CONTRACT_RENAMED', null], ['CONTRACT_RENAMED', []], ['CONTRACT_RENAMED', { title: '' }], ['CONTRACT_RENAMED', { title: 'a'.repeat(81) }], ['CONTRACT_RENAMED', { title: 7 }], ['CONTRACT_RENAMED', { title: 'X', extra: true }], ['STATUS_CHANGED', { status: 'unknown' }], ['CLAUSES_CHANGED', { delta: '2' }], ['CLAUSES_CHANGED', { delta: Infinity }], ['CLAUSES_CHANGED', { delta: 1.5 }], ['CLAUSES_CHANGED', { delta: 0 }], ['CONTRACT_RENAMED', Object.create({ title: 'X' })], ['CONTRACT_RENAMED', JSON.parse('{"__proto__":{"polluted":true}}')]];
  for (const [type, payload] of bad) { assert.throws(() => ledger.appendEvent(type, payload)); assert.deepEqual(ledger.getEvents(), before); assert.deepEqual(ledger.getMaterializedState(), state); }
  assert.equal({}.polluted, undefined);
});
test('clause bounds reject underflow and overflow atomically', () => {
  const ledger = new Ledger(); assert.throws(() => ledger.appendEvent('CLAUSES_CHANGED', { delta: -1 }));
  ledger.appendEvent('CLAUSES_CHANGED', { delta: 999 }); assert.equal(ledger.getMaterializedState().clauses, 1000); const before = ledger.getEvents();
  assert.throws(() => ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 })); assert.deepEqual(ledger.getEvents(), before);
  ledger.appendEvent('CLAUSES_CHANGED', { delta: -999 }); assert.equal(ledger.getMaterializedState().clauses, 1);
});
test('normalizes whitespace in titles and rejects no-op mutations', () => {
  const ledger = new Ledger(); assert.equal(ledger.appendEvent('CONTRACT_RENAMED', { title: ' Master ' }).payload.title, 'Master');
  const before = ledger.getEvents(); assert.throws(() => ledger.appendEvent('CONTRACT_RENAMED', { title: 'Master' })); assert.throws(() => ledger.appendEvent('STATUS_CHANGED', { status: 'draft' })); assert.deepEqual(ledger.getEvents(), before);
});
test('bad clocks and ordering overflow preserve the last valid event', () => {
  assert.throws(() => new Ledger({ now: 1 })); let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 }); const before = ledger.getEvents();
  now = -1; assert.throws(() => ledger.appendEvent('CLAUSES_CHANGED', { delta: 1 })); assert.deepEqual(ledger.getEvents(), before);
});
