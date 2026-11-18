/**
 * Automotive Hypercar - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 * Issue #936 - NSoC '26 Level 3 Feature
 */

export class AutomotiveHypercarNotificationManager {
  static PRIORITY_WEIGHTS = {
    danger: 400,
    warning: 300,
    success: 200,
    info: 100
  };

  static CHIME_FREQUENCIES = {
    danger: 220,
    warning: 440,
    success: 659.25,
    info: 523.25
  };

  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 5;
    this.audioEnabled = options.audioEnabled !== false;
    this.volume = options.volume !== undefined ? options.volume : 0.8;
    this.queue = [];
    this.history = [];
    this.timers = new Map();
    this.listeners = new Set();
    this.audioContext = options.audioContext || null;
  }

  dispatch(type = 'info', title = '', msg = '', options = {}) {
    const resolvedType = String(type).toLowerCase();
    const cleanTitle = String(title || '').trim();
    const cleanMsg = String(msg || '').trim();

    if (!cleanTitle && !cleanMsg) {
      throw new Error('Notification requires at least a title or message');
    }

    const isDuplicate = this.queue.some(
      item => item.title === cleanTitle && item.message === cleanMsg && item.type === resolvedType
    );
    if (isDuplicate) {
      return null;
    }

    const weight = AutomotiveHypercarNotificationManager.PRIORITY_WEIGHTS[resolvedType] || 100;
    const duration = options.duration !== undefined ? options.duration : 4000;
    const id = `notif-hypercar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const notification = {
      id,
      type: resolvedType,
      title: cleanTitle,
      message: cleanMsg,
      weight,
      duration,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    this.queue.push(notification);
    this.queue.sort((a, b) => b.weight - a.weight);

    while (this.queue.length > this.maxQueueSize) {
      const removed = this.queue.pop();
      if (removed) {
        this._clearTimer(removed.id);
        this.history.unshift({ ...removed, dismissedReason: 'queue_overflow' });
      }
    }

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id, 'timeout');
      }, duration);
      this.timers.set(id, timer);
    }

    if (this.audioEnabled && !options.silent) {
      this.playAudioChime(resolvedType);
    }

    this._notifyListeners('dispatch', notification);
    return notification;
  }

  dismiss(id, reason = 'manual') {
    const index = this.queue.findIndex(item => item.id === id);
    if (index === -1) return false;

    const [removed] = this.queue.splice(index, 1);
    this._clearTimer(id);
    this.history.unshift({ ...removed, dismissedReason: reason, dismissedAt: Date.now() });

    if (this.history.length > 50) {
      this.history.pop();
    }

    this._notifyListeners('dismiss', { id, reason, notification: removed });
    return true;
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  playAudioChime(type = 'info') {
    if (!this.audioEnabled) return false;
    try {
      const AudioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
      if (!AudioCtx && !this.audioContext) return false;

      const ctx = this.audioContext || new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const freq = AutomotiveHypercarNotificationManager.CHIME_FREQUENCIES[type] || 440;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type === 'danger' ? 'sawtooth' : type === 'warning' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      return true;
    } catch {
      return false;
    }
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    for (const [id] of this.timers) {
      this._clearTimer(id);
    }
    this.queue = [];
    this._notifyListeners('clear', null);
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    return () => {};
  }

  _notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data, this.getActiveQueue());
      } catch (e) {
        console.error('Notification listener error:', e);
      }
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new AutomotiveHypercarNotificationManager();
    const container = document.getElementById('hypercarToastContainer');

    function renderToasts() {
      if (!container) return;
      container.innerHTML = '';
      manager.getActiveQueue().forEach(toast => {
        const el = document.createElement('div');
        el.className = `hypercar-toast toast-${toast.type}`;
        el.innerHTML = `
          <div class="toast-content">
            <strong class="toast-title">${toast.title}</strong>
            <p class="toast-message">${toast.message}</p>
          </div>
          <button class="toast-close" data-id="${toast.id}">&times;</button>
        `;
        el.querySelector('.toast-close').addEventListener('click', () => {
          manager.dismiss(toast.id, 'user_action');
        });
        container.appendChild(el);
      });
    }

    manager.subscribe(renderToasts);

    window.AutomotiveHypercarNotifier = manager;
  });
}
