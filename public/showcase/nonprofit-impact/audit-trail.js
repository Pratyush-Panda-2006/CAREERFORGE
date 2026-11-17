/**
 * Local unsigned audit demo. SHA-256 detects inconsistent links, not a full rewrite by
 * someone controlling storage. Retain a trusted head hash externally to detect valid
 * suffix truncation. No identity, timestamp authority or production audit claim is made.
 * Hash input: UTF-8 JSON of [1, sequence, timestamp, action, sorted-key payload, previousHash].
 * Use one instance per storage key. Appends/imports are serialized within that instance.
 */
const GENESIS = '0'.repeat(64);
const MAX_BYTES = 2_000_000;
const encoder = new TextEncoder();
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const actionName = (value) => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,80}$/.test(value);
const hashString = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

function canonical(value, depth = 0, seen = new WeakSet()) {
  if (depth > 8) throw new TypeError('Payload nesting is too deep.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || seen.has(value)) throw new TypeError('Use finite JSON data without cycles.');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError('Use plain JSON objects.');
  }
  const keys = Object.keys(value);
  if ((Array.isArray(value) && (value.length > 100 || keys.length !== value.length || keys.some((key, index) => key !== String(index)))) ||
      Object.getOwnPropertySymbols(value).length > 0 ||
      keys.length > 100 || keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) {
    throw new TypeError('Payload has too many or unsupported keys.');
  }
  seen.add(value);
  const result = Array.isArray(value)
    ? value.map((item) => canonical(item, depth + 1, seen))
    : Object.fromEntries(keys.sort().map((key) => [key, canonical(value[key], depth + 1, seen)]));
  seen.delete(value);
  return result;
}
function payloadCopy(payload) {
  if (!object(payload)) throw new TypeError('The payload must be a JSON object.');
  const copy = canonical(payload);
  if (encoder.encode(JSON.stringify(copy)).length > 4096) throw new RangeError('Payload exceeds 4 KiB.');
  return copy;
}
function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function decode(json, maxEvents) {
  if (typeof json !== 'string' || encoder.encode(json).length > MAX_BYTES) throw new RangeError('History file exceeds 2 MB.');
  const document = JSON.parse(json);
  if (!object(document) || Object.keys(document).sort().join(',') !== 'events,version' ||
      document.version !== 1 || !Array.isArray(document.events) || document.events.length > maxEvents) {
    throw new TypeError('Unsupported history format or event count.');
  }
  return document.events;
}

export class NonprofitImpactAuditChain {
  #events = [];
  #pending = Promise.resolve();
  #verified = false;
  #persistedRaw = null;

  constructor({ storage = null, storageKey = 'nonprofit-impact:audit:v1', cryptoProvider = globalThis.crypto,
    now = () => new Date().toISOString(), maxEvents = 500 } = {}) {
    if (!cryptoProvider?.subtle || typeof cryptoProvider.subtle.digest !== 'function' || typeof now !== 'function' ||
        !Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 500 ||
        (storage && (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function'))) {
      throw new TypeError('Web Crypto, valid storage and bounded history are required.');
    }
    Object.assign(this, { storage, storageKey, cryptoProvider, now, maxEvents });
    const raw = storage?.getItem(storageKey);
    this.#persistedRaw = raw ?? null;
    if (raw !== null && raw !== undefined) this.#events = decode(raw, maxEvents);
  }

  snapshot() { return structuredClone(this.#events); }
  exportJSON() { return JSON.stringify({ version: 1, events: this.snapshot() }); }

  async computeHash(block) {
    const keys = object(block) ? Object.keys(block).sort().join(',') : '';
    if (!['action,payload,previousHash,sequence,timestamp', 'action,hash,payload,previousHash,sequence,timestamp'].includes(keys) ||
        !Number.isSafeInteger(block.sequence) || block.sequence < 1 || !actionName(block.action) ||
        !validTimestamp(block.timestamp) || !hashString(block.previousHash)) {
      throw new TypeError('Invalid event structure.');
    }
    const input = JSON.stringify([1, block.sequence, block.timestamp, block.action, payloadCopy(block.payload), block.previousHash]);
    const digest = await this.cryptoProvider.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async verifyChainIntegrity(events = null, expectedHead = null) {
    if (events === null) {
      if (this.storage && this.storage.getItem(this.storageKey) !== this.#persistedRaw) {
        return { valid: false, index: null, reason: 'Stored history changed outside this instance. Reload before writing.' };
      }
      events = this.#events;
    }
    if (!Array.isArray(events) || events.length > this.maxEvents || (expectedHead !== null && !hashString(expectedHead))) {
      return { valid: false, index: null, reason: 'Invalid history bounds or expected head.' };
    }
    let previousHash = GENESIS;
    for (let index = 0; index < events.length; index++) {
      const block = events[index];
      if (!object(block) || block.sequence !== index + 1 || block.previousHash !== previousHash || !hashString(block.hash)) {
        return { valid: false, index, reason: 'Sequence or previous-hash link mismatch.' };
      }
      let computed;
      try { computed = await this.computeHash(block); }
      catch { return { valid: false, index, reason: 'Invalid event data or unavailable hashing.' }; }
      if (computed !== block.hash) return { valid: false, index, reason: 'Event hash mismatch.' };
      previousHash = block.hash;
    }
    if (expectedHead !== null && expectedHead !== previousHash) {
      return { valid: false, index: events.length, reason: 'History does not match the retained head hash.' };
    }
    return { valid: true, count: events.length, headHash: previousHash };
  }

  #serialize(task) {
    const pending = this.#pending.then(task);
    this.#pending = pending.catch(() => {});
    return pending;
  }

  #persist(events) {
    const json = JSON.stringify({ version: 1, events });
    if (encoder.encode(json).length > MAX_BYTES) throw new RangeError('History storage limit reached. Export before starting a new log.');
    if (this.storage && this.storage.getItem(this.storageKey) !== this.#persistedRaw) {
      throw new Error('Stored history changed outside this instance. Reload before writing.');
    }
    this.storage?.setItem(this.storageKey, json);
    this.#persistedRaw = json;
    this.#events = structuredClone(events);
    this.#verified = true;
  }

  recordEvent(action, payload) {
    if (!actionName(action)) throw new TypeError('Use a short event name with letters, digits, dots, colons or dashes.');
    const copy = payloadCopy(payload);
    return this.#serialize(async () => {
      if (!this.#verified) {
        const result = await this.verifyChainIntegrity();
        if (!result.valid) throw new Error('Saved history failed verification. It has not been overwritten.');
        this.#verified = true;
      }
      if (this.#events.length >= this.maxEvents) throw new RangeError('Event limit reached. Export this history first.');
      const block = { sequence: this.#events.length + 1, timestamp: this.now(), action, payload: copy,
        previousHash: this.#events.at(-1)?.hash || GENESIS };
      block.hash = await this.computeHash(block);
      this.#persist([...this.#events, block]);
      return structuredClone(block);
    });
  }

  importJSON(json, expectedHead = null) {
    const events = decode(json, this.maxEvents);
    return this.#serialize(async () => {
      const result = await this.verifyChainIntegrity(events, expectedHead);
      if (!result.valid) throw new Error(`Import rejected: ${result.reason}`);
      this.#persist(events);
      return result;
    });
  }
}

if (typeof document !== 'undefined' && document.querySelector('[data-audit-trail]')) {
  const form = document.querySelector('[data-event-form]');
  const feed = document.querySelector('[data-event-feed]');
  const filter = document.querySelector('[data-filter]');
  const badge = document.querySelector('[data-integrity]');
  const status = document.querySelector('[data-audit-status]');
  const file = document.querySelector('[data-import-file]');
  const importButton = document.querySelector('[data-import]');
  let chain;
  let selectedJSON = null;
  let selectionToken = 0;
  let pendingActions = 0;
  const announce = (message) => { status.textContent = message; };
  const render = () => {
    const events = chain.snapshot();
    const query = filter.value.toLowerCase().trim();
    feed.replaceChildren();
    for (const event of [...events].reverse()) {
      if (query && !`${event.action} ${JSON.stringify(event.payload)}`.toLowerCase().includes(query)) continue;
      const item = document.createElement('li');
      const title = document.createElement('h3');
      title.textContent = `#${event.sequence} · ${event.action}`;
      const time = document.createElement('time');
      time.dateTime = event.timestamp;
      time.textContent = new Date(event.timestamp).toLocaleString();
      const payload = document.createElement('pre');
      payload.textContent = JSON.stringify(event.payload, null, 2);
      const hash = document.createElement('code');
      hash.textContent = event.hash;
      hash.setAttribute('aria-label', `SHA-256 hash for event ${event.sequence}`);
      item.append(title, time, payload, hash);
      feed.appendChild(item);
    }
    document.querySelector('[data-event-count]').textContent = String(events.length);
    document.querySelector('[data-empty]').hidden = feed.children.length > 0;
  };
  const verify = async () => {
    const result = await chain.verifyChainIntegrity();
    badge.textContent = result.valid ? `Verified · ${result.count} events` : `Integrity failed at event ${(result.index ?? 0) + 1}`;
    badge.dataset.valid = String(result.valid);
    return result;
  };
  const busy = async (task) => {
    pendingActions += 1;
    for (const button of document.querySelectorAll('button')) button.disabled = true;
    try { await task(); render(); await verify(); }
    catch (error) { announce(error.message); }
    finally {
      pendingActions -= 1;
      if (pendingActions === 0) {
        for (const button of document.querySelectorAll('button')) button.disabled = false;
        importButton.disabled = selectedJSON === null;
      }
    }
  };
  try {
    chain = new NonprofitImpactAuditChain({ storage: window.localStorage });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void busy(async () => {
        const values = new FormData(form);
        await chain.recordEvent(values.get('action'), { note: values.get('note') });
        announce('Event saved with its hash link.');
      });
    });
    filter.addEventListener('input', render);
    document.querySelector('[data-verify]').addEventListener('click', () => {
      void busy(async () => { const result = await verify(); announce(result.valid ? 'All event links match.' : result.reason); });
    });
    document.querySelector('[data-export]').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([chain.exportJSON()], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'nonprofit-impact-audit.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    file.addEventListener('change', () => {
      const token = ++selectionToken;
      selectedJSON = null;
      void busy(async () => {
        const selected = file.files[0];
        if (!selected) return;
        if (selected.size > MAX_BYTES) throw new Error('Choose a JSON history smaller than 2 MB.');
        const json = await selected.text();
        if (token !== selectionToken) return;
        const events = decode(json, 500);
        const result = await chain.verifyChainIntegrity(events);
        if (!result.valid) throw new Error(`Selected file failed verification: ${result.reason}`);
        if (token !== selectionToken) return;
        selectedJSON = json;
        announce('Selected history verified. Import will replace the current local log.');
      });
    });
    importButton.addEventListener('click', () => {
      if (selectedJSON === null) return;
      void busy(async () => { await chain.importJSON(selectedJSON); announce('Verified history imported.'); });
    });
    render();
    void busy(async () => { const result = await verify(); if (!result.valid) announce('Stored history failed verification; appends are blocked.'); });
  } catch {
    announce('Saved history or Web Crypto is unavailable. Existing storage has not been overwritten.');
    for (const control of document.querySelectorAll('button, input, select')) control.disabled = true;
  }
}
