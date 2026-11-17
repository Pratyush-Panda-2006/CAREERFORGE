import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { NonprofitImpactAuditChain } from './audit-trail.js';

const timestamp = '2026-11-17T00:00:00.000Z';
const genesis = '0'.repeat(64);
function storageAdapter() {
  const data = new Map();
  return { fail: false, getItem: (key) => data.get(key) ?? null,
    setItem(key, value) { if (this.fail) throw new Error('Storage full'); data.set(key, value); } };
}
const make = (options = {}) => new NonprofitImpactAuditChain({ cryptoProvider: webcrypto, now: () => timestamp, ...options });
async function history(count = 3) {
  const chain = make();
  for (let i = 0; i < count; i++) await chain.recordEvent('plan.updated', { note: `Plan ${i}` });
  return chain;
}

test('hash generation matches an independent SHA-256 contract vector', async () => {
  const chain = make();
  const block = await chain.recordEvent('plan.updated', { b: 2, a: 1 });
  assert.equal(block.hash, 'b003789610872c9894b6865a366391539666ad429e5c92748b97a5aa340d1500');
  assert.equal(block.previousHash, genesis);
  assert.equal((await chain.verifyChainIntegrity()).valid, true);
});

test('canonical payload order is stable while array order remains meaningful', async () => {
  const first = make();
  const second = make();
  const a = await first.recordEvent('plan.updated', { z: { b: 2, a: 1 }, a: [1, 2] });
  const b = await second.recordEvent('plan.updated', { a: [1, 2], z: { a: 1, b: 2 } });
  assert.equal(a.hash, b.hash);
  const third = await make().recordEvent('plan.updated', { z: { a: 1, b: 2 }, a: [2, 1] });
  assert.notEqual(a.hash, third.hash);
});

test('concurrent appends keep one sequence and the correct previous hashes', async () => {
  const chain = make();
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => chain.recordEvent('field.checked', { index })));
  assert.deepEqual(results.map((block) => block.sequence), [1, 2, 3, 4, 5, 6, 7, 8]);
  results.slice(1).forEach((block, index) => assert.equal(block.previousHash, results[index].hash));
  assert.equal((await chain.verifyChainIntegrity()).valid, true);
});

test('captures payloads at call time and returns defensive snapshots', async () => {
  const chain = make();
  const payload = { note: 'Original', nested: { count: 1 } };
  const pending = chain.recordEvent('plan.updated', payload);
  payload.nested.count = 99;
  const saved = await pending;
  saved.payload.note = 'Changed externally';
  const snapshot = chain.snapshot();
  snapshot[0].action = 'rewritten';
  assert.deepEqual(chain.snapshot()[0].payload, { nested: { count: 1 }, note: 'Original' });
  assert.equal((await chain.verifyChainIntegrity()).valid, true);
});

test('detects payload, action, timestamp and digest tampering', async () => {
  const chain = await history();
  for (const change of [
    (events) => { events[1].payload.note = 'Altered'; },
    (events) => { events[1].action = 'volunteer.joined'; },
    (events) => { events[1].timestamp = '2026-11-18T00:00:00.000Z'; },
    (events) => { events[1].hash = genesis; },
  ]) {
    const events = chain.snapshot();
    change(events);
    const result = await chain.verifyChainIntegrity(events);
    assert.equal(result.valid, false);
    assert.equal(result.index, 1);
  }
});

test('detects reordered, missing-middle, duplicate and broken-link entries', async () => {
  const chain = await history();
  for (const change of [
    (events) => events.reverse(),
    (events) => events.splice(1, 1),
    (events) => { events[1] = events[0]; },
    (events) => { events[1].previousHash = genesis; },
  ]) {
    const events = chain.snapshot();
    change(events);
    assert.equal((await chain.verifyChainIntegrity(events)).valid, false);
  }
});

test('retained head detects suffix truncation; an unsigned prefix alone stays valid', async () => {
  const chain = await history();
  const checkpoint = (await chain.verifyChainIntegrity()).headHash;
  const prefix = chain.snapshot().slice(0, 2);
  assert.equal((await chain.verifyChainIntegrity(prefix)).valid, true);
  assert.equal((await chain.verifyChainIntegrity(prefix, checkpoint)).valid, false);
});

test('export/import and reload preserve sequence and verification', async () => {
  const original = await history(2);
  const storage = storageAdapter();
  const imported = make({ storage });
  await imported.importJSON(original.exportJSON());
  const restored = make({ storage });
  assert.deepEqual(restored.snapshot(), original.snapshot());
  assert.equal((await restored.verifyChainIntegrity()).valid, true);
  assert.equal((await restored.recordEvent('field.checked', { note: 'After reload' })).sequence, 3);
});

test('invalid imports cannot overwrite current history or persisted bytes', async () => {
  const storage = storageAdapter();
  const chain = make({ storage, storageKey: 'log' });
  await chain.recordEvent('plan.updated', { note: 'Keep' });
  const raw = storage.getItem('log');
  const tampered = JSON.parse(chain.exportJSON());
  tampered.events[0].payload.note = 'Forged';
  await assert.rejects(chain.importJSON(JSON.stringify(tampered)), /Import rejected/);
  assert.equal(storage.getItem('log'), raw);
  assert.equal(chain.snapshot()[0].payload.note, 'Keep');
});

test('failed durable writes retain the previous chain and do not poison later appends', async () => {
  const storage = storageAdapter();
  const chain = make({ storage });
  await chain.recordEvent('plan.updated', { note: 'First' });
  storage.fail = true;
  await assert.rejects(chain.recordEvent('field.checked', { note: 'Not committed' }), /Storage full/);
  assert.equal(chain.snapshot().length, 1);
  storage.fail = false;
  const next = await chain.recordEvent('field.checked', { note: 'Next' });
  assert.equal(next.sequence, 2);
  assert.equal((await chain.verifyChainIntegrity()).valid, true);
});

test('stored tampering blocks append without erasing the damaged evidence', async () => {
  const original = await history(1);
  const document = JSON.parse(original.exportJSON());
  document.events[0].payload.note = 'Edited on disk';
  const storage = storageAdapter();
  const raw = JSON.stringify(document);
  storage.setItem('log', raw);
  const restored = make({ storage, storageKey: 'log' });
  await assert.rejects(restored.recordEvent('field.checked', {}), /failed verification/);
  assert.equal(storage.getItem('log'), raw);
});

test('rejects unsupported payloads, cycles, sparse arrays and unsafe object keys', () => {
  const chain = make();
  const cyclic = {}; cyclic.self = cyclic;
  for (const payload of [null, [], { x: undefined }, { x: Infinity }, { x: NaN }, { x: 1n },
    { x: new Date() }, { x: () => 1 }, cyclic, { x: new Array(2) }, JSON.parse('{"__proto__":1}')]) {
    assert.throws(() => chain.recordEvent('plan.updated', payload));
  }
  assert.throws(() => chain.recordEvent('<script>', {}));
  assert.equal(chain.snapshot().length, 0);
});

test('enforces payload bytes, history counts, file formats and crypto availability', async () => {
  const chain = make({ maxEvents: 1 });
  assert.throws(() => chain.recordEvent('plan.updated', { note: '树'.repeat(1500) }), /4 KiB/);
  await chain.recordEvent('plan.updated', {});
  await assert.rejects(chain.recordEvent('field.checked', {}), /Event limit/);
  assert.throws(() => chain.importJSON('x'.repeat(2_000_001)), /2 MB/);
  assert.throws(() => chain.importJSON('{"version":2,"events":[]}'));
  assert.throws(() => make({ maxEvents: 501 }));
  assert.throws(() => make({ cryptoProvider: {} }));
});

test('malformed event fields and invalid timestamps fail verification', async () => {
  const chain = await history(1);
  for (const change of [
    (block) => { block.sequence = 0; }, (block) => { block.timestamp = 'not a time'; },
    (block) => { block.extra = 'not covered by the schema'; }, (block) => { block.hash = 'invalid'; },
  ]) {
    const events = chain.snapshot();
    change(events[0]);
    assert.equal((await chain.verifyChainIntegrity(events)).valid, false);
  }
  assert.equal((await chain.verifyChainIntegrity([], 'invalid checkpoint')).valid, false);
});

test('hashing failure leaves no sequence gap and a subsequent retry can succeed', async () => {
  let calls = 0;
  const cryptoProvider = { subtle: { digest: (...args) => {
    if (++calls === 1) return Promise.reject(new Error('Hash failed'));
    return webcrypto.subtle.digest(...args);
  } } };
  const chain = make({ cryptoProvider });
  await assert.rejects(chain.recordEvent('plan.updated', {}), /Hash failed/);
  assert.equal(chain.snapshot().length, 0);
  assert.equal((await chain.recordEvent('plan.updated', {})).sequence, 1);
});

test('external storage changes after verification are detected and never overwritten', async () => {
  const storage = storageAdapter();
  const chain = make({ storage, storageKey: 'log' });
  await chain.recordEvent('plan.updated', { note: 'Original' });
  const edited = JSON.parse(chain.exportJSON());
  edited.events[0].payload.note = 'Changed elsewhere';
  const raw = JSON.stringify(edited);
  storage.setItem('log', raw);
  assert.equal((await chain.verifyChainIntegrity()).valid, false);
  await assert.rejects(chain.recordEvent('field.checked', {}), /changed outside/);
  assert.equal(storage.getItem('log'), raw);
});
