/**
 * VR Metaverse Hub - Reactive Toast Notification Queue & Audio Feedback Dispatcher
 * Dispatches prioritized toast notifications (Danger, Warning, Success, Info), synthesizes Web Audio chimes, and deduplicates events.
 */

export class VrMetaverseHubNotificationManager {
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
      title: cleanTitle || 'Notification',
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
    const manager = new VrMetaverseHubNotificationManager({ maxQueueSize: 5 });

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
        empty.textContent = 'Queue idle. No active spatial toasts.';
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
      manager.dispatch('danger', 'Critical Network Latency', 'WebRTC peer packet drop exceeded 15% threshold in Sector 4.', 5000);
      renderQueue();
    });

    document.getElementById('triggerWarningBtn')?.addEventListener('click', () => {
      manager.dispatch('warning', 'GPU Memory Pressure', 'GL context VRAM occupancy above 88%. Decimating LOD meshes.', 4000);
      renderQueue();
    });

    document.getElementById('triggerSuccessBtn')?.addEventListener('click', () => {
      manager.dispatch('success', 'Spatial Audio Synchronized', 'Room audio reflections calibrated with 12ms listener latency.', 3500);
      renderQueue();
    });

    document.getElementById('triggerInfoBtn')?.addEventListener('click', () => {
      manager.dispatch('info', 'World Anchor Verified', 'AR spatial anchor locked at origin coordinates (0, 1.6, 0).', 3000);
      renderQueue();
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
      manager.clearAll();
      renderQueue();
    });

    renderQueue();
  });
}
