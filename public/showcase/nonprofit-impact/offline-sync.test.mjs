import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactSyncQueue } from './offline-sync.js';

function storageAdapter() {
  const values = new Map();
  return {
    fail: false,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) { if (this.fail) throw new Error('Quota exceeded'); values.set(key, value); },
  };
}
function fixture(options = {}) {
  const storage = options.storage || storageAdapter();
  const delivered = [];
  const queue = new NonprofitImpactSyncQueue({ storage, clientId: 'device',
    send: async (operation) => { delivered.push(operation); return { id: operation.id, record: operation.record }; },
    ...options });
  return { storage, delivered, queue };
}
const edit = (value, recordId = 'planting-plan') => ({ recordId, value });
const record = (writer, stamp, clock, value = writer) => ({ id: 'plan', writer, stamp, clock, value });

test('persists FIFO work, restores it after reload and continues unique IDs', async () => {
  const { queue, storage } = fixture();
  const first = queue.enqueue(edit('Plant 40 trees'));
  const second = queue.enqueue(edit('Recruit 6 volunteers', 'volunteers'));
  const restored = fixture({ storage });
  assert.deepEqual(restored.queue.snapshot(), queue.snapshot());
  const third = restored.queue.enqueue(edit('Plant 50 trees'));
  assert.equal(third.id, 'device:3');
  assert.equal(third.record.clock.device, 2);
  const result = await restored.queue.flushQueue();
  assert.equal(result.sent, 3);
  assert.deepEqual(restored.delivered.map((operation) => operation.id), [first.id, second.id, third.id]);
  assert.equal(restored.queue.snapshot().queue.length, 0);
  assert.equal(restored.queue.snapshot().records['planting-plan'].value, 'Plant 50 trees');
});

test('a failed durable write cannot report an edit as queued', () => {
  const { queue, storage } = fixture();
  storage.fail = true;
  assert.throws(() => queue.enqueue(edit('Plant 40 trees')), /Quota/);
  assert.equal(queue.snapshot().sequence, 0);
  assert.deepEqual(queue.snapshot().queue, []);
});

test('snapshots and returned operations cannot mutate persisted state', () => {
  const { queue } = fixture();
  const operation = queue.enqueue(edit('Original'));
  operation.record.value = 'External mutation';
  const snapshot = queue.snapshot();
  snapshot.records['planting-plan'].value = 'Changed again';
  assert.equal(queue.snapshot().queue[0].record.value, 'Original');
  assert.equal(queue.snapshot().records['planting-plan'].value, 'Original');
});

test('invalid or corrupt saved data is rejected without overwriting it', () => {
  for (const raw of ['{bad json', 'null', '{"version":99}', '{"version":1,"clientId":"__proto__"}']) {
    const storage = storageAdapter();
    storage.setItem('saved', raw);
    assert.throws(() => fixture({ storage, storageKey: 'saved' }));
    assert.equal(storage.getItem('saved'), raw);
  }
  const { queue, storage } = fixture();
  queue.enqueue(edit('First'));
  const saved = queue.snapshot();
  saved.queue.push(saved.queue[0]);
  storage.setItem('duplicate', JSON.stringify(saved));
  assert.throws(() => fixture({ storage, storageKey: 'duplicate' }), /Invalid saved operation/);
});

test('validates input, unsafe object keys, retry bounds and queue capacity', () => {
  const { queue } = fixture();
  for (const input of [edit(''), edit('x', '__proto__'), edit('x', 'constructor'), edit('x'.repeat(201))]) {
    assert.throws(() => queue.enqueue(input));
  }
  assert.throws(() => fixture({ baseDelayMs: 0 }));
  assert.throws(() => fixture({ baseDelayMs: 5000, maxDelayMs: 1000 }));
  for (let i = 0; i < 100; i++) queue.enqueue(edit(`Plan ${i}`));
  assert.throws(() => queue.enqueue(edit('Too many')), /Queue full/);
  assert.equal(queue.snapshot().queue.length, 100);
});

test('offline flush sends nothing and leaves durable work intact', async () => {
  const { queue, delivered } = fixture({ isOnline: () => false });
  queue.enqueue(edit('Offline plan'));
  assert.deepEqual(await queue.flushQueue(), { sent: 0, pending: 1, nextRetryAt: 0 });
  assert.deepEqual(delivered, []);
});

test('retries follow capped exponential backoff and keep the original operation ID', async () => {
  let now = 0;
  let fail = true;
  const calls = [];
  const { queue } = fixture({ now: () => now, maxDelayMs: 4000, send: async (operation) => {
    calls.push(operation.id);
    if (fail) throw new Error('Unavailable');
    return { id: operation.id, record: operation.record };
  } });
  queue.enqueue(edit('Retry me'));
  for (const [at, expectedRetry] of [[0, 1000], [1000, 3000], [3000, 7000], [7000, 11000]]) {
    now = at;
    assert.equal((await queue.flushQueue()).nextRetryAt, expectedRetry);
    const count = calls.length;
    now = expectedRetry - 1;
    await queue.flushQueue();
    assert.equal(calls.length, count);
  }
  fail = false;
  now = 11000;
  assert.equal((await queue.flushQueue()).sent, 1);
  assert.equal(new Set(calls).size, 1);
});

test('retry deadlines and attempts survive reload', async () => {
  const { queue, storage } = fixture({ now: () => 100, send: async () => { throw new Error('offline'); } });
  queue.enqueue(edit('Later'));
  await queue.flushQueue();
  const restored = fixture({ storage, now: () => 500 });
  await restored.queue.flushQueue();
  assert.equal(restored.delivered.length, 0);
  assert.equal(restored.queue.snapshot().queue[0].attempts, 1);
  assert.equal(restored.queue.snapshot().queue[0].nextAttemptAt, 1100);
});

test('flush is single-flight and preserves newer edits enqueued during delivery', async () => {
  let release;
  const calls = [];
  const { queue } = fixture({ send: (operation) => {
    calls.push(operation);
    if (calls.length === 1) return new Promise((resolve) => { release = () => resolve({ id: operation.id, record: operation.record }); });
    return Promise.resolve({ id: operation.id, record: operation.record });
  } });
  queue.enqueue(edit('Older'));
  const pending = queue.flushQueue();
  assert.equal(queue.flushQueue(), pending);
  queue.enqueue(edit('Newer'));
  release();
  assert.equal((await pending).sent, 2);
  assert.equal(calls.length, 2);
  assert.equal(queue.snapshot().records['planting-plan'].value, 'Newer');
});

test('invalid acknowledgements are retried instead of silently deleting work', async () => {
  for (const acknowledge of [() => null, (operation) => ({ id: 'wrong', record: operation.record }),
    (operation) => ({ id: operation.id, record: record('cloud', 1, { cloud: 1 }) }),
    (operation) => ({ id: operation.id, record: { ...operation.record, clock: {} } })]) {
    const { queue } = fixture({ send: async (operation) => acknowledge(operation), now: () => 0 });
    queue.enqueue(edit('Keep this'));
    await queue.flushQueue();
    assert.equal(queue.snapshot().queue.length, 1);
    assert.equal(queue.snapshot().queue[0].attempts, 1);
  }
});

test('a failed acknowledgement write retains work for idempotent redelivery', async () => {
  const storage = storageAdapter();
  let calls = 0;
  const { queue } = fixture({ storage, send: async (operation) => {
    if (++calls === 1) storage.fail = true;
    return { id: operation.id, record: operation.record };
  } });
  queue.enqueue(edit('Durable'));
  await assert.rejects(queue.flushQueue(), /Quota/);
  assert.equal(queue.snapshot().queue.length, 1);
  storage.fail = false;
  await queue.flushQueue();
  assert.equal(queue.snapshot().queue.length, 0);
  assert.equal(calls, 2);
});

test('conflict merges commute, associate and are idempotent for concurrent edits', () => {
  const { queue } = fixture();
  const a = record('a', 2, { a: 2 }, 'Plant 40');
  const b = record('b', 1, { b: 1 }, 'Plant 60');
  const c = record('c', 2, { a: 1, b: 1, c: 2 }, 'Plant 80');
  const merge = (left, right) => queue.resolveConflict(left, right);
  assert.deepEqual(merge(a, b), merge(b, a));
  assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
  assert.deepEqual(merge(a, a), a);
  assert.deepEqual(merge(merge(a, b), c).clock, { a: 2, b: 1, c: 2 });
  assert.equal(merge(merge(a, b), c).value, 'Plant 80');
});

test('causally newer edits win and subsequent local stamps advance past remote clocks', async () => {
  const { queue } = fixture({ send: async (operation) => ({ id: operation.id,
    record: { ...operation.record, value: 'Remote follow-up', writer: 'cloud', stamp: 5,
      clock: { ...operation.record.clock, cloud: 5 } } }) });
  queue.enqueue(edit('First'));
  await queue.flushQueue();
  const next = queue.enqueue(edit('New local follow-up'));
  assert.equal(next.record.stamp, 6);
  assert.deepEqual(next.record.clock, { device: 6, cloud: 5 });
  assert.equal(queue.snapshot().records['planting-plan'].value, 'New local follow-up');
});

test('conflict validation rejects different record IDs and invalid clocks', () => {
  const { queue } = fixture();
  const valid = record('a', 1, { a: 1 });
  assert.throws(() => queue.resolveConflict(valid, { ...valid, id: 'another' }));
  assert.throws(() => queue.resolveConflict(valid, { ...valid, clock: { a: -1 } }));
  assert.throws(() => queue.resolveConflict(valid, { ...valid, stamp: 0 }));
});
