import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsSyncQueue } from './offline-sync.js';

test('SupplyChainLogisticsSyncQueue - initializes with clean state and online flag', () => {
  const queue = new SupplyChainLogisticsSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  assert.equal(queue.getPendingCount(), 0);
  assert.equal(queue.isOnline, true);
  assert.equal(queue.peek(), null);
});

test('SupplyChainLogisticsSyncQueue - enqueue adds mutation with ID and clock vector', () => {
  const queue = new SupplyChainLogisticsSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  const mut = queue.enqueue({ action: 'RFID_PALLET_SCAN', value: 123 });

  assert.ok(mut.id.startsWith('mut_'));
  assert.equal(mut.status, 'pending');
  assert.equal(queue.getPendingCount(), 1);
  assert.equal(queue.peek().id, mut.id);
});

test('SupplyChainLogisticsSyncQueue - resolveConflict enforces vector clock dominance', () => {
  const queue = new SupplyChainLogisticsSyncQueue();
  const local = { clock: { 'node-a': 2 }, timestamp: 1000 };
  const remote = { clock: { 'node-a': 1 }, timestamp: 2000 };

  const res = queue.resolveConflict(local, remote);
  assert.equal(res.winner, 'local');
  assert.equal(res.resolution, 'Vector clock dominance');
});

test('SupplyChainLogisticsSyncQueue - resolveConflict falls back to LWW tie-breaker', () => {
  const queue = new SupplyChainLogisticsSyncQueue();
  const local = { clock: { 'node-a': 1 }, timestamp: 2500 };
  const remote = { clock: { 'node-b': 1 }, timestamp: 1500 };

  const res = queue.resolveConflict(local, remote);
  assert.equal(res.winner, 'local');
  assert.equal(res.resolution, 'LWW timestamp tie-breaker');
});

test('SupplyChainLogisticsSyncQueue - flushQueue flushes items when online', async () => {
  const queue = new SupplyChainLogisticsSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  queue.enqueue({ action: 'A1' });
  queue.enqueue({ action: 'A2' });

  const res = await queue.flushQueue();
  assert.equal(res.flushed, 2);
  assert.equal(res.remaining, 0);
  assert.equal(queue.getPendingCount(), 0);
});

test('SupplyChainLogisticsSyncQueue - flushQueue pauses and buffers when offline', async () => {
  const queue = new SupplyChainLogisticsSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  queue.setOnlineStatus(false);
  queue.enqueue({ action: 'OFFLINE_ACTION' });

  const res = await queue.flushQueue();
  assert.equal(res.flushed, 0);
  assert.equal(res.remaining, 1);
  assert.equal(queue.getPendingCount(), 1);
});
