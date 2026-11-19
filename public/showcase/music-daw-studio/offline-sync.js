/**
 * Music DAW Studio - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Issue #861 - NSoC '26 Level 3 Feature
 */

export class MusicDawStudioSyncQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'music_daw_studio_sync_queue_v1';
    this.nodeId = options.nodeId || 'node-daw-' + Math.random().toString(36).substring(2, 6);
    this.baseBackoffMs = options.baseBackoffMs || 200;
    this.isOnline = options.initialOnline !== undefined ? options.initialOnline : true;
    this.queue = [];
    this.clockCounter = 0;
    this.loadQueue();
  }

  loadQueue() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.queue = JSON.parse(raw) || [];
      }
    } catch {
      this.queue = [];
    }
  }

  saveQueue() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch {}
  }

  enqueue(mutation) {
    this.clockCounter++;
    const item = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: mutation,
      clock: { [this.nodeId]: this.clockCounter },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };
    this.queue.push(item);
    this.saveQueue();
    return item;
  }

  dequeue(id) {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx !== -1) {
      const removed = this.queue.splice(idx, 1)[0];
      this.saveQueue();
      return removed;
    }
    return null;
  }

  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  getQueue() {
    return [...this.queue];
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
  }

  resolveConflict(localItem, incomingItem) {
    const localClock = (localItem.clock && localItem.clock[this.nodeId]) || 0;
    const incomingClock = (incomingItem.clock && Object.values(incomingItem.clock)[0]) || 0;

    if (incomingClock > localClock) {
      return incomingItem;
    } else if (localClock > incomingClock) {
      return localItem;
    }
    return incomingItem.timestamp >= localItem.timestamp ? incomingItem : localItem;
  }

  async processQueue(syncHandler) {
    if (!this.isOnline || this.queue.length === 0) return { processed: 0, failed: 0 };
    let processed = 0;
    let failed = 0;

    const items = [...this.queue];
    for (const item of items) {
      try {
        if (syncHandler) {
          await syncHandler(item);
        }
        this.dequeue(item.id);
        processed++;
      } catch {
        item.retries = (item.retries || 0) + 1;
        failed++;
      }
    }
    this.saveQueue();
    return { processed, failed, remaining: this.queue.length };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const syncQueue = new MusicDawStudioSyncQueue();

    const trackNameInput = document.getElementById('trackNameInput');
    const bpmInput = document.getElementById('bpmInput');
    const enqueueBtn = document.getElementById('enqueueBtn');
    const toggleOnlineBtn = document.getElementById('toggleOnlineBtn');
    const processQueueBtn = document.getElementById('processQueueBtn');
    const queueList = document.getElementById('queueList');
    const onlineBadge = document.getElementById('onlineBadge');

    function renderQueue() {
      if (!queueList) return;
      const q = syncQueue.getQueue();
      queueList.innerHTML = q.map(item => `
        <div class="queue-item">
          <div>
            <strong>${item.data.track || 'Track'}</strong> (BPM: ${item.data.bpm || 120})
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8;">
            ID: ${item.id} | Clock: ${JSON.stringify(item.clock)}
          </div>
        </div>
      `).join('') || '<div style="color: #64748b; padding: 1rem;">Queue is empty</div>';

      if (onlineBadge) {
        onlineBadge.textContent = syncQueue.isOnline ? 'ONLINE' : 'OFFLINE';
        onlineBadge.className = `status-badge ${syncQueue.isOnline ? 'online' : 'offline'}`;
      }
    }

    if (enqueueBtn && trackNameInput && bpmInput) {
      enqueueBtn.addEventListener('click', () => {
        const track = trackNameInput.value.trim() || 'Synth Lead';
        const bpm = Number(bpmInput.value) || 120;
        syncQueue.enqueue({ track, bpm, action: 'TRACK_MODIFIED' });
        trackNameInput.value = '';
        renderQueue();
      });
    }

    if (toggleOnlineBtn) {
      toggleOnlineBtn.addEventListener('click', () => {
        syncQueue.setOnlineStatus(!syncQueue.isOnline);
        renderQueue();
      });
    }

    if (processQueueBtn) {
      processQueueBtn.addEventListener('click', async () => {
        await syncQueue.processQueue(async (item) => {
          await new Promise(r => setTimeout(r, 50));
        });
        renderQueue();
      });
    }

    renderQueue();
  });
}
