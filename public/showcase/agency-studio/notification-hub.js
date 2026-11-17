/**
 * Agency Studio - Prioritized Toast Notification Queue & Actionable Alert Stream
 * Manages prioritized studio alerts (Critical, Warning, Success, Info), auto-dismiss timers, and audit event logs.
 */

export class AgencyStudioNotificationHub {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 5;
    this.queue = [];
    this.history = [];
    this.counter = 0;
    this.timeouts = new Map();

    this.priorityWeights = {
      critical: 4,
      warning: 3,
      success: 2,
      info: 1
    };
  }

  enqueue(message, type = 'info', priority = 'info', duration = 4000) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Notification message cannot be empty');
    }

    const normalizedPriority = String(priority).toLowerCase();
    const normalizedType = String(type).toLowerCase();
    const weight = this.priorityWeights[normalizedPriority] ?? 1;

    this.counter++;
    const id = `agn_notif_${Date.now()}_${this.counter}`;

    const notification = {
      id,
      message: message.trim(),
      type: normalizedType,
      priority: normalizedPriority,
      priorityWeight: weight,
      duration: Number(duration) || 0,
      createdAt: new Date().toISOString()
    };

    // Insert into priority queue: higher priorityWeight first; if equal weight, older first
    let insertIndex = this.queue.findIndex(item => item.priorityWeight < weight);
    if (insertIndex === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIndex, 0, notification);
    }

    // Record to history audit stream
    this.history.unshift({ ...notification });

    // Handle auto-dismissal if duration > 0
    if (notification.duration > 0 && typeof setTimeout !== 'undefined') {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
      this.timeouts.set(id, timer);
    }

    // Enforce maxQueueSize: evict lowest priority item from end of queue
    while (this.queue.length > this.maxQueueSize) {
      const evicted = this.queue.pop();
      if (evicted && this.timeouts.has(evicted.id)) {
        clearTimeout(this.timeouts.get(evicted.id));
        this.timeouts.delete(evicted.id);
      }
    }

    return notification;
  }

  dismiss(id) {
    if (this.timeouts.has(id)) {
      clearTimeout(this.timeouts.get(id));
      this.timeouts.delete(id);
    }

    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  clearAll() {
    for (const [id, timer] of this.timeouts.entries()) {
      clearTimeout(timer);
    }
    this.timeouts.clear();
    this.queue = [];
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const hub = new AgencyStudioNotificationHub({ maxQueueSize: 5 });

    const activeContainer = document.getElementById('activeToastsViewport');
    const historyContainer = document.getElementById('alertHistoryList');
    const activeCount = document.getElementById('activeCount');
    const historyCount = document.getElementById('historyCount');

    function renderActive() {
      if (!activeContainer) return;
      activeContainer.replaceChildren();

      const activeList = hub.getActiveQueue();
      if (activeCount) activeCount.textContent = String(activeList.length);

      if (activeList.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.style.color = 'var(--text-muted)';
        placeholder.style.padding = '2rem';
        placeholder.style.textAlign = 'center';
        placeholder.textContent = 'Queue idle. No active agency alerts.';
        activeContainer.appendChild(placeholder);
        return;
      }

      activeList.forEach(toast => {
        const item = document.createElement('div');
        item.className = `toast-item priority-${toast.priority}`;

        const header = document.createElement('div');
        header.className = 'toast-header-row';

        const badge = document.createElement('span');
        badge.className = 'toast-badge';
        badge.textContent = `${toast.priority.toUpperCase()} PRIORITY`;

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'toast-dismiss-btn';
        dismissBtn.innerHTML = '&times;';
        dismissBtn.title = 'Dismiss';
        dismissBtn.addEventListener('click', () => {
          hub.dismiss(toast.id);
          renderActive();
        });

        header.appendChild(badge);
        header.appendChild(dismissBtn);

        const body = document.createElement('div');
        body.className = 'toast-body';
        body.textContent = toast.message;

        item.appendChild(header);
        item.appendChild(body);

        if (toast.duration > 0) {
          const bar = document.createElement('div');
          bar.className = 'countdown-bar';
          bar.style.animationDuration = `${toast.duration}ms`;
          item.appendChild(bar);
        }

        activeContainer.appendChild(item);
      });
    }

    function renderHistory() {
      if (!historyContainer) return;
      historyContainer.replaceChildren();

      const histList = hub.getHistory();
      if (historyCount) historyCount.textContent = String(histList.length);

      histList.slice(0, 30).forEach(entry => {
        const row = document.createElement('div');
        row.className = 'history-entry';

        const text = document.createElement('span');
        text.className = 'history-text';
        text.textContent = `[${entry.priority.toUpperCase()}] ${entry.message}`;

        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = new Date(entry.createdAt).toLocaleTimeString();

        row.appendChild(text);
        row.appendChild(time);
        historyContainer.appendChild(row);
      });
    }

    function dispatchAlert(msg, type, priority, duration) {
      hub.enqueue(msg, type, priority, duration);
      renderActive();
      renderHistory();
    }

    document.getElementById('triggerCriticalBtn')?.addEventListener('click', () => {
      dispatchAlert('CRITICAL: Client pitch deadline in 2 hours. Final vector assets missing!', 'critical', 'critical', 6000);
    });

    document.getElementById('triggerWarningBtn')?.addEventListener('click', () => {
      dispatchAlert('WARNING: Creative WIP capacity reached (3/3 tasks) in Design column.', 'warning', 'warning', 4500);
    });

    document.getElementById('triggerSuccessBtn')?.addEventListener('click', () => {
      dispatchAlert('SUCCESS: Client sign-off received for Horizon 2026 Brand Guidelines.', 'success', 'success', 3500);
    });

    document.getElementById('triggerInfoBtn')?.addEventListener('click', () => {
      dispatchAlert('INFO: Figma Component Tokens synced with local repository.', 'info', 'info', 3000);
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
      hub.clearAll();
      renderActive();
    });

    renderActive();
    renderHistory();
  });
}
