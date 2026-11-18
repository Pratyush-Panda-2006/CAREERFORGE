/**
 * Docs Portal - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 */

export class DocsPortalNotificationManager {
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

    const weight = DocsPortalNotificationManager.PRIORITY_WEIGHTS[resolvedType] || 100;
    const duration = options.duration !== undefined ? options.duration : 4000;
    const id = `notif-docs-portal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

    // Sort descending by priority weight
    const insertIdx = this.queue.findIndex(item => item.weight < notification.weight);
    if (insertIdx === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIdx, 0, notification);
    }

    // Enforce maxQueueSize limit
    while (this.queue.length > this.maxQueueSize) {
      const evicted = this.queue.pop();
      if (evicted) {
        this._clearTimer(evicted.id);
        this.history.push({ ...evicted, reason: 'evicted' });
      }
    }

    // Auto-dismiss timeout
    if (duration > 0 && typeof setTimeout !== 'undefined') {
      const timer = setTimeout(() => {
        this.dismiss(id, 'timeout');
      }, duration);
      this.timers.set(id, timer);
    }

    // Play synthesized chime
    const freq = options.frequency || DocsPortalNotificationManager.CHIME_FREQUENCIES[resolvedType] || 440;
    this.playAudioChime(freq);

    this._emit();
    return notification;
  }

  dismiss(id, reason = 'manual') {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx === -1) return false;

    const [removed] = this.queue.splice(idx, 1);
    this._clearTimer(id);

    this.history.push({
      ...removed,
      dismissedAt: new Date().toISOString(),
      reason
    });

    this._emit();
    return true;
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  playAudioChime(freq = 440) {
    if (!this.audioEnabled || typeof window === 'undefined') return false;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

      gain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.35);
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
    for (const item of this.queue) {
      this._clearTimer(item.id);
      this.history.push({ ...item, reason: 'cleared_all' });
    }
    this.queue = [];
    this._emit();
  }

  subscribe(fn) {
    if (typeof fn === 'function') {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    return () => {};
  }

  _emit() {
    const state = { active: this.getActiveQueue(), history: this.getHistory() };
    for (const fn of this.listeners) {
      try {
        fn(state);
      } catch (e) {
        console.error('Notification listener error:', e);
      }
    }
  }
}
