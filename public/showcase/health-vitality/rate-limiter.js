/** Local simulation only: this does not enforce limits on a server. */
export class HealthVitalityTokenBucketRateLimiter {
  constructor({ capacity = 10, refillPerSecond = 2, maxConcurrent = 3, maxQueue = 100, clock = () => performance.now() } = {}) {
    for (const [name, value, max] of [['capacity', capacity, 1000], ['refillPerSecond', refillPerSecond, 1000]]) {
      if (!Number.isFinite(value) || value <= 0 || value > max) throw new RangeError(`${name} must be greater than 0 and at most ${max}.`);
    }
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20) throw new RangeError('Concurrency must be 1–20.');
    if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100) throw new RangeError('Queue limit must be 1–100.');
    if (typeof clock !== 'function') throw new TypeError('Clock must be a function.');
    Object.assign(this, { capacity, refillPerSecond, maxConcurrent, maxQueue, clock });
    this.lastTime = clock();
    if (!Number.isFinite(this.lastTime)) throw new TypeError('Clock must return finite milliseconds.');
    this.tokens = capacity;
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = { accepted: 0, completed: 0, throttled: 0, cancelled: 0 };
  }

  refill() {
    const time = this.clock();
    if (!Number.isFinite(time)) throw new TypeError('Clock must return finite milliseconds.');
    // A backward clock never mints tokens or moves the accounting baseline back.
    const now = Math.max(time, this.lastTime);
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.lastTime) * this.refillPerSecond / 1000);
    this.lastTime = now;
    return this.tokens;
  }

  tryConsume(tokens = 1) {
    if (!Number.isFinite(tokens) || tokens <= 0 || tokens > this.capacity) throw new RangeError('Token cost must be positive and no larger than capacity.');
    this.refill();
    if (this.tokens < tokens) return false;
    this.tokens -= tokens;
    return true;
  }

  getAvailableTokens() { return this.refill(); }

  enqueue({ id, tokens = 1, priority = 0, durationMs = 800 } = {}) {
    if (typeof id !== 'string' || !id.trim() || id.length > 64) throw new TypeError('Request ID must contain 1–64 characters.');
    if (!Number.isFinite(tokens) || tokens <= 0 || tokens > this.capacity) throw new RangeError('Token cost must be positive and no larger than capacity.');
    if (!Number.isInteger(priority) || priority < 0 || priority > 9) throw new RangeError('Priority must be an integer from 0 to 9.');
    if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 60000) throw new RangeError('Duration must be 0–60000 ms.');
    if ([...this.queue, ...this.active].some(job => job.id === id)) throw new Error('Request ID is already queued or running.');
    if (this.queue.length >= this.maxQueue) { this.metrics.throttled++; return false; }
    this.queue.push({ id, tokens, priority, durationMs, order: this.sequence++ });
    this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    return true;
  }

  tick() {
    this.refill();
    const now = this.lastTime;
    const completed = this.active.filter(job => job.endsAt <= now);
    this.active = this.active.filter(job => job.endsAt > now);
    this.metrics.completed += completed.length;
    const started = [];
    // Strict priority; a costly head waits rather than being starved by cheaper jobs.
    while (this.queue.length && this.active.length < this.maxConcurrent) {
      const next = this.queue[0];
      if (this.tokens < next.tokens) break;
      this.tokens -= next.tokens;
      this.queue.shift();
      const job = { ...next, startedAt: now, endsAt: now + next.durationMs };
      this.active.push(job);
      started.push({ ...job });
      this.metrics.accepted++;
    }
    return { started, completed: completed.map(job => ({ ...job })) };
  }

  cancel(id) {
    const index = this.queue.findIndex(job => job.id === id);
    if (index < 0) return false;
    this.queue.splice(index, 1);
    this.metrics.cancelled++;
    return true;
  }

  snapshot() {
    return { available: this.getAvailableTokens(), capacity: this.capacity,
      queue: this.queue.map(job => ({ ...job })), active: this.active.map(job => ({ ...job })),
      metrics: { ...this.metrics } };
  }
}

function mount() {
  const form = document.querySelector('#limiter-config');
  if (!form) return;
  const get = id => document.getElementById(id);
  let engine = new HealthVitalityTokenBucketRateLimiter();
  let nextId = 1;
  const events = [];
  function log(message, kind = 'info') {
    events.unshift({ message, kind });
    events.length = Math.min(events.length, 100);
  }
  function render() {
    const s = engine.snapshot();
    get('bucket-meter').max = s.capacity;
    get('bucket-meter').value = s.available;
    get('bucket-amount').textContent = `${s.available.toFixed(1)} / ${s.capacity} tokens`;
    get('reservoir-fill').style.height = `${s.available / s.capacity * 100}%`;
    for (const key of ['accepted', 'completed', 'throttled', 'cancelled']) get(key).textContent = s.metrics[key];
    get('active-count').textContent = `${s.active.length} / ${engine.maxConcurrent}`;
    get('queue-count').textContent = `${s.queue.length} / ${engine.maxQueue}`;
    get('running').textContent = s.active.length ? s.active.map(job => job.id).join(', ') : 'No requests running';
    get('queue').replaceChildren(...s.queue.map(job => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${job.id} · priority ${job.priority} · ${job.tokens} tokens`;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Cancel'; button.setAttribute('aria-label', `Cancel ${job.id}`);
      button.addEventListener('click', () => { if (engine.cancel(job.id)) log(`${job.id} cancelled before execution.`, 'cancelled'); render(); });
      li.append(label, button); return li;
    }));
    if (!s.queue.length) { const li = document.createElement('li'); li.textContent = 'Queue is empty'; get('queue').append(li); }
    get('event-log').replaceChildren(...events.map(event => {
      const li = document.createElement('li'); li.textContent = event.message; li.className = event.kind; return li;
    }));
  }
  function tick() {
    const { started, completed } = engine.tick();
    for (const job of completed) log(`${job.id} completed.`, 'completed');
    for (const job of started) log(`${job.id} accepted at priority ${job.priority}.`, 'accepted');
    render();
  }
  function flood(count) {
    for (let i = 0; i < count; i++) {
      const id = `Request ${nextId++}`;
      const accepted = engine.enqueue({ id, priority: Number(get('priority').value), tokens: Number(get('cost').value) });
      log(`${id} ${accepted ? 'queued' : 'throttled: queue full'}.`, accepted ? 'info' : 'throttled');
    }
    tick();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const replacement = new HealthVitalityTokenBucketRateLimiter({ capacity: Number(get('capacity').value),
        refillPerSecond: Number(get('refill').value), maxConcurrent: Number(get('concurrency').value) });
      engine = replacement; events.length = 0; nextId = 1;
      get('cost').max = engine.capacity; get('cost').value = 1;
      get('status').textContent = 'Simulation reset. Running and queued requests were cleared.';
      log('New local simulation started.'); render();
    } catch (error) { get('status').textContent = error.message; }
  });
  for (const [id, count] of [['send-one', 1], ['send-flood', 12], ['fill-queue', 120]]) {
    get(id).addEventListener('click', () => {
      try { flood(count); get('status').textContent = `${count} requests submitted. See queue and event log.`; }
      catch (error) { get('status').textContent = error.message; }
    });
  }
  get('clear-queue').addEventListener('click', () => {
    const jobs = engine.snapshot().queue;
    for (const job of jobs) engine.cancel(job.id);
    log(`${jobs.length} queued requests cancelled; running work continues.`, 'cancelled'); render();
  });
  let timer;
  const start = () => { if (!timer) timer = setInterval(tick, 100); };
  const stop = () => { clearInterval(timer); timer = undefined; };
  addEventListener('pagehide', stop);
  addEventListener('pageshow', start);
  log('Local simulation ready. No patient data or network requests.'); render(); start();
}
if (typeof document !== 'undefined') mount();
