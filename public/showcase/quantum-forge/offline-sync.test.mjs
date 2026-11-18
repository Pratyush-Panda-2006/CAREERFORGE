import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeSyncQueue } from './offline-sync.js';

test('QuantumForgeSyncQueue - FIFO queue ordering and vector clock incrementation', () => {
  const queue = new QuantumForgeSyncQueue({
    storageKey: 'test_sync_queue_' + Date.now(),
    nodeId: 'qforge-test-1',
    initialOnline: false
  });

  const item1 = queue.enqueue({ type: 'APPLY_PAULI_X', qubit: 0 });
  const item2 = queue.enqueue({ type: 'APPLY_ROTATION_Y', angle: 1.57 });

  assert.equal(queue.getPendingCount(), 2);
  assert.equal(queue.peek().id, item1.id);
  assert.equal(item1.clock['qforge-test-1'], 1);
  assert.equal(item2.clock['qforge-test-1'], 2);

  const list = queue.getQueue();
  assert.equal(list[0].id, item1.id);
  assert.equal(list[1].id, item2.id);
});

test('QuantumForgeSyncQueue - exponential retry backoff calculation', () => {
  const queue = new QuantumForgeSyncQueue({ baseBackoffMs: 200 });

  assert.equal(queue.calculateBackoff(0), 200);
  assert.equal(queue.calculateBackoff(1), 400);
  assert.equal(queue.calculateBackoff(2), 800);
  assert.equal(queue.calculateBackoff(3), 1600);
});

test('QuantumForgeSyncQueue - deterministic vector clock conflict resolution', () => {
  const queue = new QuantumForgeSyncQueue();

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

test('QuantumForgeSyncQueue - flush queue sync simulation with online/offline gates', async () => {
  const queue = new QuantumForgeSyncQueue({
    initialOnline: false
  });

  queue.enqueue({ type: 'CALIBRATION_TELEMETRY' });
  const offlineFlush = await queue.flushQueue();
  assert.equal(offlineFlush.flushed, 0);
  assert.equal(offlineFlush.reason, 'Offline');

  queue.setOnlineStatus(true);
  const onlineFlush = await queue.flushQueue(async (item) => ({ ok: true, syncedAt: Date.now(), item }));
  assert.equal(onlineFlush.flushed, 1);
  assert.equal(queue.getPendingCount(), 0);
});
