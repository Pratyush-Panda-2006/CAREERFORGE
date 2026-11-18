/**
 * Aerospace Orbiter - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Issue #803 - NSoC '26 Level 3 Feature
 */

export class AerospaceOrbiterSyncQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'aerospace-orbiter_sync_queue_v1';
    this.nodeId = options.nodeId || 'orbiter-node-' + Math.random().toString(36).substring(2, 6);
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
    } catch {
      // Storage unavailable or quota exceeded
    }
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

  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  getPendingCount() {
    return this.queue.length;
  }

  getQueue() {
    return [...this.queue];
  }

  calculateBackoff(retries) {
    return this.baseBackoffMs * Math.pow(2, retries);
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
  }

  resolveConflict(local, remote) {
    const localClocks = local.clock || {};
    const remoteClocks = remote.clock || {};

    let localGreater = false;
    let remoteGreater = false;

    const allKeys = new Set([...Object.keys(localClocks), ...Object.keys(remoteClocks)]);
    for (const key of allKeys) {
      const l = localClocks[key] || 0;
      const r = remoteClocks[key] || 0;
      if (l > r) localGreater = true;
      if (r > l) remoteGreater = true;
    }

    if (localGreater && !remoteGreater) {
      return { winner: 'local', resolution: 'Vector clock dominance' };
    }
    if (remoteGreater && !localGreater) {
      return { winner: 'remote', resolution: 'Vector clock dominance' };
    }

    // Concurrent: Fallback to Last-Write-Wins (LWW) timestamp tie-breaker
    const localTs = local.timestamp || 0;
    const remoteTs = remote.timestamp || 0;
    if (localTs >= remoteTs) {
      return { winner: 'local', resolution: 'LWW timestamp tie-breaker' };
    }
    return { winner: 'remote', resolution: 'LWW timestamp tie-breaker' };
  }

  async flushQueue(syncHandler = null) {
    if (!this.isOnline) {
      return { flushed: 0, remaining: this.queue.length, reason: 'Offline' };
    }

    const defaultSync = async (item) => ({ ok: true, syncedAt: Date.now(), id: item.id });
    const syncFn = syncHandler || defaultSync;

    let flushedCount = 0;
    const remainingQueue = [];

    for (const item of this.queue) {
      try {
        const res = await syncFn(item);
        if (res && res.ok) {
          flushedCount++;
        } else {
          item.retries++;
          remainingQueue.push(item);
        }
      } catch {
        item.retries++;
        remainingQueue.push(item);
      }
    }

    this.queue = remainingQueue;
    this.saveQueue();

    return {
      flushed: flushedCount,
      remaining: this.queue.length,
      reason: 'Success'
    };
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.AerospaceOrbiterSyncQueue = AerospaceOrbiterSyncQueue;

  document.addEventListener('DOMContentLoaded', () => {
    const queue = new AerospaceOrbiterSyncQueue();
    const syncBtn = document.getElementById('sync-now-btn');
    const statusBadge = document.getElementById('connection-status-badge');
    const queueCountEl = document.getElementById('queue-count');

    function updateView() {
      if (queueCountEl) queueCountEl.textContent = queue.getPendingCount();
      if (statusBadge) {
        statusBadge.textContent = queue.isOnline ? 'Online (Telemetry Linked)' : 'Offline (Buffering)';
        statusBadge.className = 'status-badge ' + (queue.isOnline ? 'online' : 'offline');
      }
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.textContent = 'Syncing...';
        await queue.flushQueue();
        updateView();
        syncBtn.textContent = 'Sync Now';
      });
    }

    updateView();
  });
}
