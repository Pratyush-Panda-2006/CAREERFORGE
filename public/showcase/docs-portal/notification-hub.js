/**
 * DocsPortalNotificationHub
 * Prioritized toast notification queue & actionable alert stream for API schema validation, breaking change warnings, deprecation schedules, and SDK releases.
 */
export class DocsPortalNotificationHub {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 8;
    this.defaultDuration = options.defaultDuration || 4500;
    this.queue = [];
    this.history = [];
    this.subscribers = new Set();
    this.counter = 0;

    this.priorityWeights = {
      critical: 3,
      warning: 2,
      success: 1,
      info: 0
    };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.getActiveQueue(), this.getHistory());
      } catch (err) {
        console.error('Docs portal notification subscriber error:', err);
      }
    }
  }

  enqueue(message, type = 'info', priority = 'info', duration = this.defaultDuration) {
    if (!message || typeof message !== 'string') {
      throw new Error('Notification message must be a non-empty string');
    }

    const normalizedPriority = Object.prototype.hasOwnProperty.call(this.priorityWeights, priority) ? priority : 'info';
    const normalizedType = ['critical', 'warning', 'success', 'info'].includes(type) ? type : 'info';
    this.counter += 1;

    const item = {
      id: `docs-alert-${Date.now()}-${this.counter}`,
      message: message.trim(),
      type: normalizedType,
      priority: normalizedPriority,
      duration,
      createdAt: new Date().toISOString(),
      dismissed: false,
      actions: []
    };

    if (normalizedPriority === 'critical') {
      item.actions = [
        { id: 'revert-schema', label: 'Revert Schema' },
        { id: 'notify-devs', label: 'Notify API Consumers' }
      ];
    } else if (normalizedPriority === 'warning') {
      item.actions = [
        { id: 'view-migration', label: 'View Migration Guide' }
      ];
    }

    this.queue.push(item);
    this.sortQueue();

    if (this.queue.length > this.maxQueueSize) {
      const removed = this.queue.pop();
      if (removed) {
        removed.dismissed = true;
        this.history.unshift(removed);
      }
    }

    this.notify();
    return item;
  }

  sortQueue() {
    this.queue.sort((a, b) => {
      const weightDiff = (this.priorityWeights[b.priority] || 0) - (this.priorityWeights[a.priority] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  dismiss(id) {
    const idx = this.queue.findIndex((item) => item.id === id);
    if (idx === -1) return false;

    const [item] = this.queue.splice(idx, 1);
    item.dismissed = true;
    item.dismissedAt = new Date().toISOString();
    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();

    this.notify();
    return true;
  }

  executeAction(id, actionId) {
    const item = this.queue.find((n) => n.id === id) || this.history.find((n) => n.id === id);
    if (!item) return null;

    const action = item.actions.find((a) => a.id === actionId);
    if (!action) return null;

    item.actionTaken = actionId;
    this.notify();
    return { item, actionId, status: 'resolved' };
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory(limit = 20) {
    return this.history.slice(0, limit);
  }

  clearQueue() {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item.dismissed = true;
      item.dismissedAt = new Date().toISOString();
      this.history.unshift(item);
    }
    this.notify();
  }

  getMetrics() {
    const total = this.queue.length + this.history.length;
    const criticalCount = this.queue.filter((i) => i.priority === 'critical').length;
    const warningCount = this.queue.filter((i) => i.priority === 'warning').length;
    return {
      active: this.queue.length,
      history: this.history.length,
      criticalActive: criticalCount,
      warningActive: warningCount,
      totalProcessed: total
    };
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'docs-notification-container';

    const header = document.createElement('div');
    header.className = 'docs-notification-header';

    const title = document.createElement('h3');
    title.textContent = 'API Spec & Developer Operations Stream';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'docs-clear-btn';
    clearBtn.textContent = 'Clear Alerts';
    clearBtn.addEventListener('click', () => {
      this.clearQueue();
    });

    header.append(title, clearBtn);
    wrapper.append(header);

    const list = document.createElement('div');
    list.className = 'docs-notification-list';

    const activeItems = this.getActiveQueue();
    if (activeItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'docs-notification-empty';
      emptyState.textContent = 'All OpenAPI specifications validated. Zero schema incompatibilities.';
      list.append(emptyState);
    } else {
      activeItems.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = `docs-toast-item docs-toast-${item.type} docs-priority-${item.priority}`;
        itemEl.setAttribute('data-id', item.id);

        const badge = document.createElement('span');
        badge.className = `docs-toast-badge badge-${item.priority}`;
        badge.textContent = item.priority.toUpperCase();

        const messageEl = document.createElement('p');
        messageEl.className = 'docs-toast-message';
        messageEl.textContent = item.message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'docs-toast-close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Dismiss alert');
        closeBtn.addEventListener('click', () => {
          this.dismiss(item.id);
        });

        itemEl.append(badge, messageEl, closeBtn);

        if (item.actions && item.actions.length > 0) {
          const actionRow = document.createElement('div');
          actionRow.className = 'docs-toast-actions';
          item.actions.forEach((act) => {
            const btn = document.createElement('button');
            btn.className = 'docs-action-btn';
            btn.textContent = act.label;
            btn.addEventListener('click', () => {
              this.executeAction(item.id, act.id);
            });
            actionRow.append(btn);
          });
          itemEl.append(actionRow);
        }

        list.append(itemEl);
      });
    }

    wrapper.append(list);
    container.append(wrapper);
  }
}
