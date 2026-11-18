import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioSyncQueue } from './offline-sync.js';

describe('DeveloperPortfolioSyncQueue', () => {
  it('initializes with default queue state and node vector clock', () => {
    const sync = new DeveloperPortfolioSyncQueue({ storageKey: 'test_dev_sync_1', nodeId: 'node-devA' });
    assert.equal(sync.isOnline, true);
    assert.equal(sync.getPendingQueue().length, 0);
    assert.equal(sync.vectorClock['node-devA'], 0);
  });

  it('enqueues mutations in FIFO order and increments vector clock', () => {
    const sync = new DeveloperPortfolioSyncQueue({ storageKey: 'test_dev_sync_2', nodeId: 'node-devA' });
    const mut1 = sync.enqueue({ type: 'PROJECT_ADDED', payload: { name: 'Alpha' } });
    const mut2 = sync.enqueue({ type: 'SKILL_ADDED', payload: { skill: 'Rust' } });

    const queue = sync.getPendingQueue();
    assert.equal(queue.length, 2);
    assert.equal(queue[0].id, mut1.id);
    assert.equal(queue[1].id, mut2.id);
    assert.equal(mut1.vectorClock['node-devA'], 1);
    assert.equal(mut2.vectorClock['node-devA'], 2);
  });

  it('resolves conflicts deterministically using vector clocks', () => {
    const sync = new DeveloperPortfolioSyncQueue({ storageKey: 'test_dev_sync_3' });

    const older = { id: 'm1', vectorClock: { devA: 1, devB: 1 }, timestamp: 1000 };
    const newer = { id: 'm2', vectorClock: { devA: 2, devB: 1 }, timestamp: 1200 };

    const resolved = sync.resolveConflict(older, newer);
    assert.equal(resolved.id, 'm2');
  });

  it('falls back to last-write-wins timestamp on concurrent conflicts', () => {
    const sync = new DeveloperPortfolioSyncQueue({ storageKey: 'test_dev_sync_4' });

    const localConcurrent = { id: 'm-local', vectorClock: { devA: 2, devB: 1 }, timestamp: 1500 };
    const remoteConcurrent = { id: 'm-remote', vectorClock: { devA: 1, devB: 2 }, timestamp: 2000 };

    const resolved = sync.resolveConflict(localConcurrent, remoteConcurrent);
    assert.equal(resolved.id, 'm-remote');
  });

  it('flushes queue successfully when online', async () => {
    const sync = new DeveloperPortfolioSyncQueue({ storageKey: 'test_dev_sync_5' });
    sync.enqueue({ type: 'BIO_UPDATE', payload: { bio: 'Senior Engineer' } });
    sync.enqueue({ type: 'RESUME_UPDATE', payload: { url: 'https://resume' } });

    assert.equal(sync.getPendingQueue().length, 2);

    const report = await sync.flushQueue(async (item) => ({ success: true }));
    assert.equal(report.syncedCount, 2);
    assert.equal(report.failedCount, 0);
    assert.equal(sync.getPendingQueue().length, 0);
  });
});
