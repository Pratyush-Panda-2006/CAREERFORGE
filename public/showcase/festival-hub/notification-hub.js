/**
 * Festival Hub - Prioritized Toast Notification Queue & Actionable Alert Stream
 * Issue #1339 - NSoC '26 Level 3 Feature
 */

export class FestivalHubNotificationHub {
  static PRIORITY_WEIGHTS = {
    critical: 400,
    warning: 300,
    success: 200,
    info: 100
  };

  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 5;
    this.queue = [];
    this.historyLog = [];
    this.listeners = new Set();
    this.timers = new Map();
  }

  enqueue(message, type = 'info', priority = null, duration = 3000) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    const resolvedType = String(type).toLowerCase();
    const resolvedPriority = String(priority || resolvedType).toLowerCase();
    const weight = FestivalHubNotificationHub.PRIORITY_WEIGHTS[resolvedPriority] ?? 100;

    const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const notification = {
      id,
      message,
      type: resolvedType,
      priority: resolvedPriority,
      weight,
      duration: typeof duration === 'number' ? duration : 3000,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    // Insert maintaining priority descending (higher weight first; if equal, earlier timestamp first)
    let insertIdx = this.queue.findIndex(item => item.weight < notification.weight);
    if (insertIdx === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIdx, 0, notification);
    }

    // Enforce max queue size by removing lowest-priority/oldest item from tail
    while (this.queue.length > this.maxQueueSize) {
      const evicted = this.queue.pop();
      if (evicted) {
        this._cancelTimer(evicted.id);
        this.historyLog.push({ ...evicted, dismissedReason: 'evicted' });
      }
    }

    // Schedule auto-dismiss if duration > 0
    if (notification.duration > 0 && typeof setTimeout !== 'undefined') {
      const timer = setTimeout(() => {
        this.dismiss(id, 'timeout');
      }, notification.duration);
      this.timers.set(id, timer);
    }

    this._notifyChange();
    return notification;
  }

  dismiss(id, reason = 'manual') {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx === -1) return false;

    const [removed] = this.queue.splice(idx, 1);
    this._cancelTimer(id);

    this.historyLog.push({
      ...removed,
      dismissedAt: new Date().toISOString(),
      dismissedReason: reason
    });

    this._notifyChange();
    return true;
  }

  _cancelTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getLog() {
    return [...this.historyLog];
  }

  clearActive() {
    for (const item of this.queue) {
      this._cancelTimer(item.id);
      this.historyLog.push({ ...item, dismissedReason: 'cleared_all' });
    }
    this.queue = [];
    this._notifyChange();
  }

  clearLog() {
    this.historyLog = [];
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }

  _notifyChange() {
    const active = this.getActiveQueue();
    const log = this.getLog();
    for (const listener of this.listeners) {
      try {
        listener({ active, log });
      } catch (err) {
        console.error('NotificationHub listener error:', err);
      }
    }
  }
}
