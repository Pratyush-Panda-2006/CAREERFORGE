/**
 * Health Vitality - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Issue #763 - NSoC '26 Level 3 Feature
 */

export class HealthVitalitySyncQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'health_vitality_offline_sync_v1';
    this.nodeId = options.nodeId || 'client-node-' + Math.floor(Math.random() * 1000);
    this.vectorClock = options.initialClock || { [this.nodeId]: 0 };
    this.isOnline = options.initialOnline !== undefined ? options.initialOnline : true;
    this.maxRetries = options.maxRetries || 3;
    this.baseBackoffMs = options.baseBackoffMs || 500;
    this.queue = [];
    this.listeners = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.queue)) this.queue = parsed.queue;
        if (parsed.vectorClock && typeof parsed.vectorClock === 'object') this.vectorClock = parsed.vectorClock;
      }
    } catch {
      this.queue = [];
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        queue: this.queue,
        vectorClock: this.vectorClock,
        lastUpdated: Date.now()
      }));
    } catch {
      // Storage restriction
    }
  }

  incrementClock() {
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1;
    return { ...this.vectorClock };
  }

  enqueue(mutation) {
    if (!mutation || typeof mutation !== 'object') {
      throw new Error('Mutation must be a valid object');
    }

    const clock = this.incrementClock();
    const entry = {
      id: mutation.id || 'vital_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type: mutation.type || 'VITALS_MUTATION',
      patientId: mutation.patientId || 'PATIENT-001',
      payload: mutation.payload || {},
      vectorClock: clock,
      timestamp: Date.now(),
      status: 'PENDING',
      attempts: 0
    };

    this.queue.push(entry);
    this.saveToStorage();
    this.notifyListeners();
    return entry;
  }

  resolveConflict(local, remote) {
    if (!local || !remote) return local || remote;

    // Vector clock dominance check
    const localClock = local.vectorClock || {};
    const remoteClock = remote.vectorClock || {};

    let localDominates = false;
    let remoteDominates = false;

    const allNodes = new Set([...Object.keys(localClock), ...Object.keys(remoteClock)]);
    for (const node of allNodes) {
      const l = localClock[node] || 0;
      const r = remoteClock[node] || 0;
      if (l > r) localDominates = true;
      if (r > l) remoteDominates = true;
    }

    if (remoteDominates && !localDominates) {
      return remote;
    }
    if (localDominates && !remoteDominates) {
      return local;
    }

    // Concurrent: Fallback to Last-Write-Wins (LWW) via timestamp
    return (remote.timestamp || 0) >= (local.timestamp || 0) ? remote : local;
  }

  async flushQueue(syncHandler = null) {
    if (!this.isOnline || this.queue.length === 0) {
      return { syncedCount: 0, failedCount: 0, remaining: this.queue.length };
    }

    const handler = syncHandler || (async (item) => ({ success: true, serverAck: Date.now() }));
    const remainingQueue = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of this.queue) {
      try {
        item.attempts += 1;
        const result = await handler(item);
        if (result && result.success) {
          syncedCount++;
        } else {
          throw new Error('Sync unacknowledged');
        }
      } catch {
        if (item.attempts < this.maxRetries) {
          item.status = 'RETRYING';
          remainingQueue.push(item);
        } else {
          item.status = 'FAILED';
          failedCount++;
        }
      }
    }

    this.queue = remainingQueue;
    this.saveToStorage();
    this.notifyListeners();
    return { syncedCount, failedCount, remaining: this.queue.length };
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
    this.notifyListeners();
    return this.isOnline;
  }

  getPendingQueue() {
    return [...this.queue];
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
    return () => {};
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener({
          isOnline: this.isOnline,
          queueLength: this.queue.length,
          queue: this.getPendingQueue()
        });
      } catch (err) {
        console.error('Sync queue listener error:', err);
      }
    }
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.HealthVitalitySyncQueue = HealthVitalitySyncQueue;

  document.addEventListener('DOMContentLoaded', () => {
    const syncQueue = new HealthVitalitySyncQueue();
    const statusPill = document.getElementById('connection-status');
    const queueList = document.getElementById('queue-items');
    const syncBtn = document.getElementById('sync-now-btn');
    const toggleNetBtn = document.getElementById('toggle-network-btn');
    const addVitalsBtn = document.getElementById('add-vital-btn');

    const render = () => {
      if (statusPill) {
        statusPill.className = `status-pill ${syncQueue.isOnline ? 'online' : 'offline'}`;
        statusPill.textContent = syncQueue.isOnline ? '● Online (Cloud Synced)' : '○ Offline (Buffering Mutations)';
      }

      if (queueList) {
        queueList.innerHTML = '';
        syncQueue.getPendingQueue().forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${item.id.slice(0, 12)}</code></td>
            <td>${item.type}</td>
            <td><span class="badge ${item.status.toLowerCase()}">${item.status}</span></td>
            <td>Attempt ${item.attempts}</td>
          `;
          queueList.appendChild(tr);
        });
      }
    };

    syncQueue.subscribe(render);
    render();

    if (toggleNetBtn) {
      toggleNetBtn.addEventListener('click', () => {
        syncQueue.setOnlineStatus(!syncQueue.isOnline);
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        await syncQueue.flushQueue();
        syncBtn.disabled = false;
      });
    }

    if (addVitalsBtn) {
      addVitalsBtn.addEventListener('click', () => {
        syncQueue.enqueue({
          type: 'HEART_RATE_MEASUREMENT',
          patientId: 'PATIENT-001',
          payload: { bpm: 75, recordedAt: new Date().toISOString() }
        });
      });
    }
  });
}
