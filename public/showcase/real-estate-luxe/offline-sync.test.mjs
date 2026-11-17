import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeSyncQueue } from './offline-sync.js';

describe('RealEstateLuxeSyncQueue', () => {
  it('initializes with default queue state and node vector clock', () => {
    const sync = new RealEstateLuxeSyncQueue({ storageKey: 'test_luxe_sync_1', nodeId: 'node-luxeA' });
    assert.equal(sync.isOnline, true);
    assert.equal(sync.getPendingQueue().length, 0);
    assert.equal(sync.vectorClock['node-luxeA'], 0);
  });

  it('enqueues mutations in FIFO order and increments vector clock', () => {
    const sync = new RealEstateLuxeSyncQueue({ storageKey: 'test_luxe_sync_2', nodeId: 'node-luxeA' });
    const mut1 = sync.enqueue({ type: 'PRICE_CHANGE', payload: { price: 5000000 } });
    const mut2 = sync.enqueue({ type: 'VIEWING_SCHEDULED', payload: { client: 'VIP Buyer' } });

    const queue = sync.getPendingQueue();
    assert.equal(queue.length, 2);
    assert.equal(queue[0].id, mut1.id);
    assert.equal(queue[1].id, mut2.id);
    assert.equal(mut1.vectorClock['node-luxeA'], 1);
    assert.equal(mut2.vectorClock['node-luxeA'], 2);
  });

  it('resolves conflicts deterministically using vector clocks', () => {
    const sync = new RealEstateLuxeSyncQueue({ storageKey: 'test_luxe_sync_3' });

    const older = { id: 'm1', vectorClock: { luxeA: 1, luxeB: 1 }, timestamp: 1000 };
    const newer = { id: 'm2', vectorClock: { luxeA: 2, luxeB: 1 }, timestamp: 1200 };

    const resolved = sync.resolveConflict(older, newer);
    assert.equal(resolved.id, 'm2');
  });

  it('falls back to last-write-wins timestamp on concurrent conflicts', () => {
    const sync = new RealEstateLuxeSyncQueue({ storageKey: 'test_luxe_sync_4' });

    const localConcurrent = { id: 'm-local', vectorClock: { luxeA: 2, luxeB: 1 }, timestamp: 1500 };
    const remoteConcurrent = { id: 'm-remote', vectorClock: { luxeA: 1, luxeB: 2 }, timestamp: 2000 };

    const resolved = sync.resolveConflict(localConcurrent, remoteConcurrent);
    assert.equal(resolved.id, 'm-remote');
  });

  it('flushes queue successfully when online', async () => {
    const sync = new RealEstateLuxeSyncQueue({ storageKey: 'test_luxe_sync_5' });
    sync.enqueue({ type: 'OFFER_SUBMITTED', payload: { amount: 8500000 } });
    sync.enqueue({ type: 'ESCROW_OPENED', payload: { deposit: 500000 } });

    assert.equal(sync.getPendingQueue().length, 2);

    const report = await sync.flushQueue(async (item) => ({ success: true }));
    assert.equal(report.syncedCount, 2);
    assert.equal(report.failedCount, 0);
    assert.equal(sync.getPendingQueue().length, 0);
  });
});
