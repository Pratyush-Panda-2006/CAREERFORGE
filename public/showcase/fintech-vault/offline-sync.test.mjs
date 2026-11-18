import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultSyncQueue } from './offline-sync.js';

describe('FintechVaultSyncQueue', () => {
  it('initializes with default queue state and node vector clock', () => {
    const sync = new FintechVaultSyncQueue({ storageKey: 'test_fintech_sync_1', nodeId: 'node-finA' });
    assert.equal(sync.isOnline, true);
    assert.equal(sync.getPendingQueue().length, 0);
    assert.equal(sync.vectorClock['node-finA'], 0);
  });

  it('enqueues mutations in FIFO order and increments vector clock', () => {
    const sync = new FintechVaultSyncQueue({ storageKey: 'test_fintech_sync_2', nodeId: 'node-finA' });
    const mut1 = sync.enqueue({ type: 'TRANSFER', payload: { amount: 500 } });
    const mut2 = sync.enqueue({ type: 'WITHDRAW', payload: { amount: 200 } });

    const queue = sync.getPendingQueue();
    assert.equal(queue.length, 2);
    assert.equal(queue[0].id, mut1.id);
    assert.equal(queue[1].id, mut2.id);
    assert.equal(mut1.vectorClock['node-finA'], 1);
    assert.equal(mut2.vectorClock['node-finA'], 2);
  });

  it('resolves conflicts deterministically using vector clocks', () => {
    const sync = new FintechVaultSyncQueue({ storageKey: 'test_fintech_sync_3' });

    const older = { id: 'm1', vectorClock: { finA: 1, finB: 1 }, timestamp: 1000 };
    const newer = { id: 'm2', vectorClock: { finA: 2, finB: 1 }, timestamp: 1200 };

    const resolved = sync.resolveConflict(older, newer);
    assert.equal(resolved.id, 'm2');
  });

  it('falls back to last-write-wins timestamp on concurrent conflicts', () => {
    const sync = new FintechVaultSyncQueue({ storageKey: 'test_fintech_sync_4' });

    const localConcurrent = { id: 'm-local', vectorClock: { finA: 2, finB: 1 }, timestamp: 1500 };
    const remoteConcurrent = { id: 'm-remote', vectorClock: { finA: 1, finB: 2 }, timestamp: 2000 };

    const resolved = sync.resolveConflict(localConcurrent, remoteConcurrent);
    assert.equal(resolved.id, 'm-remote');
  });

  it('flushes queue successfully when online', async () => {
    const sync = new FintechVaultSyncQueue({ storageKey: 'test_fintech_sync_5' });
    sync.enqueue({ type: 'PAYMENT', payload: { amount: 1500 } });
    sync.enqueue({ type: 'FEE', payload: { amount: 15 } });

    assert.equal(sync.getPendingQueue().length, 2);

    const report = await sync.flushQueue(async (item) => ({ success: true }));
    assert.equal(report.syncedCount, 2);
    assert.equal(report.failedCount, 0);
    assert.equal(sync.getPendingQueue().length, 0);
  });
});
