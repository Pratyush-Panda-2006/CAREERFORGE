import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenSyncQueue } from './offline-sync.js';

test('FIFO pet adoption application queue ordering and vector clock increments', () => {
  const queue = new PetAdoptionHavenSyncQueue({
    storageKey: 'test_pet_sync_' + Date.now(),
    nodeId: 'shelter-station-test',
    initialOnline: false
  });

  const a1 = queue.enqueue({ type: 'ADOPTION_APPLICATION', petId: 'PET-LUNA' });
  const a2 = queue.enqueue({ type: 'FOSTER_INTAKE', petId: 'PET-MAX' });

  assert.equal(queue.getPendingCount(), 2);
  assert.equal(queue.peek().id, a1.id);
  assert.equal(a1.clock['shelter-station-test'], 1);
  assert.equal(a2.clock['shelter-station-test'], 2);

  const list = queue.getQueue();
  assert.equal(list[0].id, a1.id);
  assert.equal(list[1].id, a2.id);
});

test('Exponential retry backoff calculation for shelter stations', () => {
  const queue = new PetAdoptionHavenSyncQueue({ baseBackoffMs: 250 });

  assert.equal(queue.calculateBackoff(0), 250);
  assert.equal(queue.calculateBackoff(1), 500);
  assert.equal(queue.calculateBackoff(2), 1000);
  assert.equal(queue.calculateBackoff(3), 2000);
});

test('Vector clock conflict reconciliation determines winning adoption update', () => {
  const queue = new PetAdoptionHavenSyncQueue();

  const localDom = {
    clock: { 'station-1': 2, 'station-2': 1 },
    timestamp: 1000
  };
  const remoteOutdated = {
    clock: { 'station-1': 1, 'station-2': 1 },
    timestamp: 900
  };

  const res1 = queue.resolveConflict(localDom, remoteOutdated);
  assert.equal(res1.winner, 'local');

  const concurrentLocal = {
    clock: { 'station-1': 2, 'station-2': 1 },
    timestamp: 1200
  };
  const concurrentRemote = {
    clock: { 'station-1': 1, 'station-2': 3 },
    timestamp: 1600
  };

  const res2 = queue.resolveConflict(concurrentLocal, concurrentRemote);
  assert.equal(res2.winner, 'remote');
});

test('Flush queue sync simulation with connectivity gates', async () => {
  const queue = new PetAdoptionHavenSyncQueue({ initialOnline: false });

  queue.enqueue({ type: 'VACCINE_CERT', petId: 'PET-BELLA' });
  const offResult = await queue.flushQueue();
  assert.equal(offResult.flushed, 0);
  assert.equal(offResult.reason, 'Offline');

  queue.setOnlineStatus(true);
  const onResult = await queue.flushQueue(async (item) => ({ ok: true, syncedAt: Date.now(), item }));
  assert.equal(onResult.flushed, 1);
  assert.equal(queue.getPendingCount(), 0);
});
