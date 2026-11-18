/**
 * SaaS Launchpad - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Issue #735 - NSoC '26 Level 3 Feature
 */

export class SaasLaunchpadOfflineQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'saas_launchpad_offline_queue_v1';
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : new MemoryStorage());
    this.isOnline = options.initialOnline !== undefined ? options.initialOnline : true;
    this.queue = [];
    this.history = [];
    this.hydrate();
  }

  hydrate() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
        this.history = Array.isArray(parsed.history) ? parsed.history : [];
      }
    } catch {
      this.queue = [];
      this.history = [];
    }
  }

  persist() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify({
        queue: this.queue,
        history: this.history
      }));
    } catch {
      // Storage quota or restriction fallback
    }
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
    return this.isOnline;
  }

  enqueue(action, payload = {}) {
    const operation = {
      id: `SAAS-OP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    this.queue.push(operation);
    this.persist();
    return operation;
  }

  resolveConflict(localOp, serverState) {
    // Last-Write-Wins (LWW) conflict strategy
    if (!serverState) {
      return { resolved: true, winner: 'local', state: localOp.payload };
    }
    const localTime = localOp.timestamp || 0;
    const serverTime = serverState.timestamp || 0;

    if (localTime >= serverTime) {
      return {
        resolved: true,
        winner: 'local',
        state: { ...serverState, ...localOp.payload, version: (serverState.version || 1) + 1 }
      };
    } else {
      return {
        resolved: true,
        winner: 'server',
        state: serverState
      };
    }
  }

  async processQueue(mockExecutor = null) {
    if (!this.isOnline || this.queue.length === 0) {
      return { processed: 0, remaining: this.queue.length };
    }

    const executor = mockExecutor || (async (op) => {
      return { success: true, serverSyncedAt: Date.now() };
    });

    const pending = [...this.queue];
    const remaining = [];
    let processedCount = 0;

    for (const op of pending) {
      try {
        const res = await executor(op);
        if (res && res.success) {
          op.status = 'synced';
          op.syncedAt = Date.now();
          this.history.unshift(op);
          processedCount++;
        } else {
          op.retryCount++;
          remaining.push(op);
        }
      } catch {
        op.retryCount++;
        remaining.push(op);
      }
    }

    this.queue = remaining;
    this.persist();
    return { processed: processedCount, remaining: this.queue.length };
  }

  clearAll() {
    this.queue = [];
    this.history = [];
    this.persist();
  }

  getMetrics() {
    return {
      pendingCount: this.queue.length,
      historyCount: this.history.length,
      isOnline: this.isOnline
    };
  }
}

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.SaasLaunchpadOfflineQueue = SaasLaunchpadOfflineQueue;

  document.addEventListener('DOMContentLoaded', () => {
    const queueEngine = new SaasLaunchpadOfflineQueue();
    const onlineToggle = document.getElementById('network-status-toggle');
    const queueList = document.getElementById('queue-items-list');
    const historyList = document.getElementById('history-items-list');
    const addItemBtn = document.getElementById('enqueue-item-btn');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const actionSelect = document.getElementById('action-select');
    const pendingCountBadge = document.getElementById('pending-count-badge');

    const updateUI = () => {
      const metrics = queueEngine.getMetrics();
      if (pendingCountBadge) pendingCountBadge.textContent = `${metrics.pendingCount} pending`;
      if (onlineToggle) onlineToggle.checked = metrics.isOnline;

      if (queueList) {
        if (queueEngine.queue.length === 0) {
          queueList.innerHTML = '<li class="empty-item">Queue is empty. All operations synced!</li>';
        } else {
          queueList.innerHTML = queueEngine.queue.map(op => `
            <li class="queue-item">
              <span class="op-action">${op.action}</span>
              <span class="op-meta">${JSON.stringify(op.payload)}</span>
              <span class="op-status status-${op.status}">${op.status}</span>
            </li>
          `).join('');
        }
      }

      if (historyList) {
        if (queueEngine.history.length === 0) {
          historyList.innerHTML = '<li class="empty-item">No synced transaction history yet.</li>';
        } else {
          historyList.innerHTML = queueEngine.history.slice(0, 5).map(op => `
            <li class="history-item">
              <span>${op.action}: ${JSON.stringify(op.payload)}</span>
              <span class="synced-timestamp">${new Date(op.syncedAt).toLocaleTimeString()}</span>
            </li>
          `).join('');
        }
      }
    };

    if (onlineToggle) {
      onlineToggle.addEventListener('change', (e) => {
        queueEngine.setOnlineStatus(e.target.checked);
        updateUI();
      });
    }

    if (addItemBtn && actionSelect) {
      addItemBtn.addEventListener('click', () => {
        const action = actionSelect.value;
        queueEngine.enqueue(action, {
          tenantId: 'tenant_enterprise_beta',
          updatedBy: 'ops@saas-launchpad.io',
          configKey: 'MAX_SEATS',
          configVal: 50
        });
        updateUI();
      });
    }

    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        syncNowBtn.disabled = true;
        syncNowBtn.textContent = 'Syncing...';
        await queueEngine.processQueue();
        syncNowBtn.disabled = false;
        syncNowBtn.textContent = 'Trigger Sync';
        updateUI();
      });
    }

    updateUI();
  });
}
