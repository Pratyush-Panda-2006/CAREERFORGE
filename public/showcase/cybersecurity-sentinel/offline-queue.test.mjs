import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelOfflineQueue } from './offline-queue.js';

describe('CybersecuritySentinelOfflineQueue', () => {
  it('enqueues items and increments Lamport logical clock', () => {
    const q = new CybersecuritySentinelOfflineQueue();
    const a1 = q.enqueue('UPDATE_METRIC', { val: 42 });
    const a2 = q.enqueue('SYNC_STATE', { status: 'OK' });
    assert.equal(a1.clock, 1);
    assert.equal(a2.clock, 2);
    assert.equal(q.queue.length, 2);
  });

  it('orders conflicting actions deterministically by Lamport clock', () => {
    const q = new CybersecuritySentinelOfflineQueue();
    q.enqueue('FIRST');
    q.enqueue('SECOND');
    const sorted = q.resolveConflicts();
    assert.equal(sorted[0].action, 'FIRST');
    assert.equal(sorted[1].action, 'SECOND');
  });

  it('flushes and clears queue completely on sync completion', () => {
    const q = new CybersecuritySentinelOfflineQueue();
    q.enqueue('TASK_1');
    const flushed = q.clearQueue();
    assert.equal(flushed.length, 1);
    assert.equal(q.queue.length, 0);
  });
});
