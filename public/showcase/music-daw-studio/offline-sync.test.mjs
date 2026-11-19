import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioSyncQueue } from './offline-sync.js';

test('MusicDawStudioSyncQueue - enqueue adds mutation with vector clock', () => {
  const queue = new MusicDawStudioSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  const item = queue.enqueue({ track: 'Synth', bpm: 120 });

  assert.equal(queue.getQueue().length, 1);
  assert.equal(item.data.track, 'Synth');
  assert.ok(item.clock[queue.nodeId] >= 1);
});

test('MusicDawStudioSyncQueue - dequeue removes item by id', () => {
  const queue = new MusicDawStudioSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  const item = queue.enqueue({ track: 'Bass' });
  assert.equal(queue.getQueue().length, 1);

  const removed = queue.dequeue(item.id);
  assert.equal(removed.id, item.id);
  assert.equal(queue.getQueue().length, 0);
});

test('MusicDawStudioSyncQueue - resolves conflict based on vector clock value', () => {
  const queue = new MusicDawStudioSyncQueue({ storageKey: 'test_sync_' + Date.now() });
  const localItem = { clock: { [queue.nodeId]: 2 }, timestamp: 1000, data: 'local' };
  const incomingItem = { clock: { 'remote_node': 4 }, timestamp: 1050, data: 'remote' };

  const winner = queue.resolveConflict(localItem, incomingItem);
  assert.equal(winner.data, 'remote');
});

test('MusicDawStudioSyncQueue - processQueue flushes pending items when online', async () => {
  const queue = new MusicDawStudioSyncQueue({ storageKey: 'test_sync_' + Date.now(), initialOnline: true });
  queue.enqueue({ track: 'Drums' });
  queue.enqueue({ track: 'Vocals' });

  assert.equal(queue.getQueue().length, 2);

  const processed = [];
  const res = await queue.processQueue(async (item) => {
    processed.push(item.data.track);
  });

  assert.equal(res.processed, 2);
  assert.equal(queue.getQueue().length, 0);
  assert.deepEqual(processed, ['Drums', 'Vocals']);
});
