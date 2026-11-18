/**
 * DeveloperPortfolioNotificationHub
 * Prioritized toast notification queue & actionable alert stream for developer portfolio, CI/CD deploy status, and recruiter outreach events.
 */
export class DeveloperPortfolioNotificationHub {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 8;
    this.queue = [];
    this.history = [];
    this.listeners = [];
  }

  getPriorityWeight(priority) {
    switch (priority) {
      case 'critical':
        return 4;
      case 'warning':
        return 3;
      case 'info':
        return 2;
      case 'success':
        return 1;
      default:
        return 0;
    }
  }

  enqueue(message, priority = 'info', category = 'system', actions = []) {
    if (!message || typeof message !== 'string') {
      throw new Error('Notification message must be a non-empty string');
    }

    const defaultActions = this.getDefaultActions(priority);
    const item = {
      id: `dev-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      message,
      priority,
      category,
      timestamp: new Date().toISOString(),
      actions: actions.length > 0 ? actions : defaultActions,
      status: 'active',
      actionTaken: null
    };

    this.queue.push(item);
    this.queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    if (this.queue.length > this.maxQueueSize) {
      const removed = this.queue.pop();
      if (removed) {
        removed.status = 'expired';
        this.history.unshift(removed);
      }
    }

    this.notify();
    return item;
  }

  getDefaultActions(priority) {
    switch (priority) {
      case 'critical':
        return [
          { id: 'retry-build', label: 'Retry CI/CD Pipeline' },
          { id: 'view-logs', label: 'Inspect Deploy Logs' }
        ];
      case 'warning':
        return [
          { id: 'view-diagnostics', label: 'Open Diagnostics' },
          { id: 'dismiss', label: 'Acknowledge' }
        ];
      case 'success':
        return [
          { id: 'view-live', label: 'View Live URL' }
        ];
      case 'info':
      default:
        return [
          { id: 'dismiss', label: 'Dismiss' }
        ];
    }
  }

  dismiss(id) {
    const idx = this.queue.findIndex((n) => n.id === id);
    if (idx === -1) return false;

    const [item] = this.queue.splice(idx, 1);
    item.status = 'dismissed';
    this.history.unshift(item);
    this.notify();
    return true;
  }

  executeAction(id, actionId) {
    const item = this.queue.find((n) => n.id === id);
    if (!item) return null;

    item.actionTaken = actionId;
    item.status = 'resolved';

    this.dismiss(id);
    return {
      alertId: id,
      actionId,
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    };
  }

  clearAll() {
    while (this.queue.length > 0) {
      const item = this.queue.pop();
      item.status = 'cleared';
      this.history.unshift(item);
    }
    this.notify();
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  getMetrics() {
    const active = this.queue.length;
    const criticalActive = this.queue.filter((n) => n.priority === 'critical').length;
    const warningActive = this.queue.filter((n) => n.priority === 'warning').length;
    const resolvedHistory = this.history.filter((n) => n.status === 'resolved').length;

    return {
      active,
      criticalActive,
      warningActive,
      resolvedHistory,
      totalProcessed: this.queue.length + this.history.length
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    const active = this.getActiveQueue();
    this.listeners.forEach((fn) => fn(active));
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const hubWrapper = document.createElement('div');
    hubWrapper.className = 'devport-notification-container';

    // Header
    const header = document.createElement('div');
    header.className = 'devport-notification-header';

    const title = document.createElement('h3');
    title.textContent = 'Developer Notification Queue & Telemetry Stream';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'devport-clear-btn';
    clearBtn.textContent = 'Clear All';
    clearBtn.addEventListener('click', () => {
      this.clearAll();
      this.renderToDOM(container);
    });

    header.append(title, clearBtn);
    hubWrapper.append(header);

    // List
    const list = document.createElement('div');
    list.className = 'devport-notification-list';

    const activeItems = this.getActiveQueue();
    if (activeItems.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'devport-notification-empty';
      emptyMsg.textContent = 'All CI/CD builds, GitHub hooks, and portfolio telemetry operational.';
      list.append(emptyMsg);
    } else {
      activeItems.forEach((item) => {
        const card = document.createElement('div');
        card.className = `devport-alert-card priority-${item.priority}`;

        const cardTop = document.createElement('div');
        cardTop.className = 'devport-card-top';

        const badge = document.createElement('span');
        badge.className = `devport-badge badge-${item.priority}`;
        badge.textContent = item.priority.toUpperCase();

        const cat = document.createElement('span');
        cat.className = 'devport-category';
        cat.textContent = item.category;

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'devport-dismiss-btn';
        dismissBtn.textContent = '×';
        dismissBtn.addEventListener('click', () => {
          this.dismiss(item.id);
          this.renderToDOM(container);
        });

        cardTop.append(badge, cat, dismissBtn);

        const msg = document.createElement('div');
        msg.className = 'devport-msg';
        msg.textContent = item.message;

        const actionsRow = document.createElement('div');
        actionsRow.className = 'devport-actions';

        item.actions.forEach((act) => {
          const btn = document.createElement('button');
          btn.className = 'devport-action-btn';
          btn.textContent = act.label;
          btn.addEventListener('click', () => {
            this.executeAction(item.id, act.id);
            this.renderToDOM(container);
          });
          actionsRow.append(btn);
        });

        card.append(cardTop, msg, actionsRow);
        list.append(card);
      });
    }

    hubWrapper.append(list);
    container.append(hubWrapper);
  }
}
