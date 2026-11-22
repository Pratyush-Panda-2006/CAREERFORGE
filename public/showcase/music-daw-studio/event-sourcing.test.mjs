import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioEventSourcingLedger as Ledger } from './event-sourcing.js';
const initial = { project: 'Master Track', tracks: 1, genre: 'electronic' };

test('empty ledger and any initial historical query return fresh genesis state', () => {
  const ledger = new Ledger(); assert.deepEqual(ledger.getEvents(), []); assert.deepEqual(ledger.getMaterializedState(), initial);
  const past = ledger.replayToTimestamp(0); past.tracks = 999; assert.deepEqual(ledger.getMaterializedState(), initial);
});
test('ordered event mutations produce a deterministic current materialization', () => {
  const ledger = new Ledger({ now: () => 100 });
  ledger.appendEvent('PROJECT_RENAMED', { name: 'Synthwave Odyssey' }); ledger.appendEvent('TRACKS_CHANGED', { delta: 2 }); ledger.appendEvent('GENRE_CHANGED', { genre: 'acoustic' });
  assert.deepEqual(ledger.getMaterializedState(), { project: 'Synthwave Odyssey', tracks: 3, genre: 'acoustic' });
  assert.deepEqual(ledger.getEvents().map(event => event.sequence), [1, 2, 3]);
  assert.deepEqual(ledger.replayToTimestamp(102), ledger.getMaterializedState());
});
test('replay includes the exact timestamp and preserves earlier boundaries', () => {
  let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('TRACKS_CHANGED', { delta: 2 }); now = 200; ledger.appendEvent('GENRE_CHANGED', { genre: 'acoustic' });
  assert.deepEqual(ledger.replayToTimestamp(99), initial); assert.deepEqual(ledger.replayToTimestamp(100), { ...initial, tracks: 3 });
  assert.deepEqual(ledger.replayToTimestamp(199), { ...initial, tracks: 3 }); assert.deepEqual(ledger.replayToTimestamp(200), { ...initial, tracks: 3, genre: 'acoustic' });
  assert.deepEqual(ledger.replayToTimestamp(Number.MAX_SAFE_INTEGER), ledger.getMaterializedState());
});
test('same-time and backward clocks preserve strict local ordering', () => {
  let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('TRACKS_CHANGED', { delta: 1 }); ledger.appendEvent('TRACKS_CHANGED', { delta: 1 }); now = 80; ledger.appendEvent('TRACKS_CHANGED', { delta: 1 });
  assert.deepEqual(ledger.getEvents().map(event => event.timestamp), [100, 101, 102]);
});
test('rewinding never truncates history or changes the live append target', () => {
  const ledger = new Ledger({ now: () => 100 }); ledger.appendEvent('TRACKS_CHANGED', { delta: 4 }); ledger.appendEvent('GENRE_CHANGED', { genre: 'acoustic' });
  assert.deepEqual(ledger.replayToTimestamp(0), initial); const before = ledger.getEvents(); ledger.appendEvent('TRACKS_CHANGED', { delta: 1 });
  assert.deepEqual(ledger.getEvents().slice(0, 2), before); assert.equal(ledger.getMaterializedState().tracks, 6); assert.equal(ledger.getEvents().length, 3);
});
test('input payloads, returned events and exported ledger copies cannot edit stored events', () => {
  const ledger = new Ledger(), payload = { name: 'Safe' }; const returned = ledger.appendEvent('PROJECT_RENAMED', payload);
  payload.name = 'changed'; returned.payload.name = 'returned'; returned.sequence = 999;
  const copy = ledger.getEvents(); copy[0].payload.name = 'exported'; copy.push({ type: 'fake' });
  assert.equal(ledger.getEvents()[0].payload.name, 'Safe'); assert.equal(ledger.getEvents()[0].sequence, 1); assert.equal(ledger.getEvents().length, 1);
});
test('current and historical state copies remain isolated from later appends', () => {
  const ledger = new Ledger(); const old = ledger.getMaterializedState(); ledger.appendEvent('TRACKS_CHANGED', { delta: 2 });
  const current = ledger.getMaterializedState(); current.genre = 'fake'; const past = ledger.replayToTimestamp(0); past.project = 'fake';
  assert.deepEqual(old, initial); assert.deepEqual(ledger.getMaterializedState(), { ...initial, tracks: 3 });
});
test('invalid types, fields, prototypes and non-JSON values leave all state intact', () => {
  const ledger = new Ledger(); ledger.appendEvent('TRACKS_CHANGED', { delta: 1 }); const before = ledger.getEvents(), state = ledger.getMaterializedState();
  const bad = [['UNKNOWN', {}], ['__proto__', {}], ['PROJECT_RENAMED', null], ['PROJECT_RENAMED', []], ['PROJECT_RENAMED', { name: '' }], ['PROJECT_RENAMED', { name: 'a'.repeat(81) }], ['PROJECT_RENAMED', { name: 7 }], ['PROJECT_RENAMED', { name: 'X', extra: true }], ['GENRE_CHANGED', { genre: 'unknown' }], ['TRACKS_CHANGED', { delta: '2' }], ['TRACKS_CHANGED', { delta: Infinity }], ['TRACKS_CHANGED', { delta: 1.5 }], ['TRACKS_CHANGED', { delta: 0 }], ['PROJECT_RENAMED', Object.create({ name: 'X' })], ['PROJECT_RENAMED', JSON.parse('{"__proto__":{"polluted":true}}')]];
  for (const [type, payload] of bad) { assert.throws(() => ledger.appendEvent(type, payload)); assert.deepEqual(ledger.getEvents(), before); assert.deepEqual(ledger.getMaterializedState(), state); }
  assert.equal({}.polluted, undefined);
});
test('track bounds reject underflow and overflow atomically', () => {
  const ledger = new Ledger(); assert.throws(() => ledger.appendEvent('TRACKS_CHANGED', { delta: -1 }));
  ledger.appendEvent('TRACKS_CHANGED', { delta: 999 }); assert.equal(ledger.getMaterializedState().tracks, 1000); const before = ledger.getEvents();
  assert.throws(() => ledger.appendEvent('TRACKS_CHANGED', { delta: 1 })); assert.deepEqual(ledger.getEvents(), before);
  ledger.appendEvent('TRACKS_CHANGED', { delta: -999 }); assert.equal(ledger.getMaterializedState().tracks, 1);
});
test('normalizes whitespace in names and rejects no-op mutations', () => {
  const ledger = new Ledger(); assert.equal(ledger.appendEvent('PROJECT_RENAMED', { name: ' Master ' }).payload.name, 'Master');
  const before = ledger.getEvents(); assert.throws(() => ledger.appendEvent('PROJECT_RENAMED', { name: 'Master' })); assert.throws(() => ledger.appendEvent('GENRE_CHANGED', { genre: 'electronic' })); assert.deepEqual(ledger.getEvents(), before);
});
test('bad clocks and ordering overflow preserve the last valid event', () => {
  assert.throws(() => new Ledger({ now: 1 })); let now = 100; const ledger = new Ledger({ now: () => now }); ledger.appendEvent('TRACKS_CHANGED', { delta: 1 }); const before = ledger.getEvents();
  now = -1; assert.throws(() => ledger.appendEvent('TRACKS_CHANGED', { delta: 1 })); assert.deepEqual(ledger.getEvents(), before);
});
