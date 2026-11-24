export class WeatherRadarAtlasTokenBucketRateLimiter {
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
    const idx = this.queue.findIndex(job => job.id === id);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    this.metrics.cancelled++;
    return true;
  }

  clearQueue() {
    const count = this.queue.length;
    this.queue = [];
    this.metrics.cancelled += count;
    return count;
  }

  snapshot() {
    return {
      available: this.getAvailableTokens(),
      capacity: this.capacity,
      refillPerSecond: this.refillPerSecond,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
      queue: this.queue.map(job => ({ ...job })),
      active: this.active.map(job => ({ ...job })),
      metrics: { ...this.metrics }
    };
  }
}

function mount() {
  const form = document.getElementById('limiter-config'); if (!form) return;
  const get = id => document.getElementById(id);
  let limiter = new WeatherRadarAtlasTokenBucketRateLimiter();
  let sequence = 0;
  function updateUI() {
    const snap = limiter.snapshot();
    get('bucket-amount').textContent = `${snap.available.toFixed(1)} / ${snap.capacity} tokens`;
    get('bucket-meter').max = snap.capacity;
    get('bucket-meter').value = snap.available;
    get('reservoir-fill').style.height = `${(snap.available / snap.capacity * 100)}%`;
    get('accepted').textContent = snap.metrics.accepted;
    get('completed').textContent = snap.metrics.completed;
    get('throttled').textContent = snap.metrics.throttled;
    get('cancelled').textContent = snap.metrics.cancelled;
    get('active-count').textContent = `${snap.active.length} / ${snap.maxConcurrent}`;
    get('running').textContent = snap.active.length ? snap.active.map(j => `${j.id} (p:${j.priority})`).join(', ') : 'No requests running';
    get('queue-count').textContent = `${snap.queue.length} / ${snap.maxQueue}`;
    get('queue').replaceChildren(...snap.queue.slice(0, 10).map(job => {
      const li = document.createElement('li');
      li.textContent = `${job.id} [Priority: ${job.priority}, Tokens: ${job.tokens}]`;
      return li;
    }));
  }
  setInterval(() => { limiter.tick(); updateUI(); }, 100);
  form.addEventListener('submit', e => {
    e.preventDefault();
    limiter = new WeatherRadarAtlasTokenBucketRateLimiter({
      capacity: Number(get('capacity').value),
      refillPerSecond: Number(get('refill').value),
      maxConcurrent: Number(get('concurrency').value)
    });
    get('status').textContent = 'Limiter reconfigured.';
    updateUI();
  });
  get('send-one').addEventListener('click', () => {
    const cost = Number(get('cost').value);
    const priority = Number(get('priority').value);
    const id = `req-${++sequence}`;
    const queued = limiter.enqueue({ id, tokens: cost, priority });
    get('status').textContent = queued ? `Enqueued ${id}` : 'Queue full!';
    updateUI();
  });
  get('send-flood').addEventListener('click', () => {
    for (let i = 0; i < 12; i++) {
      limiter.enqueue({ id: `flood-${++sequence}`, tokens: 1, priority: Math.floor(Math.random() * 10) });
    }
    get('status').textContent = 'Flooded 12 requests.';
    updateUI();
  });
  get('fill-queue').addEventListener('click', () => {
    for (let i = 0; i < 120; i++) {
      limiter.enqueue({ id: `stress-${++sequence}`, tokens: 1, priority: 0 });
    }
    get('status').textContent = 'Attempted 120 requests.';
    updateUI();
  });
  get('clear-queue').addEventListener('click', () => {
    limiter.clearQueue();
    get('status').textContent = 'Waiting queue cleared.';
    updateUI();
  });
}
if (typeof document !== 'undefined') mount();
