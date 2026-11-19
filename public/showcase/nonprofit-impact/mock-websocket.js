const encoder = new TextEncoder();
function bounded(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be from ${min} to ${max}.`);
  return value;
}
function channelName(channel) {
  if (typeof channel !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(channel)) throw new TypeError('Use a 1–32 character lowercase topic name.');
  return channel;
}
function payloadText(payload) {
  let count = 0; const seen = new Set();
  function visit(value, depth) {
    if (++count > 256 || depth > 12) throw new RangeError('Payload exceeds 256 values or 12 nesting levels.');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return bounded(value, 'JSON number', -Number.MAX_VALUE, Number.MAX_VALUE);
    if (typeof value === 'string') { if (encoder.encode(value).length > 4096) throw new RangeError('Payload exceeds 4 KB.'); return value; }
    if (typeof value !== 'object' || seen.has(value)) throw new TypeError('Use finite JSON data without cycles or functions.');
    const array = Array.isArray(value);
    if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError('Use plain JSON objects.');
    const keys = Object.keys(value);
    if (keys.length > 128 || (array && (keys.length !== value.length || keys.some((key, index) => key !== String(index))))) throw new RangeError('Use dense JSON arrays and at most 128 fields per object.');
    seen.add(value);
    const copy = array ? [] : Object.create(null);
    for (const key of keys) {
      if (encoder.encode(key).length > 128) throw new RangeError('Payload keys must be at most 128 bytes.');
      const item = Object.getOwnPropertyDescriptor(value, key);
      if (!item || !Object.hasOwn(item, 'value')) throw new TypeError('JSON accessors are not supported.');
      copy[key] = visit(item.value, depth + 1);
    }
    seen.delete(value);
    return copy;
  }
  const text = JSON.stringify(visit(payload, 0));
  if (encoder.encode(text).length > 4096) throw new RangeError('Payload exceeds 4 KB.');
  return text;
}

/** Local-only pub/sub transport with injected clock/randomness for deterministic tests. */
export class NonprofitImpactSocketEmulator {
  #clock; #random; #event; #heartbeatMs; #timeoutMs; #baseBackoff; #maxBackoff; #maxPending;
  #latency; #loss; #state = 'disconnected'; #disposed = false; #unavailableUntil = 0;
  #lastAck = 0; #retry = 0; #sequence = 0; #generation = 0; #ackTimer = null;
  #timers = new Set(); #pending = new Map(); #channels = new Map();
  #stats = { sent: 0, delivered: 0, dropped: 0, pings: 0, acknowledgements: 0, missedHeartbeats: 0, heartbeatTimeouts: 0, reconnectAttempts: 0, handlerErrors: 0, lastLatencyMs: null };

  constructor({ clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (id) => clearTimeout(id) }, random = Math.random, onEvent = () => {}, heartbeatMs = 500, heartbeatTimeoutMs = 1500, baseBackoffMs = 250, maxBackoffMs = 2000, latencyMs = 60, dropRate = 0, maxPending = 64 } = {}) {
    if (!clock || !['now', 'setTimeout', 'clearTimeout'].every((key) => typeof clock[key] === 'function') || typeof random !== 'function' || typeof onEvent !== 'function') throw new TypeError('Provide clock, random and event functions.');
    this.#clock = clock; this.#random = random; this.#event = onEvent;
    this.#heartbeatMs = bounded(heartbeatMs, 'Heartbeat interval', 20, 10000);
    this.#timeoutMs = bounded(heartbeatTimeoutMs, 'Heartbeat timeout', heartbeatMs + 1, 60000);
    this.#baseBackoff = bounded(baseBackoffMs, 'Initial backoff', 20, 30000);
    this.#maxBackoff = bounded(maxBackoffMs, 'Maximum backoff', baseBackoffMs, 60000);
    this.#latency = bounded(latencyMs, 'Latency', 0, 2000); this.#loss = bounded(dropRate, 'Loss rate', 0, 1);
    this.#maxPending = bounded(maxPending, 'In-flight packet limit', 1, 256);
    if (!Number.isInteger(maxPending)) throw new RangeError('Packet limit must be an integer.');
  }
  #live() { if (this.#disposed) throw new Error('This emulator has been disposed.'); }
  #available() { return this.#clock.now() >= this.#unavailableUntil; }
  #emit(type, detail = {}) {
    try { this.#event({ type, at: this.#clock.now(), ...detail }); } catch { this.#stats.handlerErrors++; }
  }
  #timer(callback, delay) {
    let id;
    id = this.#clock.setTimeout(() => { this.#timers.delete(id); callback(); }, delay);
    this.#timers.add(id); return id;
  }
  #drop(id, channel, reason) { this.#stats.dropped++; this.#emit('drop', { id, channel, reason }); }
  #interrupt(state) {
    this.#generation++; this.#state = state;
    for (const id of this.#timers) this.#clock.clearTimeout(id);
    this.#timers.clear(); this.#ackTimer = null;
    for (const [id, packet] of this.#pending) { this.#pending.delete(id); this.#drop(id, packet.channel, 'connection interrupted'); }
    this.#emit('state', { state });
  }
  #establish() {
    this.#generation++; this.#state = 'connected'; this.#retry = 0; this.#lastAck = this.#clock.now();
    this.#emit('state', { state: this.#state }); this.#heartbeatLoop();
  }
  #heartbeatLoop() {
    this.#timer(() => {
      if (this.#state !== 'connected') return;
      if (this.#clock.now() - this.#lastAck >= this.#timeoutMs) {
        this.#stats.heartbeatTimeouts++; this.#interrupt('reconnecting'); this.#scheduleRetry(); return;
      }
      this.simulateHeartbeat(); this.#heartbeatLoop();
    }, this.#heartbeatMs);
  }
  #scheduleRetry() {
    const delayMs = Math.min(this.#maxBackoff, this.#baseBackoff * 2 ** Math.min(this.#retry, 16));
    this.#retry++; this.#emit('retry', { delayMs, attempt: this.#retry });
    this.#timer(() => {
      if (this.#state !== 'reconnecting') return;
      this.#stats.reconnectAttempts++;
      if (this.#available()) this.#establish(); else this.#scheduleRetry();
    }, delayMs);
  }
  connect() {
    this.#live();
    if (this.#state !== 'disconnected') return this.#state;
    if (this.#available()) this.#establish(); else { this.#retry = 0; this.#interrupt('reconnecting'); this.#scheduleRetry(); }
    return this.#state;
  }
  disconnect() {
    if (this.#disposed || this.#state === 'disconnected') return;
    this.#interrupt('disconnected'); this.#retry = 0;
  }
  subscribe(channel, handler) {
    this.#live(); channelName(channel);
    if (typeof handler !== 'function') throw new TypeError('A subscription needs a handler.');
    const handlers = this.#channels.get(channel) || new Set();
    const total = [...this.#channels.values()].reduce((sum, set) => sum + set.size, 0);
    if (!handlers.has(handler) && (total >= 32 || (!this.#channels.has(channel) && this.#channels.size >= 16))) throw new RangeError('At most 16 topics and 32 handlers are supported.');
    handlers.add(handler); this.#channels.set(channel, handlers); this.#emit('subscriptions');
    let active = true;
    return () => {
      if (!active) return; active = false;
      handlers.delete(handler); if (handlers.size === 0 && this.#channels.get(channel) === handlers) this.#channels.delete(channel);
      this.#emit('subscriptions');
    };
  }
  publish(channel, payload) {
    this.#live(); channelName(channel); const text = payloadText(payload);
    const sample = this.#state === 'connected' && this.#available() && this.#pending.size < this.#maxPending ? bounded(this.#random(), 'Random sample', 0, 1) : 0;
    const id = ++this.#sequence; this.#stats.sent++;
    this.#emit('publish', { id, channel, payload: JSON.parse(text) });
    if (this.#state !== 'connected' || !this.#available()) { this.#drop(id, channel, 'offline'); return { id, accepted: false, reason: 'offline' }; }
    if (this.#pending.size >= this.#maxPending) { this.#drop(id, channel, 'in-flight limit'); return { id, accepted: false, reason: 'in-flight limit' }; }
    if (sample < this.#loss || this.#loss === 1) { this.#drop(id, channel, 'simulated data loss'); return { id, accepted: false, reason: 'simulated data loss' }; }
    const generation = this.#generation; const started = this.#clock.now();
    this.#pending.set(id, { channel });
    this.#timer(() => {
      if (!this.#pending.delete(id) || generation !== this.#generation) return;
      if (this.#state !== 'connected' || !this.#available()) { this.#drop(id, channel, 'link lost in flight'); return; }
      this.#stats.delivered++; this.#stats.lastLatencyMs = this.#clock.now() - started;
      for (const handler of [...(this.#channels.get(channel) || [])]) {
        try { handler(JSON.parse(text), { id, channel }); } catch { this.#stats.handlerErrors++; }
      }
      this.#emit('delivery', { id, channel });
    }, this.#latency);
    this.#emit('queued', { id, channel }); return { id, accepted: true };
  }
  simulateHeartbeat() {
    this.#live(); if (this.#state !== 'connected' || this.#ackTimer !== null) return false;
    const generation = this.#generation; const sentOnline = this.#available(); this.#stats.pings++;
    this.#ackTimer = this.#timer(() => {
      this.#ackTimer = null; if (generation !== this.#generation || this.#state !== 'connected') return;
      const acknowledged = sentOnline && this.#available();
      if (acknowledged) { this.#lastAck = this.#clock.now(); this.#stats.acknowledgements++; } else this.#stats.missedHeartbeats++;
      this.#emit('heartbeat', { acknowledged });
    }, this.#latency);
    this.#emit('ping'); return true;
  }
  simulateDropout(durationMs) {
    this.#live(); bounded(durationMs, 'Dropout duration', 1, 60000);
    this.#unavailableUntil = Math.max(this.#unavailableUntil, this.#clock.now() + durationMs);
    this.#emit('dropout', { until: this.#unavailableUntil }); return this.#unavailableUntil;
  }
  setDropRate(rate) { this.#live(); this.#loss = bounded(rate, 'Loss rate', 0, 1); }
  setLatency(milliseconds) { this.#live(); this.#latency = bounded(milliseconds, 'Latency', 0, 2000); }
  getStats() {
    return { ...this.#stats, state: this.#state, pending: this.#pending.size, subscriptions: [...this.#channels.values()].reduce((sum, handlers) => sum + handlers.size, 0), lossPercent: this.#stats.sent ? 100 * this.#stats.dropped / this.#stats.sent : 0 };
  }
  dispose() { if (!this.#disposed) { this.disconnect(); this.#channels.clear(); this.#disposed = true; } }
}

function mountStreamLab() {
  if (!document.querySelector('#stream')) return;
  const $ = (selector) => document.querySelector(selector);
  const topics = ['impact', 'supplies', 'volunteers']; const subscriptions = new Map();
  let socket; let autoTimer = null; let sample = 0;
  function journal(kind, text) {
    const entry = document.createElement('li'); entry.className = kind.toLowerCase();
    entry.textContent = `${new Date().toLocaleTimeString('en-GB')} ${kind}  ${text}`;
    const log = $('#stream'); const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 35;
    log.append(entry); while (log.children.length > 80) log.firstElementChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
  }
  function render() {
    const stats = socket.getStats(); const status = $('#connection-status');
    if (status.textContent !== stats.state) status.textContent = stats.state;
    status.dataset.state = stats.state;
    $('#connect').disabled = stats.state !== 'disconnected'; $('#disconnect').disabled = stats.state === 'disconnected';
    for (const selector of ['#dropout', '#ping', '#publish']) $(selector).disabled = stats.state !== 'connected';
    for (const [selector, value] of [['#sent-count', stats.sent], ['#delivered-count', stats.delivered], ['#pending-count', stats.pending], ['#retry-count', stats.reconnectAttempts], ['#subscription-count', stats.subscriptions]]) $(selector).textContent = String(value);
    $('#loss-percent').textContent = `${stats.lossPercent.toFixed(1)}%`; $('#dropped-count').textContent = `${stats.dropped} dropped`;
    $('#latency-value').textContent = stats.lastLatencyMs === null ? '—' : `${stats.lastLatencyMs} ms`;
    $('#heartbeat-count').textContent = `${stats.acknowledgements} / ${stats.pings}`;
  }
  socket = new NonprofitImpactSocketEmulator({ onEvent(event) {
    if (event.type === 'state') journal('STATE', event.state);
    if (event.type === 'retry') journal('RETRY', `Attempt ${event.attempt} in ${event.delayMs} ms`);
    if (event.type === 'publish') journal('OUT', `${event.channel} #${event.id} ${JSON.stringify(event.payload)}`);
    if (event.type === 'drop') journal('DROP', `${event.channel} #${event.id} ${event.reason}`);
    if (event.type === 'dropout') journal('FAULT', 'Local link unavailable for at least 3 seconds. Heartbeats will detect the outage.');
    if (event.type === 'heartbeat' && $('#show-heartbeats').checked) journal('HEARTBEAT', event.acknowledged ? 'ACK' : 'No acknowledgement');
    render();
  } });
  function setSubscription(input) {
    const topic = input.value;
    if (input.checked && !subscriptions.has(topic)) subscriptions.set(topic, socket.subscribe(topic, (payload, packet) => journal('IN', `${topic} #${packet.id} ${JSON.stringify(payload)}`)));
    if (!input.checked && subscriptions.has(topic)) { subscriptions.get(topic)(); subscriptions.delete(topic); }
    render();
  }
  document.querySelectorAll('input[name="topic"]').forEach((input) => { setSubscription(input); input.addEventListener('change', () => setSubscription(input)); });
  function stopAuto() { if (autoTimer !== null) clearInterval(autoTimer); autoTimer = null; }
  function startAuto() {
    stopAuto(); if (!$('#auto').checked || document.hidden) return;
    autoTimer = setInterval(() => {
      if (socket.getStats().state !== 'connected') return;
      const topic = topics[sample % topics.length]; sample++;
      socket.publish(topic, { demo: true, sample, activityCount: 12 + sample % 20 });
    }, 1000);
  }
  $('#connect').addEventListener('click', () => { socket.connect(); $('#lifecycle-note').textContent = 'Local simulation active. No external service is connected.'; startAuto(); });
  $('#disconnect').addEventListener('click', () => { socket.disconnect(); stopAuto(); $('#lifecycle-note').textContent = 'Disconnected. Pending packets and reconnect timers were cancelled.'; });
  $('#dropout').addEventListener('click', () => socket.simulateDropout(3000));
  $('#ping').addEventListener('click', () => socket.simulateHeartbeat());
  $('#loss').addEventListener('input', (event) => { const value = Number(event.target.value); socket.setDropRate(value / 100); $('#loss-value').textContent = `${value}%`; });
  $('#latency').addEventListener('change', (event) => socket.setLatency(Number(event.target.value)));
  $('#auto').addEventListener('change', startAuto);
  $('#publish-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { socket.publish($('#publish-topic').value, JSON.parse($('#payload').value)); $('#publish-error').textContent = ''; }
    catch (error) { $('#publish-error').textContent = error.message; }
  });
  $('#clear-log').addEventListener('click', () => $('#stream').replaceChildren());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAuto(); socket.disconnect(); $('#lifecycle-note').textContent = 'Paused while hidden. Press Connect to resume the simulation.'; }
  });
  window.addEventListener('pagehide', () => { stopAuto(); socket.disconnect(); });
  window.addEventListener('pageshow', () => { render(); });
  render();
}
if (typeof document !== 'undefined') mountStreamLab();
