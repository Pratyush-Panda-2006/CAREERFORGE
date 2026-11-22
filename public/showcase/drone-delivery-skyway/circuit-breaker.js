const failure = (code, message, retryAfterMs = 0) => Object.assign(new Error(message), { code, retryAfterMs });

export class DroneDeliverySkywayCircuitBreaker {
  #state = 'closed'; #failures = 0; #trips = 0; #until = 0; #generation = 0;
  #controllers = new Set(); #events = []; #probe = false; #disposed = false;
  #threshold; #cooldown; #maximum; #timeout; #now; #delay;
  constructor({ threshold = 3, cooldownMs = 800, maxCooldownMs = 6400, timeoutMs = 300, now = () => performance.now() } = {}) {
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10) throw new RangeError('Use a failure threshold from 1 to 10.');
    for (const [value, max] of [[cooldownMs, 30000], [maxCooldownMs, 300000], [timeoutMs, 30000]]) if (!Number.isInteger(value) || value < 5 || value > max) throw new RangeError('Invalid bounded timer duration.');
    if (maxCooldownMs < cooldownMs || typeof now !== 'function' || !Number.isFinite(now())) throw new TypeError('Use a valid clock and a maximum cooldown at least as large as the base.');
    this.#threshold = threshold; this.#cooldown = cooldownMs; this.#maximum = maxCooldownMs;
    this.#timeout = timeoutMs; this.#now = now; this.#delay = cooldownMs;
  }
  #record(event) {
    this.#events.push({ event, state: this.#state, atMs: this.#now(), failures: this.#failures });
    if (this.#events.length > 50) this.#events.shift();
  }
  #ensureActive() { if (this.#disposed) throw failure('DISPOSED', 'This circuit has been disposed.'); }
  snapshot() {
    return { state: this.#state, failures: this.#failures, threshold: this.#threshold, trips: this.#trips,
      cooldownMs: this.#delay, retryAfterMs: this.#state === 'open' ? Math.max(0, Math.ceil(this.#until - this.#now())) : 0,
      activeRequests: this.#controllers.size, disposed: this.#disposed, events: this.#events.map(event => ({ ...event })) };
  }
  trip() {
    this.#ensureActive();
    if (this.#state === 'open') return this.snapshot();
    this.#trips++;
    this.#delay = Math.min(this.#maximum, this.#cooldown * 2 ** Math.min(this.#trips - 1, 30));
    this.#until = this.#now() + this.#delay; this.#state = 'open'; this.#probe = false;
    this.#generation++;
    for (const controller of this.#controllers) controller.abort();
    this.#record('Circuit opened');
    return this.snapshot();
  }
  /** Restart the current cooldown without closing the circuit or erasing backoff. */
  resetTimeout() {
    this.#ensureActive();
    if (this.#state !== 'open') throw failure('NOT_OPEN', 'A cooldown can only be restarted while open.');
    this.#until = this.#now() + this.#delay; this.#record('Cooldown restarted');
    return this.snapshot();
  }
  async execute(fn) {
    this.#ensureActive();
    if (typeof fn !== 'function') throw new TypeError('Provide a request function.');
    if (this.#state === 'open') {
      const remaining = this.#until - this.#now();
      if (remaining > 0) { this.#record('Request blocked during cooldown'); throw failure('OPEN', 'Circuit is open; the request was not called.', Math.ceil(remaining)); }
      this.#state = 'half-open'; this.#record('Ready for one recovery trial');
    }
    if (this.#state === 'half-open' && this.#probe) { this.#record('Request blocked while recovery trial is active'); throw failure('HALF_OPEN_BUSY', 'Only one recovery trial is allowed.'); }
    if (this.#controllers.size >= 32) { this.#record('Local concurrency limit reached'); throw failure('BUSY', 'The local limit of 32 active requests is reached.'); }
    if (this.#state === 'half-open') this.#probe = true;
    const generation = this.#generation, controller = new AbortController();
    this.#controllers.add(controller);
    let timer, abortListener;
    const cancelled = new Promise((_, reject) => {
      abortListener = () => reject(failure('CANCELLED', 'An obsolete request was cancelled.'));
      controller.signal.addEventListener('abort', abortListener, { once: true });
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { reject(failure('TIMEOUT', 'The local request timed out.')); controller.abort(); }, this.#timeout);
    });
    this.#record('Request started');
    try {
      const request = Promise.resolve().then(() => {
        if (controller.signal.aborted || generation !== this.#generation) throw failure('CANCELLED', 'Request cancelled before dispatch.');
        return fn(controller.signal);
      });
      const result = await Promise.race([request, timeout, cancelled]);
      // A trip/disposal invalidates every earlier completion, including uncooperative callbacks.
      if (generation !== this.#generation || this.#disposed) throw failure('CANCELLED', 'An obsolete request result was ignored.');
      this.#failures = 0;
      if (this.#state === 'half-open') {
        this.#state = 'closed'; this.#probe = false; this.#trips = 0; this.#delay = this.#cooldown; this.#until = 0;
        this.#record('Recovery trial succeeded; circuit closed');
      } else this.#record('Request succeeded');
      return result;
    } catch (error) {
      if (generation === this.#generation && !this.#disposed) {
        this.#failures++;
        if (this.#state === 'half-open' || this.#failures >= this.#threshold) this.trip();
        else this.#record('Request failed');
      }
      throw error;
    } finally {
      clearTimeout(timer); controller.signal.removeEventListener('abort', abortListener); this.#controllers.delete(controller);
      if (generation === this.#generation) this.#probe = false;
    }
  }
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true; this.#generation++;
    for (const controller of this.#controllers) controller.abort();
    this.#record('Disposed');
  }
}

function mount() {
  const root = document.querySelector('[data-circuit-lab]'); if (!root) return;
  const get = id => root.querySelector(`#${id}`);
  let circuit = new DroneDeliverySkywayCircuitBreaker(), interval, stopped = false;
  function status(message, error = false) { get('status').setAttribute('role', error ? 'alert' : 'status'); get('status').textContent = message; }
  function countdown() {
    const state = circuit.snapshot();
    get('retry').textContent = state.state === 'open' ? state.retryAfterMs ? `${state.retryAfterMs} ms` : 'Ready for one trial' : 'No cooldown';
  }
  function render() {
    const state = circuit.snapshot(); get('state').textContent = state.state; get('lamp').dataset.state = state.state;
    get('failures').textContent = `${state.failures} / ${state.threshold}`; get('meter').value = Math.min(state.failures, state.threshold);
    get('backoff').textContent = `${state.cooldownMs} ms`; get('active').textContent = String(state.activeRequests);
    get('events').replaceChildren(...state.events.slice().reverse().map(event => { const row = document.createElement('li'); row.textContent = `${event.atMs.toFixed(0)} ms · ${event.state} · ${event.event}`; return row; }));
    countdown();
  }
  function mock(outcome) {
    return signal => new Promise((resolve, reject) => {
      if (signal.aborted) { reject(failure('CANCELLED', 'Mock request cancelled.')); return; }
      const finish = () => {
        signal.removeEventListener('abort', cancel);
        if (outcome === 'fail') reject(failure('MOCK_FAILURE', 'Simulated service failure.'));
        else resolve('Local mock response accepted');
      };
      const timer = setTimeout(finish, outcome === 'timeout' ? 1000 : 120);
      function cancel() { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(failure('CANCELLED', 'Mock request cancelled.')); }
      signal.addEventListener('abort', cancel, { once: true });
    });
  }
  root.querySelectorAll('[data-outcome]').forEach(button => button.addEventListener('click', async () => {
    const current = circuit;
    try {
      const pending = current.execute(mock(button.dataset.outcome)); render();
      const result = await pending;
      if (current === circuit && !stopped) { get('last-result').textContent = result; status('Local request succeeded.'); }
    } catch (error) {
      if (current === circuit && !stopped && error.code !== 'CANCELLED') status(`${error.code || 'ERROR'}: ${error.message} Last successful value retained.`, true);
    } finally { if (current === circuit && !stopped) render(); }
  }));
  get('trip').addEventListener('click', () => { circuit.trip(); render(); status('Circuit opened manually. Active requests were cancelled.'); });
  get('restart').addEventListener('click', () => { try { circuit.resetTimeout(); render(); status('Cooldown restarted; backoff retained.'); } catch (error) { status(error.message, true); } });
  function fresh() {
    circuit.dispose(); circuit = new DroneDeliverySkywayCircuitBreaker(); get('last-result').textContent = 'No successful response yet';
    stopped = false; render(); status('Fresh local demonstration.');
  }
  get('reset').addEventListener('click', fresh);
  interval = setInterval(countdown, 100);
  window.addEventListener('pagehide', () => { stopped = true; clearInterval(interval); circuit.dispose(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { fresh(); interval = setInterval(countdown, 100); } });
  render();
}
if (typeof document !== 'undefined') mount();
