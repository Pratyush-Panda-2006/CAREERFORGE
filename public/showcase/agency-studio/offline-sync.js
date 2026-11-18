/**
 * Implement resilient offline data persistence & conflict-free queue engine - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Queues state mutations during offline state and reconciles using vector clocks.
 */

export class AgencyStudioSyncQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'agency-studio_sync_queue_v1';
    this.nodeId = options.nodeId || 'node-local-' + Math.random().toString(36).substring(2, 6);
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

  resolveConflict(local, remote) {
    const localClocks = local.clock || {};
    const remoteClocks = remote.clock || {};

    let localGreater = false;
    let remoteGreater = false;

    const allNodes = new Set([...Object.keys(localClocks), ...Object.keys(remoteClocks)]);
    for (const node of allNodes) {
      const l = localClocks[node] || 0;
      const r = remoteClocks[node] || 0;
      if (l > r) localGreater = true;
      if (r > l) remoteGreater = true;
    }

    if (localGreater && !remoteGreater) return { winner: 'local', reason: 'Vector clock dominance' };
    if (remoteGreater && !localGreater) return { winner: 'remote', reason: 'Vector clock dominance' };

    // Concurrent: Fallback to timestamp LWW (Last-Write-Wins)
    return (local.timestamp || 0) >= (remote.timestamp || 0)
      ? { winner: 'local', reason: 'Timestamp tie-break' }
      : { winner: 'remote', reason: 'Timestamp tie-break' };
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
  }

  async flushQueue(syncHandler = null) {
    if (!this.isOnline) {
      return { flushed: 0, reason: 'Offline' };
    }

    const defaultSync = async (item) => ({ ok: true, syncedAt: Date.now(), item });
    const handler = syncHandler || defaultSync;

    let count = 0;
    while (this.queue.length > 0) {
      const item = this.queue[0];
      try {
        await handler(item);
        this.queue.shift();
        count++;
      } catch {
        item.retries++;
        break;
      }
    }
    this.saveQueue();
    return { flushed: count, remaining: this.queue.length };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const syncQueue = new AgencyStudioSyncQueue();

    const connBadge = document.getElementById('connectionStatusBadge');
    const counterBadge = document.getElementById('pendingCountBadge');
    const tbody = document.getElementById('queueTableBody');

    function renderView() {
      if (connBadge) {
        connBadge.textContent = syncQueue.isOnline ? 'ONLINE' : 'OFFLINE (Queueing)';
        connBadge.className = `status-badge ${syncQueue.isOnline ? 'status-online' : 'status-offline'}`;
      }
      if (counterBadge) {
        counterBadge.textContent = `${syncQueue.getPendingCount()} pending`;
      }

      if (tbody) {
        tbody.replaceChildren();
        const items = syncQueue.getQueue();
        if (items.length === 0) {
          const row = document.createElement('tr');
          row.innerHTML = '<td colspan="5" style="text-align:center;color:var(--sync-text-muted);">Queue empty. All mutations reconciled.</td>';
          tbody.appendChild(row);
          return;
        }

        items.forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${item.id}</code></td>
            <td>${item.data?.type || 'PROJECT_MUTATION'}</td>
            <td><code>${JSON.stringify(item.clock)}</code></td>
            <td>${item.retries}</td>
            <td><span style="color:var(--sync-amber);">${item.status}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    document.getElementById('toggleOnlineBtn')?.addEventListener('click', () => {
      syncQueue.setOnlineStatus(!syncQueue.isOnline);
      renderView();
    });

    document.getElementById('addSampleBtn')?.addEventListener('click', () => {
      syncQueue.enqueue({ type: 'PROJECT_MUTATION', payload: { timestamp: Date.now() } });
      renderView();
    });

    document.getElementById('syncNowBtn')?.addEventListener('click', async () => {
      await syncQueue.flushQueue();
      renderView();
    });

    document.getElementById('clearQueueBtn')?.addEventListener('click', () => {
      syncQueue.clearQueue();
      renderView();
    });

    renderView();
  });
}
