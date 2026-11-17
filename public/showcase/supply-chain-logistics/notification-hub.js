/**
 * Supply Chain Logistics - Prioritized Toast Notification Queue & Actionable Alert Stream
 * Manages prioritized customs alerts, freight tracking updates, and automated audit logs.
 */

export class SupplyChainLogisticsNotificationHub {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 5;
    this.queue = [];
    this.history = [];
    this.idCounter = 0;
    this.priorityWeights = {
      critical: 3,
      warning: 2,
      success: 1,
      info: 0
    };
  }

  enqueue(message, type = 'info', priority = 'info', duration = 4000) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    const cleanType = String(type).toLowerCase();
    const cleanPriority = String(priority).toLowerCase();
    const weight = this.priorityWeights[cleanPriority] ?? 0;

    const item = {
      id: `toast-${Date.now()}-${++this.idCounter}`,
      message: message.trim(),
      type: cleanType,
      priority: cleanPriority,
      weight,
      duration: Math.max(1000, Number(duration) || 4000),
      timestamp: new Date().toISOString()
    };

    let insertIndex = this.queue.findIndex(q => q.weight < item.weight);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    if (this.queue.length > this.maxQueueSize) {
      this.queue.pop();
    }

    this.history.unshift({ ...item });
    if (this.history.length > 50) this.history.pop();

    return item;
  }

  dismiss(id) {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx !== -1) {
      const [removed] = this.queue.splice(idx, 1);
      return removed;
    }
    return null;
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  clearQueue() {
    this.queue = [];
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('toastViewport');
    const logList = document.getElementById('notificationLogList');
    if (!viewport) return;

    const hub = new SupplyChainLogisticsNotificationHub({ maxQueueSize: 5 });

    function renderLog() {
      if (!logList) return;
      logList.replaceChildren();

      const items = hub.getHistory();
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.padding = '1rem';
        empty.style.textAlign = 'center';
        empty.textContent = 'No dispatch alerts recorded in current session.';
        logList.appendChild(empty);
        return;
      }

      for (const item of items) {
        const row = document.createElement('div');
        row.className = `log-item ${item.priority}`;

        const msg = document.createElement('span');
        msg.textContent = `[${item.priority.toUpperCase()}] ${item.message}`;

        const time = document.createElement('span');
        time.className = 'log-time';
        time.textContent = item.timestamp.split('T')[1].split('.')[0];

        row.append(msg, time);
        logList.appendChild(row);
      }
    }

    function renderToasts() {
      viewport.replaceChildren();
      const active = hub.getActiveQueue();

      for (const item of active) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${item.priority}`;
        toast.dataset.id = item.id;

        const header = document.createElement('div');
        header.className = 'toast-header';

        const badge = document.createElement('span');
        badge.className = 'toast-priority-badge';
        badge.textContent = item.priority;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close-btn';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
          hub.dismiss(item.id);
          renderToasts();
        });

        header.append(badge, closeBtn);

        const body = document.createElement('div');
        body.className = 'toast-body';
        body.textContent = item.message;

        const bar = document.createElement('div');
        bar.className = 'toast-countdown-bar';
        const fill = document.createElement('div');
        fill.className = 'toast-countdown-fill';
        fill.style.transition = `width ${item.duration}ms linear`;
        bar.appendChild(fill);

        toast.append(header, body, bar);
        viewport.appendChild(toast);

        setTimeout(() => {
          fill.style.width = '0%';
        }, 10);

        setTimeout(() => {
          hub.dismiss(item.id);
          renderToasts();
        }, item.duration);
      }
    }

    const critBtn = document.getElementById('triggerCriticalBtn');
    const warnBtn = document.getElementById('triggerWarningBtn');
    const succBtn = document.getElementById('triggerSuccessBtn');
    const infoBtn = document.getElementById('triggerInfoBtn');
    const clearBtn = document.getElementById('clearAllBtn');

    if (critBtn) {
      critBtn.addEventListener('click', () => {
        hub.enqueue('CUSTOMS HOLD: Container MSCU-918274 flagged for physical quarantine inspection at Port of Rotterdam.', 'error', 'critical', 6000);
        renderToasts();
        renderLog();
      });
    }

    if (warnBtn) {
      warnBtn.addEventListener('click', () => {
        hub.enqueue('TEMPERATURE DRIFT: Reefer unit #44 reported 4.8°C (Threshold: 2.0°C - 4.0°C). Compressor ramping up.', 'warn', 'warning', 4500);
        renderToasts();
        renderLog();
      });
    }

    if (succBtn) {
      succBtn.addEventListener('click', () => {
        hub.enqueue('BILL OF LADING RELEASED: Clean customs clearance issued for 40ft High-Cube container.', 'success', 'success', 3500);
        renderToasts();
        renderLog();
      });
    }

    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        hub.enqueue('TRANSIT PING: Intermodal vessel Evergreen A reached Suez Canal checkpoint. ETA on schedule.', 'info', 'info', 3000);
        renderToasts();
        renderLog();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        hub.clearQueue();
        renderToasts();
      });
    }

    renderLog();
  });
}
