/**
 * Standalone, single-instance-per-storage-key demo queue. No production endpoint is used.
 * send(operation) must be idempotent by operation.id and return { id, record }.
 * The acknowledged record clock must include the operation's clock. A failed delivery
 * or acknowledgement stays queued; callers may retry flushQueue after nextRetryAt.
 * Vector clocks retain causal context; values keep their original Lamport stamp.
 * Concurrent values use a stable stamp/writer/value order, so merges also associate.
 */
const KEY = 'nonprofit-impact:offline-sync:v1';
const safeKey = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value) &&
  !['__proto__', 'constructor', 'prototype'].includes(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => structuredClone(value);

function validClock(clock) {
  return object(clock) && Object.keys(clock).length > 0 && Object.keys(clock).length <= 64 &&
    Object.entries(clock).every(([actor, value]) => safeKey(actor) && Number.isSafeInteger(value) && value >= 0);
}

function validRecord(record) {
  return object(record) && safeKey(record.id) && safeKey(record.writer) &&
    typeof record.value === 'string' && record.value.length <= 200 && validClock(record.clock) &&
    Number.isSafeInteger(record.stamp) && record.stamp > 0 && record.clock[record.writer] === record.stamp &&
    Object.values(record.clock).every((count) => count <= record.stamp);
}

function dominates(left, right) {
  return Object.entries(right).every(([actor, count]) => (left[actor] || 0) >= count);
}

function assertSnapshot(state) {
  if (!object(state) || state.version !== 1 || !safeKey(state.clientId) ||
      !Number.isSafeInteger(state.sequence) || state.sequence < 0 || !object(state.records) ||
      Object.keys(state.records).length > 200 || !Array.isArray(state.queue) || state.queue.length > 100 ||
      !Object.entries(state.records).every(([id, record]) => id === record.id && validRecord(record))) {
    throw new Error('Invalid saved queue. Existing storage has not been overwritten.');
  }
  const ids = new Set();
  let previousSequence = 0;
  for (const operation of state.queue) {
    if (!object(operation) || !validRecord(operation.record) ||
        operation.record.writer !== state.clientId || !state.records[operation.record.id] ||
        !dominates(state.records[operation.record.id].clock, operation.record.clock) ||
        !Number.isSafeInteger(operation.sequence) || operation.sequence <= previousSequence || operation.sequence > state.sequence ||
        operation.id !== `${state.clientId}:${operation.sequence}` || ids.has(operation.id) ||
        !Number.isSafeInteger(operation.attempts) || operation.attempts < 0 ||
        !Number.isFinite(operation.nextAttemptAt) || operation.nextAttemptAt < 0) {
      throw new Error('Invalid saved operation. Existing storage has not been overwritten.');
    }
    ids.add(operation.id);
    previousSequence = operation.sequence;
  }
}

export class NonprofitImpactSyncQueue {
  constructor({ storage, send, clientId = 'local-demo', storageKey = KEY,
    now = Date.now, isOnline = () => true, baseDelayMs = 1000, maxDelayMs = 60000 }) {
    if (!safeKey(clientId) || typeof send !== 'function' || !storage ||
        !Number.isSafeInteger(baseDelayMs) || baseDelayMs < 1 ||
        !Number.isSafeInteger(maxDelayMs) || maxDelayMs < baseDelayMs) {
      throw new TypeError('A storage adapter, sender, client ID and valid retry bounds are required.');
    }
    this.storage = storage;
    this.storageKey = storageKey;
    this.send = send;
    this.now = now;
    this.isOnline = isOnline;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.inFlight = null;
    const raw = storage.getItem(storageKey);
    this.state = raw === null ? { version: 1, clientId, sequence: 0, records: {}, queue: [] } : JSON.parse(raw);
    assertSnapshot(this.state);
  }

  persist(next) {
    assertSnapshot(next);
    // Commit before exposing success, so quota/privacy failures never silently discard work.
    this.storage.setItem(this.storageKey, JSON.stringify(next));
    this.state = clone(next);
  }

  snapshot() { return clone(this.state); }

  enqueue({ recordId, value }) {
    if (!safeKey(recordId) || typeof value !== 'string' || !value.trim() || value.length > 200) {
      throw new TypeError('Use a short record ID and a nonempty value of at most 200 characters.');
    }
    if (this.state.queue.length >= 100) throw new Error('Queue full. Sync pending work before adding more.');
    const next = this.snapshot();
    const clock = { ...(next.records[recordId]?.clock || {}) };
    const count = Math.max(0, ...Object.values(clock)) + 1;
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(next.sequence + 1)) throw new Error('Clock limit reached.');
    clock[next.clientId] = count;
    const record = { id: recordId, value: value.trim(), writer: next.clientId, stamp: count, clock };
    const operation = { id: `${next.clientId}:${++next.sequence}`, sequence: next.sequence,
      record, attempts: 0, nextAttemptAt: 0 };
    next.records[recordId] = record;
    next.queue.push(operation);
    this.persist(next);
    return clone(operation);
  }

  resolveConflict(local, remote) {
    if (!validRecord(local) || !validRecord(remote) || local.id !== remote.id) {
      throw new TypeError('Conflict resolution requires valid versions of the same record.');
    }
    let winner;
    if (local.stamp > remote.stamp) winner = local;
    else if (remote.stamp > local.stamp) winner = remote;
    else {
      // Code-unit ordering is independent of browser locale; equal clocks are deterministic too.
      winner = JSON.stringify([local.writer, local.value]) >= JSON.stringify([remote.writer, remote.value]) ? local : remote;
    }
    const actors = [...new Set([...Object.keys(local.clock), ...Object.keys(remote.clock)])].sort();
    const clock = Object.fromEntries(actors.map((actor) => [actor, Math.max(local.clock[actor] || 0, remote.clock[actor] || 0)]));
    return { id: winner.id, value: winner.value, writer: winner.writer, stamp: winner.stamp, clock };
  }

  flushQueue() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.flush().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async flush() {
    let sent = 0;
    while (this.state.queue.length && this.isOnline()) {
      const operation = clone(this.state.queue[0]);
      if (operation.nextAttemptAt > this.now()) break;
      let acknowledgement;
      try {
        acknowledgement = await this.send(clone(operation));
        if (!object(acknowledgement) || acknowledgement.id !== operation.id ||
            !validRecord(acknowledgement.record) || acknowledgement.record.id !== operation.record.id ||
            !dominates(acknowledgement.record.clock, operation.record.clock)) {
          throw new Error('Invalid acknowledgement');
        }
      } catch {
        const next = this.snapshot();
        const head = next.queue[0];
        head.attempts += 1;
        const delay = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** Math.min(head.attempts - 1, 20));
        head.nextAttemptAt = this.now() + delay;
        this.persist(next);
        break;
      }
      // Read current state after await: edits enqueued during delivery must survive the acknowledgement.
      const next = this.snapshot();
      next.records[operation.record.id] = this.resolveConflict(next.records[operation.record.id], acknowledgement.record);
      next.queue.shift();
      this.persist(next);
      sent += 1;
    }
    return { sent, pending: this.state.queue.length, nextRetryAt: this.state.queue[0]?.nextAttemptAt || 0 };
  }
}

if (typeof document !== 'undefined' && document.querySelector('[data-offline-sync]')) {
  const form = document.querySelector('[data-edit-form]');
  const table = document.querySelector('[data-queue-rows]');
  const records = document.querySelector('[data-records]');
  const status = document.querySelector('[data-sync-status]');
  const connection = document.querySelector('[data-connection]');
  const pause = document.querySelector('[data-pause-network]');
  const fail = document.querySelector('[data-fail-next]');
  const sync = document.querySelector('[data-sync-now]');
  let queue;
  let timer;
  let cloud = {};
  const cloudKey = 'nonprofit-impact:offline-demo-cloud:v1';
  const online = () => navigator.onLine && !pause.checked;
  const announce = (text) => { if (status.textContent !== text) status.textContent = text; };
  const render = () => {
    const state = queue.snapshot();
    connection.textContent = online() ? 'Online · simulated cloud' : 'Offline · edits stay on this device';
    connection.dataset.online = String(online());
    table.replaceChildren();
    for (const operation of state.queue) {
      const row = document.createElement('tr');
      const retry = operation.nextAttemptAt > Date.now()
        ? `Retry in ${Math.ceil((operation.nextAttemptAt - Date.now()) / 1000)}s`
        : operation.attempts ? 'Retry ready' : 'Pending';
      for (const value of [operation.record.id, operation.record.value, String(operation.attempts), retry]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    document.querySelector('[data-pending-count]').textContent = String(state.queue.length);
    records.replaceChildren();
    for (const record of Object.values(state.records)) {
      const item = document.createElement('li');
      item.textContent = `${record.id}: ${record.value}`;
      records.appendChild(item);
    }
    sync.disabled = !online() || state.queue.length === 0 || Boolean(queue.inFlight);
  };
  const flush = async () => {
    if (!queue) return;
    try {
      sync.disabled = true;
      const result = await queue.flushQueue();
      if (result.sent) announce(`${result.sent} edit(s) acknowledged by the simulated cloud.`);
      else if (result.pending && online()) announce('Edits remain queued; retry backoff is respected.');
    } catch {
      announce('Unable to persist sync progress. Pending work is retained; check device storage.');
    }
    render();
  };
  try {
    const storage = window.localStorage;
    pause.checked = storage.getItem('nonprofit-impact:offline-demo-paused') === 'true';
    cloud = JSON.parse(storage.getItem(cloudKey) || '{}');
    if (!object(cloud) || !Object.entries(cloud).every(([id, record]) => id === record.id && validRecord(record))) throw new Error('Invalid demo cloud');
    queue = new NonprofitImpactSyncQueue({ storage, isOnline: online, send: async (operation) => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (!online() || fail.checked) {
        fail.checked = false;
        throw new Error('Simulated delivery failure');
      }
      const remote = cloud[operation.record.id];
      const record = remote ? queue.resolveConflict(operation.record, remote) : operation.record;
      const nextCloud = { ...cloud, [record.id]: record };
      storage.setItem(cloudKey, JSON.stringify(nextCloud));
      cloud = nextCloud;
      return { id: operation.id, record };
    } });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const values = new FormData(form);
        queue.enqueue({ recordId: values.get('recordId'), value: values.get('value') });
        announce('Edit saved on this device.');
        render();
      } catch (error) { announce(error.message); }
    });
    document.querySelector('[data-remote-edit]').addEventListener('click', () => {
      try {
        const id = new FormData(form).get('recordId');
        if (!safeKey(id)) throw new Error('Enter a valid record ID first.');
        const clock = { ...(cloud[id]?.clock || {}) };
        clock.cloud = Math.max(0, ...Object.values(clock)) + 1;
        const record = { id, value: 'Cloud volunteer plan', writer: 'cloud', stamp: clock.cloud, clock };
        if (!validRecord(record)) throw new Error('Clock limit reached');
        const nextCloud = { ...cloud, [id]: record };
        storage.setItem(cloudKey, JSON.stringify(nextCloud));
        cloud = nextCloud;
        announce('A simulated cloud edit is ready for reconciliation.');
      } catch { announce('Unable to save the simulated cloud edit.'); }
    });
    sync.addEventListener('click', flush);
    pause.addEventListener('change', () => {
      try { storage.setItem('nonprofit-impact:offline-demo-paused', String(pause.checked)); }
      catch { announce('The offline demo setting could not be saved.'); }
      render();
      if (online()) void flush();
    });
    window.addEventListener('online', flush);
    window.addEventListener('offline', render);
    timer = setInterval(() => { if (online()) void flush(); else render(); }, 1000);
    window.addEventListener('pagehide', (event) => { if (!event.persisted) clearInterval(timer); });
    render();
  } catch {
    announce('Saved data could not be loaded. It has not been overwritten. Check browser storage before retrying.');
    for (const control of document.querySelectorAll('button, input')) control.disabled = true;
  }
}
