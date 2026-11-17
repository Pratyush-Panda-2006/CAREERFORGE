import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsSyncQueue } from './offline-sync.js';

test('FIFO contract mutation queue ordering and vector clock increments', () => {
  const queue = new LegalSmartContractsSyncQueue({
    storageKey: 'test_legal_sync_' + Date.now(),
    nodeId: 'counsel-test-node',
    initialOnline: false
  });

  const m1 = queue.enqueue({ type: 'CLAUSE_AMENDMENT', contractId: 'ESCROW-1' });
  const m2 = queue.enqueue({ type: 'MULTI_SIG_SIGNATURE', contractId: 'ESCROW-2' });

  assert.equal(queue.getPendingCount(), 2);
  assert.equal(queue.peek().id, m1.id);
  assert.equal(m1.clock['counsel-test-node'], 1);
  assert.equal(m2.clock['counsel-test-node'], 2);

  const list = queue.getQueue();
  assert.equal(list[0].id, m1.id);
  assert.equal(list[1].id, m2.id);
});

test('Exponential backoff calculation for node retry schedule', () => {
  const queue = new LegalSmartContractsSyncQueue({ baseBackoffMs: 300 });

  assert.equal(queue.calculateBackoff(0), 300);
  assert.equal(queue.calculateBackoff(1), 600);
  assert.equal(queue.calculateBackoff(2), 1200);
  assert.equal(queue.calculateBackoff(3), 2400);
});

test('Vector clock conflict reconciliation determines winning contract mutation', () => {
  const queue = new LegalSmartContractsSyncQueue();

  const localDom = {
    clock: { 'counsel-1': 3, 'counsel-2': 1 },
    timestamp: 1000
  };
  const remoteOutdated = {
    clock: { 'counsel-1': 1, 'counsel-2': 1 },
    timestamp: 900
  };

  const res1 = queue.resolveConflict(localDom, remoteOutdated);
  assert.equal(res1.winner, 'local');

  const concurrentLocal = {
    clock: { 'counsel-1': 2, 'counsel-2': 1 },
    timestamp: 1200
  };
  const concurrentRemote = {
    clock: { 'counsel-1': 1, 'counsel-2': 3 },
    timestamp: 1600
  };

  const res2 = queue.resolveConflict(concurrentLocal, concurrentRemote);
  assert.equal(res2.winner, 'remote');
});

test('Flush queue sync simulation with connectivity gates', async () => {
  const queue = new LegalSmartContractsSyncQueue({ initialOnline: false });

  queue.enqueue({ type: 'COVENANT_ASSERTION', contractId: 'DEED-9' });
  const offResult = await queue.flushQueue();
  assert.equal(offResult.flushed, 0);
  assert.equal(offResult.reason, 'Offline');

  queue.setOnlineStatus(true);
  const onResult = await queue.flushQueue(async (item) => ({ ok: true, syncedAt: Date.now(), item }));
  assert.equal(onResult.flushed, 1);
  assert.equal(queue.getPendingCount(), 0);
});
