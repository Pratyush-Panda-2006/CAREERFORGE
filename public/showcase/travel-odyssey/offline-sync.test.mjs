import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseySyncQueue } from './offline-sync.js';

test('TravelOdysseySyncQueue - FIFO queue ordering and vector clock incrementation', () => {
  const queue = new TravelOdysseySyncQueue({
    storageKey: 'test_travel_sync_queue_' + Date.now(),
    nodeId: 'node-travel-1',
    initialOnline: false
  });

  const item1 = queue.enqueue({ type: 'ITINERARY_ADD_A' });
  const item2 = queue.enqueue({ type: 'ITINERARY_ADD_B' });

  assert.equal(queue.getPendingCount(), 2);
  assert.equal(queue.peek().id, item1.id);
  assert.equal(item1.clock['node-travel-1'], 1);
  assert.equal(item2.clock['node-travel-1'], 2);

  const list = queue.getQueue();
  assert.equal(list[0].id, item1.id);
  assert.equal(list[1].id, item2.id);
});

test('TravelOdysseySyncQueue - exponential retry backoff calculation', () => {
  const queue = new TravelOdysseySyncQueue({ baseBackoffMs: 200 });

  assert.equal(queue.calculateBackoff(0), 200);
  assert.equal(queue.calculateBackoff(1), 400);
  assert.equal(queue.calculateBackoff(2), 800);
  assert.equal(queue.calculateBackoff(3), 1600);
});

test('TravelOdysseySyncQueue - deterministic vector clock conflict resolution', () => {
  const queue = new TravelOdysseySyncQueue();

  const localDominant = {
    clock: { 'node-1': 2, 'node-2': 1 },
    timestamp: 1000
  };
  const remoteOutdated = {
    clock: { 'node-1': 1, 'node-2': 1 },
    timestamp: 900
  };

  const res1 = queue.resolveConflict(localDominant, remoteOutdated);
  assert.equal(res1.winner, 'local');

  const concurrentLocal = {
    clock: { 'node-1': 2, 'node-2': 1 },
    timestamp: 1500
  };
  const concurrentRemote = {
    clock: { 'node-1': 1, 'node-2': 3 },
    timestamp: 1800
  };

  const res2 = queue.resolveConflict(concurrentLocal, concurrentRemote);
  assert.equal(res2.winner, 'remote');
});

test('TravelOdysseySyncQueue - flushQueue successfully processes queue when online', async () => {
  const queue = new TravelOdysseySyncQueue({
    storageKey: 'test_travel_sync_queue_flush_' + Date.now(),
    nodeId: 'node-travel-test',
    initialOnline: true
  });

  queue.enqueue({ type: 'BOOKING_CONFIRMED' });
  queue.enqueue({ type: 'HOTEL_CHECKIN' });

  assert.equal(queue.getPendingCount(), 2);

  const result = await queue.flushQueue();
  assert.equal(result.flushed, 2);
  assert.equal(queue.getPendingCount(), 0);
});
