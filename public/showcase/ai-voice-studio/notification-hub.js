/**
 * AiVoiceStudioNotificationHub
 * Prioritized toast notification queue & actionable alert stream for neural audio synthesis and microphone telemetry.
 */
export class AiVoiceStudioNotificationHub {
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
        console.error('Subscriber notification error:', err);
      }
    }
  }

  enqueue(message, type = 'info', priority = 'info', duration = this.defaultDuration) {
    if (!message || typeof message !== 'string') {
      throw new Error('Notification message must be a non-empty string');
    }

    const normalizedPriority = this.priorityWeights.hasOwnProperty(priority) ? priority : 'info';
    const normalizedType = ['critical', 'warning', 'success', 'info'].includes(type) ? type : 'info';
    this.counter += 1;

    const item = {
      id: `voice-alert-${Date.now()}-${this.counter}`,
      message: message.trim(),
      type: normalizedType,
      priority: normalizedPriority,
      priorityWeight: this.priorityWeights[normalizedPriority],
      duration,
      createdAt: new Date().toISOString(),
      dismissed: false
    };

    // Insert sorted by priority weight descending (critical highest)
    const insertIndex = this.queue.findIndex(existing => existing.priorityWeight < item.priorityWeight);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    // Limit active queue capacity
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

  dismiss(id) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      removed.dismissed = true;
      this.history.unshift(removed);
      this.notify();
      return true;
    }
    return false;
  }

  clearQueue() {
    while (this.queue.length > 0) {
      const item = this.queue.pop();
      if (item) {
        item.dismissed = true;
        this.history.unshift(item);
      }
    }
    this.notify();
  }

  clearHistory() {
    this.history = [];
    this.notify();
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  render(container) {
    if (!container) return;
    container.replaceChildren();

    const activeList = this.getActiveQueue();
    if (activeList.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'av-empty-hub';
      emptyNotice.textContent = 'Voice Studio Idle: No active audio synthesis notices in queue.';
      container.append(emptyNotice);
      return;
    }

    for (const item of activeList) {
      const toast = document.createElement('div');
      toast.className = `av-toast av-toast-${item.type} av-priority-${item.priority}`;
      toast.dataset.id = item.id;

      const header = document.createElement('div');
      header.className = 'av-toast-header';

      const badge = document.createElement('span');
      badge.className = `av-badge av-badge-${item.priority}`;
      badge.textContent = item.priority.toUpperCase();

      const timeSpan = document.createElement('span');
      timeSpan.className = 'av-toast-time';
      timeSpan.textContent = new Date(item.createdAt).toLocaleTimeString();

      const closeBtn = document.createElement('button');
      closeBtn.className = 'av-toast-close';
      closeBtn.setAttribute('aria-label', 'Dismiss alert');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => this.dismiss(item.id));

      header.append(badge, timeSpan, closeBtn);

      const msg = document.createElement('div');
      msg.className = 'av-toast-message';
      msg.textContent = item.message;

      const progressBar = document.createElement('div');
      progressBar.className = 'av-toast-progress';
      const progressFill = document.createElement('div');
      progressFill.className = 'av-toast-progress-fill';
      progressFill.style.animationDuration = `${item.duration}ms`;
      progressBar.append(progressFill);

      toast.append(header, msg, progressBar);
      container.append(toast);
    }
  }
}
