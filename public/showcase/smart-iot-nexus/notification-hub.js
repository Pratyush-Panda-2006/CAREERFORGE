/**
 * Smart IoT Nexus - Prioritized Toast Notification Queue & Actionable Alert Stream
 * Manages prioritized sensor anomaly alerts, MQTT broker telemetry warnings, and firmware OTA events.
 */

export class SmartIoTNexusNotificationHub {
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
      id: `iot-toast-${Date.now()}-${++this.idCounter}`,
      message: message.trim(),
      type: cleanType,
      priority: cleanPriority,
      weight,
      duration: Math.max(1000, Number(duration) || 4000),
      timestamp: new Date().toISOString()
    };

    // Priority sorted descending
    let insertIndex = this.queue.findIndex(q => q.weight < item.weight);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    // Evict lowest priority if over maxQueueSize
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

    const hub = new SmartIoTNexusNotificationHub({ maxQueueSize: 5 });

    function renderLog() {
      if (!logList) return;
      logList.replaceChildren();

      const items = hub.getHistory();
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.padding = '1rem';
        empty.style.textAlign = 'center';
        empty.textContent = 'No IoT telemetry events recorded in current session.';
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

        // Animate fill bar and dismiss
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
        hub.enqueue('CRITICAL THERMAL RUNAWAY: Reactor Core Sensor #12 temperature exceeded 98.4°C. Automatic coolant purge initiated.', 'error', 'critical', 6000);
        renderToasts();
        renderLog();
      });
    }

    if (warnBtn) {
      warnBtn.addEventListener('click', () => {
        hub.enqueue('MQTT Broker QoS 2 latency degraded: 14% packet retransmissions on edge cluster #4.', 'warn', 'warning', 4500);
        renderToasts();
        renderLog();
      });
    }

    if (succBtn) {
      succBtn.addEventListener('click', () => {
        hub.enqueue('Firmware v2.4.1 flashed via LoRaWAN broadcast to 128 sensor nodes.', 'success', 'success', 3500);
        renderToasts();
        renderLog();
      });
    }

    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        hub.enqueue('BLE Mesh heartbeat synced across 42 active beacons. Signal RSSI -64 dBm.', 'info', 'info', 3000);
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
