import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadOfflineQueue } from './offline-sync.js';

test('SaasLaunchpadOfflineQueue - initializes with clean state or hydrated data', () => {
  const queue = new SaasLaunchpadOfflineQueue();
  const metrics = queue.getMetrics();
  assert.equal(metrics.pendingCount, 0);
  assert.equal(metrics.historyCount, 0);
  assert.equal(metrics.isOnline, true);
});

test('SaasLaunchpadOfflineQueue - enqueue adds operation with unique ID and pending status', () => {
  const queue = new SaasLaunchpadOfflineQueue();
  const op = queue.enqueue('UPDATE_SEAT_QUOTA', { tenantId: 't-10', seats: 25 });
  assert.ok(op.id.startsWith('SAAS-OP-'));
  assert.equal(op.action, 'UPDATE_SEAT_QUOTA');
  assert.equal(op.status, 'pending');
  assert.equal(queue.getMetrics().pendingCount, 1);
});

test('SaasLaunchpadOfflineQueue - resolveConflict implements Last-Write-Wins logic', () => {
  const queue = new SaasLaunchpadOfflineQueue();
  const localOp = {
    timestamp: 2500,
    payload: { seats: 50, plan: 'enterprise' }
  };
  const olderServer = {
    timestamp: 1000,
    version: 1,
    seats: 20
  };
  const newerServer = {
    timestamp: 3000,
    version: 2,
    seats: 30
  };

  const lwwResult = queue.resolveConflict(localOp, olderServer);
  assert.equal(lwwResult.winner, 'local');
  assert.equal(lwwResult.state.seats, 50);
  assert.equal(lwwResult.state.version, 2);

  const serverWinsResult = queue.resolveConflict(localOp, newerServer);
  assert.equal(serverWinsResult.winner, 'server');
  assert.equal(serverWinsResult.state.seats, 30);
});

test('SaasLaunchpadOfflineQueue - processQueue flushes pending items when online', async () => {
  const queue = new SaasLaunchpadOfflineQueue();
  queue.enqueue('TOGGLE_FLAG', { flag: 'BETA_AI' });
  queue.enqueue('UPDATE_QUOTA', { quota: 1000 });

  const result = await queue.processQueue();
  assert.equal(result.processed, 2);
  assert.equal(result.remaining, 0);
  assert.equal(queue.getMetrics().pendingCount, 0);
  assert.equal(queue.getMetrics().historyCount, 2);
});

test('SaasLaunchpadOfflineQueue - processQueue does not flush when offline', async () => {
  const queue = new SaasLaunchpadOfflineQueue();
  queue.setOnlineStatus(false);
  queue.enqueue('UPDATE_CONFIG', { key: 'VAL' });

  const result = await queue.processQueue();
  assert.equal(result.processed, 0);
  assert.equal(result.remaining, 1);
  assert.equal(queue.getMetrics().pendingCount, 1);
});
