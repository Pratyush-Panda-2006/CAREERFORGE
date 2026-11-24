export const HEARTBEAT_PING = '__quantum_ping__', HEARTBEAT_PONG = '__quantum_pong__';
export class QuantumForgeResilientSocket {
  constructor(url, { factory = address => new WebSocket(address), clock = () => performance.now(), random = Math.random,
    setTimer = setTimeout, clearTimer = clearTimeout, onEvent = () => {}, baseDelay = 250, maxDelay = 5000,
    maxRetries = 5, heartbeatMs = 2000, timeoutMs = 1500, maxQueue = 50 } = {}) {
    const parsed = new URL(url);
    if (!['ws:', 'wss:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) throw new Error('Use a ws:// or wss:// URL without credentials or a fragment.');
    for (const [name, value, max] of [['baseDelay', baseDelay, 60000], ['maxDelay', maxDelay, 60000], ['heartbeatMs', heartbeatMs, 60000], ['timeoutMs', timeoutMs, 60000]]) if (!Number.isFinite(value) || value < 1 || value > max) throw new RangeError(`${name} must be 1–${max} ms.`);
    if (maxDelay < baseDelay || !Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 20 || !Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100) throw new RangeError('Invalid retry or queue bounds.');
    for (const fn of [factory, clock, random, setTimer, clearTimer, onEvent]) if (typeof fn !== 'function') throw new TypeError('Dependencies must be functions.');
    Object.assign(this, { url: parsed.href, factory, clock, random, setTimer, clearTimer, onEvent, baseDelay, maxDelay, maxRetries, heartbeatMs, timeoutMs, maxQueue });
    // Browser timers require their normal global receiver, not this manager.
    this.setTimer = (callback, delay) => setTimer(callback, delay);
    this.clearTimer = timer => clearTimer(timer);
    this.state = 'idle'; this.queue = []; this.timers = new Set(); this.generation = 0; this.attempt = 0; this.wanted = false; this.nextRetryAt = null; this.sent = 0; this.received = 0;
  }
  emit(message) { this.onEvent({ message, ...this.snapshot() }); }
  snapshot() { return { state: this.state, queued: this.queue.length, attempt: this.attempt, nextRetryAt: this.nextRetryAt, sent: this.sent, received: this.received }; }
  later(fn, delay) {
    const generation = this.generation;
    const timer = this.setTimer(() => { this.timers.delete(timer); if (generation === this.generation && this.wanted) fn(); }, delay);
    this.timers.add(timer); return timer;
  }
  drop() {
    this.generation++;
    for (const timer of this.timers) this.clearTimer(timer);
    this.timers.clear(); this.awaitingPong = false;
    if (this.socket) { const socket = this.socket; this.socket = null; socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null; try { socket.close(); } catch { /* A failed transport may already be closed. */ } }
  }
  calculateBackoff(attempt) {
    if (!Number.isInteger(attempt) || attempt < 0 || attempt > 20) throw new RangeError('Attempt must be 0–20.');
    const random = this.random(); if (!Number.isFinite(random) || random < 0 || random > 1) throw new RangeError('Random source must return 0–1.');
    const ceiling = Math.min(this.maxDelay, this.baseDelay * 2 ** attempt);
    return Math.max(1, Math.floor(ceiling * (.5 + .5 * random)));
  }
  connect() { if (this.wanted) return; this.wanted = true; this.attempt = 0; this.open(); }
  open() {
    this.drop(); this.state = 'connecting'; this.nextRetryAt = null;
    const generation = this.generation; let socket;
    try { socket = this.factory(this.url); this.socket = socket; }
    catch { this.retry('Connection could not be created.'); return; }
    const valid = () => generation === this.generation && this.wanted;
    socket.onopen = () => { if (!valid()) return; this.clearTimer(connectTimer); this.timers.delete(connectTimer); this.state = 'open'; this.attempt = 0; this.emit('Connected.'); this.flushQueue(); if (valid()) this.later(() => this.ping(), this.heartbeatMs); };
    socket.onclose = () => { if (valid()) this.retry('Connection closed.'); };
    socket.onerror = () => { if (valid()) this.retry('Transport error.'); };
    socket.onmessage = event => {
      if (!valid() || this.state !== 'open') return;
      if (event.data === HEARTBEAT_PONG) {
        if (this.awaitingPong) { this.clearTimer(this.pongTimer); this.timers.delete(this.pongTimer); this.awaitingPong = false; this.emit('Heartbeat acknowledged.'); this.later(() => this.ping(), this.heartbeatMs); }
      } else if (typeof event.data === 'string') { this.received++; this.emit('Received: ' + event.data.slice(0, 4096)); }
    };
    const connectTimer = this.later(() => this.retry('Connection timed out.'), this.timeoutMs);
    this.emit('Connecting.');
  }
  retry(reason) {
    if (!this.wanted) return;
    this.drop();
    if (this.attempt >= this.maxRetries) { this.wanted = false; this.state = 'failed'; this.nextRetryAt = null; this.emit(reason + ' Retry limit reached; queued messages retained for explicit reconnect.'); return; }
    const delay = this.calculateBackoff(this.attempt++);
    this.state = 'reconnecting'; this.nextRetryAt = this.clock() + delay;
    this.later(() => this.open(), delay); this.emit(reason + ` Retry in ${delay} ms.`);
  }
  ping() {
    if (this.state !== 'open') return;
    try { this.socket.send(HEARTBEAT_PING); }
    catch { this.retry('Heartbeat send failed.'); return; }
    this.awaitingPong = true;
    this.pongTimer = this.later(() => this.retry('Heartbeat timed out.'), this.timeoutMs);
    this.emit('Heartbeat sent.');
  }
  send(message) {
    if (typeof message !== 'string' || !message.length || message.length > 4096) throw new RangeError('Messages must contain 1–4096 characters.');
    if (this.state === 'closed') throw new Error('Connect again before sending.');
    if (this.queue.length >= this.maxQueue) throw new Error('Offline queue full. Nothing was discarded.');
    this.queue.push(message); this.flushQueue(); this.emit('Message accepted locally; delivery is not acknowledged.');
  }
  flushQueue() {
    while (this.state === 'open' && this.socket?.readyState === 1 && this.queue.length) {
      try { this.socket.send(this.queue[0]); }
      catch { this.retry('Message send failed; unsent message retained.'); return; }
      this.queue.shift(); this.sent++;
    }
  }
  simulateDrop() { if (this.state === 'open') this.retry('Local simulated disconnect.'); }
  disconnect() { this.wanted = false; this.drop(); this.state = 'closed'; this.nextRetryAt = null; this.queue = []; this.emit('Disconnected; offline messages cleared.'); }
}

function mount() {
  if (!document.getElementById('connect')) return;
  const get = id => document.getElementById(id), events = []; let manager;
  function event(data) {
    get('state').textContent = data.state; get('queued').textContent = data.queued; get('sent').textContent = data.sent; get('received').textContent = data.received;
    events.unshift(data.message); events.length = Math.min(events.length, 100);
    get('timeline').replaceChildren(...events.map(message => { const li = document.createElement('li'); li.textContent = message; return li; }));
  }
  get('connect').addEventListener('click', () => {
    try {
      if (manager && manager.url === new URL(get('url').value).href && manager.state !== 'closed') manager.connect();
      else { const next = new QuantumForgeResilientSocket(get('url').value, { onEvent: event }); manager?.disconnect(); manager = next; manager.connect(); }
      get('status').textContent = 'Connecting to the endpoint you entered. The server must implement the documented heartbeat.';
    } catch (error) { get('status').textContent = error.message; }
  });
  get('disconnect').addEventListener('click', () => { manager?.disconnect(); get('status').textContent = 'Stopped. Offline queue cleared; no retries remain.'; });
  get('drop').addEventListener('click', () => { manager?.simulateDrop(); });
  get('send').addEventListener('click', () => {
    try { if (!manager) throw new Error('Connect to an endpoint first.'); manager.send(get('message').value); get('status').textContent = 'Accepted into local send flow. No delivery acknowledgement is implied.'; }
    catch (error) { get('status').textContent = error.message; }
  });
  let timer; const start = () => { if (!timer) timer = setInterval(() => { const retry = manager?.nextRetryAt; get('countdown').textContent = retry === null || retry === undefined ? '—' : Math.max(0, Math.ceil(retry - performance.now())) + ' ms'; }, 100); };
  addEventListener('pagehide', () => { clearInterval(timer); timer = undefined; manager?.disconnect(); });
  addEventListener('pageshow', start); start();
}
if (typeof document !== 'undefined') mount();
