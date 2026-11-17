/**
 * Crypto Exchange Pro - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 * Dispatches prioritized toast notifications (Danger, Warning, Success, Info), synthesizes Web Audio chimes, and deduplicates exchange events.
 */

export class CryptoExchangeProNotificationManager {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 5;
    this.audioEnabled = options.audioEnabled !== undefined ? options.audioEnabled : true;
    this.queue = [];
    this.counter = 0;
    this.timeouts = new Map();

    this.typePriority = {
      danger: 4,
      warning: 3,
      success: 2,
      info: 1
    };

    this.audioFrequencies = {
      danger: 220,
      warning: 440,
      success: 659.25,
      info: 523.25
    };
  }

  dispatch(type = 'info', title = '', msg = '', duration = 4000) {
    const cleanType = String(type).toLowerCase();
    const cleanTitle = String(title || '').trim();
    const cleanMsg = String(msg || '').trim();

    // Deduplication guard: ignore if identical notification is already active in queue
    const isDuplicate = this.queue.some(item => item.title === cleanTitle && item.msg === cleanMsg);
    if (isDuplicate) {
      return null;
    }

    this.counter++;
    const id = `notif_${Date.now()}_${this.counter}`;
    const weight = this.typePriority[cleanType] || 1;

    const notification = {
      id,
      type: cleanType,
      title: cleanTitle || 'Exchange Alert',
      msg: cleanMsg,
      weight,
      duration: Number(duration) || 0,
      timestamp: new Date().toISOString()
    };

    // Priority ordering: highest priority weight first
    let insertIndex = this.queue.findIndex(item => item.weight < weight);
    if (insertIndex === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIndex, 0, notification);
    }

    // Auto-dismissal timeout handling
    if (notification.duration > 0 && typeof setTimeout !== 'undefined') {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
      this.timeouts.set(id, timer);
    }

    // Enforce maxQueueSize: evict lowest priority from tail
    while (this.queue.length > this.maxQueueSize) {
      const evicted = this.queue.pop();
      if (evicted && this.timeouts.has(evicted.id)) {
        clearTimeout(this.timeouts.get(evicted.id));
        this.timeouts.delete(evicted.id);
      }
    }

    // Play synthesis chime if enabled
    if (this.audioEnabled) {
      const freq = this.audioFrequencies[cleanType] || 440;
      this.playAudioChime(freq);
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
      const [removed] = this.queue.splice(index, 1);
      return removed;
    }
    return null;
  }

  getActiveQueue() {
    return [...this.queue];
  }

  getQueueSize() {
    return this.queue.length;
  }

  clearAll() {
    for (const [id, timer] of this.timeouts.entries()) {
      clearTimeout(timer);
    }
    this.timeouts.clear();
    this.queue = [];
  }

  playAudioChime(freq = 440) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // AudioContext unavailable or unpermitted
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new CryptoExchangeProNotificationManager({ maxQueueSize: 5 });

    const viewport = document.getElementById('toastViewport');
    const queueCount = document.getElementById('queueCount');
    const chimeToggle = document.getElementById('chimeToggle');

    function renderQueue() {
      if (!viewport) return;
      viewport.replaceChildren();

      const items = manager.getActiveQueue();
      if (queueCount) queueCount.textContent = String(items.length);

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.padding = '2rem';
        empty.style.textAlign = 'center';
        empty.textContent = 'Queue idle. No active exchange alerts.';
        viewport.appendChild(empty);
        return;
      }

      items.forEach(toast => {
        const el = document.createElement('div');
        el.className = `toast-item type-${toast.type}`;

        const content = document.createElement('div');
        content.className = 'toast-content';

        const title = document.createElement('div');
        title.className = 'toast-title';
        title.textContent = toast.title;

        const msg = document.createElement('div');
        msg.className = 'toast-msg';
        msg.textContent = toast.msg;

        content.appendChild(title);
        content.appendChild(msg);

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'toast-dismiss';
        dismissBtn.innerHTML = '&times;';
        dismissBtn.title = 'Dismiss';
        dismissBtn.addEventListener('click', () => {
          manager.dismiss(toast.id);
          renderQueue();
        });

        el.appendChild(content);
        el.appendChild(dismissBtn);
        viewport.appendChild(el);
      });
    }

    if (chimeToggle) {
      chimeToggle.addEventListener('change', (e) => {
        manager.audioEnabled = e.target.checked;
      });
    }

    document.getElementById('triggerDangerBtn')?.addEventListener('click', () => {
      manager.dispatch('danger', 'Critical Margin Call', 'Liquidation Risk: Isolated margin account LTV reached 85.4%. Deposit collateral immediately.', 5000);
      renderQueue();
    });

    document.getElementById('triggerWarningBtn')?.addEventListener('click', () => {
      manager.dispatch('warning', 'Price Spread Expansion', 'ETH/USDT order book slippage exceeded 2.5% across top 5 depth levels.', 4000);
      renderQueue();
    });

    document.getElementById('triggerSuccessBtn')?.addEventListener('click', () => {
      manager.dispatch('success', 'Limit Order Executed', 'Bought 1.5 BTC at $92,450.00 USDT. Execution fee: 0.02% (VIP-2 discount).', 3500);
      renderQueue();
    });

    document.getElementById('triggerInfoBtn')?.addEventListener('click', () => {
      manager.dispatch('info', 'On-Chain Deposit Logged', 'Received 5,000 USDT via Arbitrum One. Confirmed in 12 block validations.', 3000);
      renderQueue();
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
      manager.clearAll();
      renderQueue();
    });

    renderQueue();
  });
}
