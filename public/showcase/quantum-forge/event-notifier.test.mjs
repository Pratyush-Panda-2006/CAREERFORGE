import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeNotificationManager } from './event-notifier.js';

describe('QuantumForgeNotificationManager', () => {
  it('initializes with default queue configuration', () => {
    const mgr = new QuantumForgeNotificationManager();
    assert.equal(mgr.maxQueueSize, 5);
    assert.equal(mgr.audioEnabled, true);
    assert.equal(mgr.getActiveQueue().length, 0);
  });

  it('dispatches notifications and sorts by priority weight', () => {
    const mgr = new QuantumForgeNotificationManager();
    mgr.dispatch('info', 'Low priority', 'Info message', { duration: 0 });
    mgr.dispatch('danger', 'Critical priority', 'Danger message', { duration: 0 });
    mgr.dispatch('warning', 'Medium priority', 'Warning message', { duration: 0 });

    const queue = mgr.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].type, 'danger');
    assert.equal(queue[1].type, 'warning');
    assert.equal(queue[2].type, 'info');
  });

  it('drops duplicate active notifications', () => {
    const mgr = new QuantumForgeNotificationManager();
    const first = mgr.dispatch('info', 'Alert', 'Same text', { duration: 0 });
    const duplicate = mgr.dispatch('info', 'Alert', 'Same text', { duration: 0 });

    assert.ok(first);
    assert.equal(duplicate, null);
    assert.equal(mgr.getActiveQueue().length, 1);
  });

  it('enforces maxQueueSize by evicting lowest priority items', () => {
    const mgr = new QuantumForgeNotificationManager({ maxQueueSize: 2 });
    mgr.dispatch('info', 'Info 1', 'Message 1', { duration: 0 });
    mgr.dispatch('warning', 'Warning 1', 'Message 2', { duration: 0 });
    mgr.dispatch('danger', 'Danger 1', 'Message 3', { duration: 0 });

    const queue = mgr.getActiveQueue();
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'danger');
    assert.equal(queue[1].type, 'warning');

    const history = mgr.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].reason, 'evicted');
  });

  it('dismisses notifications and records to history', () => {
    const mgr = new QuantumForgeNotificationManager();
    const notif = mgr.dispatch('success', 'Operation done', 'Success detail', { duration: 0 });

    assert.equal(mgr.getActiveQueue().length, 1);
    const dismissed = mgr.dismiss(notif.id, 'user_close');

    assert.equal(dismissed, true);
    assert.equal(mgr.getActiveQueue().length, 0);
    assert.equal(mgr.getHistory().length, 1);
    assert.equal(mgr.getHistory()[0].reason, 'user_close');
  });
});
