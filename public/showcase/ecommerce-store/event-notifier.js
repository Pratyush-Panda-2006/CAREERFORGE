/**
 * Ecommerce Store - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 * Issue #875 - NSoC '26 Level 3 Feature
 */

export class EcommerceStoreNotificationManager {
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

    // Deduplication check: drop duplicate active alert
    const isDuplicate = this.queue.some(
      item => item.title === cleanTitle && item.message === cleanMsg && item.type === resolvedType
    );
    if (isDuplicate) {
      return null;
    }

    const weight = EcommerceStoreNotificationManager.PRIORITY_WEIGHTS[resolvedType] || 100;
    const duration = options.duration !== undefined ? options.duration : 4000;
    const id = `notif-ecom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const notification = {
      id,
      type: resolvedType,
      title: cleanTitle,
      message: cleanMsg,
      weight,
      duration,
      timestamp: Date.now(),
      createdFormatted: new Date().toLocaleTimeString()
    };

    if (this.queue.length >= this.maxQueueSize) {
      let lowestIdx = 0;
      let lowestWeight = Infinity;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].weight < lowestWeight) {
          lowestWeight = this.queue[i].weight;
          lowestIdx = i;
        }
      }
      const evicted = this.queue.splice(lowestIdx, 1)[0];
      this._clearTimer(evicted.id);
      this.history.unshift({ ...evicted, evictedAt: Date.now(), reason: 'evicted' });
    }

    this.queue.push(notification);
    this.queue.sort((a, b) => b.weight - a.weight);

    if (this.audioEnabled) {
      const freq = options.frequency || EcommerceStoreNotificationManager.CHIME_FREQUENCIES[resolvedType] || 440;
      this.playAudioChime(freq);
    }

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    this._notifyListeners();
    return notification;
  }

  dismiss(id) {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx === -1) return false;

    const [item] = this.queue.splice(idx, 1);
    this._clearTimer(id);
    this.history.unshift({ ...item, dismissedAt: Date.now(), reason: 'dismissed' });
    this._notifyListeners();
    return true;
  }

  clearAll() {
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.queue = [];
    this._notifyListeners();
  }

  playAudioChime(freq = 440, durationSec = 0.15) {
    if (!this.audioEnabled || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

      gain.gain.setValueAtTime(this.volume * 0.25, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + durationSec);
    } catch {
      // AudioContext policy suppression
    }
  }

  setAudioEnabled(enabled) {
    this.audioEnabled = Boolean(enabled);
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.getActiveQueue(), this.getHistory());
      } catch {
        // Suppress listener callback error
      }
    }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.EcommerceStoreNotificationManager = EcommerceStoreNotificationManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new EcommerceStoreNotificationManager();
    const toastViewport = document.getElementById('toastNotificationViewport');
    const toggleAudio = document.getElementById('toggleAudioFeedback');

    function renderToasts() {
      if (!toastViewport) return;
      toastViewport.replaceChildren();

      manager.getActiveQueue().forEach(toast => {
        const item = document.createElement('div');
        item.className = `toast-card toast-${toast.type}`;
        item.innerHTML = `
          <div class="toast-content">
            <strong class="toast-title">${toast.title}</strong>
            <span class="toast-message">${toast.message}</span>
          </div>
          <button class="toast-close-btn" data-toast-id="${toast.id}">×</button>
        `;
        toastViewport.appendChild(item);
      });

      toastViewport.querySelectorAll('.toast-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-toast-id');
          manager.dismiss(id);
        });
      });
    }

    manager.subscribe(renderToasts);

    toggleAudio?.addEventListener('change', (e) => {
      manager.setAudioEnabled(e.target.checked);
    });

    document.querySelectorAll('[data-toast-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-toast-type');
        const title = btn.getAttribute('data-toast-title') || 'Store Alert';
        const msg = btn.getAttribute('data-toast-msg') || 'Shopping update notification.';
        manager.dispatch(type, title, msg);
      });
    });

    renderToasts();
  });
}
