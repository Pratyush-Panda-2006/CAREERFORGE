/**
 * Legal Smart Contracts - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 * Buffers legal clause modifications, multi-sig approvals, and covenant updates with vector-clock reconciliation.
 */

export class LegalSmartContractsSyncQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'legal_contracts_offline_sync_v1';
    this.nodeId = options.nodeId || 'counsel-node-' + Math.floor(Math.random() * 1000);
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
      id: mutation.id || 'clause_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type: mutation.type || 'CLAUSE_AMENDMENT',
      contractId: mutation.contractId || 'CONTRACT-ESCROW-2026',
      payload: mutation.payload || {},
      timestamp: mutation.timestamp || Date.now(),
      clock,
      nodeId: this.nodeId,
      status: 'pending',
      retryCount: 0,
      nextRetryTime: 0
    };

    this.queue.push(entry);
    this.saveToStorage();
    this.notifyListeners({ type: 'ENQUEUED', entry });
    return entry;
  }

  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  getQueue() {
    return [...this.queue];
  }

  getPendingCount() {
    return this.queue.filter(item => item.status === 'pending').length;
  }

  calculateBackoff(retryCount) {
    const factor = Math.min(retryCount, 6);
    return this.baseBackoffMs * Math.pow(2, factor);
  }

  setOnlineStatus(online) {
    this.isOnline = Boolean(online);
    this.notifyListeners({ type: 'CONNECTIVITY_CHANGED', isOnline: this.isOnline });
  }

  resolveConflict(local, remote) {
    if (!local || !remote) return local || remote;

    const localClock = local.clock || {};
    const remoteClock = remote.clock || {};
    const allKeys = Array.from(new Set([...Object.keys(localClock), ...Object.keys(remoteClock)]));

    let localGreater = false;
    let remoteGreater = false;

    for (const key of allKeys) {
      const lVal = localClock[key] || 0;
      const rVal = remoteClock[key] || 0;
      if (lVal > rVal) localGreater = true;
      if (rVal > lVal) remoteGreater = true;
    }

    if (localGreater && !remoteGreater) {
      return { winner: 'local', item: local, reason: 'Vector clock dominant (local)' };
    }
    if (remoteGreater && !localGreater) {
      return { winner: 'remote', item: remote, reason: 'Vector clock dominant (remote)' };
    }

    const localTime = Number(local.timestamp) || 0;
    const remoteTime = Number(remote.timestamp) || 0;

    if (remoteTime > localTime) {
      return { winner: 'remote', item: remote, reason: 'Concurrent resolution (latest timestamp: remote)' };
    }
    return { winner: 'local', item: local, reason: 'Concurrent resolution (latest timestamp: local)' };
  }

  async flushQueue(cloudBackend = null) {
    if (!this.isOnline) {
      return { flushed: 0, pending: this.queue.length, reason: 'Offline' };
    }

    const defaultSimulator = async (entry) => {
      await new Promise(resolve => setTimeout(resolve, 25));
      return { ok: true, syncedAt: Date.now(), remoteClock: entry.clock };
    };

    const syncFn = cloudBackend || defaultSimulator;
    const remainingQueue = [];
    const syncedItems = [];

    for (const entry of this.queue) {
      try {
        const res = await syncFn(entry);
        if (res && res.ok) {
          entry.status = 'synced';
          entry.syncedAt = res.syncedAt || Date.now();
          syncedItems.push(entry);
        } else {
          entry.retryCount = (entry.retryCount || 0) + 1;
          entry.nextRetryTime = Date.now() + this.calculateBackoff(entry.retryCount);
          if (entry.retryCount >= this.maxRetries) entry.status = 'failed';
          remainingQueue.push(entry);
        }
      } catch {
        entry.retryCount = (entry.retryCount || 0) + 1;
        entry.nextRetryTime = Date.now() + this.calculateBackoff(entry.retryCount);
        if (entry.retryCount >= this.maxRetries) entry.status = 'failed';
        remainingQueue.push(entry);
      }
    }

    this.queue = remainingQueue;
    this.saveToStorage();
    this.notifyListeners({ type: 'FLUSH_COMPLETE', synced: syncedItems, remaining: this.queue });
    return {
      flushed: syncedItems.length,
      pending: this.queue.length,
      synced: syncedItems
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners({ type: 'QUEUE_CLEARED' });
  }

  subscribe(listener) {
    if (typeof listener === 'function') this.listeners.push(listener);
  }

  notifyListeners(event) {
    for (const fn of this.listeners) {
      try { fn(event); } catch { /* Safe */ }
    }
  }
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('queueTableBody');
    if (!tableBody) return;

    const queueEngine = new LegalSmartContractsSyncQueue();

    const statusBadge = document.getElementById('connectionStatusBadge');
    const pendingCountBadge = document.getElementById('pendingCountBadge');
    const toggleOnlineBtn = document.getElementById('toggleOnlineBtn');
    const syncNowBtn = document.getElementById('syncNowBtn');
    const addClauseBtn = document.getElementById('addClauseBtn');
    const clearQueueBtn = document.getElementById('clearQueueBtn');
    const logConsole = document.getElementById('syncLogConsole');

    function log(msg) {
      if (!logConsole) return;
      const line = document.createElement('div');
      line.className = 'log-line';
      const time = new Date().toLocaleTimeString();
      line.textContent = `[${time}] ${msg}`;
      logConsole.prepend(line);
    }

    function updateUI() {
      if (statusBadge) {
        statusBadge.textContent = queueEngine.isOnline ? 'ONLINE (Consensus Node Connected)' : 'OFFLINE (Air-Gapped Vault)';
        statusBadge.className = `status-badge ${queueEngine.isOnline ? 'status-online' : 'status-offline'}`;
      }

      if (pendingCountBadge) {
        const count = queueEngine.getPendingCount();
        pendingCountBadge.textContent = `${count} pending`;
        pendingCountBadge.className = `counter-badge ${count > 0 ? 'badge-warning' : 'badge-idle'}`;
      }

      renderTable();
    }

    function renderTable() {
      tableBody.replaceChildren();
      const items = queueEngine.getQueue();

      if (items.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'empty-notice';
        td.textContent = 'Smart contract queue is synchronized. No pending covenant or multi-sig amendments.';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
      }

      for (const item of items) {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.className = 'cell-mono';
        tdId.textContent = item.id;

        const tdType = document.createElement('td');
        tdType.textContent = item.type;

        const tdContract = document.createElement('td');
        tdContract.textContent = item.contractId;

        const tdClock = document.createElement('td');
        tdClock.className = 'cell-mono';
        tdClock.textContent = JSON.stringify(item.clock);

        const tdRetries = document.createElement('td');
        tdRetries.textContent = `${item.retryCount} / ${queueEngine.maxRetries}`;

        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `chip-status chip-${item.status}`;
        badge.textContent = item.status.toUpperCase();
        tdStatus.appendChild(badge);

        tr.append(tdId, tdType, tdContract, tdClock, tdRetries, tdStatus);
        tableBody.appendChild(tr);
      }
    }

    if (toggleOnlineBtn) {
      toggleOnlineBtn.addEventListener('click', () => {
        queueEngine.setOnlineStatus(!queueEngine.isOnline);
        log(`Relay status toggled to: ${queueEngine.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        updateUI();
      });
    }

    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        syncNowBtn.disabled = true;
        log('Submitting buffered smart contract mutations to blockchain consensus...');
        const res = await queueEngine.flushQueue();
        log(`Consensus sync complete: ${res.flushed} committed, ${res.pending} pending.`);
        updateUI();
        syncNowBtn.disabled = false;
      });
    }

    if (addClauseBtn) {
      addClauseBtn.addEventListener('click', () => {
        const contracts = ['ESCROW-VAL-401', 'ARBITRATION-DAO-99', 'LIQUIDITY-VAULT-77', 'COVENANT-DEED-12'];
        const randomContract = contracts[Math.floor(Math.random() * contracts.length)];
        const clauseNum = Math.floor(Math.random() * 20) + 1;

        const mutation = queueEngine.enqueue({
          type: 'MULTI_SIG_SIGNATURE',
          contractId: randomContract,
          payload: { clause: `Clause #${clauseNum}`, authorizedSigner: '0x71C...B29', gasLimit: 250000 }
        });
        log(`Enqueued signature on ${randomContract} [Mutation: ${mutation.id}, Clause #${clauseNum}]`);
        updateUI();
      });
    }

    if (clearQueueBtn) {
      clearQueueBtn.addEventListener('click', () => {
        queueEngine.clearQueue();
        log('Local contract queue cleared.');
        updateUI();
      });
    }

    queueEngine.subscribe(() => updateUI());
    updateUI();
    log('Legal Smart Contracts Offline Sync Module active.');
  });
}
