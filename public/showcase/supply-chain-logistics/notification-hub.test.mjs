import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsNotificationHub } from './notification-hub.js';

describe('SupplyChainLogisticsNotificationHub', () => {
  it('should prioritize critical alerts over standard info messages in queue ordering', () => {
    const hub = new SupplyChainLogisticsNotificationHub({ maxQueueSize: 5 });

    hub.enqueue('Routine manifest check', 'info', 'info');
    hub.enqueue('PORT CUSTOMS BLOCKADE', 'error', 'critical');
    hub.enqueue('Reefer temp warning', 'warn', 'warning');

    const queue = hub.getActiveQueue();
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  it('should dismiss notification by id and remove it from active queue', () => {
    const hub = new SupplyChainLogisticsNotificationHub();
    const item = hub.enqueue('Shipment alert', 'info', 'info');

    assert.equal(hub.getActiveQueue().length, 1);
    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed.id, item.id);
    assert.equal(hub.getActiveQueue().length, 0);
  });

  it('should evict lowest-priority notification when max queue size is exceeded', () => {
    const hub = new SupplyChainLogisticsNotificationHub({ maxQueueSize: 3 });

    hub.enqueue('Freight update 1', 'info', 'info');
    hub.enqueue('Freight update 2', 'info', 'info');
    hub.enqueue('Freight update 3', 'info', 'info');
    assert.equal(hub.getActiveQueue().length, 3);

    hub.enqueue('PORT CONGESTION RED ALERT', 'error', 'critical');
    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
  });

  it('should track actionable alert history and clear queue when requested', () => {
    const hub = new SupplyChainLogisticsNotificationHub();
    hub.enqueue('Cargo loading', 'info', 'info');
    hub.enqueue('Draft survey check', 'warn', 'warning');

    assert.equal(hub.getHistory().length, 2);
    hub.clearQueue();
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 2);
  });
});
