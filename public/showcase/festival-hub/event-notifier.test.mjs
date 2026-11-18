import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubNotificationManager } from './event-notifier.js';

describe('FestivalHubNotificationManager', () => {
  it('dispatches notifications and maintains order by priority weight', () => {
    const manager = new FestivalHubNotificationManager({ audioEnabled: false });
    manager.dispatch('info', 'Info Notice', 'Low priority notice');
    manager.dispatch('danger', 'Critical Notice', 'High priority notice');
    manager.dispatch('warning', 'Caution Notice', 'Medium priority notice');

    const queue = manager.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].type, 'danger');
    assert.equal(queue[1].type, 'warning');
    assert.equal(queue[2].type, 'info');
  });

  it('caps queue size to maxQueueSize and evicts lowest priority item', () => {
    const manager = new FestivalHubNotificationManager({ maxQueueSize: 3, audioEnabled: false });
    manager.dispatch('info', 'Info 1', 'Message 1');
    manager.dispatch('info', 'Info 2', 'Message 2');
    manager.dispatch('warning', 'Warn 1', 'Message 3');

    // Queue is full [warning, info 1, info 2]
    // Dispatch higher priority item
    manager.dispatch('danger', 'Danger Alert', 'High impact');

    const queue = manager.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].type, 'danger');
    assert.equal(queue[1].type, 'warning');

    // One of the info items should have been evicted to history
    const history = manager.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].reason, 'evicted');
  });

  it('deduplicates identical active notifications', () => {
    const manager = new FestivalHubNotificationManager({ audioEnabled: false });
    const first = manager.dispatch('info', 'Gate Open', 'Gate 3 is now open');
    const second = manager.dispatch('info', 'Gate Open', 'Gate 3 is now open');

    assert.ok(first !== null);
    assert.equal(second, null);
    assert.equal(manager.getActiveQueue().length, 1);
  });

  it('dismisses notifications manually and clears timer', () => {
    const manager = new FestivalHubNotificationManager({ audioEnabled: false });
    const item = manager.dispatch('success', 'Pass Validated', 'All clear');
    assert.equal(manager.getActiveQueue().length, 1);

    const dismissed = manager.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(manager.getActiveQueue().length, 0);

    const history = manager.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].reason, 'manual');
  });
});
