/**
 * Festival Hub - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 * Issue #883 - NSoC '26 Level 3 Feature
 */

export class FestivalHubNotificationManager {
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

    const weight = FestivalHubNotificationManager.PRIORITY_WEIGHTS[resolvedType] || 100;
    const duration = options.duration !== undefined ? options.duration : 4000;
    const id = `notif-festival-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

    // Capacity cap: evict lowest priority item if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      const minWeight = Math.min(...this.queue.map(it => it.weight));
      if (weight >= minWeight) {
        let lowestIndex = -1;
        for (let i = this.queue.length - 1; i >= 0; i--) {
          if (this.queue[i].weight === minWeight) {
            lowestIndex = i;
            break;
          }
        }
        if (lowestIndex !== -1) {
          const evicted = this.queue.splice(lowestIndex, 1)[0];
          this._clearTimer(evicted.id);
          this.history.push({ ...evicted, dismissedAt: Date.now(), reason: 'evicted' });
        }
      } else {
        // Incoming alert lower priority than anything in queue
        return null;
      }
    }

    this.queue.push(notification);
    this.queue.sort((a, b) => b.weight - a.weight);

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id, 'timeout');
      }, duration);
      this.timers.set(id, timer);
    }

    if (this.audioEnabled) {
      this.playAudioChime(notification.type);
    }

    this._notify();
    return notification;
  }

  dismiss(id, reason = 'manual') {
    const idx = this.queue.findIndex(it => it.id === id);
    if (idx === -1) return false;

    this._clearTimer(id);
    const removed = this.queue.splice(idx, 1)[0];
    this.history.push({ ...removed, dismissedAt: Date.now(), reason });
    this._notify();
    return true;
  }

  clearAll() {
    for (const item of this.queue) {
      this._clearTimer(item.id);
      this.history.push({ ...item, dismissedAt: Date.now(), reason: 'clear_all' });
    }
    this.queue = [];
    this._notify();
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  playAudioChime(freqOrType) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const freq = typeof freqOrType === 'number'
        ? freqOrType
        : (FestivalHubNotificationManager.CHIME_FREQUENCIES[freqOrType] || 440);

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

      gain.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.35);
    } catch {
      // Audio playback suppressed
    }
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getActiveQueue(), this.getHistory());
      } catch {
        // Listener error
      }
    }
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      listener(this.getActiveQueue(), this.getHistory());
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.FestivalHubNotificationManager = FestivalHubNotificationManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new FestivalHubNotificationManager();
    const container = document.getElementById('festival-toast-stack');
    const audioToggle = document.getElementById('toggle-audio');

    if (audioToggle) {
      audioToggle.addEventListener('change', (e) => {
        manager.audioEnabled = e.target.checked;
      });
    }

    const render = (queue) => {
      if (!container) return;
      container.innerHTML = '';
      queue.forEach((notif) => {
        const item = document.createElement('div');
        item.className = `toast-item toast-${notif.type}`;
        item.setAttribute('role', 'alert');
        item.innerHTML = `
          <div class="toast-body">
            <strong>${notif.title}</strong>
            <p>${notif.message}</p>
          </div>
          <button class="toast-close" data-id="${notif.id}" aria-label="Dismiss">&times;</button>
        `;
        item.querySelector('.toast-close').addEventListener('click', () => {
          manager.dismiss(notif.id);
        });
        container.appendChild(item);
      });
    };

    manager.subscribe(render);

    document.querySelectorAll('[data-festival-toast]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-festival-toast') || 'info';
        const title = btn.getAttribute('data-title') || 'Festival Update';
        const msg = btn.getAttribute('data-msg') || 'Stage announcement has been updated.';
        manager.dispatch(type, title, msg);
      });
    });
  });
}
